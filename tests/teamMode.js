const {Client:Host} = require("../index"),
  Client = require("kahoot.js-updated");
module.exports = function teamModeTest() {
  return new Promise((resolve, reject) => {
    console.log("[TEST] - Team Mode starting");
    const host = new Host({
        autoPlay: true,
        gameMode: "team"
      }),
      client = new Client;
    host.initialize("https://create.kahoot.it/details/space-exploration/f954d734-7b26-4519-ba99-4134b3416be1").then(() => {
      return host.start();
    }).then((pin) => {
      console.log("PIN:", pin);
      host.once("PlayerJoined", (data) => {
        console.log("Player Joined", data);
        if(host.controllers[data.cid].active) {
          reject({
            error: data,
            description: "Client was set to active despite not sending their team members"
          });
        }
        setTimeout(() => {
          host.next();
        },5e3);
      });
      return client.join(pin, "Test", false);
    }).then((data) => {
      console.log("Game settings:", data);
      if(data.gameMode !== "team") {
        reject({
          error: data,
          description: `Unexpected game mode '${data.gameMode}'`
        });
      }
      let answered = false,
        teamtalk = false;
      host.once("QuestionAnswered", () => {
        answered = true;
      });
      host.once("TeamTalk", () => {
        console.log("Team talk started.");
        teamtalk = true;
      });
      host.once("QuestionStart", () => {
        if(!teamtalk) {
          reject({
            description: "Question start ocurred before team talk."
          });
        }
        console.log("Question started. Trying to answer 1.");
        setTimeout(() => {
          client.answer(1);
        }, 1e3);
        setTimeout(() => {
          if(answered) {
            reject({
              description: "Client answered despite not being connected fully"
            });
          }
        }, 2e3);
      });
      host.once("QuestionResults", () => {
        console.log("Question ended. Trying to join team members");
        setTimeout(() => {
          client.joinTeam().catch((error) => {
            reject(error);
          });
        }, 1e3);
        host.once("TeamReceived", (data) => {
          if(!host.controllers[data.cid].active) {
            reject({
              error: data,
              description: "Client was not set to active despite sending their team members"
            });
          } else {
            host.closeGame();
            console.log("[TEST] - Team Talk passed!");
            resolve();
          }
        });
      });
    }).catch((error) => {
      reject(error);
    });
  });
};
