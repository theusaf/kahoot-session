/**
 * PlayerLeft - Manages players leaving the game
 *
 * @param  {Object} data The player leave data {@link https://kahoot.js.org/enum/LiveEventPlayerLeft}
 */
function PlayerLeft(data) {
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

  /**
   * Emitted when a player leaves
   *
   * @event PlayerLeft
   * @type Object
   * @see  {@link https://kahoot.js.org/enum/LiveEventPlayerLeft}  
   */
  this.emit("PlayerLeft", data);
}
module.exports = PlayerLeft;
