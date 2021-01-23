// The options for the game
// https://kahoot.js.org/enum/HostSessionData
module.exports = class HostSessionData {

  /**
   * constructor
   *
   * @param  {Object} options The game options
   */
  constructor(options) {
    this.gameMode = options.gameMode === "team" ? "team" : "normal";
    this.namerator = !!options.namerator;
    this.orgId = options.orgId || "";
    this.participantId = options.participantId || false;
    this.smartPractice = !!options.smartPractice;
    this.themeId = options.themeId || false;
    this.twoFactorAuth = !!options.twoFactorAuth;
  }
};
