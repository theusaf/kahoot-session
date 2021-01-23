const LiveEventPodium = require("../classes/LiveEventPodium");

/**
 * SendRankings - Sends the final podium info to the players
 *
 * @returns {Boolean} Whether the message was sent successfully
 */
function SendRankings() {
  const pack = [];
  for(const i in this.controllers) {
    if(this.controllers[i].hasLeft || !this.controllers[i].active) {
      continue;
    }
    pack.push(["/service/player", new LiveEventPodium(this.controllers[i], this)]);
  }
  return this.send(pack);
}
module.exports = SendRankings;
