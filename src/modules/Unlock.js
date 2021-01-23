const HostUnlockMessage = require("../classes/HostUnlockMessage");

/**
 * Lock - Unlocks the game
 *
 * @returns {Promise<Boolean>} Whether the game was successfully unlocked
 */
module.exports = function Lock() {
  return this.send("/service/player", new HostUnlockMessage(this), true);
};
