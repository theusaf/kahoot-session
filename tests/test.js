const path = require('path');
const game = require(path.join(__dirname,"..","WSHandler.js"));

const quiz = new game.Quiz("Testing123");

quiz.addQuestion("What is the meaning of life").setTime(10000).addChoice("42",true).addChoice("24",false).addChoice("lmao",false).addChoice("gg",false).getQuiz().addQuestion("Why is Gamora").setTime(10000).addChoice("yes",false).addChoice("no",false).addChoice("shut up",true).addChoice("haha",false).getQuiz().addQuestion("Can you see the love tonight").setTime(10000).addChoice("no",true).addChoice("yes",true).addChoice("lmao",false).addChoice("gg",false);

//const Session = new game(quiz,{autoNextQuestion:true});
const Session = new game("ac401413-7183-45e2-b1ea-66e90dcfa8cf",{autoNextQuestion:true,useAntiBot:true});
Session.start();

Session.on("answer",id=>{
  //when somebody answers the quiz. id is the id of the player who sent the answer.
  //if manuallyHandleAnswers is enabled, id is actually the data of the player, including id, and choice, etc.
});
Session.on("start",quiz=>{
  //when quiz starts. has quiz object.
  console.log(quiz);
});
Session.on("handshake",id=>{
  //technical event. Id is the "clientId"
});
Session.on("ready",session=>{
  //runs when the quiz is set up and ready to go.
  //session is the session number that players use to connect to
  console.log(session);
});
Session.on("close",()=>{
  //runs when the quiz is closed.
});
Session.on("open",()=>{
  //runs when quiz is first made
});
Session.on("questionStart",question=>{
  //runs on the start of the quiz. Has the question object.
  //event start is similar events, but should be replaced with this.
  console.log(question);
});
Session.on("questionEnd",players=>{
  //runs when the question ends. Players is a sorted list of players based on score
});
Session.on("quizEnd",players=>{
  //runs at end of quiz. Players is a sorted list of players based on score
});
Session.on("join",player=>{
  //runs when a player joins.
  //player has id and name
  setTimeout(()=>{Session.startQuiz(Session)},2000);
});
Session.on("leave",player=>{
  //runs when a player leaves
  //player had id and name
});
