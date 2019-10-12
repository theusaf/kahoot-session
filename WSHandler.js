const WebSocket = require('ws');
const EventEmitter = require('events');
const request = require('request');
const consts = require('./consts.js');

class newHandler extends EventEmitter{
  constructor(id,options){
    super();
    let me = this;
    this.quizID = id;
    this.options = options;
    if(!this.options){
      this.options = {};
    }
    this.msgID = 0;
    this.clientID = null;
    this.session = null;
    this.secret = null;
    this.antibot = {
      cachedData: [],
      cachedUsernames: [],
      confirmedPlayers: []
    };
    this.quiz = {};
    this.configured;
    this.timestamp = 0;
    this.connected = false;
    this.players = [];
    this.questionIndex = 0;
    this.snark = ["Are you sure about that?"];
    this.success = ["1st","2nd","3rd","Top 5!","Oof"];
    this.success2 = ["Hooray!","Nice!","So close!","You tried...","Next time..."];
    this.questionTimestamp = 0;
    this.shookHands = false;
    this.timesyncdata = {
      a: [],
      b: []
    }
    this.on("start",()=>{
      setTimeout(()=>{
        this.nextQuestion(true);
      },4000);
    });
    this.on("questionStart",()=>{
      let me = this;
      this.timeout = setTimeout(()=>{
        me.executeQuestion(me);
        me.questionTimestamp = Date.now();
      },4000);
    });
  }
  start(){
    this.timestamp = Date.now();
    if(typeof(this.quizID) == "string"){
      request(consts.quiz_id + this.quizID + consts.quiz_extra + this.timestamp,(e,r,b)=>{
        if(e){
          console.log("Invalid URI / API Error.");
          this.emit("error",e);
          return;
        }try{
          this.quiz = JSON.parse(b);
        }catch(e){
          console.log("Failed to parse quiz data.");
          this.emit("error",e);
        }
      });
    }else{
      this.quiz = this.quizID;
      this.quizID = this.quizID.uuid;
    }
    request.post({
      url: `https://play.kahoot.it/reserve/session?${this.timestamp}`,
      multipart: [{'content-type': 'application/json',body: JSON.stringify({
        namerator: this.options.namerator ? this.options.namerator : false,
        gameMode: "normal",
        twoFactorAuth: this.options.twoFactorAuth ? this.options.twoFactorAuth : false
      })}]
    },(e,r,b)=>{
      this.session = Number(b);
      this.secret = r.headers['x-kahoot-session-token'];
      this.ws = new WebSocket(consts.wss_endpoint+"/"+this.session+"/"+this.secret,{
        origin: "https://play.kahoot.it",
        perMessageDeflate: true,
        maxPayload: 50000000,
        threshold: 0
      });
      this.ws.on("open",()=>{
        this.connected = true;
        this.open();
      });
      this.ws.on("message",msg=>{
        this.message(msg)
      });
      this.ws.on("close",()=>{
        this.close();
        this.connected = false;
      });
      this.ws.on("error",err=>{
        console.log("WebSocket Error " + err);
        this.emit("error",err);
      });
    });
  }
  antiBotDetect(player){
    const percent = this.options.antiBotPercent ? this.options.antiBotPercent : 0.6;
    function similarity(s1, s2) {
      if(!s2){
        return 0;
      }
      if(s1){
        if(!isNaN(s2) && !isNaN(s1) && s1.length == s2.length){
          return 1;
        }
      }
      if(this.options.namerator){
        let caps = s2.length - s2.replace(/[A-Z]/g, '').length;
          if(caps !== 2){ /*has less than 2 or more than 2 capitals*/
            return -1;
          }
          if (s2.substr(0,1).replace(/[A-Z]/g,'').length === 1){ /*first char is not a capital*/
            return -1;
          }
          if (s2.substr(1,2).replace(/[A-Z]/g,'').length != 2){ /*next few char have capitals*/
            return -1;
          }
          if(s2.substr(s2.length - 2,2).replace(/[A-Z]/g,'').length !== 2){ /*last few char have a capital*/
            return -1;
          }
          if(s2.replace(/[a-z]/ig,'').length > 0){ /*has non-letter chars*/
            return -1;
          }
        }
        if(!s1){
          return;
        }
        s1 = s1.toLowerCase();
        s2 = s2.toLowerCase();
        var longer = s1;
        var shorter = s2;
        if (s1.length < s2.length) {
          longer = s2;
          shorter = s1;
        }
        var longerLength = longer.length;
        if (longerLength == 0) {
          return 1.0;
        }
        return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
      }
    function editDistance(s1, s2) {
      s1 = s1.toLowerCase();
      s2 = s2.toLowerCase();
      var costs = new Array();
      for (var i = 0; i <= s1.length; i++) {
        var lastValue = i;
        for (var j = 0; j <= s2.length; j++) {
          if (i == 0){
            costs[j] = j;
          } else {
            if (j > 0) {
              var newValue = costs[j - 1];
              if (s1.charAt(i - 1) != s2.charAt(j - 1)){
                newValue = Math.min(Math.min(newValue, lastValue),costs[j]) + 1;
              }
              costs[j - 1] = lastValue;
              lastValue = newValue;
            }
          }
        }
        if (i > 0){
          costs[s2.length] = lastValue;
        }
      }
      return costs[s2.length];
    }
    function determineEvil(player){
      if(this.antibot.cachedUsernames.length == 0){
        if(similarity(null,player.name) == -1){
          this.kickPlayer(player.cid);
          return `Bot ${player.name} has been banished`
        }
        this.antibot.cachedUsernames.push({name: player.name, id: player.cid, time: 10, banned: false});
      }else{
        var removed = false;
        for(var i in this.antibot.cachedUsernames){
          if(this.antibot.confirmedPlayers.includes(this.antibot.cachedUsernames[i].name)){
            continue;
        }
        if(similarity(this.antibot.cachedUsernames[i].name,player.name) == -1){
          removed = true;
          this.kickPlayer(player.cid);
          return `Bot ${player.name} has been banished`;
        }
        if(similarity(this.antibot.cachedUsernames[i].name,player.name) >= percent){
          removed = true;
          this.kickPlayer(player.cid);
          if(!this.antibot.cachedUsernames[i].banned){
            this.antibot.cachedUsernames[i].banned = true;
            this.antibot.cachedUsernames[i].time = 10;
            this.kickPlayer(this.antibot.cachedUsernames[i].id);
          }
          return `Bots ${player.name} and ${this.antibot.cachedUsernames[i].name} have been banished`;
        }
      }
      if(!removed){
        this.antibot.cachedUsernames.push({name: player.name, id: player.cid, time: 10, banned: false});
      }
    }
  }
    function specialBotDetector(type,data){
    switch (type) {
      case 'joined':
        if(!this.antibot.cachedData[data.cid] && !isNaN(data.cid) && Object.keys(data).length <= 5){ //if the id has not been cached yet or is an invalid id, and they are not a bot :p
          this.antibot.cachedData[data.cid] = {
            time: 0,
            tries: 0
          };
        }else{
          this.kickPlayer(data.cid);
          return `Bot ${data.name} has been banished, clearly a bot from kahootsmash or something`;
        }
        break;
      }
    }
    var timer = setInterval(function(){
      for(let i in this.antibot.cachedUsernames){
        if(this.antibot.cachedUsernames[i].time <= 0 && !this.antibot.cachedUsernames[i].banned && !this.antibot.confirmedPlayers.includes(this.antibot.cachedUsernames[i].name)){
          this.antibot.confirmedPlayers.push(this.antibot.cachedUsernames[i].name);
          continue;
        }
        if(this.antibot.cachedUsernames[i].time <= -20){
          this.antibot.cachedUsernames.splice(i,1);
          continue;
        }
        this.antibot.cachedUsernames[i].time--;
      }
    },1000);
    return specialBotDetector("joined",player) != undefined || determineEvil(player) != undefined;
  }
  message(msg){
    //console.log(`^${msg}`);
    let data = JSON.parse(msg)[0];
    if(data.channel == consts.channels.handshake){
      this.emit("handshake",data.clientId);
      this.clientID = data.clientId;
      let r = this.getPacket(data);
      delete r.ext.ack;
      r.channel = consts.channels.subscribe,
      r.subscription = "/service/player"
      this.timesync = r.timesync;
      this.send(r);
      r.subscription = "/controller/" + this.session;
      this.send(r);
      delete r.subscription;
      delete r.advice;
      r.ext.ack = -1;
      r.advice = {
        timeout: 0
      };
      r.channel = consts.channels.connect;
      r.connectionType = "websocket";
      this.send(r);
      return;
    }
    if(data.channel == consts.channels.subscribe && data.subscription == consts.channels.subscription && data.successful && !this.configured){
      this.configured = true;
      let r = {
        channel: consts.channels.subscription,
        clientId: this.clientID,
        data: {
          gameid: this.session,
          host: "play.kahoot.it",
          type: "started"
        }
      }
      this.send(r);
      this.emit("ready",this.session);
      return;
    }
    if(data.channel == "/controller/" + this.session && data.data.type == "joined"){
      if(this.options.useAntiBot){
        this.players.push({
          name: data.data.name,
          id: data.data.cid
        });
        if(this.antiBotDetect(this.data)){
          return;
        }
      }
      let r = {
        channel: consts.channels.subscription,
        clientId: this.clientID,
        data: {
          cid: data.data.cid,
          content: JSON.stringify({
            playerName: data.data.name,
            quizType: this.quiz.type
          }),
          gameid: this.session,
          host: "play.kahoot.it",
          id: 14,
          type: "message"
        }
      }
      this.send(r);
      if(!this.options.useAntiBot){
        this.players.push({
          name: data.data.name,
          id: data.data.cid
        });
      }
      this.emit("join",{name: data.data.name,id:data.data.cid});
      return;
    }
    if(data.channel == "/controller/" + this.session && data.data.type == "left"){
      this.emit("leave",{
        name: this.players.filter(o=>{
          return o.id == data.data.cid;
        }).name,
        id: data.data.cid
      });
      this.players = this.players.filter(o=>{
        return o.id != data.data.cid
      });
      return;
    }
    if(data.channel == "/controller/" + this.session && data.data.content.search(/(\"choice\":)/img) != -1){
      if(this.options.manuallyHandleAnswers){
        this.emit("answer",data.data);
        return;
      }
      this.handleScore(data.data.cid,JSON.parse(data.data.content));
      //send response...
      let ans = [];
      this.msgID++;
      for(let i in this.quiz.questions){
        ans.push(this.quiz.questions[i].choices.length);
      }
      let r = {
        channel: consts.channels.subscription,
        clientId: this.clientID,
        data: {
          cid: String(data.data.cid),
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
      this.send(r);
      this.emit("answer",data.data.cid);
      return;
    }
    if(data.channel == consts.channels.connect && typeof(data.advice) == "undefined" && !data.subscription){
      //ping + pong system.
      let r = {
        channel: data.channel,
        clientId: this.clientID,
        ext: {
          ack: data.ext.ack,
          timesync: this.timesync
        }
      };
      if(data.ext.timesync){
        let r = this.getPacket(data)[0];
      }
      r.connectionType = "websocket"
      r.clientId = this.clientID;
      this.send(r);
      return;
    }
    if(data.channel == consts.channels.connect && data.advice && data.advice.reconnect && data.advice.reconnect == "retry"){
      let r = {
        ext: {
          ack: data.ext.ack,
          timesync: this.timesync
        },
        channel: consts.channels.connect,
        connectionType: "websocket",
        clientId: this.clientID
      };
      if(data.subscription){
        r.subscription = data.subscription;
      }
      this.send(r);
    }
  }
  getPacket(p){
    let l = (Date.now() - p.ext.timesync.tc - p.ext.timesync.p) / 2;
    let o = p.ext.timesync.ts - p.ext.timesync.tc - l;
    this.timesyncdata.a.push(l);
    this.timesyncdata.b.push(o);
    if(this.timesyncdata.a.length > 10){
      this.timesyncdata.a.shift();
      this.timesyncdata.b.shift();
    }
    var pz,g,h,d;
    for(d = this.timesyncdata.a.length,pz=0,h=0,g=0;g<d;++g){
      pz+=this.timesyncdata.a[g],
      h+=this.timesyncdata.b[g]
    }
    return {
      channel: p.channel,
      clientId: this.clientID,
      ext: {
        ack: p.ext.ack,
        timesync: {
          l: parseInt((pz/d).toFixed()),
          o: parseInt((pz/d).toFixed()),
          tc: Date.now()
        }
      },
      id: String(this.msgID)
    };
  }
  executeQuestion(me){
    var me = me ? me : this;
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
      data: {
        gameid: me.session,
        host: "play.kahoot.it",
        id: 2,
        type: "message",
        content: JSON.stringify({
          questionIndex: me.questionIndex,
          answerMap: answerMap,
          canAccessStoryBlocks: false,
          gameBlockType: me.quiz.type,
          quizType: me.quiz.type,
          quizQuestionAnswers: ans
        })
      }
    };
    me.send(r);
    let extraTimeout = (me.quiz.questions[me.questionIndex].video.endTime - me.quiz.questions[me.questionIndex].video.startTime) * 1000;
    me.timeout2 = setTimeout(()=>{
      me.endQuestion(me);
    }, me.quiz.questions[me.questionIndex].time + extraTimeout);
  }
  send(msg){
    //console.log(`\\${JSON.stringify(msg)}`);
    if(typeof(msg.push) == "function"){
      for(let i in msg){
        msg[i].id = String(this.msgID);
        this.msgID++;
      }
    }else{
      msg.id = String(this.msgID);
    }
    try{
      if(typeof(msg.push) == "function"){
        this.ws.send(JSON.stringify(msg),function ack(err){
          if(err){
            console.log("Websocket send error " + err);
            this.emit("error",err);
          }
        });
        return;
      }
      this.ws.send(JSON.stringify([msg]),function ack(err){
        if(err){
          console.log("Websocket send error " + err);
          this.emit("error",err);
        }
      });
    }catch(e){
      console.log("Websocket connection error " + e);
      this.emit("error",e);
    }
    this.msgID++;
  }
  end(){
    this.emit("close");
  }
  open(){
    this.emit("open");
    let r = {
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
      minumum_version: "1.0",
      version: "1.0",
      supportedConnectionTypes: [
        "websocket","long-polling"
      ]
    };
    this.send(r);
  }
  close(){
    this.emit("close");
    this.ws.close();
  }
  startQuiz(me){
    if(me){
      me = me;
    }else{
      me = this;
    }
    if(me.configured){
      let ans = [];
      for(let i in me.quiz.questions){
        ans.push(me.quiz.questions[i].choices.length);
      }
      let r = {
        channel: consts.channels.subscription,
        clientId: me.clientID,
        data: {
          host: "play.kahoot.it",
          id: 9,
          gameid: this.session,
          type: "message",
          content: JSON.stringify({
            quizName: me.quiz.title,
            quizType: me.quiz.type,
            quizQuestionAnswers: ans
          })
        }
      };
      me.emit("start",this.quiz);
      me.send(r);
    }else{
      console.log("Start the quiz using kahoot.start()");
      me.emit("error","Quiz was not started yet");
    }
  }
  kickPlayer(id){
    if(this.getPlayerById(id)){
      let r = {
        channel: consts.channels.subscription,
        clientId: this.clientID,
        data: {
          cid: String(id),
          content: JSON.stringify({
            kickCode: 1,
            quizType: this.quiz.type
          }),
          gameid: this.session,
          host: "play.kahoot.it",
          id: 10,
          type: "message"
        }
      };
      this.send(r);
    }
  }
  rankPlayers(){
    //credit to leemetme for the bug fix
    return JSON.parse(JSON.stringify(this.players)).sort(function(a,b){
      if ("info" in a){
        // Great.
      } else {
        a.info = {}
        a.info.totalScore = 0
      }
      if ("info" in b){
        // Great.
      } else {
        b.info = {}
        b.info.totalScore = 0
      }
      return b.info.totalScore - a.info.totalScore;
    });
  }
  handleScore(id,options,answerIsNULL,dis){
    let me = dis ? dis : this;
    let index;
    for(let i in me.players){
      if(this.players[i].id == id){
        index = Number(i);
        break;
      }
    }
    me.players[index].answers = typeof(me.players[index].answers) == "undefined" ? [] : me.players[index].answers;
    me.players[index].answers.push(options);
    let ans = [];
    var tp = me.players[index]
    for(let i in me.quiz.questions){
      ans.push(me.quiz.questions[i].choices.length);
    }
    let sorted = me.rankPlayers();
    let place = 0;
    var nemesis = undefined;
    let hasPoints = me.quiz.questions[me.questionIndex].points;
    let correct = answerIsNULL ? false : me.quiz.questions[me.questionIndex].choices[options.choice].correct;
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
          let objs = me.quiz.questions[me.questionIndex].choices.filter(o=>{
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
            streakLevel: me.quiz.questions[me.questionIndex].points ? 0 : typeof(tp.info.pointsData) == "undefined" ? 0 : typeof(tp.info.pointsData.answerStreakPoints) == "undefined" ? 0 : tp.info.pointsData.answerStreakPoints.streakLevel,
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
        pointsQuestion: me.quiz.questions[me.questionIndex].points,
        quizType: "quiz",
        quizQuestionAnswers: ans
      };
    }else{
      tp.info = {
        choice: options.choice,
        isCorrect: correct,
        correctAnswers: (()=>{
          let objs = me.quiz.questions[me.questionIndex].choices.filter(o=>{
            return o.correct;
          });
          let c = [];
          for(let i in objs){
            c.push(objs[i].answer);
          }
          return c;
        })(),
        points: correct ? hasPoints ? me.getPoints(Date.now(),options) + (typeof(tp.info.streakLevel) == "undefined" ? 0 : ((tp.info.streakLevel)*100)) : 0 : 0,
        meta: {
          lag: options.meta.lag
        },
        totalScore: correct ? (
          hasPoints ? (
            typeof(tp.info.totalScore) == "undefined" ? (
              me.getPoints(Date.now(),options) + (typeof(tp.info.streakLevel) == "undefined" ? 0 : tp.info.streakLevel*100)
            ):(
              tp.info.totalScore + me.getPoints(Date.now(),options) + (typeof(tp.info.streakLevel) == "undefined" ? 0 : (
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
              typeof(tp.info.pointsData) == "undefined" ? me.getPoints(Date.now(),options) :
              typeof(tp.info.pointsData.totalPointsWithoutBonuses) == "undefined" ? (
                me.getPoints(Date.now(),options)
              ):(
                tp.info.pointsData.totalPointsWithoutBonuses + me.getPoints(Date.now(),options)
              )
            ):(
              typeof(tp.info.pointsData) == "undefined" ? 0 : typeof(tp.info.pointsData.totalPointsWithoutBonuses) == "undefined" ? 0 : tp.info.pointsData.totalPointsWithoutBonuses
            )
          ):(
            typeof(tp.info.pointsData.totalPointsWithoutBonuses) == "undefined" ? 0 : tp.info.pointsData.totalPointsWithoutBonuses
          ),
          totalPointsWithBonuses: hasPoints ? (
            correct ? (
              typeof(tp.info.pointsData) == "undefined" ? 0 :
              typeof(tp.info.pointsData.totalPointsWithBonuses) == "undefined" ? (
                me.getPoints(Date.now(),options) + typeof(tp.info.streakLevel) == "undefined" ? (
                  0
                ):(
                  tp.info.streakLevel * 100
                )
              ):(
                tp.info.pointsData.totalPointsWithBonuses + me.getPoints(Date.now(),options) + typeof(tp.info.streakLevel) == "undefined" ? (
                  0
                ):(
                  tp.info.streakLevel * 100
                )
              )
            ):(
              typeof(tp.info.pointsData) == "undefined" ? 0 :
              typeof(tp.info.pointsData.totalPointsWithBonuses) == "undefined" ? 0 : tp.info.pointsData.totalPointsWithBonuses
            )
          ):(
            typeof(tp.info.pointsData.totalPointsWithBonuses) == "undefined" ? 0 : tp.info.pointsData.totalPointsWithBonuses
          ),
          questionPoints: hasPoints ? (
            correct ? (
              me.getPoints(Date.now(),options) + (typeof(tp.info.streakLevel) == "undefined" ? 0 : tp.info.streakLevel*100)
            ):(
              0
            )
          ):0,
          answerStreakPoints: {
            streakLevel: hasPoints ? (
              correct ? (
                typeof(tp.info.pointsData) == "undefined" ? (
                  1
                ):(
                  typeof(tp.info.pointsData.answerStreakPoints) == "undefined" ? (
                    1
                  ):(
                    typeof(tp.info.pointsData.answerStreakPoints.streakLevel) == "undefined" ? 1 : tp.info.pointsData.answerStreakPoints.streakLevel + 1
                  )
                )
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
                typeof(tp.info.pointsData) == "undefined" ? (
                  0
                ):(
                  typeof(tp.info.pointsData.answerStreakPoints) == "undefined" ? (
                    0
                  ):(
                    typeof(tp.info.pointsData.answerStreakPoints.streakBonus) == "undefined" ? 100 : tp.info.pointsData.answerStreakPoints.streakBonus + 100
                  )
                )
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
        pointsQuestion: me.quiz.questions[me.questionIndex].points,
        quizType: "quiz",
        quizQuestionAnswers: ans
      };
    }
    //nemesis and other score stuff will be updated after time.
    //streaks increase score by 100 (per streak).
    if(me.players[index].info.isCorrect){
      me.players[index].correctCount = typeof(me.players[index].correctCount) == "undefined" ? 1 : me.players[index].correctCount + 1;
    }else{
      me.players[index].incorrectCount = typeof(me.players[index].incorrectCount) == "undefined" ? 1 : me.players[index].incorrectCount + 1;
    }
  }
  getPoints(time){
    let extraTimeout = 1000 * (this.quiz.questions[this.questionIndex].video.endTime - this.quiz.questions[this.questionIndex].video.startTime);
    let quizTime = this.quiz.questions[this.questionIndex].time + extraTimeout;
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
    let r = {
      channel: consts.channels.subscription,
      clientId: me.clientID,
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
    me.send(r);
    me.emit("questionEnd",me.rankPlayers());
    //send results
    let rs = [];
    for(let i in me.players){
      //determine if we need to set base score?
      if(typeof(me.players[i].info) == "undefined"){
        me.handleScore(me.players[i].id,{},true,me);
      }else if(typeof(me.players[i].info.pointsData) == "undefined"){
        me.handleScore(me.players[i].id,{},true,me);
      }else if(typeof(me.players[i].info.pointsData.answerStreakPoints) == "undefined"){
        me.handleScore(me.players[i].id,{},true,me);
      }
      if(typeof(me.players[i].info.choice) == "undefined"){
        me.handleScore(me.players[i].id,{},true,me);
      }
      //get rank and nemesis
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
      rs.push({
        channel: consts.channels.subscription,
        clientId: me.clientID,
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
    if(me.options.autoNextQuestion){
      setTimeout(()=>{
        me.nextQuestion(false,me);
      },5000);
    }
  }
  nextQuestion(isFirst,me){
    var me = me ? me : this;
    me.questionIndex++;
    if(me.questionIndex >= me.quiz.questions.length){
      me.endQuiz();
      return;
    }
    if(isFirst){me.questionIndex--;}
    me.emit("questionStart",me.quiz.questions[me.questionIndex]);
    let answerMap = {};
    let ans = [];
    for(let i in me.players){
      if(typeof(me.players[i].info) == "undefined"){
        continue;
      }
      delete me.players[i].info.choice;
      delete me.players[i].info.isCorrect;
      me.players[i].info.points = 0;
    }
    for(let i in me.quiz.questions){
      ans.push(me.quiz.questions[i].choices.length);
    }
    for(let i in me.quiz.questions[me.questionIndex].choices){
      answerMap[String(i)] = Number(i);
    }
    let r = {
      channel: consts.channels.subscription,
      clientId: me.clientID,
      data: {
        id: 1,
        type: "message",
        host: "play.kahoot.it",
        gameid: me.session,
        content: JSON.stringify({
          questionIndex: me.questionIndex,
          answerMap: answerMap,
          canAccessStoryBlocks: false,
          gameBlockType: me.quiz.type,
          quizType: me.quiz.type,
          quizQuestionAnswers: ans,
          timeLeft: 4
        })
      }
    };
    me.send(r);
  }
  endQuiz(){
    let ans = [];
    for(let i in this.quiz.questions){
      ans.push(this.quiz.questions[i].choices.length);
    }
    this.emit("quizEnd",this.rankPlayers());
    //send end message.
    let rs2 = [];
    for(let i in this.players){
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
    let rs = [];
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
        throw "TypeError: " + String(type) + " is not a valid type";
    }
  }
  getPlayerById(id){
    return this.players.filter(o=>{
      return o.id == id;
    })[0];
  }
}

class Quiz{
  constructor(name,options){
    if(typeof(options) == "undefined"){
      options = {};
    }
    this.uuid = "no-uuid";
    this.creator = "kahoot-session",
    this.metadata = {
      duplicationProtection: false,
      lastEdit: {
        editTimestamp: 0,
        editorUserId: "kahoot-session",
        editorUsername: "kahoot-session"
      }
    };
    this.folderId = "null";
    this.cover = "null";
    this.resources = "null";
    this.modified = 0;
    this.visibility = 0;
    this.title = name;
    this.slug = name.replace(/[\n|\ ]+/mg,"-");
    this.creator_primary_usage = "server";
    this.coverMetadata = {
      id: "null"
    };
    this.questions = [];
    this.language = options.language ? options.language : "English";
    this.audience = options.audience ? options.audience : "Social";
    this.description = options.description ? options.description : "Hello World";
    this.type = options.type ? options.type : "quiz";
    this.quizType = this.type;
  }
  addQuestion(q){
    let question = new Question(q,this);
    this.questions.push(question);
    return question;
  }
};

class Question{
  constructor(question,quiz){
    this.__proto__.quiz = quiz;
    this.question = question ? question : "No Question Provided.";
    this.choices = [];
    this.numberOfAnswers = 0;
    this.points = true;
    this.questionFormat = 0;
    this.resources = null;
    this.time = 20000;
    this.type = "quiz";
    this.image = null;
    this.imageMetadata = {};
    this.video = {
      id: "",
      endTime: 0,
      fullUrl: "",
      service: "youtube",
      startTime: 0
    }
  }
  getQuiz(){
    return this.__proto__.quiz;
  }
  addChoice(choice,correct){
    if(typeof(choice) == "string" && typeof(correct) == "boolean"){
      if(this.choices.length == 4){
        throw "ERROR: CHOICE LENGTH FULL";
      }
      this.choices.push({answer: choice,correct:correct});
      this.numberOfAnswers = this.choices.length;
    }else{
      throw "ERROR: MISSING/INCORRECT ARGUMENTS";
    }
    return this;
  }
  setTime(time){
    this.time = Number(time);
    return this;
  }
  setPoints(bool){
    this.points = Boolean(bool);
    return this;
  }
}

newHandler.Quiz = Quiz;

module.exports = newHandler;
