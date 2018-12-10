const WebSocket = require('ws');
const EventEmitter = require('events');
const request = require('request');
const consts = require('./consts.js');
const md5 = require('md5');

class Handler extends EventEmitter {
  constructor(id,options){
    super();
    var me = this;
    this.quizID = id;
    this.options = options;
    this.msgID = 0;
    this.clientID = null;
    this.session = null;
    this.secret = null;
    this.quiz = {};
    this.timestamp = 0;
    this.connected = false;
    this.recievedFirstHandshake = false;
    this.players = [];
    this.configured = false;
    this.questionIndex = 0;
    this.snark = ["Are you sure about that?"];
    this.success = ["1st","2nd","3rd","Top 5!","Oof"];
    this.success2 = ["Hooray!","Nice!","So close!","You tried...","Next time..."];
    this.questionTimestamp = 0;
    this.on("start",()=>{
      setTimeout(()=>{
        this.questionTimestamp = Date.now();
        this.emit("questionStart");
        this.nextQuestion(true);
      },5000);
    });
    this.on("qstart",f=>{
      if(f == "first"){
        return;
      }
      this.emit("questionStart");
    });
    this.on("questionStart",()=>{
      this.timeout = setTimeout(function(){me.executeQuestion(me)},4000);
    });
    this.timesync = {
      a: [],
      b: []
    }
  }
  start(){
    //GET quiz.
    this.timestamp = Date.now();
    request(consts.quiz_id + this.quizID + consts.quiz_extra + this.timestamp,(e,r,b) => {
      if(e){
        throw "Invalid URI / API Error";
      }
      try{
        this.quiz = JSON.parse(b);
      }catch(e){
        console.log("JSON Error");
        this.emit("error",e);
        return;
      }
    });
    let form = {
      gameMode: "normal",
      namerator: false,
      twoFactorAuth: false
    };
    request.post({
      url: `https://play.kahoot.it/reserve/session/?${Date.now()}`,
      multipart: [{
        'content-type': 'application/json',
        body: JSON.stringify(form)
      }]
    },(e,r,b) => {
      this.session = Number(b);
      this.secret = r.headers['x-kahoot-session-token'];
      //console.log(this.session + "," + this.secret);
      //now create the web socket.
      this.ws = new WebSocket(consts.wss_endpoint+"/"+this.session+"/"+this.secret,{
        origin: "https://play.kahoot.it",
        perMessageDeflate: true,
        maxPayload: 50000000,
        threshold: 0
      });
      //ws stuffs
      this.ws.on("open",()=>{
        //console.log("opened!");
        this.connected = true;
        this.open();
      });
      this.ws.on("message",msg => {
        this.message(msg);
      });
      this.ws.on("close",()=>{
        this.close();
        this.connected = false;
      });
      this.ws.on("error",err=>{
        console.log("Error! " + err);
      });
      //end of ws stuff
    });
  }
  getPacket(packet){
    let l = (Date.now() - packet.ext.timesync.tc - packet.ext.timesync.p) / 2;
    let o = packet.ext.timesync.ts - packet.ext.timesync.tc - l;
    this.timesync.a.push(l);
    this.timesync.b.push(o);
    if(this.timesync.a.length > 10){
      this.timesync.a.shift();
      this.timesync.b.shift();
    }
    var p,g,g,d;
    for(var d = this.timesync.a.length, p = 0, h=0,g=0;g<d;++g){
      p+=this.timesync.a[g];
      h+=this.timesync.b[g];
    }
    this.msgID++;
    return [{
      channel: packet.channel,
      clientId: this.clientID,
      ext: {
        ack: packet.ext.ack,
        timesync: {
          l: parseInt((p/d).toFixed()),
          o: parseInt((h/d).toFixed()),
          tc: Date.now()
        }
      },
      id: String(this.msgID)
    }];
  }
  message(msg){
    //console.log("message recieved: " + msg);
    let data = JSON.parse(msg);
    if(data[0].channel == consts.channels.handshake && data[0].clientId){
      this.emit("handshake",data[0].clientId);
      this.clientID = data[0].clientId;
      let r = this.getPacket(data[0])[0];
      r.ext.ack = undefined,
      r.channel = consts.channels.subscribe,
      r.clientId = this.clientID,
      r.subscription = "/service/player";
      this.send([r]);
      //console.log("handshake? " + this.recievedFirstHandshake);
      if(!this.recievedFirstHandshake){ //send subscription stuff
        let r = this.getPacket(data[0])[0];
        delete r.ext.ack;
        r.channel = consts.channels.subscribe;
        r.clientId = this.clientID;
        r.subscription = "/controller/" + this.session;
        this.send([r]);
        r = this.getPacket(data[0])[0];
        r.ext.ack = -1;
        r.advice = {
          timeout: 0
        };
        r.channel = consts.channels.connect;
        r.clientId = this.clientID;
        r.connectionType = "websocket";
        this.send([r]);
        this.recievedFirstHandshake = true;
      }
      return;
    }
    if(data[0].channel == consts.channels.subscribe){
      if(data[0].subscription == consts.channels.subscription && data[0].successful == true && !this.configured){
        //console.log("sending final setup thing");
        this.configured = true;
        let r = this.getPacket(data[0])[0];
        r.channel = consts.channels.subscription;
        r.clientId = this.clientID;
        delete r.ext;
        r.data = {
          gameid: this.session,
          host: "play.kahoot.it",
          type: "started"
        };
        this.send([r]);
        this.emit("ready",this.session);
      }
      return;
    }
    if(data[0].channel == "/controller/" + this.session && data[0].data.type == "joined"){ //a player joind
      this.msgID++;
      let r = {
        channel: consts.channels.subscription,
        clientId: this.clientID,
        id: String(this.msgID),
        data: {
          cid: data[0].data.cid,
          content: JSON.stringify({
            playerName: data[0].data.name,
            quizType: "quiz"
          }),
          gameid: this.session,
          host: "play.kahoot.it",
          id: 14,
          type: "message"
        }
      };
      this.send([r]);
      //add player to list
      this.players.push({
        name: data[0].data.name,
        id: data[0].data.cid,
        score: 0
      });
      this.emit("join",{name: data[0].data.name,id:data[0].data.cid});
      return;
    }
    if(data[0].channel == "/controller/" + this.session && data[0].data.type == "left"){
      this.emit("leave",{
        name: this.players.filter(o=>{
          return o.id == data[0].data.cid;
        })[0].name,
        id: data[0].data.cid
      });
      this.players = this.players.filter(o=>{
        return o.id != data[0].data.cid
      });
      return;
    }
    if(data[0].channel == "/controller/" + this.session && JSON.parse(data[0].data.content).choice){
      this.handleScore(data[0].data.cid,JSON.parse(data[0].data.content));
      //send response...
      let ans = [];
      this.msgID++;
      for(let i in this.quiz.questions){
        ans.push(this.quiz.questions[i].choices.length);
      }
      let r = {
        channel: consts.channels.subscription,
        clientId: this.clientID,
        id: String(this.msgID),
        data: {
          cid: String(data[0].data.cid),
          host: "play.kahoot.it",
          id: 7,
          type: "message",
          gameid: this.session,
          content: JSON.stringify({
            primaryMessage: this.snark[Math.floor(Math.random() * this.snark.length)],
            quizType: "quiz",
            quizQuestionAnswers: ans
          })
        }
      };
      this.send([r]);
      this.emit("answer",data[0].data.cid);
      return;
    }
    if(data[0].channel == consts.channels.connect && typeof(data[0].advice) != "undefined"){
      if(typeof(data[0].advice.reconnect) == "undefined"){
        return;
      }
      if(data[0].advice.reconnect == "retry"){
        let r = this.getPacket(data[0])[0];
        r.clientId = this.clientID;
        r.connectionType = "websocket";
        this.send([r]);
      }
      return;
    }
    if(data[0].channel == consts.channels.connect && typeof(data[0].advice) == "undefined"){
      //ping + pong system.
      let r = this.getPacket(data[0])[0];
      r.clientId = this.clientID;
      this.send([r]);
      return;
    }
  }
  executeQuestion(me){
    var me = me ? me : this;
    me.msgID++;
    let answerMap = {};
    let ans = [];
    for(let i in me.quiz.questions){
      ans.push(me.quiz.questions[i].choices.length);
    }
    for(let i in me.quiz.questions[me.questionIndex].choices){
      answerMap[String(i)] = Number(i);
    }
    let r = {
      channel: consts.channels.subscription,
      clientId: me.clientID,
      id: String(me.msgID),
      data: {
        gameid: me.session,
        host: "play.kahoot.it",
        id: 2,
        type: "message",
        content: JSON.stringify({
          questionIndex: me.questionIndex,
          answerMap: answerMap,
          canAccessStoryBlocks: false,
          gameBlockType: "quiz",
          quizType: "quiz",
          quizQuestionAnswers: ans
        })
      }
    };
    me.send([r]);
    me.timeout2 = setTimeout(function(){me.endQuestion(me)},me.quiz.questions[me.questionIndex].time);
  }
  send(msg){
    if(this.connected){
      try{
        //console.log("sending " + JSON.stringify(msg));
        this.ws.send(JSON.stringify(msg),function ack(err){
          if(err){
            console.log("Error sending message: " + err);
          }
        });
      }catch(e){
        console.log("Uh oh. an error!");
      }
    }
  }
  end(){
    this.emit("close");
  }
  open(){
    this.emit("open");
    this.connected = true;
    let r = [{
      advice: {
        interval: 0,
        timeout: 60000
      },
      channel: consts.channels.handshake,
      ext: {
        ack: true,
        timesync: {
          l: 0,
          o: 0,
          tc: Date.now()
        }
      },
      id: "1",
      minumum_version: "1.0",
      version: "1.0",
      supportedConnectionTypes: [
        "websocket","long-polling"
      ]
    }];
    this.send(r);
    this.msgID++;
  }
  close(){
    this.connected = false;
    this.emit("close");
    this.ws.close();
  }
  startQuiz(){
    if(this.connected && this.configured){
      this.msgID++;
      let ans = [];
      for(let i in this.quiz.questions){
        ans.push(this.quiz.questions[i].choices.length);
      }
      let r = {
        channel: consts.channels.subscription,
        clientId: this.clientID,
        id: String(this.msgID),
        data: {
          host: "play.kahoot.it",
          id: 9,
          gameid: this.session,
          type: "message",
          content: JSON.stringify({
            quizName: this.quiz.title,
            quizType: "quiz",
            quizQuestionAnswers: ans
          })
        }
      };
      this.emit("start",this.quiz.questions[this.questionIndex]);
      this.send([r]);
    }else{
      return "Start the quiz first using kahoot.start()";
    }
  }
  kickPlayer(id){
    if(this.players.filter(o=>{
      return o.id == id;
    }).length == 1){
      this.msgID++;
      let r = {
        channel: consts.channels.subscription,
        clientId: this.clientID,
        id: String(this.msgID),
        data: {
          cid: String(id),
          content: JSON.stringify({
            kickCode: 1,
            quizType: "quiz"
          }),
          gameid: this.session,
          host: "play.kahoot.it",
          id: 10,
          type: "message"
        }
      };
      this.send([r]);
    }else{
      return "Player not found...";
    }
  }
  rankPlayers(){
    return JSON.parse(JSON.stringify(this.players)).sort(function(a,b){
      return b.totalScore - a.totalScore;
    });
  }
  //{"podiumMedalType":"gold","primaryMessage":"1<sup>st</sup> place","secondaryMessage":"Colossal result!","quizType":"quiz","quizQuestionAnswers":[4,4,4,4,4,4,4,4,2,4]}
  /*{"playerCount":1,"quizId":"c5429a87-08b5-4aeb-a90c-bd56ebf09540","quizType":"quiz","startTime":1544307691369,"hostId":"56936bb8-8653-4130-9cf2-be47a54b42a7","rank":1,"challengeId":null,"correctCount":8,"incorrectCount":2,"unansweredCount":0,"cid":"4","name":"s","isGhost":false,"isKicked":false,"answers":[{"choice":1,"isCorrect":false,"points":0,"receivedTime":1544307706498,"text":"Function","meta":{"lag":58},"pointsQuestion":true},{"choice":1,"isCorrect":true,"points":588,"receivedTime":1544312677300,"text":"Flappy will play a sound","meta":{"lag":27},"pointsQuestion":true},{"choice":1,"isCorrect":true,"points":657,"receivedTime":1544312748854,"text":"The speed of the game will be slow","meta":{"lag":52},"pointsQuestion":true},{"choice":3,"isCorrect":false,"points":0,"receivedTime":1544312799420,"text":"Flap","meta":{"lag":50},"pointsQuestion":true},{"choice":3,"isCorrect":true,"points":882,"receivedTime":1544312839720,"text":"Flapping","meta":{"lag":45},"pointsQuestion":true},{"choice":0,"isCorrect":true,"points":874,"receivedTime":1544312856154,"text":"A large amount","meta":{"lag":47},"pointsQuestion":true},{"choice":3,"isCorrect":true,"points":741,"receivedTime":1544312877157,"text":"A sad sound will play","meta":{"lag":53},"pointsQuestion":true},{"choice":3,"isCorrect":true,"points":907,"receivedTime":1544312907512,"text":"Crunch","meta":{"lag":62},"pointsQuestion":true},{"choice":0,"isCorrect":true,"points":960,"receivedTime":1544312925817,"text":"True","meta":{"lag":70},"pointsQuestion":true},{"choice":0,"isCorrect":true,"points":0,"receivedTime":1544312946175,"text":"Yes","meta":{"lag":69},"pointsQuestion":false}],"meta":{"device":{"userAgent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.110 Safari/537.36","screen":{"width":1280,"height":777}}},"totalScore":6709,"quizQuestionAnswers":[4,4,4,4,4,4,4,4,2,4]}*/
  handleScore(id,options,answerIsNULL){
    //edits the scores of ppl + saves their choice
    //{"choice":1,"isCorrect":false,"correctAnswers":["Event"],"points":0,"totalScore":0,"pointsData":{"totalPointsWithoutBonuses":0,"totalPointsWithBonuses":0,"questionPoints":0,"answerStreakPoints":{"streakLevel":0,"streakBonus":0,"totalStreakPoints":0,"previousStreakLevel":0,"previousStreakBonus":0}},"rank":2,"nemesis":{"cid":"5","name":"sooo","isGhost":false,"totalScore":935,"isKicked":false},"nemesisIsGhost":false,"receivedTime":1544307706498,"text":"Function","meta":{"lag":58},"pointsQuestion":true,"quizType":"quiz","quizQuestionAnswers":[4,4,4,4,4,4,4,4,2,4]}
    let index;
    for(let i in this.players){
      if(this.players[i].id == id){
        index = Number(i);
        break;
      }
    }
    this.players[index].answers = typeof(this.players[index].answers) == "undefined" ? [] : this.players[index].answers;
    this.players[index].answers.push(options);
    let ans = [];
    var tp = this.players[index]
    for(let i in this.quiz.questions){
      ans.push(this.quiz.questions[i].choices.length);
    }
    let sorted = this.rankPlayers();
    let place = 0;
    var nemesis = undefined;
    let hasPoints = this.quiz.questions[this.questionIndex].points;
    let correct = this.quiz.questions[this.questionIndex].choices[options.choice].correct;
    if(typeof(tp.info) == "undefined"){
      tp.info = {};
    }
    for(let j in sorted){
      if(sorted[j].id == tp.id){
        place = Number(j) + 1;
        if(place == 1){
          nemesis = null;
        }else{
          nemesis = sorted[Number(j) - 1];
        }
        break;
      }
    }
    if(answerIsNULL){
      tp.info = {
        choice: null,
        isCorrect: false,
        correctAnswers: (()=>{
          let objs = this.quiz.questions[this.questionIndex].choices.filter(o=>{
            return o.correct;
          });
          let c = [];
          for(let i in objs){
            c.push(objs[i].answer);
          }
          return c;
        })(),
        points: 0,
        meta: {
          lag: 0
        },
        totalScore: typeof(tp.info.totalScore) == "undefined" ? 0 : tp.info.totalScore,
        pointsData: {
          totalPointsWithoutBonuses: hasPoints ? typeof(tp.info.totalScore) == "undefined" ? 0 : tp.info.totalScore : 0,
          totalPointsWithBonuses: hasPoints ? typeof(tp.info.totalScore) == "undefined" ? 0 : tp.info.totalScore : 0,
          questionPoints: 0,
          answerStreakPoints: {
            streakLevel: this.quiz.questions[this.questionIndex].points ? 0 : typeof(tp.info.pointsData) == "undefined" ? 0 : typeof(tp.info.pointsData.answerStreakPoints) == "undefined" ? 0 : tp.info.pointsData.answerStreakPoints.streakLevel,
            streakBonus: 0,
            totalStreakPoints: typeof(tp.info.pointsData) == "undefined" ? 0 : typeof(tp.info.pointsData.answerStreakPoints == "undefined") ? 0 : tp.info.pointsData.answerStreakPoints.totalStreakPoints,
            previousStreakLevel: typeof(tp.info.pointsData) == "undefined" ? 0 : typeof(tp.info.pointsData.answerStreakPoints == "undefined") ? 0 : tp.info.pointsData.answerStreakPoints.streakLevel,
            previousStreakBonus: typeof(tp.info.pointsData) == "undefined" ? 0 : typeof(tp.info.pointsData.answerStreakPoints == "undefined") ? 0 : tp.info.pointsData.answerStreakPoints.streakBonus
          }
        },
        rank: place,
        nemesis: nemesis,
        nemesisIsGhost: false,
        receivedTime: Date.now(),
        text: "",
        pointsQuestion: this.quiz.questions[this.questionIndex].points,
        quizType: "quiz",
        quizQuestionAnswers: ans
      };
    }else{
      tp.info = {
        choice: options.choice,
        isCorrect: correct,
        correctAnswers: (()=>{
          let objs = this.quiz.questions[this.questionIndex].choices.filter(o=>{
            return o.correct;
          });
          let c = [];
          for(let i in objs){
            c.push(objs[i].answer);
          }
          return c;
        })(),
        points: correct ? hasPoints ? getPoints(Date.now(),options) + (typeof(tp.info.streakLevel) == "undefined" ? 0 : ((tp.info.streakLevel)*100)) : 0 : 0,
        meta: {
          lag: options.meta.lag
        },
        totalScore: correct ? (
          hasPoints ? (
            typeof(tp.info.totalScore) == "undefined" ? (
              getPoints(Date.now(),options) + (typeof(tp.info.streakLevel) == "undefined" ? 0 : tp.info.streakLevel*100)
            ):(
              tp.info.totalScore + getPoints(Date.now(),options) + (typeof(tp.info.streakLevel) == "undefined" ? 0 : (
                (tp.info.streakLevel * 100)
              ))
            )
          ) : (
            typeof(tp.info.totalScore) == "undefined" ? 0 : tp.info.totalScore
          )
        ) : (
          typeof(tp.info.totalScore) == "undefined" ? 0 : tp.info.totalScore
        ),
        pointsData: {
          totalPointsWithoutBonuses: hasPoints ? (
            correct ? (
              typeof(tp.info.pointsData.totalPointsWithoutBonuses) == "undefined" ? (
                getPoints(Date.now(),options)
              ):(
                tp.info.pointsData.totalPointsWithoutBonuses + getPoints(Date.now(),options)
              )
            ):(
              typeof(tp.info.pointsData.totalPointsWithoutBonuses) == "undefined" ? 0 : tp.info.pointsData.totalPointsWithoutBonuses
            )
          ):(
            typeof(tp.info.pointsData.totalPointsWithoutBonuses) == "undefined" ? 0 : tp.info.pointsData.totalPointsWithoutBonuses
          ),
          totalPointsWithBonuses: hasPoints ? (
            correct ? (
              typeof(tp.info.pointsData.totalPointsWithBonuses) == "undefined" ? (
                getPoints(Date.now(),options) + typeof(tp.info.streakLevel) == "undefined" ? (
                  0
                ):(
                  tp.info.streakLevel * 100
                )
              ):(
                tp.info.pointsData.totalPointsWithBonuses + getPoints(Date.now(),options) + typeof(tp.info.streakLevel) == "undefined" ? (
                  0
                ):(
                  tp.info.streakLevel * 100
                )
              )
            ):(
              typeof(tp.info.pointsData.totalPointsWithBonuses) == "undefined" ? 0 : tp.info.pointsData.totalPointsWithBonuses
            )
          ):(
            typeof(tp.info.pointsData.totalPointsWithBonuses) == "undefined" ? 0 : tp.info.pointsData.totalPointsWithBonuses
          ),
          questionPoints: hasPoints ? (
            correct ? (
              getPoints(Date.now(),options) + (typeof(tp.info.streakLevel) == "undefined" ? 0 : tp.info.streakLevel*100)
            ):(
              0
            )
          ):0,
          answerStreakPoints: {
            streakLevel: hasPoints ? (
              correct ? (
                typeof(tp.info.pointsData.answerStreakPoints.streakLevel) == "undefined" ? 1 : tp.info.pointsData.answerStreakPoints.streakLevel + 1
              ):(
                0
              )
            ):(
              typeof(tp.info.pointsData) == "undefined" ? (
                typeof(tp.info.pointsData.answerStreakPoints) == "undefined" ? (
                  typeof(tp.info.pointsData.answerStreakPoints.streakLevel) == "undefined" ? (
                    0
                  ):(
                    tp.info.pointsData.answerStreakPoints.streakLevel
                  )
                ):(
                  0
                )
              ):(
                0
              )
            ),
            streakBonus: hasPoints ? (
              correct ? (
                typeof(tp.info.pointsData.answerStreakPoints.streakBonus) == "undefined" ? 100 : tp.info.pointsData.answerStreakPoints.streakBonus + 100
              ):(
                0
              )
            ):(
              typeof(tp.info.pointsData) == "undefined" ? (
                typeof(tp.info.pointsData.answerStreakPoints) == "undefined" ? (
                  typeof(tp.info.pointsData.answerStreakPoints.streakBonus) == "undefined" ? (
                    0
                  ):(
                    tp.info.pointsData.answerStreakPoints.streakBonus
                  )
                ):(
                  0
                )
              ):(
                0
              )
            ),
            totalStreakPoints: typeof(tp.info.pointsData) == "undefined" ? 0 : typeof(tp.info.pointsData.answerStreakPoints == "undefined") ? 0 : tp.info.pointsData.answerStreakPoints.totalStreakPoints,
            previousStreakLevel: typeof(tp.info.pointsData) == "undefined" ? 0 : typeof(tp.info.pointsData.answerStreakPoints == "undefined") ? 0 : tp.info.pointsData.answerStreakPoints.streakLevel,
            previousStreakBonus: typeof(tp.info.pointsData) == "undefined" ? 0 : typeof(tp.info.pointsData.answerStreakPoints == "undefined") ? 0 : tp.info.pointsData.answerStreakPoints.streakBonus
          }
        },
        rank: place,
        nemesis: nemesis,
        nemesisIsGhost: false,
        receivedTime: Date.now(),
        text: "",
        pointsQuestion: this.quiz.questions[this.questionIndex].points,
        quizType: "quiz",
        quizQuestionAnswers: ans
      };
    }
    //nemesis and other score stuff will be updated after time.
    //streaks increase score by 100 (per streak).
    if(this.players[index].info.isCorrect){
      this.players[index].correctCount = typeof(this.players[index].correctCount) == "undefined" ? 1 : this.players[index].correctCount + 1;
    }else{
      this.players[index].incorrectCount = typeof(this.players[index].incorrectCount) == "undefined" ? 1 : this.players[index].incorrectCount + 1;
    }
  }
  getPoints(time,options){
    let quizTime = this.quiz.questions[this.questionIndex].time;
    let ansTime = time - this.questionTimestamp;
    return Math.round(1000 * ((quizTime - ansTime) / quizTime));
  }
  endQuestion(me){
    var me = me ? me : this;
    if(me.questionIndex == me.quiz.questions.length){
      me.endQuiz();
    }
    clearTimeout(me.timeout);
    clearTimeout(me.timeout2);
    let ans = [];
    for(let i in me.quiz.questions){
      ans.push(me.quiz.questions[i].choices.length);
    }
    me.msgID++;
    let r = {
      channel: consts.channels.subscription,
      clientId: me.clientID,
      id: String(me.msgID),
      data: {
        gameid: me.session,
        host: "play.kahoot.it",
        id: 4,
        type: "message",
        content: JSON.stringify({
          questionNumber: me.questionIndex,
          quizType: "quiz",
          quizQuestionAnswers: ans
        })
      }
    };
    me.send([r]);
    me.emit("questionEnd",me.rankPlayers());
    //send results..
    let rs = [];
    for(let i in me.players){
      //determine if we need to set base score?
      if(typeof(me.players[i].info) == "undefined"){
        handleScore(me.players[i].id,{},true);
      }else if(typeof(me.players[i].info.pointsData) == "undefined"){
        handleScore(me.players[i].id,{},true);
      }else if(typeof(me.players[i].info.pointsData.answerStreakPoints) == "undefined"){
        handleScore(me.players[i].id,{},true);
      }

      //get rank + nemesis
      let sorted = me.rankPlayers();
      let place = 0;
      var nemesis = undefined;
      for(let j in sorted){
        if(sorted[j].id == me.players[i].id){
          place = Number(j) + 1;
          if(place == 1){
            nemesis = null;
          }else{
            nemesis = sorted[Number(j) - 1];
          }
          break;
        }
      }
      me.players[i].info.rank = place;
      if(nemesis != null){
        me.players[i].info.nemesis = {
          cid: nemesis.id,
          name: nemesis.name,
          isGhost: false,
          totalScore: nemesis.info.totalScore,
          isKicked: false
        }
      }
      me.msgID++;
      rs.push({
        channel: consts.channels.subscription,
        clientId: me.clientID,
        id: String(me.msgID),
        data: {
          cid: me.players[i].id,
          gameid: me.session,
          host: "play.kahoot.it",
          id: 8,
          type: "message",
          content: JSON.stringify(me.players[i].info)
        }
      });
    }
    me.send(rs);
    //wait for user to call next question
  }
  nextQuestion(isFirst){
    this.questionIndex++;
    if(this.questionIndex >= this.quiz.questions.length){
      this.endQuiz();
      return;
    }
    this.msgID++;
    if(isFirst){this.questionIndex--;}
    this.emit("qstart",isFirst ? "first" : this.quiz.questions[this.quizIndex]);
    let answerMap = {};
    let ans = [];
    for(let i in this.players){
      if(typeof(this.players.info) == "undefined"){
        continue;
      }
      delete this.players.info.choice;
      delete this.players.info.isCorrect;
      this.players.info.points = 0;
    }
    for(let i in this.quiz.questions){
      ans.push(this.quiz.questions[i].choices.length);
    }
    for(let i in this.quiz.questions[this.questionIndex].choices){
      answerMap[String(i)] = Number(i);
    }
    let r = {
      channel: consts.channels.subscription,
      clientId: this.clientID,
      id: String(this.msgID),
      data: {
        id: 1,
        type: "message",
        host: "play.kahoot.it",
        gameid: this.session,
        content: JSON.stringify({
          questionIndex: this.questionIndex,
          answerMap: answerMap,
          canAccessStoryBlocks: false,
          gameBlockType: "quiz",
          quizType: "quiz",
          quizQuestionAnswers: ans,
          timeLeft: 4
        })
      }
    };
    this.send([r]);
  }
  endQuiz(){
    let ans = [];
    for(let i in this.quiz.questions){
      ans.push(this.quiz.questions[i].choices.length);
    }
    this.emit("quizEnd",this.rankPlayers());
    //send end message.
    this.msgID++;
    let r = {
      channel: consts.channels.subscription,
      clientId: this.clientID,
      id: String(this.msgID),
      data: {
        id: 4,
        type: "message",
        host: "play.kahoot.it",
        gameid: this.session,
        content: JSON.stringify({
          questionNumber: this.questionIndex,
          quizType: "quiz",
          quizQuestionAnswers: ans
        })
      }
    };
    this.send([r]);
    let rs = [];
    let rs2 = [];
    /*for(let i in this.players){
      //update scores and ranks.
      if(!this.quiz.questions[questionIndex].points){
        //remove the extra points given to them
        this.players[i].info.totalScore -= this.players[i].info.points;
        this.players[i].info.pointsData.questionPoints = 0;
        this.players[i].info.points = 0;
        continue;
      }
      //update scores based on the streaks
      if(this.players[i].info.isCorrect){
        this.players[i].info.pointsData.answerStreakPoints = {
          streakLevel: this.players[i].info.streakLevel + 1,
          streakBonus: (this.players[i].info.streakLevel)*100,
          totalStreakPoints: this.players[i].info.pointsData.answerStreakPoints.totalStreakPoints + (this.players[i].info.streakLevel)*100,
          previousStreakLevel: this.players[i].info.pointsData.streakLevel,
          previousStreakBonus: this.players[i].info.pointsData.streakBonus
        }
        this.players[i].info.streakLevel ++;
        this.players[i].info.streakBonus = (this.players[i].info.streakLevel - 1)*100;
        this.players[i].info.points += (this.players[i].info.streakLevel - 1)*100;
        this.players[i].info.totalScore += this.players[i].info.points;
        this.players[i].info.pointsData.totalPointsWithBonuses = this.players[i].info.totalScore;
        this.players[i].info.pointsData.totalPointsWithoutBonuses = this.players[i].info.totalScore - (this.players[i].info.streakLevel - 1)*100;
      }else{
        this.players[i].info.totalScore -= this.players[i].info.points;
        this.players[i].info.pointsData.questionPoints = 0;
        this.players[i].info.points = 0;
        this.players[i].info.pointsData.answerStreakPoints = {
          streakLevel: 0,
          streakBonus: 0,
          totalStreakPoints: this.players[i].info.pointsData.answerStreakPoints.totalStreakPoints,
          previousStreakLevel: this.players[i].info.pointsData.streakLevel,
          previousStreakBonus: this.players[i].info.pointsData.streakBonus
        }
        this.players[i].info.pointsData.streakLevel = 0;
        this.players[i].info.pointsData.streakBonus = 0;
        this.players[i].info.pointsData.totalPointsWithBonuses = this.players[i].info.totalScore;
        this.players[i].info.pointsData.totalPointsWithoutBonuses = this.players[i].info.totalScore;
      }
      //get rank + nemesis
      let sorted = rankPlayers();
      let place = 0;
      let nemesis = undefined;
      for(let j in sorted){
        if(sorted[j].id == this.players[i].id){
          place = Number(j) + 1;
          if(place == 1){
            nemsis = null;
          }else{
            nemesis = sorted[Number(j) - 1];
          }
          break;
        }
      }
      this.players[i].info.rank = place;
      this.players[i].info.nemesis = {
        cid: nemsis.id,
        name: nemesis.name,
        isGhost: false,
        totalScore: nemesis.info.totalScore,
        isKicked: false
      }
      this.msgID++;
      rs.push({
        channel: consts.channels.subscription,
        clientId: this.clientID,
        id: String(this.msgID),
        data: {
          cid: this.players[i].id,
          gameid: this.session,
          host: "play.kahoot.it",
          id: 8,
          type: "message",
          content: JSON.stringify(this.players[i].info)
        }
      });
    }*/
    //this.send(rs);
    for(let i in this.players){
      this.msgID++;
      let rank = 0;
      let pl = this.rankPlayers();
      for(let h in pl){
        if(pl[h].id == this.players[i].id){
          rank = Number(h) + 1;
        }
      }
      let r = {
        channel: consts.channels.subscription,
        clientId: this.clientID,
        id: this.msgID,
        data: {
          cid: this.players[i].id,
          gameid: this.session,
          host: "play.kahoot.it",
          id: 3,
          type: "message",
          content: JSON.stringify({
            playerCount: this.players.length,
            quizId: this.quizID,
            quizType: "quiz",
            startTime: this.timestamp,
            hostId: consts.user_id,
            rank: rank,
            challengeId: null,
            correctCount: this.players[i].correctCount,
            incorrectCount: this.players[i].incorrectCount,
            unansweredCount: 0, //fix
            cid: this.players[i].id,
            name: this.players[i].name,
            isGhost: false,
            isKicked: false,
            answers: this.players[i].answers,
            quizQuestionAnswers: ans,
            totalScore: this.players[i].info.totalScore
          })
        }
      };
      rs2.push(r);
    }
    this.send(rs2);
    for(let i in this.players){
      this.msgID++;
      let rank = 0;
      let pl = this.rankPlayers();
      for(let h in pl){
        if(pl[h].id == this.players[i].id){
          rank = Number(h) + 1;
        }
      }
      let r = {
        channel: consts.channels.subscription,
        clientId: this.clientID,
        id: this.msgID,
        data: {
          cid: this.players[i].id,
          gameid: this.session,
          host: "play.kahoot.it",
          id: 13,
          type: "message",
          content: JSON.stringify({
            podiumMedalType: rank <= 3 ? consts.podium[rank - 1] : consts.podium[3],
            primaryMessage: rank <= 5 ? this.success[rank - 1] : this.success[5],
            secondaryMessage: rank <= 5 ? this.success2[rank - 1]: this.success2[5],
            quizType: "quiz",
            quizQuestionAnswers: ans
          })
        }
      };
      rs.push(r);
    }
    this.send(rs);
  }
  setSnark(game,type,index,text){
    switch (type) {
      case "answer":
        if(typeof(index) == "object" && typeof(index.push) == "function"){
          if(index.length >= 1){
            game.snark = index;
            return index;
          }
          return game.snark;
        }
      break;
      case "rank":
        if(index < 0){
          game.success[0] = String(text);
        }else if(index > 4){
          game.success[4] = String(text);
        }else{
          game.success[index] = String(text);
        }
        return game.success2;
      break;
      case "finish":
        if(index < 0){
          game.success2[0] = String(text);
        }else if(index > 4){
          game.success2[4] = String(text);
        }else{
          game.success2[index] = String(text);
        }
        return game.success2;
      break;
      default:
        return "TypeError: " + String(type) + " is not a valid type";
    }
  }
  getPlayerById(id){
    return this.players.filter(o=>{
      return o.id == id;
    });
  }
}

module.exports = Handler;
