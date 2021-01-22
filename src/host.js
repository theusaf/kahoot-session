const EventEmitter = require("events"),
  cometdAPI = require("cometd"),
  calculateReadTime = require("./util/calculateReadTime"),
  got = require("got"),
  modules = require("./modules/index"),
  HostSessionData = require("./classes/HostSessionData"),
  HostStartedData = require("./classes/HostStartedData"),
  AckExtension = require("cometd/AckExtension"),
  TimeSyncExtension = require("cometd/TimeSyncExtension"),
  ReloadExtension = require("cometd/ReloadExtension");

// The basic Kahoot host
class Client extends EventEmitter {

  /**
   * constructor - Creates the Client
   *
   * @param  {Object} options An object containing settings, controlling things such as team mode, two factor auth, and antibot
   */
  constructor(options) {
    super();
    this.questionStartTime = null;
    this.options = options || {};
    this.cometd = null;
    this.controllers = {};
    this.currentQuestionIndex = 0;
    this.currentQuizIndex = 0;
    this.feedback = [];
    this.gameid = null;
    this.getReadyTime  null;
    this.jumbleSteps = null;
    this.mainEventTimer = null;
    this.twoFactorSteps = null;
    this.quiz = null;
    this.quizPlaylist = [];
    this.recoveryData = {};
    this.startTime = null;
    this.state = "lobby";
    this.status = "ACTIVE";
  }

  /**
   * get quizQuestionAnswers - The number of choices per question
   *
   * @returns {Number[]}
   */
  get quizQuestionAnswers() {
    return this.quiz.questions.map((question) => {
      return question.choices ? question.choices.length : null;
    });
  }

  /**
   * async initialize - Downloads the quiz information for the game
   *
   * @param  {String|Quiz|Array} quizId The quiz id/url to use, or a Quiz object.
   * @returns {Promise<Client>} The client.
   */
  async initialize(quizId) {
    if (typeof quizId === "object" && typeof quizId.push === "function") {
      // is array
      this.quizPlaylist = quizId;
      quizId = quizId[0];
    }
    if(typeof quizId === "object" && typeof quizId.questions === "object") {
      // is quiz object
      this.quiz = quizId;
      return this;
    }
    const uuid = /[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}/i.match(quizId);
    if(uuid === null) {
      throw {
        description: "Invalid UUID"
      };
    }
    try {
      const response = await got(`https://play.kahoot.it/rest/kahoots/${uuid}`),
        data = JSON.parse(response.body);
      if(data.error) {
        throw data.error;
      }
      this.quiz = data;
    } catch(error) {
      throw {
        error,
        description: "Failed to fetch quiz."
      };
    }
    return this;
  }

  /**
   * async start - Starts the game
   *
   * @returns {Promise<String>} The game pin.
   */
  async start() {
    try {
      const sessionData = new HostSessionData(this.options),
        response = await got.post(`https://play.kahoot.it/reserve/session/?${Date.now()}`,{
          json: sessionData
        });
      if(typeof response.headers["x-kahoot-session-token"] === "undefined") {
        throw "Missing header token (ratelimited/blocked)";
      }
      this._token = response.headers["x-kahoot-session-token"];
      this.gameid = parseInt(response.body);
      await this._createHandshake();
      const cometd = this.cometd;
      cometd.addListener(`/controller/${this.gameid}`, this.message);
      cometd.addListener("/service/status", this.message);
      cometd.addListener("/service/player", this.message);
      await this.send("/service/player", new HostStartedData(), true);
      this.recoveryData = {
        data: {},
        defaultQuizData: {
          quizType: "quiz",
          quizQuestionAnswers: this.quizQuestionAnswers,
          didControllerLeave: false,
          wasControllerKicked: false
        },
        state: 0
      };
      return this.gameid;
    } catch(error) {
      throw {
        error,
        description: "Failed to create session"
      };
    }
  }

  /**
   * message - Handles messages from the server
   *
   * @param {Object} message The CometD message from the server
   */
  message(message) {
    const {channel,data} = message;
    if(channel === `/controller/${this.gameid}`) {
      if(data) {
        if(typeof data.id === "number") {
          // has an id
          switch(data.id) {
            case 16: {
              modules.DataRequest.call(this, data);
              break;
            }
            case 11: {
              modules.FeedbackSent.call(this, data);
              break;
            }
            case 18: {
              modules.TeamSent.call(this, data);
              break;
            }
            case 50: {
              modules.TwoFactorAnswered.call(this, data);
              break;
            }
            case 45: {
              modules.QuestionAnswered.call(this, data);
              break;
            }
          }
        } else {
          // does not have an id
          if(typeof data.type === "string") {
            if(data.type === "joined") {
              modules.PlayerJoined.call(this, data);
            } else if(data.type === "left") {
              modules.PlayerLeft.call(this, data);
            }
          }
        }
      }
    } else if(channel === "/service/status") {
      this.status = data.status;
      this.emit("Status",data);
    }
  }

