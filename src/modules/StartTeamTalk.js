const LiveEventTeamTalk = require("../classes/LiveEventTeamTalk");
module.exports = function Start() {
  return this.send("/service/player", new LiveEventTeamTalk(this));
};
