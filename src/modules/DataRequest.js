const LiveEventBackup = require("../classes/LiveEventBackup");

/**
 * DataRequest - Handles requests to get data. Responds with https://kahoot.js.org/enum/LiveEventBackup
 *
 * @param  {Object} data The data from the server {@link https://kahoot.js.org/enum/LiveDataRequest}
 */
module.exports = function DataRequest(data) {
  this.send("/service/player", new LiveEventBackup(data, this));
  this.emit("RecoveryDataRequested", data);
};
