const shuffle = require("../util/shuffle");
// The question start message
module.exports = class LiveEventQuestionStart {

  /**
   * constructor
   *
   * @param  {Client} client The client
   */
  constructor(client) {
    this.gameid = client.gameid;
    this.id = 2;
    this.type = "message";
    this.content = JSON.stringify({
      questionIndex: client.currentQuestionIndex,
      gameBlockType: client.quiz.questions[client.currentQuestionIndex].type,
      gameBlockLayout: client.quiz.questions[client.currentQuestionIndex].layout,
      quizQuestionAnswers: client.quizQuestionAnswers,
      timeAvailable: client.quiz.questions[client.currentQuestionIndex].time,
      timeLeft: client.quiz.questions[client.currentQuestionIndex].time,
      numberOfAnswersAllowed: 1
    });
    if(client.quiz.questions[client.currentQuestionIndex].type === "jumble") {
      client.jumbleSteps = shuffle(client.quiz.questions[client.currentQuestionIndex].choices.map((e,i) => {
        return i;
      }));
    }
  }
};
