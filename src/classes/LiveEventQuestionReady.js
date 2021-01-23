const calculateReadTime = require("../util/calculateReadTime");
// The question ready message
class LiveEventQuestionReady {

  /**
   * constructor
   *
   * @param  {Client} client The client
   */
  constructor(client) {

    /**
     * The game id
     *
     * @name LiveEventQuestionReady#gameid
     * @type String
     */
    this.gameid = client.gameid;

    /**
     * The event id
     *
     * @name LiveEventQuestionReady#id
     * @type Number
     */
    this.id = 1;
    this.type = "message";

    /**
     * The content of the question ready message
     *
     * @name LiveEventQuestionReady#content
     * @typw String
     * @see {@link https://kahoot.js.org/enum/LiveEventQuestionReadyContent}    
     */
    this.content = JSON.stringify({
      questionIndex: client.currentQuestionIndex,
      gameBlockType: client.quiz.questions[client.currentQuestionIndex].type,
      gameBlockLayout: client.quiz.questions[client.currentQuestionIndex].layout,
      quizQuestionAnswers: client.quizQuestionAnswers,
      timeLeft: calculateReadTime(client.quiz.questions[client.currentQuestionIndex].question || client.quiz.questions[client.currentQuestionIndex].title)
    });
  }
}
module.exports = LiveEventQuestionReady;
