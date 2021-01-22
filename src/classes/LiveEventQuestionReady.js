const calculateReadTime = require("../util/calculateReadTime");
module.exports = class LiveEventQuestionReady {
  constructor(client) {
    this.gameid = client.gameid;
    this.id = 1;
    this.type = "message";
    this.content = JSON.stringify({
      questionIndex: client.currentQuestionIndex,
      gameBlockType: client.quiz.questions[client.currentQuestionIndex].type,
      gameBlockLayout: client.quiz.questions[client.currentQuestionIndex].layout,
      quizQuestionAnswers: client.quizQuestionAnswers,
      timeLeft: calculateReadTime(client.quiz.questions[client.currentQuestionIndex].question || client.quiz.questions[client.currentQuestionIndex].title)
    });
  }
};
