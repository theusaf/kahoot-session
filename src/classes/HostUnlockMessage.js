module.exports = class HostUnlockMessage {
  constructor(client) {
    this.gameid = client.gameid;
    this.type = "unlock";
  }
};
