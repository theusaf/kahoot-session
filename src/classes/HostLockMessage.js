// The lock message
module.exports = class HostLockMessage {

  /**
   * constructor
   *
   * @param  {Client} client The client
   */
  constructor(client) {
    this.gameid = client.gameid;
    this.type = "lock";
  }
};
