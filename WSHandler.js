const WebSocket = require('ws');
const EventEmitter = require('events');
const request = require('request');
const consts = require('./consts.js');
const md5 = require('md5');

class Handler extends EventEmitter {
  constructor(id,options){
    super();
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
      },5000);
    });
    this.on("questionStart",()=>{
      this.timeout = setTimeout(endQuestion,this.quiz.questions[quizIndex].time);
    });
  }
  start(){
    //GET quiz.
    this.timestamp = Date.now();
    let form = {
      gameMode: "normal",
      namerator: false,
      twoFactorAuth: false
    };
    request.post({
      url: `https://play.kahoot.it/reserve/session/?${Date.now()}`,
      form: form
    },(e,r,b) => {
      this.session = Number(b);
      this.secret = r.headers['x-kahoot-session-token'];
      console.log(this.session + "," + this.secret)
      //now create the web socket.
      this.ws = new WebSocket(consts.wss_endpoint+"/"+this.session+"/"+this.secret,{
        origin: "https://play.kahoot.it"
      });
      //ws stuffs
      this.ws.on("open",()=>{
        this.connected = true;
        this.open();
      });
      this.ws.on("message",msg => {
        console.log("message recieved: " + msg);
        this.message(msg);
      });
      this.ws.on("close",()=>{
        this.close();
        this.connected = false;
      });
      //end of ws stuff
    });
  }
  getPacket(packet){
    let l = (Date.now() - packet.ext.timesync.tc - packet.ext.timesync.p) / 2;
    let o = packet.ext.timesync.ts - packet.ext.timesync.tc - l;
    this.msgID++;
    return [{
      channel: packet.channel,
      clientId: this.clientID,
      ext: {
        ack: packet.ext.ack,
        timesync: {
          l: l,
          o: o,
          tc: Date.now()
        }
      },
      id: String(this.msgID)
    }];
  }
  message(msg){
    let data = JSON.parse(msg);
    if(data.channel == consts.channels.handshake && data.clientId){
      this.clientID = data.clientId;
      let r = this.getPacket(data)[0];
      r.ext.ack = undefined,
      r.channel = consts.channel.subscribe,
      r.clientId = this.clientID,
      r.subscription = "/service/player";
      this.send([r]);
      if(!this.recievedFirstHandshake){ //send subscription stuff
        let r = this.getPacket(data)[0];
        delete r.ext.ack;
        r.channel = consts.channels.subscribe;
        r.clientId = this.clientID;
        r.subscription = "/controller/" + this.session;
        this.send(r);
        r = this.getPacket(data)[0];
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
    if(data.channel == consts.channels.subscribe){
      if(data.subscription == consts.channels.subscription && data.successful == true && !this.configured){
        this.configured = true;
        let r = this.getPacket(data);
        r.channel = consts.channels.subscription;
        r.clientId = this.clientID;
        delete r.ext;
        r.data = {
          gameid: this.session,
          host: "play.kahoot.it",
          type: "started"
        };
        this.send([r]);
        this.emit("ready");
      }
      return;
    }
    if(data.channel == "/controller/" + this.session && data.data.type == "joined"){ //a player joind
      this.msgID++;
      let r = {
        channel: consts.channels.subscription,
        clientId: this.clientID,
        id: String(this.msgID),
        data: {
          cid: data.data.cid,
          content: JSON.stringify({
            playerName: data.data.name,
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
        name: data.data.name,
        id: data.data.cid,
        score: 0
      });
      this.emit("join",{name: data.data.name,id:data.data.cid});
      return;
    }
    if(data.channel == "/controller/" + this.session && data.data.type == "left"){
      this.emit("leave",{
        name: this.players.filter(o=>{
          return o.id == data.data.cid;
        })[0].name,
        id: data.data.cid
      });
      this.players = this.players.filter(o=>{
        return o.id != data.data.cid
      });
      return;
    }
    if(data.channel == "/controller/" + this.session && JSON.parse(data.data.content).choice){
      handleScore(data.data.cid,JSON.parse(data.data.content));
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
          cid: String(data.data.cid),
          host: "play.kahoot.it",
          id: 7,
          type: "message",
          content: JSON.stringify({
            primaryMessage: this.snark[Math.floor(Math.random() * this.snark.length)],
            quizType: "quiz",
            quizQuestionAnswers: ans
          })
        }
      };
      this.send([r]);
      this.emit("answer",data.data.cid);
      return;
    }
  }
  send(msg){
    if(this.connected){
      try{
        this.ws.send(JSON.stringify(msg));
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
    this.msgID ++;
    this.send(r);
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
      this.emit("start");
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
  handleScore(id,options){
    //edits the scores of ppl + saves their choice
    //{"choice":1,"isCorrect":false,"correctAnswers":["Event"],"points":0,"totalScore":0,"pointsData":{"totalPointsWithoutBonuses":0,"totalPointsWithBonuses":0,"questionPoints":0,"answerStreakPoints":{"streakLevel":0,"streakBonus":0,"totalStreakPoints":0,"previousStreakLevel":0,"previousStreakBonus":0}},"rank":2,"nemesis":{"cid":"5","name":"sooo","isGhost":false,"totalScore":935,"isKicked":false},"nemesisIsGhost":false,"receivedTime":1544307706498,"text":"Function","meta":{"lag":58},"pointsQuestion":true,"quizType":"quiz","quizQuestionAnswers":[4,4,4,4,4,4,4,4,2,4]}
    this.players[index].answers = typeof(this.players[index].answers) == "undefined" ? [] : this.players[index].answers;
    this.players[index].answers.push(options);
    let ans = [];
    for(let i in this.quiz.questions){
      ans.push(this.quiz.questions[i].choices.length);
    }
    let index;
    for(let i in this.players){
      if(this.players[i].id == id){
        index = Number(i);
        return;
      }
    }
    this.players[index].info.choice= options.choice;
    this.players[index].info.isCorrect= this.quiz.questions[this.questionIndex].choices[options.choice].correct;
    this.players[index].info.correctAnswers= (()=>{
      let objs = this.quiz.questions[this.questionIndex].choices.filter(o=>{
        return o.correct;
      });
      let c = [];
      for(let i in objs){
        c.push(objs[i].answer);
      }
      return c;
    })();
    this.players[index].info.points= this.getPoints(Date.now(),options);
    this.players[index].info.meta= {
      lag: options.meta.lag
    };
    this.players[index].info.pointsQuestion= this.quiz.questions[this.questionIndex].points;
    this.players[index].info.quizType= "quiz";
    this.players[index].info.quizQuestionAnswers= ans;
    this.players[index].info.text = this.quiz.questions[this.questionIndex].choices[options.choice].answer;
    this.players[index].info.recievedTime = Date.now();
    this.players[index].info.nemesisIsGhost = false;
    this.players[index].info.totalScore = typeof(this.players[index].info.totalScore) == "undefined" ? this.players[index].info.points : this.players[index].info.totalScore + this.players[index].info.points;
    this.players[index].info.pointsData = typeof(this.players[index].info.pointsData) == "undefined" ? { //base info...
      streakLevel: 0,
      streakBonus: 0,
      totalPointsWithoutBonuses: this.players[index].info.totalScore,
      totalPointsWithBonuses: this.players[index].info.totalScore,
      questionPoints: this.players[index].info.totalScore,
      answerStreakPoints: {
        streakLevel: 0,
        streakBonus: 0,
        totalStreakPoints: 0,
        previousStreakLevel: 0,
        previousStreakBonus: 0
      }
    } : this.players[index].info.pointsData;
    //nemesis and other score stuff will be updated after time.
    //streaks increase score by 100 (per streak).
    if(this.players[index].info.isCorrect){
      this.players[index].correctCount = typeof(this.players[index].correctCount) == "undefined" ? 1 : this.players[index].correctCount + 1;
    }else{
      this.players[index].incorrectCount = typeof(this.players[index].incorrectCount) == "undefined" ? 1 : this.players[index].incorrectCount + 1;
    }
  }
  getPoints(time,options){
    let quizTime = this.quiz.questions[questionIndex].time;
    let ansTime = time - this.questionTimestamp;
    return Math.round(1000 * ((quizTime - ansTime) / quizTime));
  }
  endQuestion(){
    if(this.questionIndex == this.quiz.questions.length){
      this.endQuiz();
    }
    clearTimeout(this.timeout);
    let ans = [];
    for(let i in this.quiz.questions){
      ans.push(this.quiz.questions[i].choices.length);
    }
    this.msgID++;
    let r = {
      channel: consts.channels.subscription,
      clientId: this.clientID,
      id: String(this.msgID),
      data: {
        gameid: this.session,
        host: "play.kahoot.it",
        id: 4,
        type: "message",
        content: JSON.stringify({
          questionNumber: this.questionIndex,
          quizType: "quiz",
          quizQuestionAnswers: ans
        })
      }
    };
    this.send([r]);
    this.emit("questionEnd");
    //send results..
    let rs = [];
    for(let i in this.players){
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
    }
    this.send(rs);
    //wait for user to call next question
  }
  nextQuestion(){
    if(this.questionIndex == this.quiz.questions.length){
      this.endQuiz();
    }
    this.emit("start");
    this.msgID++;
    this.questionIndex++;
    let answerMap = {};
    let ans = [];
    for(let i in this.quiz.questions){
      ans.push(this.quiz.questions[i].choices.length);
    }
    for(let i in this.quiz.questions[questionIndex].choices){
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
          quizQuestionAnswers: ans
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
    this.emit("quizEnd");
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
      let pl = rankPlayers();
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
      let pl = rankPlayers();
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
  setSnark(type){

  }
}

module.exports = Handler;
