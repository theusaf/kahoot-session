const LiveEventQuestionStart = require("../classes/LiveEventQuestionStart");

/**
 * StartQuestion - Notifies players that the question started
 *
 * @returns {Promise<Boolean>} Whether the message was sent successfully
 */
module.exports = function StartQuestion() {
  return this.send("/service/player", new LiveEventQuestionStart(this));
};
