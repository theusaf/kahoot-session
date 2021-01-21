const LiveEventTimeOver = require("../classes/LiveEventTimeOver");
module.exports = function TimeOver() {
  return this.send("/service/player", new LiveEventTimeOver(this));
};
