# kahoot-session
#### An script that allows you to create Kahoot! quizzes with more control
---
### Installation:
> npm i kahoot-session

---
Basic usage:

```javascript
const Game = require('kahoot-session');

var Session = new Game('c5429a87-08b5-4aeb-a90c-bd56ebf09540',/*options*/);

Session.on("join",player=>{
  console.log(player.name + " has joined the kahoot!");
});

Session.start();
```
---
#Session Options
```js
manuallyHandleAnswers: (false|true) //whether you are going to manually handle answers and the point system. default is false
autoNextQuestion: (false|true) //whether you are going to automatically go through questions. default is false.
namerator: (false|true) //whether to enable the namerator. default is false
twoFactorAuth: (false|true) //whether to enable two factor authentification. currently does nothing. default is false
useAntiBot: (false|true) //enable the antibot and ban bots. (from greasyfork). defaults to false
antiBotPercent: (0-1) //the percent number for names to match in order to be banned. defaults to 0.6
```
---
## More Functions
```js
Session.end(); //closes the game.
Session.startQuiz(Session); //starts the quiz.
Session.kickPlayer(id); //kicks a player with id
Session.endQuestion(); //ends the question early.
Session.nextQuestion(); //sends the next question
Session.endQuiz(); //ends the quiz
Session.setSnark(Session,"answer",0,"foo"); //["answer","rank","finish"] (answer is the text when answering questions, rank is the ranking text, and finish is the secondary ranking text) [index/array] (index/array is the text to replace) [text] (value to set item.)
Session.rankPlayers(); //returns an ordered list of Players
Session.getPlayerById(id); //gets the player by id
```
---
## Events
```js
Session.on("answer",id=>{
  //when somebody answers the quiz. id is the id of the player who sent the answer.
  //if manuallyHandleAnswers is enabled, id is actually the data of the player, including id, and choice, etc.
});
Session.on("start",quiz=>{
  //when quiz starts. has quiz object.
});
Session.on("handshake",id=>{
  //technical event. Id is the "clientId"
});
Session.on("ready",session=>{
  //runs when the quiz is set up and ready to go.
  //session is the session number that players use to connect to
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
});
Session.on("leave",player=>{
  //runs when a player leaves
  //player had id and name
});
```
---
## Properties
```js
Session.players //list of players
Session.session //session id
Session.clientID //client id
Session.quiz //quiz info
Session.secret //secret kahoot token
Session.quizIndex //current quiz index
Session.snark //an array of text to send after the player answers
Session.success //an array of text to send at the end of the quiz. (the top text) ["1st","2nd","3rd","top 5","below top 5"]
Session.success2 //an array of text to send at the end of the quiz (the bottom text) ["you won!","almost","good try","made it to the leaderboard at least","good job, nice try"]
```
---
```js
var Session = new Game({/*quiz object*/},/*options*/);
//You can create your own quiz using:
new Game.Quiz(name,/*options*/);
```
---
## Quiz Class Options
```js
type: //Sets the type of the quiz. Defaults to "quiz"
//The following are pointless, but are available to use despite having no effect
language: //sets the language
audience: //sets audience
description: //sets desc
```
---
## Quiz Class Properties
```js
Quiz.uuid //uuid of the quiz. defaults to "no-uuid" and has no effect on the game
//useless metadata
Quiz.creator
this.metadata
this.folderId
this.cover
this.resources
this.modified
this.visibility
this.slug
this.creator_primary_usage
this.coverMetadata
this.language
this.audience
this.description

this.title //the title of the quiz
this.questions //the question list
this.type //type of the quiz
this.quizType //type of the quiz...

/*
// NOTE: You can set up custom metadata and stuff for jumbles, which have a little extra data
*/
```
---
## Question Class Properties and Methods
```js
//to be used by Quiz.addQuestion();
this.__proto__.quiz //this quiz of the question
this.question //the question text
this.choices //the list of answers for the question
this.numberOfAnswers //how many choices there are.
this.points //whether to give points for the question
this.questionFormat //question metadata
this.resources //image metadata
this.time //time of the question
this.type //type of the question. defaults to "quiz".
this.image //url of image
this.imageMetadata //metadata of image, must be manually set
this.video = { //youtube video
  id: "",
  endTime: 0,
  fullUrl: "",
  service: "youtube",
  startTime: 0
}
getQuiz() //returns the quiz of the question
addChoice(choice, correct) //adds a question choice, with the answer (choice) and whether it is correct answer (correct). returns the question
setTime(time){ //sets the time of the question. returns the question.
setPoints(bool) //whether the question gives points. returns the question.
```
