const EventEmitter = require("events"),
  cometdAPI = require("cometd"),
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
    this.options = options || {};
    this.cometd = null;
    this.controllers = {};
    this.currentQuestionIndex = 0;
    this.currentQuizIndex = 0;
    this.feedback = [];
    this.gameid = null;
    this.jumbleSteps = null;
    this.mainEventTimer = null;
    this.twoFactorSteps = null;
    this.quiz = null;
    this.quizPlaylist = [];
    this.state = "lobby";
    this.status = "ACTIVE";
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
    await modules.TimeOver.call(this);
    return this.sendQuestionResults();
  }

  /**
   * sendQuestionResults - Sends the question results to the players
   *
   * @returns {Promise<Boolean[]>} Whether the message was successfully sent
   */
  sendQuestionResults() {
    this.emit("SendQuestionResults");
    const pack = modules.SendQuestionResults.call(this);
    return this.send(pack);
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

  }

  /**
   * startQuestion - Starts the question
   *
   * @returns {Promise<Boolean>} Whether successful or not
   */
  startQuestion() {

  }

  /**
   * readyQuestion - Starts the question
   *
   * @returns {Promise<Boolean>} Whether successful or not
   */
  readyQuestion() {

  }

  /**
   * startTeamTalk - Starts team talk
   *
   * @returns {Promise<Boolean>} Whether successful or not
   */
  startTeamTalk() {

  }

  /**
   * sendRankings - Sends the medals to players (podium)
   * Used before endGame
   *
   * @returns {Promise<Boolean>} Resolves if successful, rejects if not
   */
  sendRankings() {

  }

  /**
   * endGame - Ends the quiz. Sends the final data to all players
   *
   * @returns {Promise<Boolean>} Resolves if successful, rejects if not
   */
  endGame() {

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
    return modules.ResetGame.call(this);
  }

  /**
   * replayGame - Plays the game again
   *
   * @returns {Promise<Boolean>} Whether the replay message was successful
   */
  replayGame() {
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
  constructor() {
    super(...arguments);
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
