module.exports = class LiveEventTwoFactorRight {
  constructor(data, client) {
    this.gameid = client.gameid;
    this.host = "play.kahoot.it";
    this.id = 52;
    this.type = "message";
    this.content = "{}";
    this.cid = data.cid;
  }
};
