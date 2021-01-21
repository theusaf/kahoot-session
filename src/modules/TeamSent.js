const LiveEventTeamAccept = require("../classes/LiveEventTeamAccept");
module.exports = function TeamSent(data) {
  this.emit("TeamReceived", data);
  try {
    const {cid,content} = data;
    if(this.controllers[cid]) {
      this.controllers[cid].team = JSON.parse(content);
    }
    this.send(new LiveEventTeamAccept(data, this));
  } catch(error) {
    this.emit("error", {
      error,
      description: "Unknown error ocurred while handling TeamSent"
    });
  }
};
