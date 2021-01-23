// A two factor correct message
class LiveEventTwoFactorRight {

  /**
   * constructor
   *
   * @param  {Object} data The two factor data {@link https://kahoot.js.org/enum/LiveTwoStepAnswered}
   * @param  {Client} client The client
   */
  constructor(data, client) {

    /**
     * The game id
     *
     * @name LiveEventTwoFactorRight#gameid
     * @type String
     */
    this.gameid = client.gameid;

    /**
     * The host of the game
     *
     * @name LiveEventTwoFactorRight#host
     * @type String
     */
    this.host = "play.kahoot.it";

    /**
     * The event id
     *
     * @name LiveEventTwoFactorRight#id
     * @type Number
     */
    this.id = 52;
    this.type = "message";
    this.content = "{}";

    /**
     * The id of the player who got the two-factor right
     *
     * @name LiveEventTwoFactorRight#cid
     * @type String
     */
    this.cid = data.cid;
  }
}
module.exports = LiveEventTwoFactorRight;
