const shuffle = require("../util/shuffle");
// The question start message
class LiveEventQuestionStart {

  /**
   * constructor
   *
   * @param  {Client} client The client
   */
  constructor(client) {

    /**
     * The game id
     *
     * @name LiveEventQuestionStart#gameid
     * @type String
     */
    this.gameid = client.gameid;

    /**
     * The event id
     *
     * @name LiveEventQuestionStart#id
     * @type Number
     */
    this.id = 2;
    this.type = "message";

    /**
     * The content of the question start event
     *
     * @name LiveEventQuestionStart#content
     * @type String
     * @see {@link https://kahoot.js.org/enum/LiveEventQuestionStartContent}    
     */
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
}
module.exports = LiveEventQuestionStart;
