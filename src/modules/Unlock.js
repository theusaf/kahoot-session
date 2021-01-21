const HostUnlockMessage = require("../classes/HostUnlockMessage");
module.exports = function Lock() {
  return this.send("/service/player", new HostUnlockMessage(this), true);
};
