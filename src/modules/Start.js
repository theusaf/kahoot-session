const LiveEventStartQuiz = require("../classes/LiveEventStartQuiz");
module.exports = function Start() {
  return this.send("/service/player", new LiveEventStartQuiz(this));
};
