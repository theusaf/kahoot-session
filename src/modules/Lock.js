const HostLockMessage = require("../classes/HostLockMessage");

/**
 * Lock - Locks the game
 *
 * @returns {Promise<Boolean>} Whether the lock message was sent successfully
 */
module.exports = function Lock() {
  return this.send("/service/player", new HostLockMessage(this), true);
};
