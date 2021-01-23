const LiveEventTwoFactorRight = require("../classes/LiveEventTwoFactorRight"),
  LiveEventTwoFactorWrong = require("../classes/LiveEventTwoFactorWrong");
module.exports = function TwoFactorAnswered(data) {
  const {cid,content} = data;
  try {
    const player = this.controllers[cid],
      {sequence} = JSON.parse(content);
    if(this.twoFactorSteps.join("") === sequence) {
      player.active = true;
      this.send("/service/player", new LiveEventTwoFactorRight(data, this));
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
