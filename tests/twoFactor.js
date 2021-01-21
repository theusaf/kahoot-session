const game = require("../WSHandler.js");
//const Session = new game(quiz,{autoNextQuestion:true});
const Session = new game("c2227e28-5cd0-41b6-a758-1d4aca486bda",{
  autoNextQuestion: true,
  useAntiBot: true,
  twoFactorAuth: true
});
Session.start();
Session.on("start",quiz=>{
  //when quiz starts. has quiz object.
});
Session.on("TFA",code=>{
  console.log(code);
});
Session.on("ready",session=>{
  //runs when the quiz is set up and ready to go.
  //session is the session number that players use to connect to
  console.log(session);
});
Session.on("questionStart",question=>{
  //runs on the start of the quiz. Has the question object.
  //event start is similar events, but should be replaced with this.
  console.log(question);
  if(question.type == "content"){
    setTimeout(()=>{
      Session.endQuestion();
    },10000);
  }
});
Session.on("join",player=>{
  //runs when a player joins.
  //player has id and name
  console.log(player);
  setTimeout(()=>{Session.startQuiz(Session);},2000);
});
Session.on("quizEnd",()=>{
  Session.requestFeedback();
});
Session.on("feedback",data=>{
  console.log(data);
});
