const LiveEventQuestionStart = require("../classes/LiveEventQuestionStart");
module.exports = function StartQuestion() {
  return this.send("/service/player", new LiveEventQuestionStart(this));
};
