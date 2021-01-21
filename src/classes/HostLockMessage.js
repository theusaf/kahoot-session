module.exports = class HostLockMessage {
  constructor(client) {
    this.gameid = client.gameid;
    this.type = "lock";
  }
};
