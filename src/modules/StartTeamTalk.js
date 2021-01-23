const LiveEventTeamTalk = require("../classes/LiveEventTeamTalk");

/**
 * StartTeamTalk - Notifies players that the team talk has started
 *
 * @returns {Promise<Boolean>} Whether the message was sent successfully 
 */
module.exports = function StartTeamTalk() {
  return this.send("/service/player", new LiveEventTeamTalk(this));
};
