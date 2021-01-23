// The disconnect message
class LiveEventDisconnect {

  /**
   * constructor
   *
   * @param  {Client} client The client
   * @param  {String} cid The cid of the player to kick
   */
  constructor(client, cid) {

    /**
     * The game id
     *
     * @name LiveEventDisconnect#gameid
     * @type String
     */
    this.gameid = client.gameid;

    /**
     * The event id
     *
     * @name LiveEventDisconnect#id
     * @type Number
     */
    this.id = 10;
    this.type = "message";

    /**
     * The host of the game
     *
     * @name LiveEventDisconnect#host
     * @type String
     */
    this.host = "play.kahoot.it";
    if(typeof cid === "string") {

      /**
       * The content of the message
       *
       * @name LiveEventDisconnect#content
       * @type String      
       */
      this.content = JSON.stringify({
        kickCode: 1
      });
      this.cid = cid;
    } else {
      this.content = "{}";
    }
  }
}
module.exports = LiveEventDisconnect;
