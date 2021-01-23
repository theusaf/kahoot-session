// The backup data
class LiveEventBackup {

  /**
   * constructor
   *
   * @param  {Object} data The backup data {@link https://kahoot.js.org/enum/LiveEventBackup}
   * @param  {Client} client The client
   */
  constructor(data, client) {

    /**
     * The game id
     *
     * @name LiveEventBackup#gameid
     * @type String
     */
    this.gameid = client.gameid;

    /**
     * The host of the game
     *
     * @name LiveEventBackup#host
     * @type String
     */
    this.host = "play.kahoot.it";

    /**
     * The event id
     *
     * @name LiveEventBackup#id
     * @type Number
     */
    this.id = 17;
    this.type = "message";

    /**
     * The cid of the player to receive the backup data
     *
     * @name LiveEventBackup#cid
     * @type Number
     */
    this.cid = data.cid;

    /**
     * The content of the backup data
     * @name LiveEventBackup#content
     * @type String
     * @see {@link https://kahoot.js.org/enum/LiveEventRecoveryData}    
     */
    this.content = JSON.stringify(client.getPlayer(data.cid).recoveryData || this.recoveryData);
  }
}
module.exports = LiveEventBackup;
