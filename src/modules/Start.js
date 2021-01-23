const LiveEventStartQuiz = require("../classes/LiveEventStartQuiz");

/**
 * Start - Notifies players that the quiz started
 *
 * @returns {Promise<Boolean>} Whether the message was sent successfully
 */
module.exports = function Start() {
  return this.send("/service/player", new LiveEventStartQuiz(this));
};
