module.exports = class LiveEventTwoFactorReset {
  constructor(client) {
    this.gameid = client.gameid;
    this.id = 53;
    this.type = "message";
    this.content = "\"quiz\"";
  }
};
