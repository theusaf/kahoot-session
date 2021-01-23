const {Client:Host} = require("../index"),
  Client = require("kahoot.js-updated"),
  sleep = require("../src/util/sleep");
module.exports = function twoFactorAuthTest() {
  console.log("[TEST] - Two Factor starting");
  return new Promise((resolve, reject) => {
    const host = new Host({
        autoPlay: true,
        twoFactorAuth: true
      }),
      client = new Client;
    host.initialize("https://create.kahoot.it/details/space-exploration/f954d734-7b26-4519-ba99-4134b3416be1").then(() => {
      return host.start();
    }).then(async (pin) => {
      console.log("PIN:", pin);
      host.once("PlayerJoined", (data) => {
        console.log("Player joined", data);
        if(host.controllers[data.cid].active) {
          reject({
            error: data,
            description: "Client was made active despite not passing the two-factor auth"
          });
        }
      });
      await sleep(1);
      return client.join(pin, "TwoFactorTest");
    }).then((data) => {
      console.log(data);
      client.once("TwoFactorReset", async () => {
        console.log("Answering two factor #1");
        await sleep(0.5);
        if(host.twoFactorSteps[0] === 0) {
          client.answerTwoFactorAuth([3, 2, 1, 0]);
        } else {
          client.answerTwoFactorAuth([0, 1, 2, 3]);
        }
      });
      let correct = false,
        wrong = false;
      client.once("TwoFactorCorrect", async () => {
        console.log("Correct");
        correct = true;
      });
      client.once("TwoFactorWrong", async () => {
        console.log("Wrong");
        wrong = true;
      });
      host.once("TwoFactorAnswered", (data) => {
        console.log("data", data);
        if(host.controllers[client.cid].active) {
          reject({
            error: data,
            description: "Client was made active despite not passing the two-factor auth"
          });
        } else {
          client.once("TwoFactorReset", async () => {
            console.log("Answering two factor #2");
            if(correct) {
              reject({
                description: "Client was marked correct for two-factor steps unexpectedly"
              });
            }
            await sleep(0.5);
            client.answerTwoFactorAuth(host.twoFactorSteps);
            host.once("TwoFactorAnswered", (data) => {
              console.log("data", data);
              if(host.controllers[client.cid].active) {
                setTimeout(() => {
                  if(wrong || !correct) {
                    console.log("[TEST] - Two Factor passed!");
                    host.closeGame();
                    resolve();
                  } else {
                    reject({
                      error: data,
                      description: "Client was not marked correct"
                    });
                  }
                }, 5e3);
              } else {
                reject({
                  error: data,
                  description: "Client was not made active despite passing the two-factor auth"
                });
              }
            });
          });
        }
      });
    }).catch((error) => {
      reject(error);
    });
  });
};
