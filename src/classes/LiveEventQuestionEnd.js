const isCorrect = require("../util/isCorrect"),
  getPoints = require("../util/getPoints");
// The question end message
class LiveEventQuestionEnd {

  /**
   * constructor
   *
   * @param  {Player} player The player
   * @param  {Client} client The client
   */
  constructor(player, client) {

    /**
     * The game id
     *
     * @name LiveEventQuestionEnd#gameid
     * @type String
     */
    this.gameid = client.gameid;

    /**
     * The host of the game
     *
     * @name LiveEventQuestionEnd#name
     * @type String
     */
    this.host = "play.kahoot.it";

    /**
     * The event id
     *
     * @name LiveEventQuestionEnd#id
     * @type Number
     */
    this.id = 8;
    this.type = "message";

    /**
     * The id of the player to send the message to
     *
     * @name LiveEventQuestionEnd#cid
     * @type String
     */
    this.cid = player.cid;

    /**
     * The previous question index
     * @name LiveEventQuestionEnd#lastGameBlockIndex
     * @type Number
     */
    this.lastGameBlockIndex = client.currentQuestionIndex ? client.currentQuestionIndex - 1 : client.currentQuestionIndex;
    const currentQuestion = client.quiz.questions[client.currentQuestionIndex],
      content = player.answer || {
        isCorrect: false,
        type: currentQuestion.type,
        choice: null,
        pointsData: player.pointsData,
        text: "",
        receivedTime: null,
        pointsQuestion: typeof currentQuestion.points === "boolean" ? currentQuestion.points : currentQuestion.type === "open_ended",
        correctChoices: []
      };
    if(player.answer !== null) {
      content.isCorrect = isCorrect(
        content.type,
        client.quiz.questions[client.currentQuestionIndex].choices,
        content.choice,
        client
      );
    }
    content.points = getPoints(
      content.type,
      client.quiz.questions[client.currentQuestionIndex],
      content.choice,
      client,
      content
    );
    content.totalScore = content.pointsData.totalPointsWithBonuses;
    if(player.answer === null) {
      player.answer = content;
    }

    /**
     * The temporary content of the message (should be modified and replaced with stringified `content` instead)
     *
     * @name LiveEventQuestionEnd#tempContent
     * @type Object
     */
    this.tempContent = content;
  }
}
module.exports = LiveEventQuestionEnd;
