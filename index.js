const clients = require("./src/host"),
  quiz = require("./src/util/quiz"),
  question = require("./src/util/question");

clients.Quiz = quiz;
clients.Question = question;

module.exports = clients;
