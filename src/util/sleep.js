module.exports = function sleep(n) {
  return new Promise((res) => {
    setTimeout(() => {
      res();
    }, (n || 1000) * 1000);
  });
};
