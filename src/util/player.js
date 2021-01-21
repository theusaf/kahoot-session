module.exports = class Player{
  constructor(data, client) {
    this.name = data.name;
    this.recoveryData = {
      hasAnswer: false
    };
    this.team = null;
    this.active = false;
    this.answer = null;
    this.pointsData = {
      questionPoints: 0,
      totalPointsWithBonuses: 0,
      totalPointsWithoutBonuses: 0,
      lastGameBlockIndex: 0,
      answerStreakPoints: {
        streakLevel: 0,
        streakBonus: 0,
        totalStreakPoints: 0,
        previousStreakLevel: 0,
        previousStreakBonus: 0
      }
    };
  }
};
