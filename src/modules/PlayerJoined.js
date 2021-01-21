const Player = require("../util/player"),
  LiveEventNameAccept = require("../classes/LiveEventNameAccept");
module.exports = function PlayerJoined(data) {
  this.emit("PlayerJoined", data);
  const {cid} = data;
  if(this.controllers[cid]) {
    if(this.controllers[cid].hasLeft) {
      this.controllers[cid].hasLeft = false;
    }
  } else {
    this.controllers[cid] = new Player(data, this);
  }
  this.send("/service/player", new LiveEventNameAccept(data, this));
};
