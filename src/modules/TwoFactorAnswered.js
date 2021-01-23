const LiveEventTwoFactorRight = require("../classes/LiveEventTwoFactorRight"),
  LiveEventTwoFactorWrong = require("../classes/LiveEventTwoFactorWrong");

/**
 * TwoFactorAnswered - Handles two-factor answers
 *
 * @param  {Object} data The two-factor answer data. {@link https://kahoot.js.org/enum/LiveTwoStepAnswered}
 */
module.exports = function TwoFactorAnswered(data) {
  const {cid,content} = data;
  try {
    const player = this.controllers[cid],
      {sequence} = JSON.parse(content);
    if(!player) {
      return;
    }
    if(this.twoFactorSteps.join("") === sequence) {
      player.active = true;
      this.send("/service/player", new LiveEventTwoFactorRight(data, this));
      if(this.state === "lobby" && this.options.autoPlay && this.controllers[cid].active) {
        clearTimeout(this.mainEventTimer);
        this.mainEventTimer = setTimeout(() => {
          this.startGame();
        }, 15e3);
      }
    } else {
      this.send("/service/player", new LiveEventTwoFactorWrong(data, this));
    }
  } catch(error) {
    this.emit("error", {
      error,
      description: "Unknown error while handling TwoFactorAnswered"
    });
  }
  this.emit("TwoFactorAnswered", data);
};
