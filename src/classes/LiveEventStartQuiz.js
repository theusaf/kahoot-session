// The quiz start message
class LiveEventStartQuiz {

  /**
   * constructor
   *
   * @param  {Client} client The client
   */
  constructor(client) {

    /**
     * The game id
     *
     * @name LiveEventStartQuiz#gameid
     * @type String
     */
    this.gameid = client.gameid;

    /**
     * The event id
     *
     * @name LiveEventStartQuiz#id
     * @type Number
     */
    this.id = 9;
    this.type = "message";

    /**
     * The content of the qiuz start
     *
     * @name LiveEventStartQuiz#content
     * @type String
     */
    this.content = JSON.stringify({
      quizType: "quiz",
      quizQuestionAnswers: client.quizQuestionAnswers,
      quizTitle: client.quiz.title
    });
  }
}
module.exports = LiveEventStartQuiz;
