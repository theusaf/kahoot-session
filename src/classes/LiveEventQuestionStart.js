module.exports = class LiveEventQuestionStart {
  constructor(client) {
    this.gameid = client.gameid;
    this.id = 2;
    this.type = "message";
    this.content = JSON.stringify({
      questionIndex: client.currentQuestionIndex,
      gameBlockType: client.quiz.questions[client.currentQuestionIndex].type,
      gameBlockLayout: client.quiz.questions[client.currentQuestionIndex].layout,
      quizQuestionAnswers: client.quizQuestionAnswers,
      timeAvailable: gameBlockType: client.quiz.questions[client.currentQuestionIndex].time,
    });
  }
};
