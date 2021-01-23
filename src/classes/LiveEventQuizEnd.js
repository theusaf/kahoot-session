// The quiz end message
class LiveEventQuizEnd {

  /**
   * constructor
   *
   * @param  {Player} player The player
   * @param  {Client} client The client
   */
  constructor(player, client) {

    /**
     * The game id
     *
     * @name LiveEventQuizEnd
     * @type String
     */
    this.gameid = client.gameid;

    /**
     * The host of the game
     *
     * @name LiveEventQuizEnd#host
     * @type String
     */
    this.host = "play.kahoot.it";

    /**
     * The event id
     *
     * @name LiveEventQuizEnd#id
     * @type Number
     */
    this.id = 3;
    this.type = "message";

    /**
     * The id of the player to send the final results to
     *
     * @name LiveEventQuizEnd#cid
     * @type String
     */
    this.cid = player.cid;

    /**
     * The content of the quiz end data
     *
     * @name LiveEventQuizEnd#content
     * @type String
     * @see {@link https://kahoot.js.org/enum/LiveEventQuizEndContent}    
     */
    this.content = JSON.stringify({
      rank: player.rank,
      cid: player.cid,
      correctCount: player.correctCount,
      incorrectCount: player.incorrectCount,
      unansweredCount: player.unansweredCount,
      isKicked: false,
      isGhost: false,
      playerCount: Object.keys(client.controllers).length,
      startTime: client.startTime,
      quizId: client.quiz.uuid,
      name: player.name,
      totalScore: player.pointsData.totalPointsWithBonuses,
      hostId: "",
      challengeId: null,
      isOnlyNonPointGameBlockKahoot: false
    });
  }
}
module.exports = LiveEventQuizEnd;
