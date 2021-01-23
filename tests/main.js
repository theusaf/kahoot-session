const tests = [
  require("./basic"),
  require("./teamMode"),
  require("./twoFactorAuth"),
  require("./multiple")
];

(async () => {
  const testPromises = [];
  for(const test of tests) {
    testPromises.push(test());
  }
  try {
    await Promise.all(testPromises);
  } catch(error) {
    console.error(error);
    process.exit(1);
  }
})();
