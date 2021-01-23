require("cometd-nodejs-client").adapt();
const EventEmitter = require("events"),
  cometdAPI = require("cometd"),
  calculateReadTime = require("./util/calculateReadTime"),
  got = require("got"),
  modules = require("./modules/index"),
  shuffle = require("./util/shuffle"),
  HostSessionData = require("./classes/HostSessionData"),
  HostStartedData = require("./classes/HostStartedData"),
  AckExtension = require("cometd/AckExtension"),
  TimeSyncExtension = require("cometd/TimeSyncExtension"),
  LiveEventDisconnect = require("./classes/LiveEventDisconnect");

// The basic Kahoot host
class Client extends EventEmitter {

  /**
   * constructor - Creates the Client
   *
   * @param {Object} options An object containing settings, controlling things such as team mode, two factor auth
   * @param {Boolean} options.autoPlay Whether to automatically start, move through questions, and replay games
   * @param {String} [options.gameMode=classic] The game mode of the game. Can be "classic" or "team"
   * @param {Boolean} options.twoFactorAuth Whether to enable two-factor auth in the game
   * @param {Boolbea} options.namerator Whether to enable the friendly nickname generator
   * @param {Number} options.twoFactorInterval The time in seconds between two-factor resets
   */
  constructor(options) {
    super();

    /**
     * The time the quesiton started
     *
     * @name Client#questionStartTime
     * @type Number
     */
    this.questionStartTime = null;

    /**
     * The game options
     *
     * @name Client#questionStartTime
     * @see Client
     */
    this.options = options || {};

    /**
     * The CometD client. {@link https://docs.cometd.org/current7/reference/}
     *
     * @name Client#cometd
     * @type CometDClient
     */
    this.cometd = null;

    /**
     * The controllers, mapped by id
     *
     * @name Client#controllers
     * @type Object<Player>
     */
    this.controllers = {};

    /**
     * The current question index
     *
     * @name Client#currentQuestionIndex
     * @type Number
     */
    this.currentQuestionIndex = 0;

    /**
     * The current quiz index, used in playlists
     *
     * @name Client#currentQuizIndex
     * @type Number
     */
    this.currentQuizIndex = 0;

    /**
     * The feedback received.
     *
     * @see FeedbackSent
     * @name Client#feedback
     * @type Object[]
     */
    this.feedback = [];

    /**
     * The game pin of the game
     *
     * @name Client#gameid
     * @type String
     */
    this.gameid = null;

    /**
     * The time the QuestionReady started
     *
     * @name Client#getReadyTime
     * @type Number
     */
    this.getReadyTime = null;

    /**
     * The shuffled steps of the jumble question
     *
     * @name Client#jumbleSteps
     * @type Number[]
     */
    this.jumbleSteps = null;

    /**
     * A number from setTimeout used for autoPlay and question ending
     *
     * @name Client#mainEventTimer
     * @type Number
     */
    this.mainEventTimer = null;

    /**
     * A number from setInterval for use in two-factor auth resets
     *
     * @name Client#twoFactorInterval
     * @type Number
     */
    this.twoFactorInterval = null;

    /**
     * A shuffled list of numbers representing the current pattern for the two-factor steps
     *
     * @name Client#twoFactorSteps
     * @type Number[]
     */
    this.twoFactorSteps = shuffle([0,1,2,3]);

    /**
     * The current quiz being played
     *
     * @name Client#quiz
     * @type Quiz
     */
    this.quiz = null;

    /**
     * The list of quizzes or ids
     *
     * @name Client#quizPlaylist
     * @type String[]|Quiz[]
     */
    this.quizPlaylist = [];

    /**
     * The recovery data
     *
     * @name Client#recoveryData
     * @type Object
     * @see {@link https://kahoot.js.org/enum/LiveEventRecoveryData}
     */
    this.recoveryData = {};

    /**
     * The time the quiz started
     *
     * @name Client#startTime
     * @type Number
     */
    this.startTime = null;

    /**
     * The current state of the game
     * - "lobby"
     * - "start"
     * - "getready"
     * - "teamtalk"
     * - "question"
     * - "timeover"
     * - "questionend"
     * - "podium"
     * - "quizend"
     *
     * @name Client#state
     * @type String
     */
    this.state = "lobby";

    /**
     * The current status of the game. Either "ACTIVE" or "LOCKED"
     *
     * @name Client#status
     * @type String
     */
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
    let restart;
    if(quizId === true) {
      restart = true;
      quizId = this.quizPlaylist[this.currentQuizIndex];
    }
    if (typeof quizId === "object" && typeof quizId.push === "function") {
      // is array
      this.quizPlaylist = quizId;
      quizId = quizId[0];
    }
    if(typeof quizId === "object" && typeof quizId.questions === "object") {
      // is quiz object
      this.quiz = quizId;
      this.quizPlaylist[this.currentQuizIndex] = quizId;
      return this;
    }
    let uuid = quizId.match(/[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}/i);
    if(uuid === null) {
      throw {
        description: "Invalid UUID"
      };
    }
    uuid = uuid[0];
    try {
      const response = await got(`https://play.kahoot.it/rest/kahoots/${uuid}`),
        data = JSON.parse(response.body);
      if(data.error) {
        throw data.error;
      }
      this.quiz = data;
      this.quizPlaylist[this.currentQuizIndex] = data;
    } catch(error) {
      throw {
        error,
        description: "Failed to fetch quiz."
      };
    }
    if(restart) {
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
      if(Object.keys(this.controllers).length > 0 && this.options.autoPlay) {
        this.mainEventTimer = setTimeout(() => {
          this.next().catch((error) => {
            this.emit("error", error);
          });
        }, 15e3);
      }
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
      cometd.addListener(`/controller/${this.gameid}`, (data) => {
        this.message(data);
      });
      cometd.addListener("/service/status", (data) => {
        this.message(data);
      });
      cometd.addListener("/service/player", (data) => {
        this.message(data);
      });
      cometd.onListenerException = (exception) => {
        this.emit("error", exception.description ? exception : {
          error: exception,
          description: "Unknown error"
        });
      };
      await this.send("/service/player", new HostStartedData(this), true);
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
      if(this.twoFactorInterval === null && this.options.twoFactorAuth) {
        this.twoFactorInterval = setInterval(() => {
          this.resetTwoFactorAuth();
        }, this.options.twoFactorInterval || 7e3);
      }
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
   * @param {Object} message.data The data sent from the server
   * @param {String} message.channel The channel the message is in
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
    if(this.cometd.isDisconnected()) {
      return new Promise((resolve) => {
        setTimeout(() => {
          if(this.cometd.isDisconnected()) {
            this.emit("Disconnect");
            clearTimeout(this.mainEventTimer);
            clearInterval(this.twoFactorInterval);
            this.cometd.disconnect();
          } else {
            this.send.apply(this, arguments);
          }
          resolve();
        }, 10e3);
      });
      return;
    }
    if(typeof channel === "object" && typeof channel.push === "function") {
      // An array
      const promises = [];
      this.cometd.batch(() => {
        for(let i = 0; i < channel.length; i++) {
          promises.push(this.send(channel[i][0], channel[i][1], message));
        }
      });
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
    clearTimeout(this.mainEventTimer);
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

    /**
     * Emitted when the time is up
     *
     * @event TimeOver
     */
    this.emit("TimeOver");
    return this.next();
  }

  /**
   * sendQuestionResults - Sends the question results to the players
   *
   * @returns {Promise<Boolean[]>} Whether the message was successfully sent
   */
  sendQuestionResults() {
    clearTimeout(this.mainEventTimer);
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
    if(this.options.autoPlay) {
      this.mainEventTimer = setTimeout(() => {
        this.next().catch((error) => {
          this.emit("error", error);
        });
      }, 5e3);
    }

    /**
     * Emitted when the question has ended
     *
     * @event QuestionResults
     * @type Object<Player>
     */
    this.emit("QuestionResults", this.controllers);
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
   * async closeGame - Closes the game, disconnects from Kahoot
   */
  async closeGame() {
    clearTimeout(this.mainEventTimer);
    clearInterval(this.twoFactorInterval);
    await this.send("/service/player", new LiveEventDisconnect(this));
    this.cometd.disconnect();

    /**
     * Emitted when the game is disconnected
     *
     * @event Disconnect
     */
    this.emit("Disconnect");
  }

  /**
   * startGame - Starts the game
   *
   * @returns {Promise<Boolean>} Whether successful or not
   */
  startGame() {
    this.state = "start";
    this.startTime = Date.now();
    this.recoveryData.data = {
      quizType: "quiz",
      quizQuestionAnswers: this.quizQuestionAnswers
    };
    this.recoveryData.state = 1;
    this.mainEventTimer = setTimeout(() => {
      this.next().catch((error) => {
        this.emit("error", error);
      });
    }, 5e3);

    /**
     * Emitted when the quiz starts
     *
     * @event GameStart
     * @type Quiz
     */
    this.emit("GameStart", this.quiz);
    return modules.Start.call(this);
  }

  /**
   * async startQuestion - Starts the question
   *
   * @returns {Promise} Resolves when question is started.
   */
  async startQuestion() {
    clearTimeout(this.mainEventTimer);
    await modules.StartQuestion.call(this);
    this.questionStartTime = Date.now();
    this.state = "question";
    this.recoveryData.state = 3;
    this.recoveryData.data = {
      questionIndex: this.currentQuestionIndex,
      gameBlockType: this.quiz.questions[this.currentQuestionIndex].type,
      gameBlockLayout: this.quiz.questions[this.currentQuestionIndex].layout,
      quizQuestionAnswers: this.quizQuestionAnswers,
      timeAvailable: this.quiz.questions[this.currentQuestionIndex].time,
      timeLeft: this.quiz.questions[this.currentQuestionIndex].time,
      numberOfAnswersAllowed: 1
    };
    this.mainEventTimer = setTimeout(() => {
      this.next().catch((error) => {
        this.emit("error", error);
      });
    }, this.recoveryData.data.timeAvailable);

    /**
     * Emitted when the question starts
     *
     * @event QuestionStart
     * @type Question
     */
    this.emit("QuestionStart", this.quiz.questions[this.currentQuestionIndex]);
  }

  /**
   * readyQuestion - Starts the question
   *
   * @returns {Promise<Boolean>} Whether successful or not
   */
  readyQuestion() {
    clearTimeout(this.mainEventTimer);
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
    if(this.quiz.questions[this.currentQuestionIndex].type !== "content"){
      this.mainEventTimer = setTimeout(() => {
        this.next().catch((error) => {
          this.emit("error", error);
        });
      }, this.recoveryData.data.getReady.timeLeft * 1e3);
    } else {
      if(this.options.autoPlay) {
        this.mainEventTimer = setTimeout(() => {
          this.next().catch((error) => {
            this.emit("error", error);
          });
        }, 20e3);
      }
    }

    /**
     * Emitted when the question is starting up
     *
     * @event QuestionReady
     * @type Question
     */
    this.emit("QuestionReady", this.quiz.questions[this.currentQuestionIndex]);
    return modules.ReadyQuestion.call(this);
  }

  /**
   * startTeamTalk - Starts team talk
   *
   * @returns {Promise<Boolean>} Whether successful or not
   */
  startTeamTalk() {
    clearTimeout(this.mainEventTimer);
    this.state = "teamtalk";
    this.mainEventTimer = setTimeout(() => {
      this.next().catch((error) => {
        this.emit("error", error);
      });
    }, 5e3);
    this.emit("TeamTalk");
    return modules.StartTeamTalk.call(this);
  }

  /**
   * async sendRankings - Sends the medals to players (podium)
   * Used before endGame
   *
   * @returns {Promise<Boolean>} Resolves if successful, rejects if not
   */
  async sendRankings() {
    clearTimeout(this.mainEventTimer);
    this.state = "podium";
    await modules.SendRankings.call(this);

    /**
     * Emitted at the end of the game, before GameEnd
     *
     * @event Rankings
     * @type Object<Player>
     */
    this.emit("Rankings", this.controllers);
    return this.next();
  }

  /**
   * endGame - Ends the quiz. Sends the final data to all players
   *
   * @returns {Promise<Boolean>} Resolves if successful, rejects if not
   */
  endGame() {
    clearTimeout(this.mainEventTimer);
    this.state = "quizend";
    this.recoveryData.state = 6;
    this.recoveryData.data = {};
    if(this.options.autoPlay) {
      this.mainEventTimer = setTimeout(() => {
        this.next().catch((error) => {
          this.emit("error", error);
        });
      }, 15e3);
    }

    /**
     * Emitted at the end of the quiz
     *
     * @event GameEnd
     * @type Object<Player>
     */
    this.emit("GameEnd", this.controllers);
    return modules.EndGame.call(this);
  }

  /**
   * requestFeedback - Requests feedback from the user
   *
   * @returns {Promise<Boolean>} Whether the request was successful or not
   */
  requestFeedback(){
    clearTimeout(this.mainEventTimer);
    this.recoveryData.state = 7;
    this.recoveryData.data = {};

    /**
     * Emitted when feedback is requested
     *
     * @event FeedbackRequested
     */
    this.emit("FeedbackRequested");
    return modules.RequestFeedback.call(this);
  }

  /**
   * resetTwoFactorAuth - Resets the two-factor auth and notifies clients
   *
   * @returns {Promise<Boolean>} Successful or not
   */
  resetTwoFactorAuth() {
    this.twoFactorSteps = shuffle([0,1,2,3]);

    /**
     * Emitted when the two factor resets
     *
     * @event TwoFactorAuthReset
     * @type Number[]
     */
    this.emit("TwoFactorAuthReset", this.twoFactorSteps);
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
  async resetGame() {
    clearTimeout(this.mainEventTimer);
    this.state = "lobby";
    this.currentQuestionIndex = 0;
    this.currentQuizIndex++;
    if(this.currentQuizIndex >= this.quizPlaylist.length) {
      this.currentQuizIndex = 0;
    }
    try {
      await this.initialize(true);
    } catch(error) {
      this.emit("error", {
        error,
        description: "An error ocurred while reinintializing the game"
      });
      return;
    }
    this.emit("GameReset", this.quiz);
    return modules.ResetGame.call(this);
  }

  /**
   * async replayGame - Plays the game again
   *
   * @returns {Promise<Boolean>} Whether the replay message was successful
   */
  async replayGame() {
    clearTimeout(this.mainEventTimer);
    this.state = "lobby";
    this.currentQuestionIndex = 0;
    this.currentQuizIndex++;
    if(this.currentQuizIndex >= this.quizPlaylist.length) {
      this.currentQuizIndex = 0;
    }
    try {
      await this.initialize(true);
    } catch(error) {
      this.emit("error", {
        error,
        description: "An error ocurred while reinintializing the game"
      });
      return;
    }

    /**
     * Emitted when the game resets
     *
     * @event GameReset
     * @type Quiz
     */
    this.emit("GameReset", this.quiz);
    return await modules.ReplayGame.call(this);
  }

  /**
   * checkAllAnswered - Checks if all players have answered. If yes, ends the question.
   */
  checkAllAnswered() {
    let isDone = true;
    for(const i in this.controllers) {
      if(this.controllers[i].answer === null && !this.controllers[i].hasLeft && this.controllers[i].active) {
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

  /**
   * next - Manages transitions between certain events
   *
   * @returns {Promise<Boolean>} Successful or not
   */
  next() {
    clearTimeout(this.mainEventTimer);
    switch(this.state) {
      case "lobby": {
        return this.startGame();
      }
      case "start": {
        return this.readyQuestion();
      }
      case "getready": {
        if(this.quiz.questions[this.currentQuestionIndex].type === "content") {
          this.currentQuestionIndex++;
          return this.readyQuestion();
        } else {
          if(this.options.gameMode === "team") {
            return this.startTeamTalk();
          } else {
            return this.startQuestion();
          }
        }
      }
      case "teamtalk": {
        return this.startQuestion();
      }
      case "question": {
        return this.timeOver();
      }
      case "timeover": {
        return this.sendQuestionResults();
      }
      case "questionend": {
        if(this.currentQuestionIndex + 1 >= this.quiz.questions.length) {
          // end quiz
          return this.sendRankings();
        } else {
          // next question
          this.currentQuestionIndex++;
          return this.readyQuestion();
        }
      }
      case "podium": {
        return this.endGame();
      }
      case "quizend": {
        if(this.options.rejoinOnReset) {
          return this.resetGame();
        } else {
          return this.replayGame();
        }
      }
    }
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
      if(typeof messageHandler === "function") {
        if(messageHandler(message) === true) {
          return;
        }
      }
      oldMessage(message);
    };
  }
}

module.exports = {Client,CustomClient};
