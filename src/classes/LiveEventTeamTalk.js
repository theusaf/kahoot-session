// A team talk event message
class LiveEventTeamTalk {

  /**
   * constructor
   *
   * @param  {Client} client The client
   */
  constructor(client) {

    /**
     * The game id
     *
     * @name LiveEventTeamTalk#gameid
     * @type String
     */
    this.gameid = client.gameid;

    /**
     * The event id
     *
     * @name LiveEventTeamTalk#id
     * @type Number
     */
    this.id = 20;
    this.type = "message";

    /**
     * The content of the team talk message
     *
     * @name LiveEventTeamTalk#content
     * @type String
     * @see {@link https://kahoot.js.org/enum/LiveEventTeamTalkContent}    
     */
    this.content = JSON.stringify({
      questionIndex: client.currentQuestionIndex,
      quizQuestionAnswers: client.quizQuestionAnswers,
      gameBlockType: client.quiz.questions[client.currentQuestionIndex].type,
      gameBlockLayout: client.quiz.questions[client.currentQuestionIndex].layout,
      teamTalkDuration: 5
    });
  }
}
module.exports = LiveEventTeamTalk;
