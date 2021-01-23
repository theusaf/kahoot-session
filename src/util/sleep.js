/**
 * sleep - Resolves after n seconds
 *
 * @param  {Number} n The amount of seconds to wait
 * @returns {Promise} Resolves after n seconds
 */
function sleep(n) {
  return new Promise((res) => {
    setTimeout(() => {
      res();
    }, (n || 1000) * 1000);
  });
}
module.exports = sleep;
