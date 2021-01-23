const Player = require("../util/player"),
  LiveEventNameAccept = require("../classes/LiveEventNameAccept");
module.exports = function PlayerJoined(data) {
  const {cid} = data;
  if(this.controllers[cid]) {
    if(this.controllers[cid].hasLeft) {
      this.controllers[cid].hasLeft = false;
    }
  } else {
    this.controllers[cid] = new Player(data, this);
  }
  if(this.state === "lobby" && this.options.autoPlay && this.controllers[cid].active) {
    clearTimeout(this.mainEventTimer);
    this.mainEventTimer = setTimeout(() => {
      this.startGame();
    }, 15e3);
  }
  this.send("/service/player", new LiveEventNameAccept(data, this));
  this.emit("PlayerJoined", data);
};
