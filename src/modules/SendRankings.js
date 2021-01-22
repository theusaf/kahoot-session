const LiveEventPodium = require("../classes/LiveEventPodium");
module.exports = function SendRankings() {
  const pack = [];
  for(const i in this.controllers) {
    if(this.controllers[i].hasLeft || !this.controllers[i].active) {
      continue;
    }
    pack.push(["/service/player", new LiveEventPodium(this.controllers[i], this)]);
  }
  return this.send(pack);
};
