// The two factor reset message
module.exports = class LiveEventTwoFactorReset {

  /**
   * constructor
   *
   * @param  {Client} client The client
   */
  constructor(client) {
    this.gameid = client.gameid;
    this.id = 53;
    this.type = "message";
    this.content = "\"quiz\"";
  }
};
