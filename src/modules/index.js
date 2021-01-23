/**
 * @fileinfo Puts all modules into a single export objcet
 */
module.exports = {
  DataRequest: require("./DataRequest"),
  FeedbackSent: require("./FeedbackSent"),
  PlayerJoined: require("./PlayerJoined"),
  PlayerLeft: require("./PlayerLeft"),
  TeamSent: require("./TeamSent"),
  TwoFactorAnswered: require("./TwoFactorAnswered"),
  QuestionAnswered: require("./QuestionAnswered"),
  TimeOver: require("./TimeOver"),
  SendQuestionResults: require("./SendQuestionResults"),
  Lock: require("./Lock"),
  Unlock: require("./Unlock"),
  KickPlayer: require("./KickPlayer"),
  ResetGame: require("./ResetGame"),
  ReplayGame: require("./ReplayGame"),
  Start: require("./Start"),
  StartTeamTalk: require("./StartTeamTalk"),
  ReadyQuestion: require("./ReadyQuestion"),
  StartQuestion: require("./StartQuestion"),
  ResetTwoFactorAuth: require("./ResetTwoFactorAuth"),
  RequestFeedback: require("./RequestFeedback"),
  EndGame: require("./EndGame"),
  SendRankings: require("./SendRankings")
};
