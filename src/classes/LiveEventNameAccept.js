// The name accept message
module.exports = class LiveEventNameAccept {

  /**
   * constructor
   *
   * @param  {Object} data The player join data. {@link https://kahoot.js.org/enum/LiveEventPlayerJoined}
   * @param  {Client} client The client
   */
  constructor(data, client) {
    this.gameid = client.gameid;
    this.host = "play.kahoot.it";
    this.id = 14;
    this.type = "message";
    this.cid = data.cid;
    this.content = JSON.stringify({
      playerName: data.name,
      quizType: "quiz",
      playerV2: true
    });
  }
};
