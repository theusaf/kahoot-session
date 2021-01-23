// A two factor wrong message
module.exports = class LiveEventTwoFactorWrong {

  /**
   * constructor
   *
   * @param  {Object} data The two-factor data {@link https://kahoot.js.org/enum/LiveTwoStepAnswered}
   * @param  {Client} client The client
   */
  constructor(data, client) {
    this.gameid = client.gameid;
    this.host = "play.kahoot.it";
    this.id = 51;
    this.type = "message";
    this.content = "{}";
    this.cid = data.cid;
  }
};
