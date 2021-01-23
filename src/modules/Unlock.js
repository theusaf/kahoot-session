const HostUnlockMessage = require("../classes/HostUnlockMessage");

/**
 * Unlock - Unlocks the game
 *
 * @returns {Promise<Boolean>} Whether the game was successfully unlocked
 */
function Unlock() {
  return this.send("/service/player", new HostUnlockMessage(this), true);
}
module.exports = Unlock;
