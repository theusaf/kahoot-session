module.exports = {
  endpoint: "kahoot.it",
  port: 443,
  wss_endpoint: "wss://play.kahoot.it/cometd",
  quiz_id: "https://create.kahoot.it/rest/kahoots/",//61d327f5-1c9c-44f6-9886-4362d2cfc607
  quiz_extra: "?_=",//time
  //Note: the session request also has the kahoot token.
  get_session: "https://play.kahoot.it/reserve/session/?",//time
  session_opts: {
    gameMode: "normal",
    namerator: false,
    twoFactorAuth: false
  },
  user_id: "56936bb8-8653-4130-9cf2-be47a54b42a7",
  connection_type: ["websocket","long-polling"],
  channels: {
    handshake: "/meta/handshake",
    subscribe: "/meta/subscribe",
    subscription: "/service/player",
    sub_controller: "/controller/", //session
    connect: "/meta/connect"
  },
  AmpAPI: [{
    v: 2,
    a: 0,//function(){return Date.now()},
    key: "f4f55f73fbc8e071422c933108b66218",
    s: {
      device_id: "none",
      user_id: "none",
      //timestamp,
      event_id: 1049,
      //session_id = time at start?...,
      event_type: "Launch Kahoot",
      os_name: "npm",
      platform: "nodejs",
      version_name: null,
      os_version: "8",
      device_model:"node",
      language:"en-US",
      api_properties:{},
      event_properties:{}, //customized..
      user_properties:{},
      uuid:"none",
      library:{
        name:"amplitude-js",
        version:"4.2.1"
      },
      sequence_number:1528,
      groups:{},
      user_agent:"nodejs"
    }
  },{
    v: 2,
    a: 0,
    key: "f4f55f73fbc8e071422c933108b66218",
    s: {
      device_id: "none",
      user_id: "none",
      //timestamp,
      event_id: 487,
      //session_id = time at start?...,
      event_type: "$identify",
      os_name: "npm",
      platform: "nodejs",
      version_name: null,
      os_version: "8",
      device_model:"node",
      language:"en-US",
      api_properties:{},
      event_properties:{},
      user_properties:{
        "$setOnce":{
          created: null,
          uuid: "3cd88edb-1df8-46e1-996c-1b54ed0a72ef"
        }
      },
      uuid:"none",
      library:{
        name:"amplitude-js",
        version:"4.2.1"
      },
      sequence_number:1528,
      groups:{},
      user_agent:"nodejs"
    }
  }],
  eval: "var _ = {" +
			"	replace: function() {" +
			"		var args = arguments;" +
			"		var str = arguments[0];" +
			"		return str.replace(args[1], args[2]);" +
			"	}" +
			"}; " +
			"var log = function(){};" +
			"return ",
  host: "play.kahoot.it",
  cid: "1",
  player_id: 14,
  send_quiz_id: 9, //{"quizName":"Newsquiz for kids: Nov 26 - Dec 2","quizType":"quiz","quizQuestionAnswers":[4,4,4,4,2,4,4]}
  send_question_id: 1, //{"questionIndex":0,"answerMap":{"0":2,"1":0,"2":3,"3":1},"canAccessStoryBlocks":false,"gameBlockType":"quiz","timeLeft":4,"quizType":"quiz","quizQuestionAnswers":[4,4,4,4,2,4,4]}
  quiz_end: 4, //{"questionNumber":0,"quizType":"quiz","quizQuestionAnswers":[4,4,4,4,2,4,4]}
  event_properties_submit: {
    option_show_game_pin: true,
    option_minimised_lobby_instructions: true,
    option_randomise_question_order: false,
    option_randomise_answer_order: false,
    option_automatically_progress_game: false,
    option_require_rejoin: false,
    option_enable_answer_streak_bonus: true,
    option_opt_in_experiments: false,
    option_podium: true,
    option_namerator: false,
    option_two_factor_auth: false,
    is_team_mode: false,
    url: "https://play.kahoot.it/#/?quizId=",
    page_path: "/",
    component: "player"
  }, /*"option_show_game_pin":true,"option_minimised_lobby_instructions":true,"option_randomise_question_order":false,"option_randomise_answer_order":true,"option_automatically_progress_game":false,"option_require_rejoin":false,"option_enable_answer_streak_bonus":true,"option_opt_in_experiments":false,"option_podium":true,"option_namerator":false,"option_two_factor_auth":false,"is_team_mode":false,"url":"https://play.kahoot.it/#/?quizId=1b2a0158-a7f5-4e54-a6d8-cd822e9eb756","page_path":"/","component":"player"}*/
  podium: ["gold","silver","bronze",null]
};
