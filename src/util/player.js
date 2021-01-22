module.exports = class Player{
  constructor(data, client) {
    this.client = client;
    this.name = data.name;
    this.cid = data.cid;
    this.team = null;
    this.active = false;
    this.answer = null;
    this.data = {
      correctCount: 0,
      incorrectCount: 0,
      unansweredCount: 0
    };
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
    if(client.options.gameMode !== "team" && !client.options.twoFactorAuth) {
      this.active = true;
    }
  }
  get recoveryData() {
    const data = JSON.parse(JSON.stringify(this.client.recoveryData));
    switch(data.state) {
      case 2: {
        data.data.getReady.timeLeft = Math.ceil(data.data.getReady.timeLeft - (Date.now() - this.client.getReadyTime));
        break;
      }
      case 3: {
        data.data.timeAvailable = Math.ceil(data.data.timeAvailable - (Date.now() - this.client.questionStartTime));
        break;
      }
      case 4:
      case 5: {
        data.data.timeUp.cid = this.cid;
        data.data.revealAnswer = this.answer || data.data.revealAnswer;
        break;
      }
    }
    return data;
  }
};
