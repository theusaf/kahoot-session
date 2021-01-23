const LiveEventQuizEnd = require("../classes/LiveEventQuizEnd");

/**
 * EndGame - Sends the message to end the quiz
 *
 * @returns {Promise<Boolean>} Whether the message was sent successfully
 */
function EndGame() {
  const pack = [];
  for(const i in this.controllers) {
    if(this.controllers[i].hasLeft || !this.controllers[i].active) {
      continue;
    }
    pack.push(["/service/player", new LiveEventQuizEnd(this.controllers[i], this)]);
  }
  return this.send(pack);
}
module.exports = EndGame;
