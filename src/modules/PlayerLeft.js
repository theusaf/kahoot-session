/**
 * PlayerLeft - Manages players leaving the game
 *
 * @param  {Object} data The player leave data {@link https://kahoot.js.org/enum/LiveEventPlayerLeft}
 */
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
