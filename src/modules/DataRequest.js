const LiveEventBackup = require("../classes/LiveEventBackup");

/**
 * DataRequest - Handles requests to get data. Responds with https://kahoot.js.org/enum/LiveEventBackup
 *
 * @param  {Object} data The data from the server {@link https://kahoot.js.org/enum/LiveDataRequest}
 */
function DataRequest(data) {
  this.send("/service/player", new LiveEventBackup(data, this));

  /**
   * Emitted when recovery data is requested
   *
   * @event RecoveryDataRequested
   * @type Object
   * @see {@link https://kahoot.js.org/enum/LiveDataRequest}
   */
  this.emit("RecoveryDataRequested", data);
}
module.exports = DataRequest;
