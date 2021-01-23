const LiveEventQuestionStart = require("../classes/LiveEventQuestionStart");

/**
 * StartQuestion - Notifies players that the question started
 *
 * @returns {Promise<Boolean>} Whether the message was sent successfully
 */
function StartQuestion() {
  return this.send("/service/player", new LiveEventQuestionStart(this));
}
module.exports = StartQuestion;
