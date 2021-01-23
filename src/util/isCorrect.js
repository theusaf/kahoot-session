/**
 * isCorrect - Calculates whether the player's answer was correct or not
 *
 * @param  {String} type The question type
 * @param  {Object[]} choices The question choices
 * @param  {Number|String|Number[]} choice The player's choice
 * @param  {Client} client The client
 * @returns {Boolean} Whether correct or not
 */
module.exports = function isCorrect(type, choices, choice, client){
  switch(type) {
    case "survey":
    case "content":
    case "multiple_select_poll":
    case "word_cloud": {
      return true;
    }
    case "open_ended": {
      choice = `${choice}`;
      return !!choices.find((c) => {
        if(!c.correct) {
          return false;
        }
        if(c.answer.replace(/\p{Emoji}/ug,"").length === 0) {
          // only emojis
          return c.answer === choice;
        } else {
          return c.answer.replace(/\p{Emoji}/ug,"").toLowerCase() === choice.replace(/\p{Emoji}/ug,"").toLowerCase();
        }
      });
    }
    case "multiple_select_quiz": {
      choice = Array.from(choice);
      for(let i = 0; i < choice.length; i++) {
        choice[i] = +choice[i];
      }
      for(let i = 0; i < choices.length; i++) {
        const c = choices[i];
        if(!c.correct) {
          if(choice.includes(i)) {
            return false;
          }
        }
      }
      return true;
    }
    case "jumble": {
      choice = Array.from(choice);
      return client.jumbleSteps.join("") === choice.join("");
    }
    default: {
      choice = +choice;
      const c = choices[choice];
      if(typeof c === "object") {
        return c.correct;
      } else {
        return false;
      }
    }
  }
};
