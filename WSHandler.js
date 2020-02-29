const path = require("path");
const WebSocket = require("ws");
const EventEmitter = require("events");
const request = require("request");
const consts = require(path.join(__dirname,"consts.js"));
const antibot = require("@theusaf/kahoot-antibot");

class Handler extends EventEmitter{
	constructor(id,options){
		super();
		this.quizID = id;
		this.options = options;
		if(!this.options){
			this.options = {};
		}
		this.msgID = 1;
		this.clientID = null;
		this.session = null;
		this.secret = null;
		this.antibot = {
			cachedData: {},
			cachedUsernames: [],
			confirmedPlayers: [],
			loggedPlayers: {}
		};
		this.quiz = {};
		this.configured;
		this.timestamp = 0;
		this.connected = false;
		this.players = [];
		this.questionIndex = 0;
		this.questionTimestamp = 0;
		this.shookHands = false;
		this.timesyncdata = {
			a: [],
			b: []
		};
		this.ts = {};
		this.on("start",()=>{
			setTimeout(()=>{
				this.nextQuestion(true);
			},4000);
		});
		this.on("questionStart",()=>{
			this.timeout = setTimeout(()=>{
				this.executeQuestion();
				this.questionTimestamp = Date.now();
			},4000);
		});
		options.antibot = options.antibot || {};
		this.antibot = new antibot({
			timeout: options.antibot.timeout,
			random: options.antibot.random,
			mid: this.msgID,
			clientId: this.clientID,
			pin: this.session
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
			multipart: [{"content-type": "application/json",body: JSON.stringify({
				namerator: this.options.namerator ? this.options.namerator : false,
				gameMode: "normal",
				twoFactorAuth: this.options.twoFactorAuth ? this.options.twoFactorAuth : false,
				smartPractice: false,
				themeId: false,
				orgId: "",
				participantId: false
			})}]
		},(e,r,b)=>{
			//console.log(b + "\n");
			this.session = Number(b);
			this.secret = r.headers["x-kahoot-session-token"];
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
				this.message(msg);
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
	message(msg){
		if(this.antibot.handle(msg,"recieve",this.ws) === true){
			return;
		}
		//console.log(`^${msg}`);
		let data = JSON.parse(msg)[0];
		// Startup
		if(data.channel == consts.channels.handshake){
			this.emit("handshake",data.clientId);
			this.clientID = data.clientId;
			let r = this.getPacket(data);
			r.advice = {timeout: 0};
			r.channel = consts.channels.connect;
			this.send(r);
			return;
		}
		if(data.channel == consts.channels.subscription && data.data && data.data.type == "start" && !this.configured){
			this.configured = true;
			this.emit("ready",this.session);
			return;
		}
		if(data.data && data.data.type == "joined"){
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
			};
			this.send(r);
			this.players.push({
				name: data.data.name,
				id: data.data.cid
			});
			this.emit("join",{name: data.data.name,id:data.data.cid});
			return;
		}
		if(data.data && data.data.type == "left"){
			this.emit("leave",{
				name: this.players.filter(o=>{
					return o.id == data.data.cid;
				}).name,
				id: data.data.cid
			});
			this.players = this.players.filter(o=>{
				return o.id != data.data.cid;
			});
			return;
		}
		if(data.channel == "/controller/" + this.session && data.data.content.search(/("choice":)/img) != -1){
			if(this.options.manuallyHandleAnswers){
				this.emit("answer",data.data);
				return;
			}
			this.handleScore(data.data.cid,JSON.parse(data.data.content));
			this.emit("answer",data.data.cid);
			return;
		}
		//ping + pong system.
		if(data.channel == consts.channels.connect && typeof(data.advice) == "undefined" && !data.subscription){
			let r = {
				channel: data.channel,
				clientId: this.clientID,
				ext: {
					ack: data.ext.ack,
					timesync: this.ts
				}
			};
			if(data.ext.timesync){
				r = this.getPacket(data);
			}
			r.ext.timesync.tc = Date.now();
			r.connectionType = "websocket";
			r.clientId = this.clientID;
			this.send(r);
			return;
		}
		// ready to start
		if(data.channel == consts.channels.connect && data.advice && data.advice.reconnect && data.advice.reconnect == "retry"){
			let r = {
				ext: {},
				channel: consts.channels.subscription,
				connectionType: "websocket",
				clientId: this.clientID,
				data: {
					type: "started",
					gameid: this.session,
					host: "play.kahoot.it"
				}
			};
			this.send(r);
			r.channel = "/meta/connect";
			delete r.data;
			r.ext = {
				ack: 1,
				timesync: this.ts
			};
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
			h+=this.timesyncdata.b[g];
		}
		this.ts = {
			l: parseInt((pz/d).toFixed()),
			o: parseInt((h/d).toFixed()),
			tc: Date.now()
		};
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
	executeQuestion(){
		let answerMap = {};
		let ans = [];
		for(let i in this.quiz.questions){
			ans.push(this.quiz.questions[i].choices.length);
		}
		for(let i in this.quiz.questions[this.questionIndex].choices){
			answerMap[String(i)] = Number(i);
		}
		let r = {
			channel: consts.channels.subscription,
			clientId: this.clientID,
			data: {
				gameid: this.session,
				host: "play.kahoot.it",
				id: 2,
				type: "message",
				content: JSON.stringify({
					questionIndex: this.questionIndex,
					gameBlockType: this.quiz.questions[this.questionIndex].type,
					quizQuestionAnswers: ans
				})
			}
		};
		this.send(r);
		let extraTimeout = (this.quiz.questions[this.questionIndex].video.endTime - this.quiz.questions[this.questionIndex].video.startTime) * 1000;
		this.timeout2 = setTimeout(()=>{
			this.endQuestion();
		}, this.quiz.questions[this.questionIndex].time + extraTimeout);
	}
	send(msg){
		if(typeof(msg.push) == "function"){
			for(let i in msg){
				msg[i].id = String(this.msgID);
				this.msgID++;
			}
		}else{
			this.antibot.handle(msg,"send",this.ws);
			msg.id = String(this.msgID);
		}
		//console.log(`\\${JSON.stringify(msg)}`);
		try{
			if(typeof(msg.push) == "function"){
				this.ws.send(JSON.stringify(msg),err=>{
					if(err){
						console.log("Websocket send error " + err);
						this.emit("error",err);
					}
				});
				return;
			}
			this.ws.send(JSON.stringify([msg]),err=>{
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
				"websocket","long-polling", "callback-polling"
			]
		};
		this.send(r);
	}
	close(){
		this.emit("close");
		this.ws.close();
	}
	startQuiz(){
		if(this.configured){
			let ans = [];
			for(let i in this.quiz.questions){
				ans.push(this.quiz.questions[i].choices.length);
			}
			let r = {
				channel: consts.channels.subscription,
				clientId: this.clientID,
				data: {
					host: "play.kahoot.it",
					id: 9,
					gameid: this.session,
					type: "message",
					content: JSON.stringify({
						quizName: this.quiz.title,
						quizType: this.quiz.type,
						quizQuestionAnswers: ans
					})
				}
			};
			this.emit("start",this.quiz);
			this.send(r);
		}else{
			console.log("Start the quiz using kahoot.start()");
			this.emit("error","Quiz was not started yet");
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
		return JSON.parse(JSON.stringify(this.players)).sort((a,b)=>{
			if ("info" in a){
				// Great.
			} else {
				a.info = {};
				a.info.totalScore = 0;
			}
			if ("info" in b){
				// Great.
			} else {
				b.info = {};
				b.info.totalScore = 0;
			}
			return b.info.totalScore - a.info.totalScore;
		});
	}
	handleScore(id,options,answerIsNULL){
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
		var tp = this.players[index];
		for(let i in this.quiz.questions){
			ans.push(this.quiz.questions[i].choices.length);
		}
		let sorted = this.rankPlayers();
		let place = 0;
		let nemesis = undefined;
		let hasPoints = this.quiz.questions[this.questionIndex].points;
		let correct = answerIsNULL ? false : this.quiz.questions[this.questionIndex].choices[options.choice].correct;
		if(typeof(tp.info) == "undefined"){
			tp.info = {};
		}
		for(let j in sorted){
			if(sorted[j].id == tp.id){
				place = Number(j) + 1;
				if(place == 1){
					nemesis = null;
				}else{
					nemesis = {
						isGhost: false,
						name: sorted[j].name,
						score: sorted[j].info && sorted[j].info.totalScore
					};
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
						totalStreakPoints: typeof(tp.info.pointsData) == "undefined" ? 0 : typeof(tp.info.pointsData.answerStreakPoints) == "undefined" ? 0 : tp.info.pointsData.answerStreakPoints.totalStreakPoints,
						previousStreakLevel: typeof(tp.info.pointsData) == "undefined" ? 0 : typeof(tp.info.pointsData.answerStreakPoints) == "undefined" ? 0 : tp.info.pointsData.answerStreakPoints.streakLevel,
						previousStreakBonus: typeof(tp.info.pointsData) == "undefined" ? 0 : typeof(tp.info.pointsData.answerStreakPoints) == "undefined" ? 0 : tp.info.pointsData.answerStreakPoints.streakBonus
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
			let streakPoints = 0;
			if(tp.info && tp.info.pointsData && tp.info.pointsData.answerStreakPoints && tp.info.pointsData.answerStreakPoints.streakLevel){
				if(tp.info.pointsData.answerStreakPoints.streakLevel >= 6){
					streakPoints = 500;
				}else{
					streakPoints = tp.info.pointsData.answerStreakPoints.streakLevel * 100;
				}
			}
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
				points: correct ? hasPoints ? this.getPoints(Date.now(),options) + streakPoints : 0 : 0,
				meta: {
					lag: options.meta.lag
				},
				totalScore: correct ? (
					hasPoints ? (
						typeof(tp.info.totalScore) == "undefined" ? (
							this.getPoints(Date.now(),options) + (typeof(tp.info.streakLevel) == "undefined" ? 0 : tp.info.streakLevel*100)
						):(
							tp.info.totalScore + this.getPoints(Date.now(),options) + (typeof(tp.info.streakLevel) == "undefined" ? 0 : (
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
							typeof(tp.info.pointsData) == "undefined" ? this.getPoints(Date.now(),options) :
								typeof(tp.info.pointsData.totalPointsWithoutBonuses) == "undefined" ? (
									this.getPoints(Date.now(),options)
								):(
									tp.info.pointsData.totalPointsWithoutBonuses + this.getPoints(Date.now(),options)
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
									this.getPoints(Date.now(),options) + typeof(tp.info.streakLevel) == "undefined" ? (
										0
									):(
										tp.info.streakLevel * 100
									)
								):(
									tp.info.pointsData.totalPointsWithBonuses + this.getPoints(Date.now(),options) + typeof(tp.info.streakLevel) == "undefined" ? (
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
							this.getPoints(Date.now(),options) + (typeof(tp.info.streakLevel) == "undefined" ? 0 : tp.info.streakLevel*100)
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
						totalStreakPoints: typeof(tp.info.pointsData) == "undefined" ? 0 : typeof(tp.info.pointsData.answerStreakPoints) == "undefined" ? 0 : tp.info.pointsData.answerStreakPoints.totalStreakPoints,
						previousStreakLevel: typeof(tp.info.pointsData) == "undefined" ? 0 : typeof(tp.info.pointsData.answerStreakPoints) == "undefined" ? 0 : tp.info.pointsData.answerStreakPoints.streakLevel,
						previousStreakBonus: typeof(tp.info.pointsData) == "undefined" ? 0 : typeof(tp.info.pointsData.answerStreakPoints) == "undefined" ? 0 : tp.info.pointsData.answerStreakPoints.streakBonus
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
	getPoints(time){
		let extraTimeout = 1000 * (this.quiz.questions[this.questionIndex].video.endTime - this.quiz.questions[this.questionIndex].video.startTime);
		let quizTime = this.quiz.questions[this.questionIndex].time + extraTimeout;
		let ansTime = time - this.questionTimestamp;
		return Math.round(1000 * ((quizTime - ansTime) / quizTime));
	}
	endQuestion(){
		if(this.questionIndex == this.quiz.questions.length){
			this.endQuiz();
		}
		clearTimeout(this.timeout);
		clearTimeout(this.timeout2);
		let ans = [];
		for(let i in this.quiz.questions){
			ans.push(this.quiz.questions[i].choices.length);
		}
		let r = {
			channel: consts.channels.subscription,
			clientId: this.clientID,
			data: {
				gameid: this.session,
				host: "play.kahoot.it",
				id: 4,
				type: "message",
				content: JSON.stringify({
					questionNumber: this.questionIndex
				})
			}
		};
		this.send(r);
		this.emit("questionEnd",this.rankPlayers());
		//send results
		let rs = [];
		for(let i in this.players){
			//determine if we need to set base score?
			if(typeof(this.players[i].info) == "undefined"){
				this.handleScore(this.players[i].id,{},true);
			}else if(typeof(this.players[i].info.pointsData) == "undefined"){
				this.handleScore(this.players[i].id,{},true);
			}else if(typeof(this.players[i].info.pointsData.answerStreakPoints) == "undefined"){
				this.handleScore(this.players[i].id,{},true);
			}
			if(typeof(this.players[i].info.choice) == "undefined"){
				this.handleScore(this.players[i].id,{},true);
			}
			//get rank and nemesis
			let sorted = this.rankPlayers();
			let place = 0;
			var nemesis = undefined;
			for(let j in sorted){
				if(sorted[j].id == this.players[i].id){
					place = Number(j) + 1;
					if(place == 1){
						nemesis = null;
					}else{
						nemesis = sorted[Number(j) - 1];
					}
					break;
				}
			}
			this.players[i].info.rank = place;
			if(nemesis != null){
				this.players[i].info.nemesis = {
					name: nemesis.name,
					isGhost: false,
					totalScore: nemesis.info.totalScore
				};
			}
			rs.push({
				channel: consts.channels.subscription,
				clientId: this.clientID,
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
		if(this.options.autoNextQuestion){
			setTimeout(()=>{
				this.nextQuestion(false);
			},5000);
		}
	}
	nextQuestion(isFirst){
		this.questionIndex++;
		if(isFirst){this.questionIndex--;}
		if(this.questionIndex >= this.quiz.questions.length){
			this.endQuiz();
			return;
		}
		this.emit("questionStart",this.quiz.questions[this.questionIndex]);
		let answerMap = {};
		let ans = [];
		for(let i in this.players){
			if(typeof(this.players[i].info) == "undefined"){
				continue;
			}
			delete this.players[i].info.choice;
			delete this.players[i].info.isCorrect;
			this.players[i].info.points = 0;
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
			data: {
				id: 1,
				type: "message",
				host: "play.kahoot.it",
				gameid: this.session,
				content: JSON.stringify({
					questionIndex: this.questionIndex,
					gameBlockType: this.quiz.questions[this.questionIndex].type,
					quizQuestionAnswers: ans,
					timeLeft: 4
				})
			}
		};
		this.send(r);
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
						totalScore: this.players[i].info.totalScore,
            isOnlyNonPointGameBlockKahoot: false
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
						podiumMedalType: rank <= 3 ? consts.podium[rank - 1] : consts.podium[3]
					})
				}
			};
			rs.push(r);
		}
		this.send(rs);
	}
	getPlayerById(id){
		return this.players.filter(o=>{
			return o.id == id;
		})[0];
	}
}

Handler.Quiz = require(path.join(__dirname,"quiz.js"));

module.exports = Handler;
