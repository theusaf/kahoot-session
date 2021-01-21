module.exports = function calculateReadTime(str) {
  // assuming 5.5 words per second
  const words = str.split(" ").length;
  return words / 5.5 <= 5 ? 5 : Math.round(words / 5.5);
};
