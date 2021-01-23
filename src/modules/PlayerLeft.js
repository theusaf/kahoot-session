module.exports = function PlayerLeft(data) {
  const {cid} = data;
  if(this.controllers[cid]) {
    this.controllers[cid].hasLeft = true;
    if(this.state === "lobby" && this.options.autoPlay) {
      clearTimeout(this.mainEventTimer);
      this.mainEventTimer = setTimeout(() => {
        this.startGame();
      }, 15e3);
    }
  }
  this.emit("PlayerLeft", data);
};
