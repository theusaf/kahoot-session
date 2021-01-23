// A request for feedback
class LiveEventFeedbackRequest {

  /**
   * constructor
   *
   * @param  {Client} client The client
   */
  constructor(client) {

    /**
     * The game id
     *
     * @name LiveEventFeedbackRequest#gameid
     * @type String
     */
    this.gameid = client.gameid;

    /**
     * The event id
     *
     * @name LiveEventFeedbackRequest#id
     * @type Number
     */
    this.id = 12;
    this.type = "message";

    /**
     * The content of the feedback request
     *
     * @name LiveEventFeedbackRequest#content
     * @type String    
     */
    this.content = JSON.stringify({
      quizType: "quiz"
    });
  }
}
module.exports = LiveEventFeedbackRequest;
