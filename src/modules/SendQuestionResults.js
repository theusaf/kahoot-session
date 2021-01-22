const LiveEventQuestionEnd = require("../classes/LiveEventQuestionEnd");
module.exports = function sendQuestionResults() {
  const pack = [];
  for(const i in this.controllers) {
    if(!this.controllers[i].active) {
      continue;
    }
    if(this.controllers[i].hasLeft) {
      if(this.controllers[i].answer !== null) {
        const p = new LiveEventQuestionEnd(this.controllers[i], this);
        if(p.isCorrect) {
          this.controllers[i].correctCount++;
        } else {
          this.controllers[i].incorrectCount++;
        }
      } else {
        this.controllers[i].pointsData.answerStreakPoints.streakLevel = 0;
        this.controllers[i].unansweredCount++;
      }
      continue;
    }
    pack.push(["/service/player", new LiveEventQuestionEnd(this.controllers[i], this)]);
    // get ranks and nemesis
    pack.sort((a, b) => {
      return b[1].tempContent.pointsData.totalPointsWithBonuses - a[1].tempContent.pointsData.totalPointsWithBonuses;
    });
    for(let i = 0; i < pack.length; i++) {
      if(this.controllers[pack[i][1].cid].answer === null) {
        this.controllers[pack[i][1].cid].unansweredCount++;
      } else if(pack[i][1].isCorrect) {
        this.controllers[pack[i][1].cid].correctCount++;
      } else {
        this.controllers[pack[i][1].cid].incorrectCount++;
      }
      pack[i][1].tempContent.rank = i + 1;
      if(i > 0) {
        const nemesis = this.controllers[pack[i - 1][1].cid];
        pack[i][1].tempContent.nemesis = {
          isGhost: false,
          name: nemesis.name,
          totalScore: nemesis.pointsData.totalPointsWithBonuses
        };
      }
      pack[i][1].content = JSON.stringify(pack[i][1].tempContent);
      delete pack[i][1].tempContent;
    }
  }
  return this.send(pack);
};
