const isCorrect = require("../util/isCorrect"),
  getPoints = require("../util/getPoints");
module.exports = class LiveEventQuestionEnd {
  constructor(player, client) {
    this.gameid = client.gameid;
    this.host = "play.kahoot.it";
    this.id = 8;
    this.type = "message";
    this.cid = player.cid;
    const content = player.answer;
    content.isCorrect = isCorrect(
      content.type,
      client.quiz.questions[client.currentQuestionIndex].choices,
      content.choice,
      client
    );
    content.points = getPoints(
      content.type,
      client.quiz.questions[client.currentQuestionIndex],
      content.choice,
      client,
      content
    );
    this.tempContent = content;
  }
};
