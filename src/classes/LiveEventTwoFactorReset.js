// The two factor reset message
class LiveEventTwoFactorReset {

  /**
   * constructor
   *
   * @param  {Client} client The client
   */
  constructor(client) {

    /**
     * The game id
     *
     * @name LiveEventTwoFactorReset#gameid
     * @type String
     */
    this.gameid = client.gameid;

    /**
     * The event id
     *
     * @name LiveEventTwoFactorReset#id
     * @type Number    
     */
    this.id = 53;
    this.type = "message";
    this.content = "\"quiz\"";
  }
}
module.exports = LiveEventTwoFactorReset;
