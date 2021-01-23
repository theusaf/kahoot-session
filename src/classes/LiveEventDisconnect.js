// The disconnect message
module.exports = class LiveEventDisconnect {

  /**
   * constructor
   *
   * @param  {Client} client The client
   * @param  {String} cid The cid of the player to kick
   */
  constructor(client, cid) {
    this.gameid = client.gameid;
    this.id = 10;
    this.type = "message";
    this.host = "play.kahoot.it";
    if(typeof cid === "string") {
      this.content = JSON.stringify({
        kickCode: 1
      });
      this.cid = cid;
    } else {
      this.content = "{}";
    }
  }
};
