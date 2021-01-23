# Kahoot-Session
Documentation can be found at [theusaf.github.io/kahoot-session](https://theusaf.github.io/kahoot-kession)

![Dependencies](https://david-dm.org/theusaf/kahoot-session.svg) [![Known Vulnerabilities](https://snyk.io/test/github/theusaf/kahoot-session/badge.svg)](https://snyk.io/test/github/theusaf/kahoot-session) ![Builds](https://travis-ci.com/theusaf/kahoot-session.svg?branch=master) ![Docs](https://inch-ci.org/github/theusaf/kahoot-session?branch=master)

## Installation
```bash
npm install kahoot-session
```

**Requires Node 10.9.0 or newer.**

## Example Usage
```js
const {Client} = require("kahoot-session"),
  client = new Client({
    autoPlay: true,
    namerator: false,
    gameMode: "classic",
    twoFactorAuth: false
  });
client.initialize("103c34ce-c56e-4fbd-b060-87e5611de042").then(() => {
  return client.start();
}).then((pin) => {
  console.log("Join at https://kahoot.it PIN:", pin);
}).catch((error) => {
  console.log("Failed to set up:", error);
});
```
