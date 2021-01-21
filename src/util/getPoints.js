module.exports = function getPoints(type, question, choice, client, answer) {
  const {pointsData} = answer,
    {answerStreakPoints} = pointsData,
    correct = answer.isCorrect;
  pointsData.lastGameBlockIndex = !client.currentQuestionIndex ? 0 : client.currentQuestionIndex - 1;
  answerStreakPoints.previousStreakBonus = answerStreakPoints.streakBonus;
  answerStreakPoints.previousStreakLevel = answerStreakPoints.streakLevel;
  switch(type) {
    case "word_cloud":
    case "multiple_select_poll":
    case "content":
    case "survey": {
      pointsData.questionPoints = 0;
      return 0;
    }
    case "multiple_select_quiz": {
      choice = Array.from(choice);
      if(correct && answer.pointsQuestion) {
        const responseRatio = (answer.receivedTime -  this.questionStartTime) / (question.time || 20000),
          newValue = responseRatio / 2,
          inverse = 1 - newValue,
          maxPoints = 1000 * (question.pointsMultiplier || 1),
          points = Math.round(inverse * maxPoints * choice.length);
        let streakBonus = 0;
        if(client.options.enableStreakBonus) {
          streakBonus = answerStreakPoints.streakLevel >= 4 ? 500 : answerStreakPoints.streakLevel * 100;
        }
        pointsData.questionPoints = points;
        pointsData.totalPointsWithoutBonuses += points;
        pointsData.totalPointsWithoutBonuses += points + streakBonus;
        answerStreakPoints.streakLevel++;
        answerStreakPoints.totalStreakPoints += streakBonus;
        answerStreakPoints.streakBonus = streakBonus;
        return points + streakBonus;
      } else if (correct) {
        pointsData.questionPoints = 0;
        answerStreakPoints.streakLevel++;
        answerStreakPoints.streakBonus = 0;
      } else {
        pointsData.questionPoints = 0;
        answerStreakPoints.streakBonus = 0;
        answerStreakPoints.streakLevel = 0;
        return 0;
      }
      return;
    }
    default: {
      if(correct && answer.pointsQuestion) {
        const responseRatio = (answer.receivedTime -  this.questionStartTime) / (question.time || 20000),
          newValue = responseRatio / 2,
          inverse = 1 - newValue,
          maxPoints = 1000 * (question.pointsMultiplier || 1),
          points = Math.round(inverse * maxPoints);
        let streakBonus = 0;
        if(client.options.enableStreakBonus) {
          streakBonus = answerStreakPoints.streakLevel >= 4 ? 500 : answerStreakPoints.streakLevel * 100;
        }
        pointsData.questionPoints = points;
        pointsData.totalPointsWithoutBonuses += points;
        pointsData.totalPointsWithoutBonuses += points + streakBonus;
        answerStreakPoints.streakLevel++;
        answerStreakPoints.totalStreakPoints += streakBonus;
        answerStreakPoints.streakBonus = streakBonus;
        return points + streakBonus;
      } else if(correct) {
        // correct, but not a points question
        pointsData.questionPoints = 0;
        answerStreakPoints.streakLevel++;
        answerStreakPoints.streakBonus = 0;
      } else {
        // wrong
        pointsData.questionPoints = 0;
        answerStreakPoints.streakBonus = 0;
        answerStreakPoints.streakLevel = 0;
        return 0;
      }
    }
  }
};
