// The quiz start message
module.exports = class LiveEventStartQuiz {

  /**
   * constructor
   *
   * @param  {Client} client The client
   */
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
