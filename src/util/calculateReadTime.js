/**
 * calculateReadTime - Calculates a time for the question ready text to be read
 *
 * @param  {String} str The text to calculate by
 * @returns {Number} The time in seconds for the text to be read
 */
module.exports = function calculateReadTime(str) {
  // assuming 5.5 words per second
  const words = str.split(" ").length;
  return words / 5.5 <= 5 ? 5 : Math.round(words / 5.5);
};
