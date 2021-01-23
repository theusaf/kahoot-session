// The time over message
module.exports = class LiveEventTimeOver {

  /**
   * constructor
   *
   * @param  {Client} client The Client 
   */
  constructor(client) {
    this.gameid = client.gameid;
    this.host = "play.kahoot.it";
    this.id = 4;
    this.type = "message";
    this.content = JSON.stringify({
      questionNumber: client.currentQuizIndex
    });
  }
};
