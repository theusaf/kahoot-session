const LiveEventDisconnect = require("../classes/LiveEventDisconnect");
module.exports = function KickPlayer(cid) {
  delete this.controllers[cid];
  return this.send("/service/player", new LiveEventDisconnect(this, cid));
};
