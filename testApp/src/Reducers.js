import {JoiGraph} from "./joistate/JoiGraph.js";

export class Reducers {
  static handleInput(state, e) {
    let startTime;
    if (!state.startTime) {
      startTime = Date.now();
      state = JoiGraph.setIn(state, "startTime", startTime);
    }

    const key = e.detail.key;
    const selectionStart = e.detail.currentTarget.selectionStart;
    const selectionEnd = e.detail.currentTarget.selectionEnd;
    const selectionRange = selectionEnd - selectionStart;

    let characterIndex = state.characterIndex;
    let wordIndex = state.wordIndex;
    let inputValues = [...state.inputValues];

    if (key.length === 1) { //exclude technical keys (Enter etc) but allow all another (even non a-Z) //todo regex here?
      if (selectionRange) {
        inputValues.splice(selectionStart, selectionRange, key);
        characterIndex = selectionStart + 1;
      } else {
        inputValues.splice(selectionStart, 0, key);
        characterIndex = inputValues.length
      }
    }

    if (key === "Backspace" && inputValues.length) {
      if (selectionRange) {  //someone selected text and removed
        inputValues.splice(selectionStart, selectionRange);
        characterIndex = selectionStart
      } else if (selectionStart !== 0) {
        inputValues.splice(selectionStart - 1, 1)
        characterIndex = state.characterIndex - 1;
      } else
        inputValues.pop();
    }

    // When press Space
    if (key === " " && state.expectedCharacter === " " && state.inputValues.join("") === state.separateWords[wordIndex].trim() && selectionEnd === state.separateWords[wordIndex].trim().length) {
      wordIndex++;
      characterIndex = 0;
      inputValues = [];
    }

    let currentWord = state.separateWords[wordIndex];

    state = JoiGraph.setIn(state, "inputValues", inputValues);
    state = JoiGraph.setIn(state, "characterIndex", characterIndex);
    state = JoiGraph.setIn(state, "wordIndex", wordIndex);
    state = JoiGraph.setIn(state, "typedCharacters", currentWord.slice(0, characterIndex));
    state = JoiGraph.setIn(state, "expectedCharacter", currentWord.charAt(characterIndex));
    state = JoiGraph.setIn(state, "remainedCharacters", currentWord.slice(characterIndex + 1, currentWord.length));
    state = JoiGraph.setIn(state, "typedWords", [...state.separateWords].slice(0, wordIndex));
    state = JoiGraph.setIn(state, "sessionHistory", [...state.sessionHistory, [key, Date.now() - state.startTime, characterIndex]]);
    state = JoiGraph.setIn(state, "remainedWords", [...state.separateWords].slice(wordIndex + 1, state.separateWords.length).join(" "));

    //last character of last word
    if (wordIndex === state.separateWords.length - 1 && characterIndex === state.separateWords[state.separateWords.length - 1].length && state.inputValues.join("") === state.typedCharacters) {
      let result = this.countWPM(state, Date.now() - state.startTime);

      let data = JSON.stringify({
        sessionId: Date.now(),
        wpm: result.wpm.toFixed(2),
        cpm: result.cpm.toFixed(2),
        history: JSON.stringify([...state.sessionHistory]),
        expression: state.separateWords.join("")
      });

      this.doRequest("POST", "https://typing-race.maksgalochkin2.workers.dev/json", data).then(res => {
      })
      this.renderSessions([data]);
      let newState = this.getImmutableState();  // new state
      return JoiGraph.setIn(newState, "sessionResult", "wpm: " + result.wpm.toFixed(0) + " cpm: " + result.cpm.toFixed(0));
    }

    return state;
  }

  static getAllSessions(state) {
    this.doRequest('GET', "https://typing-race.maksgalochkin2.workers.dev/getsessions").then(data => {
      this.renderSessions(data);
    });
    return state
  }
}




