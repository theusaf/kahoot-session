module.exports = class LiveEventTwoFactorWrong {
  constructor(data, client) {
    this.gameid = client.gameid;
    this.host = "play.kahoot.it";
    this.id = 51;
    this.type = "message";
    this.content = "{}";
    this.cid = data.cid;
  }
};
