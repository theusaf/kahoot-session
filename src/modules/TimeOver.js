const LiveEventTimeOver = require("../classes/LiveEventTimeOver");

/**
 * TimeOver - Notifies players that the time is up
 *
 * @returns {Promise<Boolean>} Whether the message was sent successfully
 */
module.exports = function TimeOver() {
  return this.send("/service/player", new LiveEventTimeOver(this));
};
