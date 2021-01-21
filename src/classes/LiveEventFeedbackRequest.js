module.exports = class LiveEventFeedbackRequest {
  constructor(client) {
    this.gameid = client.gameid;
    this.id = 12;
    this.type = "message";
    this.content = JSON.stringify({
      quizType: "quiz"
    });
  }
};
