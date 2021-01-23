const LiveEventDisconnect = require("../classes/LiveEventDisconnect");

/**
 * KickPlayer - Kicks a player
 *
 * @param  {String} cid The cid of the player to kick
 * @returns {Promise<Boolean>} Whether the kick was successful or not 
 */
module.exports = function KickPlayer(cid) {
  delete this.controllers[cid];
  return this.send("/service/player", new LiveEventDisconnect(this, cid));
};
