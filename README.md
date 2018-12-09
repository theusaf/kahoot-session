# kahoot-session
#### An script that allows you to create Kahoot! quizzes with more control
---
### Installation:
> npm i theusaf/kahoot-session

---
Basic usage:

```javascript
const Game = require('kahoot session');

var Session = new Game('c5429a87-08b5-4aeb-a90c-bd56ebf09540');

Session.on("join",player=>{
  console.log(player.name + " has joined the kahoot!");
});

Session.start();
```
---
## More Functions
```js
Session.end(); //closes the game.
Session.startQuiz(); //starts the quiz.
Session.kickPlayer(1 || "1"); //kicks a player with id "1"
Session.endQuestion(); //ends the question early.
Session.nextQuestion(); //sends the next question
Session.endQuiz(); //ends the quiz
Session.setSnark("answer"); //wip. not used currently
```
---
## Events
```js
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
Session.on("start",question=>{
  //runs on the start of the quiz/question. Has the question object.
});
Session.on("questionEnd",players=>{
  //runs when the question ends. Players is a sorted list of players based on score
});
Session.on("quizEnd",players=>{
  //runs at end of quiz. Players is a sorted list of players based on score
});
```
---
### To Do's
- allow usage of urls instead of id in constructor
- allow other types of kahoots besides quizzes
