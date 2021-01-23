// The unlock message
class HostUnlockMessage {

  /**
   * constructor
   *
   * @param  {Client} client The client
   */
  constructor(client) {

    /**
     * The game id
     *
     * @name HostUnlockMessage#gameid
     * @type String
     */
    this.gameid = client.gameid;

    /**
     * The type of action
     *
     * @name HostUnlockMessage#type
     * @type String    
     */
    this.type = "unlock";
  }
}
module.exports = HostUnlockMessage;
