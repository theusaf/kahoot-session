const LiveEventQuestionReady = require("../classes/LiveEventQuestionReady");
module.exports = function ReadyQuestion() {
  for(const i in this.controllers) {
    this.controllers[i].answer = null;
  }
  return this.send("/service/player", new LiveEventQuestionReady(this));
};
