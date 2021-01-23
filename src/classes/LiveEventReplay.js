// A replay message
module.exports = class LiveEventReplay {

  /**
   * constructor
   *
   * @param  {Client} client The client
   */
  constructor(client) {
    this.gameid = client.gameid;
    this.id = 5;
    this.type = "message";
    this.content = "{}";
  }
};
