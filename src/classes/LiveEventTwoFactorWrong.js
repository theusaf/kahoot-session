// A two factor wrong message
class LiveEventTwoFactorWrong {

  /**
   * constructor
   *
   * @param  {Object} data The two-factor data {@link https://kahoot.js.org/enum/LiveTwoStepAnswered}
   * @param  {Client} client The client
   */
  constructor(data, client) {

    /**
     * The game id
     *
     * @name LiveEventTwoFactorWrong#gameid
     * @type String
     */
    this.gameid = client.gameid;

    /**
     * The host of the game
     *
     * @name LiveEventTwoFactorWrong#host
     * @type String
     */
    this.host = "play.kahoot.it";

    /**
     * The event id
     *
     * @name LiveEventTwoFactorWrong#id
     * @type Number
     */
    this.id = 51;
    this.type = "message";
    this.content = "{}";

    /**
     * The id of the player who got the two factor wrong
     *
     * @name LiveEventTwoFactorWrong#cid
     * @type String    
     */
    this.cid = data.cid;
  }
}
module.exports = LiveEventTwoFactorWrong;
