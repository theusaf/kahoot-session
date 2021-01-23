const LiveEventQuestionEnd = require("../classes/LiveEventQuestionEnd");

/**
 * sendQuestionResults - Sends the end question data to the clients
 *
 * @returns {Promise<Boolean>} Whether the message was successful
 */
module.exports = function sendQuestionResults() {
  const pack = [];
  for(const i in this.controllers) {
    if(!this.controllers[i].active) {
      continue;
    }
    if(this.controllers[i].hasLeft) {
      if(this.controllers[i].answer !== null) {
        new LiveEventQuestionEnd(this.controllers[i], this);
      }
      continue;
    }
    pack.push(["/service/player", new LiveEventQuestionEnd(this.controllers[i], this)]);
  }
  // get ranks and nemesis
  const players = Object.values(this.controllers);
  players.sort((a, b) => {
    return b.pointsData.totalPointsWithBonuses - a.pointsData.totalPointsWithBonuses;
  });
  for(let i = 0; i < players.length; i++) {
    if(players[i].answer === null) {
      players[i].pointsData.answerStreakPoints.streakLevel = 0;
      players[i].unansweredCount++;
    } else if(players[i].answer.isCorrect) {
      players[i].correctCount++;
    } else {
      players[i].incorrectCount++;
    }
    players[i].rank = i + 1;
    if(players[i].answer){
      players[i].answer.rank = i + 1;
      if(i > 0) {
        const nemesis = players[i - 1];
        players[i].answer.nemesis = {
          isGhost: false,
          name: nemesis.name,
          totalScore: nemesis.pointsData.totalPointsWithBonuses
        };
      }
    }
  }
  for(let i = 0; i < pack.length; i++) {
    pack[i][1].content = JSON.stringify(pack[i][1].tempContent);
    delete pack[i][1].tempContent;
  }
  return this.send(pack);
};
