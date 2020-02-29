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
	podium: ["gold","silver","bronze",null]
};
