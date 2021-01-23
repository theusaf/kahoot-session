// The quiz end message
module.exports = class LiveEventQuizEnd {

  /**
   * constructor
   *
   * @param  {Player} player The player
   * @param  {Client} client The client
   */
  constructor(player, client) {
    this.gameid = client.gameid;
    this.host = "play.kahoot.it";
    this.id = 3;
    this.type = "message";
    this.cid = player.cid;
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
};
