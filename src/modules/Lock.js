const HostLockMessage = require("../classes/HostLockMessage");

/**
 * Lock - Locks the game
 *
 * @returns {Promise<Boolean>} Whether the lock message was sent successfully
 */
function Lock() {
  return this.send("/service/player", new HostLockMessage(this), true);
}
module.exports = Lock;
