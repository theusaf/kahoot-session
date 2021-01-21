module.exports = class LiveEventTeamAccept {
  constructor(data, client) {
    this.gameid = client.gameid;
    this.host = "play.kahoot.it";
    this.id = 19;
    this.type = "message";
    this.cid = data.cid;
    this.content = JSON.stringify({
      memberNames: data.content,
      recoveryData: client.controllers[data.cid].recoveryData || client.recoveryData
    });
  }
};
