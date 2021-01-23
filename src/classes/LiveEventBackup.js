// The backup data
module.exports = class LiveEventBackup {

  /**
   * constructor
   *
   * @param  {Object} data The backup data {@link https://kahoot.js.org/enum/LiveEventBackup}
   * @param  {Client} client The client
   */
  constructor(data, client) {
    this.gameid = client.gameid;
    this.host = "play.kahoot.it";
    this.id = 17;
    this.type = "message";
    this.cid = data.cid;
    this.content = JSON.stringify(client.getPlayer(data.cid).recoveryData || this.recoveryData);
  }
};
