/**
 * FeedbackSent - Handles feedback
 *
 * @param {Object} data The feedback data. {@see https://kahoot.js.org/enum/LiveFeedbackPacketContent}
 */
module.exports = function FeedbackSent(data) {
  try {
    const content = JSON.parse(data);
    content.cid = data.cid;
    this.feedback.push(content);
  } catch(error) {
    this.emit("error", {
      error,
      description: "Unknown error occured at FeedbackSent"
    });
  }
  this.emit("FeedbackReceived", data);
};
