/**
 * FeedbackSent - Handles feedback
 *
 * @param {Object} data The feedback data. {@link https://kahoot.js.org/enum/LiveFeedbackPacketContent}
 */
function FeedbackSent(data) {
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

  /**
   * Emitted when feedback is received
   *
   * @event FeedbackReceived
   * @type Object
   * @see {@link https://kahoot.js.org/enum/LiveFeedbackPacketContent}
   */
  this.emit("FeedbackReceived", data);
}
module.exports = FeedbackSent;
