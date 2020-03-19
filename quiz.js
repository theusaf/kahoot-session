const path = require("path");
const Question = require(path.join(__dirname,"question.js"));
module.exports = class{
	constructor(name,options){
		if(typeof(options) == "undefined"){
			options = {};
		}
		this.uuid = "no-uuid";
		this.creator = "kahoot-session",
		this.metadata = {
			duplicationProtection: false,
			lastEdit: {
				editTimestamp: 0,
				editorUserId: "kahoot-session",
				editorUsername: "kahoot-session"
			}
		};
		this.folderId = "null";
		this.cover = "null";
		this.resources = "null";
		this.modified = 0;
		this.visibility = 0;
		this.title = name;
		this.slug = name.replace(/[\n| ]+/mg,"-");
		this.creator_primary_usage = "server";
		this.coverMetadata = {
			id: "null"
		};
		this.questions = [];
		this.language = options.language ? options.language : "English";
		this.audience = options.audience ? options.audience : "Social";
		this.description = options.description ? options.description : "Hello World";
		this.type = options.type ? options.type : "quiz";
		this.quizType = this.type;
	}
	addQuestion(q){
		let question = new Question(q,this);
		this.questions.push(question);
		return question;
	}
};
