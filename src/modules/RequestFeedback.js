const LiveEventFeedbackRequest = require("../classes/LiveEventFeedbackRequest");
module.exports = function RequestFeedback() {
  return this.send("/service/player", new LiveEventFeedbackRequest(this));
};