  /**
   * send - Wrapper for publishing data to the cometd server
   *
   * @param {String} channel The channel to publish the data to
   * @param {Object} message The data to send
   * @param {Boolean} shouldReject Whether the function should reject if the message fails to send.
   * @returns {Promise<Boolean>} Whether the message was successful
   */
  send(channel, message, shouldReject) {
    if(typeof channel === "object" && typeof channel.push === "function") {
      // An array
      const promises = [];
      this.cometd.batch(() => {
        for(let i = 0; i < channel.length; i++) {
          promises.push(this.send(channel[i][0], channel[i][1], message));
        }
      });
      console.log("[DEBUG] (send batch):",promises);
      return Promise.all(promises);
    }
    return new Promise((resolve, reject) => {
      this.cometd.publish(channel, message, (ack) => {
        if(shouldReject && !ack.successful) {
          reject(ack.successful);
        } else {
          resolve(ack.successful);
        }
      });
    });
  }

  /**
   * _createHandshake - Creates the connection to the server
   *
   * @returns {Promise} - Resolves if successful, rejects if an error occurs
   */
  _createHandshake() {
    const cometd = new cometdAPI.CometD;
    this.cometd = cometd;
    cometd.registerExtension("ack",new AckExtension);
    cometd.registerExtension("timesync",new TimeSyncExtension);
    cometd.registerExtension("reload",new ReloadExtension);
    cometd.configure({
      url: `wss://play.kahoot.it/cometd/${this.gameid}/${this._token}`
    });
    return new Promise((resolve, reject) => {
      cometd.handshake((h) => {
        if (h.successful) {
          resolve();
        } else {
          reject(h);
        }
      });
    });
  }

  /**
   * timeOver - Ends the question
   *
   * @returns {Promise} @see {Client.sendQuestionResults}
   */
  async timeOver() {
    this.emit("TimeOver");
    this.state = "timeover";
    this.recoveryData.state = 4;
    this.recoveryData.data = {
      timeUp: {
        gameid: this.gameid,
        host: "play.kahoot.it",
        id: 4,
        type: "message",
        content: JSON.stringify({
          questionNumber: this.currentQuestionIndex
        }),
        cid: null
      },
      revealAnswer: {
        hasAnswer: false
      }
    };
    await modules.TimeOver.call(this);
    return this.sendQuestionResults();
  }

  /**
   * sendQuestionResults - Sends the question results to the players
   *
   * @returns {Promise<Boolean[]>} Whether the message was successfully sent
   */
  sendQuestionResults() {
    this.emit("QuestionResults");
    this.state = "questionend";
    this.recoveryData.state = 5;
    this.recoveryData.data = {
      timeUp: {
        gameid: this.gameid,
        host: "play.kahoot.it",
        id: 4,
        type: "message",
        content: JSON.stringify({
          questionNumber: this.currentQuestionIndex
        }),
        cid: null
      },
      revealAnswer: {
        hasAnswer: false
      }
    };
    return modules.SendQuestionResults.call(this);
  }

  /**
   * lock - Locks the game
   *
   * @returns {Promise} Resolves if successful, rejects if not
   */
  lock() {
    return modules.Lock.call(this);
  }

  /**
   * unlock - Unlocks the game
   *
   * @returns {Promise}  Resolves if successful, rejects if not
   */
  unlock() {
    return modules.Unlock.call(this);
  }

  /**
   * closeGame - Closes the game, disconnects from Kahoot
   */
  closeGame() {
    this.cometd.disconnect();
  }

  /**
   * startGame - Starts the game
   *
   * @returns {Promise<Boolean>} Whether successful or not
   */
  startGame() {
    this.emit("GameStart");
    this.state = "start";
    this.startTime = Date.now();
    this.recoveryData.data = {
      quizType: "quiz",
      quizQuestionAnswers: this.quizQuestionAnswers
    };
    this.recoveryData.state = 1;
    return modules.Start.call(this);
  }

  /**
   * async startQuestion - Starts the question
   *
   * @returns {Promise} Resolves when question is started.
   */
  async startQuestion() {
    this.emit("QuestionStart");
    await modules.StartQuestion.call(this);
    this.questionStartTime = Date.now();
    this.state = "question";
    this.recoveryData.state = 3;
    this.recoveryData.data = {
      questionIndex: this.currentQuestionIndex,
      gameBlockType: this.quiz.questions[this.currentQuestionIndex].type,
      gameBlockLayout: this.quiz.questions[this.currentQuestionIndex].layout,
      quizQuestionAnswers: this.quizQuestionAnswers,
      timeAvailable: this.quiz.questions[this.currentQuestionIndex].time
    };
  }

