// A message indicating the game is ready
// https://kahoot.js.org/enum/HostStartedData
class HostStartedData {

  /**
   * constructor
   *
   * @param  {Client} client The client
   */
  constructor(client) {

    /**
     * The host of the game
     *
     * @name HostStartedData#host
     * @type String
     */
    this.host = "play.kahoot.it";

    /**
     * The type of action
     *
     * @name HostStartedData#type
     * @type String
     */
    this.type = "started";

    /**
     * The game id
     *
     * @name HostStartedData#gameid
     * @type String    
     */
    this.gameid = client.gameid;
  }
}
module.exports = HostStartedData;
