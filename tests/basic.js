/**
 * @fileinfo This file checks a 'regular' game and makes sure the basic functions work
 */

const {Client:Host} = require("../index"),
  Client = require("kahoot.js-updated");

module.exports = function basicTest() {
  return new Promise((resolve, reject) => {
    console.log("[TEST] - Basic starting!");
    const host = new Host({
        autoPlay: true
      }),
      client = new Client;
    host.initialize("https://create.kahoot.it/details/space-exploration/f954d734-7b26-4519-ba99-4134b3416be1").then(() => {
      return host.start();
    }).then((pin) => {
      return client.join(pin, "Basic Test");
    }).then(() => {
      client.once("NameAccept", (data) => {
        if(data.playerName !== "Basic Test" && data.playerV2 === true && data.quizType === "quiz") {
          reject({
            error: data,
            description: "data.playerName did not match test name"
          });
        }
      });
      client.once("RecoveryData", (data) => {
        if(!data.data.defaultQuizData) {
          reject({
            error: data,
            description: "Recovery data was not complete"
          });
        }
      });
      client.on("QuestionReady", (data) => {
        if(!(typeof data.questionIndex === "number" &&
          typeof data.gameBlockType === "string" &&
          typeof data.timeLeft === "number" &&
          typeof data.quizQuestionAnswers === "object"
        )) {
          reject({
            error: data,
            description: "Question Ready data is not formatted correctly"
          });
        }
      });
    }).catch((error) => {
      reject(error);
    });
  });
};
