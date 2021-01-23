// The unlock message
module.exports = class HostUnlockMessage {

  /**
   * constructor
   *
   * @param  {Client} client The client
   */
  constructor(client) {
    this.gameid = client.gameid;
    this.type = "unlock";
  }
};
