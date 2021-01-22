const isCorrect = require("../util/isCorrect"),
  getPoints = require("../util/getPoints");
module.exports = class LiveEventQuestionEnd {
  constructor(player, client) {
    this.gameid = client.gameid;
    this.host = "play.kahoot.it";
    this.id = 8;
    this.type = "message";
    this.cid = player.cid;
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
