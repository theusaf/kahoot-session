module.exports = class LiveEventStartQuiz {
  constructor(client) {
    this.gameid = client.gameid;
    this.id = 9;
    this.type = "message";
    this.content = JSON.stringify({
      quizType: "quiz",
      quizQuestionAnswers: client.quizQuestionAnswers
    });
  }
};
