module.exports = function PlayerLeft(data) {
  this.emit("PlayerLeft", data);
  const {cid} = data;
  if(this.controllers[cid]) {
    this.controllers[cid].hasLeft = true;
  }
};
