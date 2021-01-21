const LiveEventReplay = require("../classes/LiveEventReplay");
module.exports = function ReplayGame() {
  return this.send("/service/player", new LiveEventReplay(this));
};
