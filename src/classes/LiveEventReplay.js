// A replay message
class LiveEventReplay {

  /**
   * constructor
   *
   * @param  {Client} client The client
   */
  constructor(client) {

    /**
     * The game id
     *
     * @name LiveEventReplay#gameid
     * @type String
     */
    this.gameid = client.gameid;

    /**
     * The event id
     *
     * @name LiveEventReplay#id
     * @type Number
     */
    this.id = 5;
    this.type = "message";

    /**
     * The content of the LiveEventReplay
     *
     * @name LiveEventReplay#content
     * @type String    
     */
    this.content = "{}";
  }
}
module.exports = LiveEventReplay;
