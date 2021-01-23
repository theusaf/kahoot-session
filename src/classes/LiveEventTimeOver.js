// The time over message
class LiveEventTimeOver {

  /**
   * constructor
   *
   * @param  {Client} client The Client
   */
  constructor(client) {

    /**
     * The game id
     *
     * @name LiveEventTimeOver#gameid
     * @type String
     */
    this.gameid = client.gameid;

    /**
     * The host of the game
     * @name LiveEventTimeOver#host
     * @type String
     */
    this.host = "play.kahoot.it";

    /**
     * The event id
     *
     * @name LiveEventTimeOver#id
     * @type Number
     */
    this.id = 4;
    this.type = "message";

    /**
     * The content of the time over event
     *
     * @name LiveEventTimeOver#content
     * @type String    
     */
    this.content = JSON.stringify({
      questionNumber: client.currentQuizIndex
    });
  }
}
module.exports = LiveEventTimeOver;
