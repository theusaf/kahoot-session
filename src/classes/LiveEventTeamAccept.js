// The team accept message
class LiveEventTeamAccept {

  /**
   * constructor
   *
   * @param  {Object} data The team data {@link https://kahoot.js.org/enum/LiveJoinedTeamPacket}
   * @param  {Client} client The client
   */
  constructor(data, client) {

    /**
     * The game id
     *
     * @name LiveEventTeamAccept#gameid
     * @type String
     */
    this.gameid = client.gameid;

    /**
     * The host of the game
     *
     * @name LiveEventTeamAccept#host
     * @type String
     */
    this.host = "play.kahoot.it";

    /**
     * The event id
     *
     * @name LiveEventTeamAccept#id
     * @type Number
     */
    this.id = 19;
    this.type = "message";

    /**
     * The id of the player whose team is being accepted
     *
     * @name LiveEventTeamAccept#cid
     * @type String
     */
    this.cid = data.cid;

    /**
     * The content of the team accept
     *
     * @name LiveEventTeamAccept#content
     * @type String
     * @see {@link https://kahoot.js.org/enum/LiveEventTeamAcceptContent}    
     */
    this.content = JSON.stringify({
      memberNames: data.content,
      recoveryData: client.controllers[data.cid].recoveryData || client.recoveryData
    });
  }
}
module.exports = LiveEventTeamAccept;
