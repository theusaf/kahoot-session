const LiveEventQuestionReady = require("../classes/LiveEventQuestionReady");

/**
 * ReadyQuestion - Notifies players that the question is about to start
 *
 * @returns {Promise<Boolean>} Whether the message was sent successfully
 */
module.exports = function ReadyQuestion() {
  for(const i in this.controllers) {
    this.controllers[i].answer = null;
  }
  return this.send("/service/player", new LiveEventQuestionReady(this));
};
