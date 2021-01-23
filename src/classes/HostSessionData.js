// The options for the game
// https://kahoot.js.org/enum/HostSessionData
class HostSessionData {

  /**
   * constructor
   *
   * @param  {Object} options The game options
   */
  constructor(options) {

    /**
     * The game mode
     *
     * @name HostSessionData#gameMode
     * @type String
     */
    this.gameMode = options.gameMode === "team" ? "team" : "normal";

    /**
     * Whether to use friendly nickname generator
     *
     * @name HostSessionData#namerator
     * @type Boolean
     */
    this.namerator = !!options.namerator;
    this.orgId = options.orgId || "";

    /**
     * Whether to use participantId
     *
     * @name HostSessionData#participantId
     * @type Boolean
     */
    this.participantId = options.participantId || false;

    /**
     * Whether to use smartPractice
     *
     * @name HostSessionData#smartPractice
     * @type Boolean
     */
    this.smartPractice = !!options.smartPractice;
    this.themeId = options.themeId || false;

    /**
     * Whether to enable two-factor auth
     *
     * @name HostSessionData#twoFactorAuth
     * @type Boolean    
     */
    this.twoFactorAuth = !!options.twoFactorAuth;
  }
}
module.exports = HostSessionData;
