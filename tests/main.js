const tests = [
  require("./basic"),
  require("./teamMode"),
  require("./twoFactorAuth"),
  require("./multiple")
];

(async () => {
  for(const test of tests) {
    try {
      await test();
    } catch(error) {
      console.error(error);
      process.exit(1);
    }
  }
})();
