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
      console.log("PIN: ", pin);
      return client.join(pin, "Basic Test");
    }).then(() => {
      let quizStarted = false,
        answerProcessed = false,
        index = -1,
        timeUp = false,
        podium = false,
        left = false;
      client.once("NameAccept", (data) => {
        if(data.playerName !== "Basic Test" && data.playerV2 === true && data.quizType === "quiz") {
          reject({
            error: data,
            description: "data.playerName did not match test name"
          });
        }
        setTimeout(() => {
          if(!quizStarted) {
            reject({
              description: "The quiz was not started automatically"
            });
          }
        },20e3);
      });
      client.once("RecoveryData", (data) => {
        if(!data.defaultQuizData || !data.data) {
          reject({
            error: data,
            description: "Recovery data was not complete"
          });
        }
      });
      client.once("QuizStart", (data) => {
        quizStarted = true;
        console.log("Quiz Started", data);
      });
      client.on("QuestionReady", (data) => {
        console.log("Received question ready", data);
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
        if(index === data.questionIndex) {
          reject({
            error: data,
            description: "The same question index was played"
          });
        } else {
          index = data.questionIndex;
        }
      });
      client.on("QuestionStart", (data) => {
        answerProcessed = false;
        timeUp = false;
        console.log("Question Started", data);
        if(!(typeof data.questionIndex === "number" &&
          typeof data.gameBlockType === "string" &&
          typeof data.quizQuestionAnswers === "object" &&
          typeof data.timeAvailable === "number" &&
          typeof data.timeLeft === "number" &&
          typeof data.numberOfAnswersAllowed === "number"
        )) {
          reject({
            error: data,
            description: "Question start data is not formatted correctly"
          });
        }
        console.log("Answering 1");
        data.answer(1);
        setTimeout(() => {
          if(!answerProcessed) {
            reject({
              description: "Question was not automatically ended after answering"
            });
          }
        },5e3);
      });
      client.on("TimeOver", (data) => {
        timeUp = true;
        if(typeof data.questionNumber !== "number") {
          reject({
            error: data,
            description: "Time over was not formatted correctly"
          });
        }
      });
      client.on("QuestionEnd", (data) => {
        answerProcessed = true;
        if(!(typeof data.choice !== "undefined" &&
          data.choice !== null &&
          typeof data.type === "string" &&
          typeof data.isCorrect === "boolean" &&
          typeof data.text === "string" &&
          typeof data.receivedTime === "number" &&
          typeof data.points === "number" &&
          typeof data.correctChoices === "object" &&
          typeof data.rank === "number" &&
          typeof data.pointsData === "object"
        )) {
          reject({
            error: data,
            description: "Question end data is not formatted correctly"
          });
        }
        if(!timeUp) {
          reject({
            error: data,
            description: "Question end before time up"
          });
        }
        console.log("Got question end", data);
      });
      client.once("Podium", (data) => {
        podium = true;
        if(typeof data.podiumMedalType !== "string" && data.podiumMedalType !== null) {
          reject({
            error: data,
            description: "Podium was not formatted corrcetly"
          });
        }
      });
      client.once("QuizEnd", (data) => {
        console.log("Quiz ended", data);
        if(!(typeof data.rank === "number" &&
          typeof data.cid === "string" &&
          typeof data.correctCount === "number" &&
          typeof data.incorrectCount === "number" &&
          typeof data.unansweredCount === "number" &&
          typeof data.playerCount === "number" &&
          typeof data.isKicked === "boolean" &&
          typeof data.isGhost === "boolean" &&
          typeof data.startTime === "number" &&
          typeof data.quizId === "string" &&
          typeof data.name === "string" &&
          typeof data.totalScore === "number" &&
          data.hostId === "" &&
          data.challengeId === null &&
          data.isOnlyNonPointGameBlockKahoot === false
        )) {
          reject({
            error: data,
            description: "Quiz end was not formatted correctly"
          });
        }
        if(!podium) {
          reject({
            error: data,
            description: "Quiz end came before podium"
          });
        }
        host.closeGame();
        setTimeout(() => {
          if(!left) {
            reject({
              description: "Faild to disconnect clients"
            });
          } else {
            console.log("[TEST] - Basic passed!");
            resolve();
          }
        }, 10e3);
      });
      client.once("Disconnect", (data) => {
        left = true;
        console.log(data);
      });
      host.on("error", (error) => {
        reject(error);
      });
    }).catch((error) => {
      reject(error);
    });
  });
};