  /**
   * readyQuestion - Starts the question
   *
   * @returns {Promise<Boolean>} Whether successful or not
   */
  readyQuestion() {
    this.emit("QuestionReady");
    this.state = "getready";
    this.recoveryData.state = 2;
    this.recoveryData.data = {
      getReady: {
        questionIndex: this.currentQuestionIndex,
        gameBlockType: this.quiz.questions[this.currentQuestionIndex].type,
        gameBlockLayout: this.quiz.questions[this.currentQuestionIndex].layout,
        quizQuestionAnswers: this.quizQuestionAnswers,
        timeLeft: calculateReadTime(this.quiz.questions[this.currentQuestionIndex].question || this.quiz.questions[this.currentQuestionIndex].title)
      }
    };
    this.getReadyTime = Date.now();
    return modules.ReadyQuestion.call(this);
  }

  /**
   * startTeamTalk - Starts team talk
   *
   * @returns {Promise<Boolean>} Whether successful or not
   */
  startTeamTalk() {
    this.emit("TeamTalk");
    this.state = "teamtalk";
    return modules.StartTeamTalk.call(this);
  }

  /**
   * sendRankings - Sends the medals to players (podium)
   * Used before endGame
   *
   * @returns {Promise<Boolean>} Resolves if successful, rejects if not
   */
  sendRankings() {
    this.emit("Rankings");
    this.state = "podium";
    return modules.SendRankings.call(this);
  }

  /**
   * endGame - Ends the quiz. Sends the final data to all players
   *
   * @returns {Promise<Boolean>} Resolves if successful, rejects if not
   */
  endGame() {
    this.emit("GameEnd");
    this.state = "quizend";
    this.recoveryData.state = 6;
    this.recoveryData.data = {};
    return modules.EndGame.call(this);
  }

  /**
   * requestFeedback - Requests feedback from the user
   *
   * @returns {Promise<Boolean>} Whether the request was successful or not
   */
  requestFeedback(){
    this.emit("FeedbackRequested");
    this.recoveryData.state = 7;
    this.recoveryData.data = {};
    return modules.RequestFeedback.call(this);
  }

  /**
   * resetTwoFactorAuth - Resets the two-factor auth and notifies clients
   *
   * @returns {Promise<Boolean>} Successful or not
   */
  resetTwoFactorAuth() {
    this.emit("TwoFactorAuthReset");
    return modules.ResetTwoFactorAuth.call(this);
  }

  /**
   * kickPlayer - Kicks a player from a game
   *
   * @param  {String|Player} player The cid or player to kick
   * @returns {Promise<Boolean>} Resolves if the kick is successful or not
   */
  kickPlayer(player) {
    if(typeof player === "object") {
      player = player.cid;
    }
    return modules.KickPlayer.call(this, player);
  }

  /**
   * resetGame - Resets the game, removes all players
   *
   * @returns {Promise<Boolean>} Resolves whether successful or not
   */
  resetGame() {
    this.emit("GameReset");
    this.state = "lobby";
    return modules.ResetGame.call(this);
  }

  /**
   * replayGame - Plays the game again
   *
   * @returns {Promise<Boolean>} Whether the replay message was successful
   */
  replayGame() {
    this.emit("GameReset");
    this.state = "lobby";
    return modules.ReplayGame.call(this);
  }

  /**
   * checkAllAnswered - Checks if all players have answered. If yes, ends the question.
   */
  checkAllAnswered() {
    let isDone = true;
    for(const i in this.controllers) {
      if(this.controllers[i].answer === null && !this.controllers[i].hasLeft) {
        isDone = false;
        break;
      }
    }
    if(isDone) {
      this.timeOver();
    }
  }

  /**
   * getPlayer - Gets the player by cid
   *
   * @param {String} cid The cid of the player to get
   * @returns {Player} A player
   */
  getPlayer(cid) {
    return this.controllers[cid] || {};
  }
}

// For hosting with more control over events
class CustomClient extends Client {

  /**
   * constructor - Create the custom client
   */
  constructor(options, messageHandler) {
    super(options);
    const oldMessage = this.message;
    this.message = (message) => {
      if(typeof this.options.messageHandler === "function") {
        if(this.options.messageHandler(message) === true) {
          return;
        }
      }
      oldMessage(message);
    };
  }
}

module.exports = {Client,CustomClient};
