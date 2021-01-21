module.exports = class LiveEventTeamTalk {
  constructor(client) {
    this.gameid = client.gameid;
    this.id = 20;
    this.type = "message";
    this.content = JSON.stringify({
      questionIndex: client.currentQuestionIndex,
      quizQuestionAnswers: client.quizQuestionAnswers,
      gameBlockType: client.quiz.questions[client.currentQuestionIndex].type,
      gameBlockLayout: client.quiz.questions[client.currentQuestionIndex].layout,
      teamTalkDuration: 5
    });
  }
};
