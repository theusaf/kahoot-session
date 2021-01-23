// A player
class Player{

  /**
   * constructor - Player constructor
   *
   * @param  {Object} data The player join data {@link https://kahoot.js.org/enum/LiveEventPlayerJoined}
   * @param {String} data.cid The id of the player
   * @param {String} data.name The name of the player
   * @param  {Client} client The client
   */
  constructor(data, client) {

    /**
     * The client
     *
     * @name Player#client
     * @type Client
     */
    this.client = client;

    /**
     * The name of the player
     *
     * @name Player#name
     * @type String
     */
    this.name = data.name;

    /**
     * The id of the player
     *
     * @name Player#cid
     * @type String
     */
    this.cid = data.cid;

    /**
     * The team members of the player
     *
     * @name Player#team
     * @type String[]
     */
    this.team = null;

    /**
     * Whether the player is 'active' and can interact with the game
     *
     * @name Player#active
     * @type Boolean
     */
    this.active = false;

    /**
     * The current answer of the player
     *
     * @name Player#answer
     * @type Object
     * @see LiveEventQuestionEnd
     */
    this.answer = null;

    /**
     * The number of correct answers
     *
     * @name Player#correctCount
     * @type Number
     */
    this.correctCount = 0;

    /**
     * The number of incorrect answers
     *
     * @name Player#incorrectCount
     * @type Number
     */
    this.incorrectCount = 0;

    /**
     * The rank of the player
     *
     * @name Player#rank
     * @type Number
     */
    this.rank = null;

    /**
     * The number of unanswered questions
     *
     * @name Player#unansweredCount
     * @type Number
     */
    this.unansweredCount = 0;

    /**
     * The points data for the player
     *
     * @name Player#pointsData
     * @type Object
     */
    this.pointsData = {
      questionPoints: 0,
      totalPointsWithBonuses: 0,
      totalPointsWithoutBonuses: 0,
      lastGameBlockIndex: 0,
      answerStreakPoints: {
        streakLevel: 0,
        streakBonus: 0,
        totalStreakPoints: 0,
        previousStreakLevel: 0,
        previousStreakBonus: 0
      }
    };
    if(client.options.gameMode !== "team" && !client.options.twoFactorAuth) {
      this.active = true;
    }
  }

  /**
   * get recoveryData - The recovery data of the player
   *
   * @returns {Object}
   * @see {@link https://kahoot.js.org/enum/LiveEventRecoveryData}
   */
  get recoveryData() {
    const data = JSON.parse(JSON.stringify(this.client.recoveryData));
    switch(data.state) {
      case 2: {
        data.data.getReady.timeLeft = Math.ceil(data.data.getReady.timeLeft - (Date.now() - this.client.getReadyTime));
        break;
      }
      case 3: {
        data.data.timeAvailable = Math.ceil(data.data.timeAvailable - (Date.now() - this.client.questionStartTime));
        break;
      }
      case 4:
      case 5: {
        data.data.timeUp.cid = this.cid;
        data.data.revealAnswer = this.answer || data.data.revealAnswer;
        break;
      }
    }
    return data;
  }
}
module.exports = Player;
