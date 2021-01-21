const clients = require("./src/host.js"),
  quiz = require("./src/util/quiz.js"),
  question = require("./src/util/question.js");

clients.Quiz = quiz;
clients.Question = question;

module.exports = clients;
