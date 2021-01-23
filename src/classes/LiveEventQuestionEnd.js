const isCorrect = require("../util/isCorrect"),
  getPoints = require("../util/getPoints");
// The question end message
module.exports = class LiveEventQuestionEnd {

  /**
   * constructor
   *
   * @param  {Player} player The player
   * @param  {Client} client The client
   */
  constructor(player, client) {
    this.gameid = client.gameid;
    this.host = "play.kahoot.it";
    this.id = 8;
    this.type = "message";
    this.cid = player.cid;
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
    this.tempContent = content;
  }
};
