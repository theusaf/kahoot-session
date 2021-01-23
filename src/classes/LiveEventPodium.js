// The podium message
module.exports = class LiveEventPodium {

  /**
   * constructor
   *
   * @param  {Player} player The player
   * @param  {Client} client The client
   */
  constructor(player, client) {
    this.gameid = client.gameid;
    this.host = "play.kahoot.it";
    this.id = 13;
    this.type = "message";
    let medal = null;
    if(player.rank >= 3) {
      medal = ["gold", "silver", "bronze"][player.rank - 1];
    }
    this.content = JSON.stringify({
      podiumMedalType: medal
    });
    this.cid = player.cid;
  }
};
