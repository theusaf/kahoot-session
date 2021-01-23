const LiveEventReplay = require("../classes/LiveEventReplay");

/**
 * ReplayGame - Notifies players that the game is replaying
 *
 * @returns {Promise<Boolean>} Whether the message was sent successfully
 */
module.exports = function ReplayGame() {
  return this.send("/service/player", new LiveEventReplay(this));
};
