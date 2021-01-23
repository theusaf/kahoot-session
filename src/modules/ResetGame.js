const LiveEventDisconnect = require("../classes/LiveEventDisconnect");

/**
 * ResetGame - Notifies the server that the game is reset and should kick all players
 *
 * @returns {Promise<Boolean>} Whether the message was successfully sent
 */
function ResetGame() {
  this.controllers = {};
  return this.send("/service/player", new LiveEventDisconnect(this));
}
module.exports = ResetGame;
