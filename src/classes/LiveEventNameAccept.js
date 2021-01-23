// The name accept message
class LiveEventNameAccept {

  /**
   * constructor
   *
   * @param  {Object} data The player join data. {@link https://kahoot.js.org/enum/LiveEventPlayerJoined}
   * @param  {Client} client The client
   */
  constructor(data, client) {

    /**
     * The game id
     *
     * @name LiveEventNameAccept#gameid
     * @type String
     */
    this.gameid = client.gameid;

    /**
     * The host of the game
     *
     * @name LiveEventNameAccept#host
     * @type String
     */
    this.host = "play.kahoot.it";

    /**
     * The event id
     *
     * @name LiveEventNameAccept#id
     * @type Number
     */
    this.id = 14;
    this.type = "message";

    /**
     * The cid of the player responding to
     *
     * @name LiveEventNameAccept#cid
     * @type String
     */
    this.cid = data.cid;

    /**
     * The content of the name accept message
     *
     * @name LiveEventNameAccept#content
     * @type String
     */
    this.content = JSON.stringify({
      playerName: data.name,
      quizType: "quiz",
      playerV2: true
    });
  }
}
module.exports = LiveEventNameAccept;
