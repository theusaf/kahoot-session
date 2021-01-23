// The lock message
class HostLockMessage {

  /**
   * constructor
   *
   * @param  {Client} client The client
   */
  constructor(client) {

    /**
     * The game id
     *
     * @name HostLockMessage#gameid
     * @type String
     */
    this.gameid = client.gameid;

    /**
     * The type of action
     *
     * @name HostLockMessage#type
     * @type String
     */
    this.type = "lock";
  }
}
module.exports = HostLockMessage;
