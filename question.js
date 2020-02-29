module.exports = class{
	constructor(question,quiz){
		this.__proto__.quiz = quiz;
		this.question = question ? question : "No Question Provided.";
		this.choices = [];
		this.numberOfAnswers = 0;
		this.points = true;
		this.questionFormat = 0;
		this.resources = null;
		this.time = 20000;
		this.type = "quiz";
		this.image = null;
		this.imageMetadata = {};
		this.video = {
			id: "",
			endTime: 0,
			fullUrl: "",
			service: "youtube",
			startTime: 0
		};
	}
	getQuiz(){
		return this.__proto__.quiz;
	}
	addChoice(choice,correct){
		if(typeof(choice) == "string" && typeof(correct) == "boolean"){
			if(this.choices.length == 4){
				throw "ERROR: CHOICE LENGTH FULL";
			}
			this.choices.push({answer: choice,correct:correct});
			this.numberOfAnswers = this.choices.length;
		}else{
			throw "ERROR: MISSING/INCORRECT ARGUMENTS";
		}
		return this;
	}
	setTime(time){
		this.time = Number(time);
		return this;
	}
	setPoints(bool){
		this.points = Boolean(bool);
		return this;
	}
};
