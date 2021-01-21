const LiveEventQuestionEnd = require("../classes/LiveEventQuestionEnd");
module.exports = function sendQuestionResults() {
  const pack = [];
  for(const i in this.controllers) {
    if(this.controllers[i].hasLeft) {
      if(this.controllers[i].answer !== null) {
        new LiveEventQuestionEnd(this.controllers[i], this);
      }
      continue;
    }
    pack.push(["/service/player", new LiveEventQuestionEnd(this.controllers[i], this)]);
    // get ranks and nemesis
    pack.sort((a, b) => {
      return b[1].tempContent.pointsData.totalPointsWithBonuses - a[1].tempContent.pointsData.totalPointsWithBonuses;
    });
    for(let i = 0; i < pack.length; i++) {
      pack[1].tempContent.rank = i + 1;
      if(i >= 0) {
        const nemesis = this.controllers[pack[1].cid];
        pack[1].tempContent.nemesis = {
          isGhost: false,
          name: nemesis.name,
          totalScore: nemesis.pointsData.totalPointsWithBonuses
        };
      }
      pack[1].content = JSON.stringify(pack[1].tempContent);
      delete pack[1].tempContent;
    }
  }
  return pack;
};
