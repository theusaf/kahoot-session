const LiveEventTwoFactorReset = require("../classes/LiveEventTwoFactorReset");

/**
 * ResetTwoFactorAuth - Notifies that the two-factor auth was reset
 *
 * @returns {Promise<Boolean>} Whether the notice was sent successfully
 */
module.exports = function ResetTwoFactorAuth() {
  return this.send("/service/player", new LiveEventTwoFactorReset(this));
};
