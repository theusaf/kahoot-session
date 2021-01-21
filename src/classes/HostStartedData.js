// A message indicating the game is ready
// https://kahoot.js.org/enum/HostStartedData
module.exports = class HostStartedData {
  constructor(client) {
    this.host = "play.kahoot.it";
    this.type = "started";
    this.gameid = client.gameid;
  }
};
