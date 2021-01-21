const HostLockMessage = require("../classes/HostLockMessage");
module.exports = function Lock() {
  return this.send("/service/player", new HostLockMessage(this), true);
};
