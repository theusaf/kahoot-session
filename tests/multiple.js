/**
 * @fileinfo Checks whether the playlist function and multiple players in the game works as expected
 */
const {Client:Host} = require("../index"),
  Client = require("kahoot.js-updated"),
  sleep = require("../src/util/sleep");
module.exports = function multipleTest() {
  const host = new Host({
      autoPlay: true
    }),
    client = new Client,
    client2 = new Client;
  return new Promise((resolve, reject) => {
    console.log("[TEST] - Multiple starting");
    let countdownInterval = null;
    host.initialize([
      "https://create.kahoot.it/details/space-exploration/f954d734-7b26-4519-ba99-4134b3416be1",
      "c2227e28-5cd0-41b6-a758-1d4aca486bda"
    ]).then(() => {
      return host.start();
    }).then((pin) => {
      console.log("PIN:", pin);
      host.currentQuestionIndex = host.quiz.questions.length - 2;
      host.once("PlayerJoined", () => {
        countdownInterval = host.mainEventTimer;
      });
      console.log("Joining Player 1");
      return client.join(pin, "Test 1");
    }).then(async () => {
      await sleep(5);
      console.log("Joining Player 2");
      host.once("PlayerJoined", () => {
        if(countdownInterval === host.mainEventTimer) {
          reject({
            description: "New player joining did not change timer"
          });
        }
      });
      return client2.join(host.gameid, "Test 2");
    }).then(() => {
      // First question, 1 answer, 1 does not answer
      let ended = false;
      host.once("QuestionResults", () => {
        ended = true;
        console.log("Question 1 ended");
        let ended2 = false;
        host.once("error", (error) => {
          reject(error);
        });
        host.once("QuestionResults", () => {
          ended2 = true;
          console.log("Question 2 Ended.");
          host.once("GameReset", () => {
            console.log("Game has reset.");
            if(!(host.state === "lobby" &&
              host.currentQuestionIndex === 0 &&
              host.currentQuizIndex === 1 &&
              host.quiz.uuid === "c2227e28-5cd0-41b6-a758-1d4aca486bda"
            )) {
              reject({
                error: host,
                description: "The host did not continue to the next quiz"
              });
            }
            let started = false,
              started2 = false,
              started3 = false;
            host.once("GameStart", () => {
              console.log("Starting quiz 2");
              started = true;
            });
            client.on("QuizStart", () => {
              console.log("[1] - Playing again!");
              started2 = true;
            });
            client.on("QuizStart", () => {
              console.log("[2] - Playing again!");
              started3 = true;
            });
            setTimeout(() => {
              if(!started || !started2 || !started3) {
                console.log("Game did not start a second time");
                reject({
                  error: [started, started2, started3],
                  description: "Game failed to start a second time automatically"
                });
              } else {
                console.log("[TEST] - Multiple passed!");
                host.closeGame();
                resolve();
              }
            }, 25e3);
          });
          host.on("QuestionStart", () => {
            console.log("Question started", host.currentQuestionIndex);
          });
          host.on("QuestionEnd", () => {
            console.log("Question end", host.currentQuestionIndex);
          });
          host.on("Rankings", () => {
            console.log("Rankings sent");
          });
          host.on("GameEnd", () => {
            console.log("Game ended");
          });
        });
        host.once("QuestionStart", async () => {
          console.log("Question 2 Started. Both answering");
          await sleep(0.5);
          client.answer(1);
          client2.answer(3);
          setTimeout(() => {
            if(!ended2) {
              reject({
                description: "The question should have ended as both client answered."
              });
            }
          }, 5e3);
        });
      });
      host.once("QuestionStart", async () => {
        await sleep(0.5);
        console.log("Question 1 started. Answering with 1 client");
        client.answer(1);
        setTimeout(() => {
          if(ended) {
            reject({
              description: "The question should not have ended early, since only one client answered"
            });
          }
        }, 5e3);
      });
      function QE(data) {
        if(data.rank === 1) {
          if(data.nemesis) {
            reject({
              error: data,
              description: "The first place player should not have a nemesis"
            });
          }
        } else {
          if(typeof data.nemesis !== "object") {
            reject({
              error: data,
              description: "The second place player should have a nemesis"
            });
          }
        }
      }
      client2.once("QuestionEnd", QE);
      client.once("QuestionEnd", QE);
    }).catch((error) => {
      reject(error);
    });
  });
};
