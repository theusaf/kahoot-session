// The podium message
class LiveEventPodium {

  /**
   * constructor
   *
   * @param  {Player} player The player
   * @param  {Client} client The client
   */
  constructor(player, client) {

    /**
     * The game id
     *
     * @name LiveEventPodium#gameid
     * @type String
     */
    this.gameid = client.gameid;

    /**
     * The host of the game
     *
     * @name LiveEventPodium#host
     * @type String
     */
    this.host = "play.kahoot.it";

    /**
     * The event id
     *
     * @name LiveEventPodium#id
     * @type Number
     */
    this.id = 13;
    this.type = "message";
    let medal = null;
    if(player.rank >= 3) {
      medal = ["gold", "silver", "bronze"][player.rank - 1];
    }

    /**
     * The content of the podium info
     *
     * @name LiveEventPodium#content
     * @type String
     */
    this.content = JSON.stringify({
      podiumMedalType: medal
    });

    /**
     * The id of the player the podium info belongs to
     *
     * @name LiveEventPodium#cid
     * @type String
     */
    this.cid = player.cid;
  }
}
module.exports = LiveEventPodium;
