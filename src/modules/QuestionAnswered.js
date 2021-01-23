module.exports = function QuestionAnswered(data) {
  try {
    const {cid, content} = data,
      quiz = this.quiz,
      question = quiz.questions[this.currentQuestionIndex],
      {type,points,choices} = question,
      player = this.controllers[cid],
      answer = JSON.parse(content),
      {choice} = answer,
      answerData = {
        pointsData: player.pointsData
      };
    if(this.state !== "question") {
      // cannot answer yet!
      return;
    }
    if(player.answer !== null){
      // already answered
      return;
    }
    if(!player.active){
      // cannot partake yet
      return;
    }
    answerData.correctChoices = [];
    answerData.hasAnswer = true;
    answerData.type = type;
    answerData.choice = choice;
    answerData.receivedTime = Date.now();
    switch(type) {
      case "open_ended": {
        answerData.text = `${choice}`.toLowerCase();
        answerData.pointsQuestion = true;
        break;
      }
      case "multiple_select_quiz": {
        answerData.text = Array.from(choice).map((c) => {
          return choices[+c] ? choices[+c].answer : "";
        }).join("|");
        answerData.pointsQuestion = points;
        const c = [];
        for(let i = 0; i < choices.length; i++) {
          if(choices[i].correct) {
            c.push(i);
          }
        }
        answerData.correctChoices = c;
        break;
      }
      case "jumble": {
        answerData.text = Array.from(choice).map((c) => {
          return choices[+c] ? choices[+c].answer : "";
        }).join("|");
        answerData.pointsQuestion = points;
        break;
      }
      case "survey": {
        answerData.text = choices[+choice] ? choices[+choice].answer : "";
        answerData.pointsQuestion = false;
        break;
      }
      case "multiple_select_poll": {
        answerData.text = Array.from(choice).map((c) => {
          return choices[+c] ? choices[+c].answer : "";
        }).join("|");
        answerData.pointsQuestion = false;
        break;
      }
      case "content":
      case "word_cloud": {
        answerData.text = `${choice}`;
        answerData.pointsQuestion = false;
        break;
      }
      default: {
        answerData.text = choices[+choice] ? choices[+choice].answer : "";
        answerData.pointsQuestion = points;
      }
    }
    player.answer = answerData;
  } catch(error) {
    this.emit("error", {
      error,
      description: "Unknown error while handling QuestionAnswered"
    });
  }
  this.emit("QuestionAnswered", data);
  this.checkAllAnswered();
};
