const LiveEventTwoFactorReset = require("../classes/LiveEventTwoFactorReset");
module.exports = function ResetTwoFactorAuth() {
  return this.send("/service/player", new LiveEventTwoFactorReset(this));
};
