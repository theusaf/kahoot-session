# kahoot-session
#### An script that allows you to create Kahoot! quizzes with more control
---
### Installation:
> npm i kahoot-session

---
Basic usage:

```javascript
const Game = require('kahoot-session');

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
  //events qstart and start are similar events, but should be replaced with this.
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
```
