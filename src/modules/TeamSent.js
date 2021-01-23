const LiveEventTeamAccept = require("../classes/LiveEventTeamAccept");

/**
 * TeamSent - Handles team members being sent
 *
 * @param  {Object} data The team info {@link https://kahoot.js.org/enum/LiveJoinedTeamPacket}
 */
function TeamSent(data) {
  try {
    const {cid,content} = data;
    if(this.controllers[cid]) {
      this.controllers[cid].team = JSON.parse(content);
    } else {
      // nonexisting player!
      return;
    }
    if(!this.options.twoFactorAuth) {
      this.controllers[cid].active = true;
    }
    if(this.state === "lobby" && this.options.autoPlay && this.controllers[cid].active) {
      clearTimeout(this.mainEventTimer);
      this.mainEventTimer = setTimeout(() => {
        this.startGame();
      }, 15e3);
    }
    this.send("/service/player", new LiveEventTeamAccept(data, this));
  } catch(error) {
    this.emit("error", {
      error,
      description: "Unknown error ocurred while handling TeamSent"
    });
  }

  /**
   * Emitted when a team is sent
   *
   * @event TeamReceived
   * @type Object
   * @see {@link https://kahoot.js.org/enum/LiveJoinedTeamPacket}  
   */
  this.emit("TeamReceived", data);
}
module.exports = TeamSent;
