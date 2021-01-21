module.exports = class LiveEventBackup {
  constructor(data, client) {
    this.gameid = client.gameid;
    this.host = "play.kahoot.it";
    this.id = 17;
    this.type = "message";
    this.cid = data.cid;
    this.content = JSON.stringify(this.getPlayer(data.cid).recoveryData || this.recoveryData);
  }
};
