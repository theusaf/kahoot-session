const path = require("path");
const WebSocket = require("ws");
const EventEmitter = require("events");
const request = require("request");
const consts = require(path.join(__dirname,"consts.js"));
const antibot = require("@theusaf/kahoot-antibot");

function shuffle(array) {
	var currentIndex = array.length, temporaryValue, randomIndex;
	// While there remain elements to shuffle...
	while (0 !== currentIndex) {
		// Pick a remaining element...
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;
		// And swap it with the current element.
		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}
	return array;
}

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
		this.answersReceived = 0;
		this.TFACode = shuffle([0,1,2,3]);
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
		this.antibot = {
			handle: ()=>{}
		};
		this.on("ready",()=>{
			this.antibot = new antibot({
				timeout: options.antibot.timeout,
				random: options.antibot.random,
				mid: this.msgID,
				clientId: this.clientID,
				pin: this.session
			});
			if(!this.options.twoFactorAuth){
				return;
			}
			this.TFA = setInterval(()=>{
				shuffle(this.TFACode);
				this.emit("TFA",this.TFACode);
				this.send({
					channel: "/service/player",
					clientId: this.clientID,
					ext: {},
					data: {
						content: '"quiz"',
						gameid: this.session,
						host: "play.kahoot.it",
						id: 53,
						type: "message"
					}
				});
			},this.options.TFATime || 7000);
		});
		options.antibot = options.antibot || {};
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
			body: JSON.stringify({
				namerator: this.options.namerator ? this.options.namerator : false,
				gameMode: (this.options.mode && "team") || "normal",
				twoFactorAuth: this.options.twoFactorAuth || false,
				smartPractice: false,
				themeId: false,
				orgId: "",
				participantId: false
			}),
			headers: {
				"Content-Type": "application/json"
			}
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
		if(this.options.useAntiBot && this.antibot.handle(msg,"recieve",this.ws) === true){
			console.log("Antibot blocked something.");
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
		}else
		if(data.channel == consts.channels.subscription && data.data && data.data.type == "start" && !this.configured){
			this.configured = true;
			this.emit("ready",this.session);
			return;
		}else
		if(data.data && data.data.type == "joined"){
			let r = {
				channel: consts.channels.subscription,
				clientId: this.clientID,
				data: {
					cid: data.data.cid,
					content: JSON.stringify({
						playerName: data.data.name,
						quizType: this.quiz.type,
						playerV2: true,
						hostPrimaryUsage: "social"
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
				id: data.data.cid,
				connected: this.options.mode !== "team" || !this.options.twoFactorAuth
			});
			if(this.options.mode == "team" || this.options.twoFactorAuth){
				return;
			}
			this.emit("join",{name: data.data.name,id:data.data.cid});
			return;
		}else
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
		}else
		if(data.channel == "/controller/" + this.session && data.data && data.data.content && typeof(JSON.parse(data.data.content).choice) != "undefined"){
			if(this.options.manuallyHandleAnswers){
				this.emit("answer",data.data);
				return;
			}
			this.handleScore(data.data.cid,JSON.parse(data.data.content));
			this.emit("answer",data.data.cid,data.data.content);
			return;
		}else
		// open_ended support
		if(data.channel == "/controller/" + this.session && data.data && data.data.content && typeof(JSON.parse(data.data.content).text) != "undefined"){
			if(this.options.manuallyHandleAnswers){
				this.emit("answer",data.data);
				return;
			}
			this.handleScore(data.data.cid,JSON.parse(data.data.content));
			this.emit("answer",data.data.cid,data.data.content);
			return;
		}else
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
		}else
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
		}else if(data.data && data.data.content){ // other messages
			this.messageHandler(data.data,data.data.content);
		}
	}
	messageHandler(data,content){
		try{
			content = JSON.parse(content);
		}catch(e){}
		switch (data.id) {
			case 18:{
				for(let player of this.players){
					if(player.id == data.cid){
						this.send({
							channel: "/service/player",
							clientId: this.clientID,
							data: {
								cid: player.id,
								content: JSON.stringify({
									memberNames: content,
									recoveryData: {
										data: {},
										defaultQuizData: {
											quizType: "quiz",
											quizQuestionAnswers: []
										},
										quizType: "quiz",
										didControllerLeave: false,
										wasControllerKicked: false,
										state: 0
									}
								}),
								gameid: this.session,
								host: "play.kahoot.it",
								id: 19,
								type: "message"
							},
							ext: {}
						});
						player.team = content;
						if(this.options.twoFactorAuth){
							break;
						}
						player.connected = true;
						this.emit("join",{name: player.name,id:player.id,members:content});
						break;
					}
				}
				break;
			}
			case 11:
				this.emit("feedback",content);
				break;
			case 50:{
				if(content.sequence && content.sequence == this.TFACode.join("")){
					this.send({
						channel: "/service/player",
						clientId: this.clientID,
						ext: {},
						data: {
							cid: data.cid,
							content: "{}",
							gameid: this.session,
							host: "play.kahoot.it",
							id: 52,
							type: "message"
						}
					});
					for(let player of this.players){
						if(player.id == data.cid){
							player.connected = true;
							this.emit("join",{name:player.name,id:player.id,members:player.team});
							break;
						}
					}
				}else{
					this.send({
						channel: "/service/player",
						clientId: this.clientID,
						ext: {},
						data: {
							cid: data.cid,
							content: "{}",
							gameid: this.session,
							host: "play.kahoot.it",
							id: 51,
							type: "message"
						}
					});
				}
				break;
			}
		}
	}
	lock(){
		this.send({
			channel: "/service/player",
			clientId: this.clientID,
			data: {
				gameid: this.session,
				type: "lock"
			},
			ext: {}
		});
	}
	unlock(){
		this.send({
			channel: "/service/player",
			clientId: this.clientID,
			data: {
				gameid: this.session,
				type: "unlock"
			},
			ext: {}
		});
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
	requestFeedback(){
		this.send({
			channel: "/service/player",
			clientId: this.clientID,
			ext: {},
			data: {
				content: '{"quizType":"quiz"}',
				gameid: this.session,
				host: "play.kahoot.it",
				id: 12,
				type: "message"
			}
		});
	}
	executeQuestion(){
		clearTimeout(this.timeout);
		let ans = [];
		for(let i in this.quiz.questions){
			ans.push(this.quiz.questions[i].choices ? this.quiz.questions[i].choices.length : null);
		}
		if(this.quiz.questions[this.questionIndex].type == "content"){
			if(!this.options.autoNextQuestion){
				return;
			}
			this.timeout2 = setTimeout(()=>{
				this.endQuestion();
			},20000);
			return;
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
		}, (this.quiz.questions[this.questionIndex].time || 20000) + extraTimeout); // if no time, assume 2 minutes
	}
	send(msg){
		if(typeof(msg.push) == "function"){
			for(let i in msg){
				msg[i].id = String(this.msgID);
				this.msgID++;
			}
		}else{
			if(this.options.useAntiBot){
				this.antibot.handle(JSON.stringify([msg]),"send",this.ws);
			}
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
		clearInterval(this.TFA);
		this.ws.close();
	}
	startQuiz(){
		if(this.configured){
			let ans = [];
			for(let i in this.quiz.questions){
				ans.push(this.quiz.questions[i].choices ? this.quiz.questions[i].choices.length : null);
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
		return JSON.parse(JSON.stringify(this.players)).filter(player=>{
			return player.connected;
		}).sort((a,b)=>{
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
	scoreProtection(type,options){ // true = bad, false = ok
		if(type == "open_ended" || type == "word_cloud"){
			if(!options.text && options.choice){
				return true;
			}
			return false;
		}else
		if(type == "quiz" || type == "survey"){
			if((!options.choice || isNaN(options.choice)) && options.text){
				return true;
			}
			return false;
		}else
		if(type == "jumble"){
			if((!options.choice || options.text)){
				return true;
			}
			if(typeof(options.choice.push) != "function" || options.choice.length != 4){
				return true;
			}
			return false;
		}else
		if(type == "content"){ // should not get answers for content type
			return true;
		}else if(type == "multiple_select_quiz"){
			if(!options.choice || typeof options.choice.push != "function"){
				return true;
			}
			return false;
		}
		if(isNaN(options.choice)){
			return true;
		}
		return false;
	}
	handleScore(id,options,answerIsNULL){
		if(this.scoreProtection(this.quiz.questions[this.questionIndex].type,options) && !answerIsNULL){
			return;
		}
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
			ans.push(this.quiz.questions[i].choices ? this.quiz.questions[i].choices.length : null);
		}
		let sorted = this.rankPlayers();
		let place = 0;
		let nemesis = undefined;
		let hasPoints = this.quiz.questions[this.questionIndex].points || this.quiz.questions[this.questionIndex].type == "open_ended";
		let correct;
		const invalid = /[~`!@#$%^&*(){}[\];:"'<,.>?/\\|\-_+=]| $/gm;
		if(this.quiz.questions[this.questionIndex].type == "open_ended"){
			correct = false;
			const c = this.quiz.questions[this.questionIndex].choices;
			for (let i = 0; i < c.length; i++) {
				if(!options.text){
					break;
				}
				if(c[i].answer.replace(consts.emoji,"").length){
					let compare = c[i].answer.replace(consts.emoji,"").replace(invalid,"").toLowerCase();
					let userInput = options.text.replace(consts.emoji,"").replace(invalid,"").toLowerCase();
					correct = compare == userInput;
				}else{
					correct = c[i].answer === options.text;
				}
				if(correct){
					break;
				}
			}
		}else if(this.quiz.questions[this.questionIndex].type == "jumble"){
			correct = true;
			for (let i = 0; i < options.choice.length; i++) {
				if(this.quiz.questions[this.questionIndex].choices[options.choice[i]].answer != this.jumbleData[i].answer){
					correct = false;
					break;
				}
			}
		}else if(this.quiz.questions[this.questionIndex].type == "survey"){
			correct = true;
		}else if(this.quiz.questions[this.questionIndex].type == "multiple_select_quiz"){
			correct = 0;
			for(let i = 0; i < options.choice.length;i++){
				let n = options.choice[i];
				let q = this.quiz.questions[this.questionIndex];
				if(q.choices[i] && q.choices[i].correct){
					correct++;
				}else{
					correct = 0;
					break;
				}
			}
		}else{
			correct = answerIsNULL ? false : this.quiz.questions[this.questionIndex].choices[options.choice].correct;
		}
		if(typeof(tp.info) == "undefined"){
			tp.info = {};
		}
		for(let j in sorted){
			if(sorted[j].id == tp.id){
				place = Number(j) + 1;
				if(place == 1){
					nemesis = undefined;
				}else{
					nemesis = {
						name: sorted[j].name,
						score: sorted[j].info && sorted[j].info.totalScore
					};
				}
				break;
			}
		}
		// tbh, I don't actually care about this part too much
		function getStreakData(streak,client){
			streak = Number(streak) || 0;
			const oldstreak = streak;
			if(correct){
				streak ++;
			}else{
				streak = 0;
			}
			return {
				totalPointsWithoutBonuses: Number(hasPoints) * (tp.info.totalScore || 0),
				totalPointsWithBonuses: Number(hasPoints) * (tp.info.totalScore || 0),
				questionPoints: Number(hasPoints) * client.getPoints(Date.now(),options,correct),
				answerStreakPoints: {
					streakLevel: streak,
					streakBonus: 100 * (Number(hasPoints) * ((streak - 1) > 5 && 5) || ((streak - 1 < 0 ? 0 : streak - 1))),
					totalStreakPoints: 0,
					previousStreakLevel: oldstreak,
					previousStreakBonus: 100 * ((streak - 1) > 5 && 5) || ((streak - 1 < 0 ? 0 : streak - 1))
				}
			}
		}
		if(answerIsNULL){
			tp.info = {
				choice: null,
				isCorrect: false,
				correctAnswers: (()=>{
					if(!this.quiz.questions[this.questionIndex].choices){
						return [];
					}
					let objs = this.quiz.questions[this.questionIndex].choices.filter(o=>{
						return o.correct;
					});
					let c = [];
					for(let i in objs){
						c.push(objs[i].answer);
					}
					return c;
				})(),
				correctChoices: [],
				points: 0,
				meta: {
					lag: 0
				},
				totalScore: typeof(tp.info.totalScore) == "undefined" ? 0 : tp.info.totalScore,
				pointsData: getStreakData((tp.info.pointsData && tp.info.pointsData.answerStreakPoints && tp.info.pointsData.answerStreakPoints.streakLevel) || 0,this),
				rank: place,
				nemesis: nemesis,
				receivedTime: Date.now(),
				text: "",
				pointsQuestion: this.quiz.questions[this.questionIndex].points || true,
				quizType: "quiz",
				quizQuestionAnswers: ans
			};
			tp.info.text = tp.info.correctAnswers.join(",");
		}else{
			let streakPoints = getStreakData((tp.info.pointsData && tp.info.pointsData.answerStreakPoints && tp.info.pointsData.answerStreakPoints.streakLevel) || 0,this);
			streakPoints = streakPoints.answerStreakPoints.streakBonus;
			tp.info = {
				choice: options.text || options.choice,
				isCorrect: Boolean(correct),
				correctAnswers: (()=>{
					if(!this.quiz.questions[this.questionIndex].choices){
						return [];
					}
					let objs = this.quiz.questions[this.questionIndex].choices.filter(o=>{
						return o.correct;
					});
					let c = [];
					for(let i in objs){
						c.push(objs[i].answer);
					}
					return c;
				})(),
				correctChoices: [],
				points: correct ? hasPoints ? this.getPoints(Date.now(),options,correct) + streakPoints : 0 : 0,
				meta: {
					lag: options.meta.lag
				},
				totalScore: correct ? (
					hasPoints ? (
						typeof(tp.info.totalScore) == "undefined" ? (
							this.getPoints(Date.now(),options,correct) + streakPoints
						):(
							tp.info.totalScore + this.getPoints(Date.now(),options,correct) + streakPoints
						)
					) : (
						typeof(tp.info.totalScore) == "undefined" ? 0 : tp.info.totalScore
					)
				) : (
					typeof(tp.info.totalScore) == "undefined" ? 0 : tp.info.totalScore
				),
				pointsData: getStreakData((tp.info.pointsData && tp.info.pointsData.answerStreakPoints && tp.info.pointsData.answerStreakPoints.streakLevel) || 0,this),
				rank: place,
				nemesis: nemesis,
				receivedTime: Date.now(),
				text: "",
				pointsQuestion: this.quiz.questions[this.questionIndex].points,
				quizType: "quiz",
				quizQuestionAnswers: ans
			};
			tp.info.text = tp.info.correctAnswers.join(",");
		}
		//nemesis and other score stuff will be updated after time.
		//streaks increase score by 100 (per streak).
		if(this.players[index].info.isCorrect){
			this.players[index].correctCount = typeof(this.players[index].correctCount) == "undefined" ? 1 : this.players[index].correctCount + 1;
		}else{
			this.players[index].incorrectCount = typeof(this.players[index].incorrectCount) == "undefined" ? 1 : this.players[index].incorrectCount + 1;
		}
		if(++this.answersReceived >= this.players.length){
			this.endQuestion();
		}
	}
	getPoints(time,answer,correct){
		let extraTimeout = 1000 * (this.quiz.questions[this.questionIndex].video.endTime - this.quiz.questions[this.questionIndex].video.startTime);
		let quizTime = this.quiz.questions[this.questionIndex].time + extraTimeout;
		let ansTime = time - this.questionTimestamp;
		let raw = (Math.round((1 - ((ansTime / quizTime) / 2)) * 1000) * this.quiz.questions[this.questionIndex].pointsMultiplier || 0);
		if(this.quiz.questions[this.questionIndex].type == "multiple_select_quiz"){
			raw = raw * correct;
		}
		return raw;
	}
	endQuestion(){
		clearTimeout(this.timeout);
		if(this.questionIndex == this.quiz.questions.length){
			this.endQuiz();
		}
		if(this.quiz.questions[this.questionIndex].type == "content"){
			if(this.options.autoNextQuestion){
				this.timeout = setTimeout(()=>{
					this.nextQuestion(false);
				},4000);
				return;
			}
			return this.nextQuestion(false);
		}
		clearTimeout(this.timeout);
		clearTimeout(this.timeout2);
		let ans = [];
		for(let i in this.quiz.questions){
			ans.push(this.quiz.questions[i].choices ? this.quiz.questions[i].choices.length : null);
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
		// detect if question doesn't need to send response. (slideshows)
		try{
			if(this.quiz.questions[this.questionIndex].type == "content"){
				if(this.options.autoNextQuestion){
					setTimeout(()=>{
						this.nextQuestion(false);
					},5000);
				}
				return;
			}
		}
		catch(err){}
		//send results
		let rs = [];
		for(let i in this.players){
			if(!this.players[i].connected){
				continue;
			}
			//determine if we need to set base score?
			if(!this.players[i].info || !this.players[i].info.pointsData || !typeof this.players[i].info.pointsData.answerStreakPoints == "number"){
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
		clearTimeout(this.timeout);
		this.questionIndex++;
		if(isFirst){this.questionIndex--;}
		if(this.questionIndex >= this.quiz.questions.length){
			this.endQuiz();
			return;
		}
		// jumbles
		if(this.quiz.questions[this.questionIndex].type == "jumble"){
			this.jumbleData = Array.from(this.quiz.questions[this.questionIndex].choices);
			shuffle(this.quiz.questions[this.questionIndex].choices);
		}
		this.emit("questionStart",this.quiz.questions[this.questionIndex]);
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
			ans.push(this.quiz.questions[i].choices ? this.quiz.questions[i].choices.length : null);
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
					timeLeft: 4,
					gameBlockLayout: this.quiz.questions[this.questionIndex].layout || "CLASSIC"
				})
			}
		};
		this.send(r);
	}
	endQuiz(){
		let ans = [];
		for(let i in this.quiz.questions){
			ans.push(this.quiz.questions[i].choices ? this.quiz.questions[i].choices.length : null);
		}
		this.emit("quizEnd",this.rankPlayers());
		//send end message.
		let rs2 = [];
		for(let i in this.players){
			if(!this.players[i].connected){
				continue;
			}
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
