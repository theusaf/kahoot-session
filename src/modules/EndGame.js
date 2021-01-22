const LiveEventQuizEnd = require("../classes/LiveEventQuizEnd");
module.exports = function EndGame() {
  const pack = [];
  for(const i in this.controllers) {
    if(this.controllers[i].hasLeft || !this.controllers[i].active) {
      continue;
    }
    pack.push(["/service/player", new LiveEventQuizEnd(this.controllers[i], this)]);
  }
  return this.send(pack);
};
