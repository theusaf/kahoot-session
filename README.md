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
mode: ("team"|"normal") // enable team mode or play normally
twoFactorAuth: (false|true) //whether to enable two factor authentification. default is false
useAntiBot: (false|true) //enable the antibot and ban bots. (from greasyfork). defaults to false [Not fully working]
antiBotPercent: (0-1) //the percent number for names to match in order to be banned. defaults to 0.6
```
---
## More Functions
```js
Session.end(); //closes the game.
Session.startQuiz(); //starts the quiz.
Session.kickPlayer(id); //kicks a player with id
Session.endQuestion(); //ends the question early.
Session.nextQuestion(); //sends the next question
Session.endQuiz(); //ends the quiz
Session.rankPlayers(); //returns an ordered list of Players
Session.getPlayerById(id); //gets the player by id
Session.requestFeedback(); // at the end of the quiz, ask for feedback
// Lock or unlock a session
Session.lock();
Session.unlock();
```
---
## Events
```js
Session.on("answer",(id,data)=>{
  //when somebody answers the quiz. id is the id of the player who sent the answer.
  //if manuallyHandleAnswers is enabled, id is actually the data of the player, including id, and choice, etc.
  // data is the raw data of the choice
});
Session.on("start",quiz=>{
  //when quiz starts. has quiz object.
});
Session.on("ready",session=>{
  //runs when the quiz is set up and ready to go.
  //session is the session number that players use to connect to
});
Session.on("TFA",code=>{
  // runs when code is updated.
  const example_code = [1,2,0,3];
});
Session.on("feedback",data=>{
  // runs when feedback is sent back to the host
  const example_feedback = {
    totalScore: 9482,
    fun: 3,
    learning: 1,
    recommend: 1,
    overall: 1,
    nickname: 'SwiftSable'
  }
});
Session.on("close",()=>{
  //runs when the quiz is closed.
});
Session.on("open",()=>{
  //runs when quiz is first made
});
Session.on("questionStart",question=>{
  //runs on the start of the quiz. Has the question object.
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
Session.jumbleData // the jumble information (correct order)
Session.session //session id
Session.clientID //client id
Session.quiz //quiz info
Session.secret //secret kahoot token
Session.quizIndex //current quiz index
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
---
# TODO
- Allow support for feedback
- Support all quizzes
- Clean up the code and make sure there are no bugs
- Make the code 100% like kahoot's code
