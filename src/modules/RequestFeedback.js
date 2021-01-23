const LiveEventFeedbackRequest = require("../classes/LiveEventFeedbackRequest");

/**
 * RequestFeedback - Requests feedback from the players
 *
 * @returns {Promise<Boolean>} Whether the request was successful
 */
module.exports = function RequestFeedback() {
  return this.send("/service/player", new LiveEventFeedbackRequest(this));
};
