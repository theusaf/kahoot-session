module.exports = function QuestionAnswered(data) {
  this.emit("QuestionAnswered", data);
  try {
    const {cid, content} = data,
      quiz = this.quiz,
      question = quiz[this.currentQuestionIndex],
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
    if(typeof player.answer === "object"){
      // already answered
      return;
    }
    answerData.hasAnswer = true;
    answerData.type = type;
    answerData.choice = choice;
    answerData.receivedTime = Date.now();
    switch(type) {
      case "open_ended": {
        answerData.text = `${choice}`;
        answerData.pointsQuestion = true;
        break;
      }
      case "multiple_select_quiz": {
        answerData.text = Array.from(choice).join("|");
        answerData.pointsQuestion = points;
        let c = [];
        for(let i = 0; i < choices.length; i++) {
          if(choices[i].correct) {
            c.push(i);
          }
        }
        answerData.correctChoices = c;
        break;
      }
      case "jumble": {
        answerData.text = Array.from(choice).join("|");
        answerData.pointsQuestion = points;
        break;
      }
      case "survey":
      case "content":
      case "word_cloud":
      case "multiple_select_poll": {
        answerData.text = `${choice}`;
        answerData.pointsQuestion = false;
        break;
      }
      default: {
        answerData.text = `${choice}`;
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
  this.checkAllAnswered();
};
