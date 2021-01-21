module.exports = class LiveEventReplay {
  constructor(client) {
    this.gameid = client.gameid;
    this.id = 5;
    this.type = "message";
    this.content = "{}";
  }
};
