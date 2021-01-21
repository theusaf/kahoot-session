const LiveEventDisconnect = require("../classes/LiveEventDisconnect");
module.exports = function ResetGame() {
  this.controllers = {};
  return this.send("/service/player", new LiveEventDisconnect(this));
};
