function countWPM(state, durationMs) {
  let minutes = (durationMs) / 1000 / 60;
  return {wpm: (state.separateWords.length / 5) / minutes, cpm: state.separateWords.join("").length / minutes}
}

function random_rgba() {
  let o = Math.round, r = Math.random, s = 255;
  return 'rgba(' + o(r() * s) + ',' + o(r() * s) + ',' + o(r() * s) + ',' + r().toFixed(1) + ')';
}

async function doRequest(method, path, body) {
  const options = {
    method,
    headers: {'Content-Type': 'application/json'}
  }
  if (body)
    options.body = body;
  let res = await fetch(path, options);
  return res.json();
}

function repeatSession(session, input, div) {
  if (input.value.length)
    input.value = "";
  //todo: disable double repeating  at the same time
  const parsedHistory = JSON.parse(session.history);
  const wpm = session.wpm;
  const cpm = session.cpm;

  for (const character of parsedHistory) {
    setTimeout(() => {
      if (character[0] !== "Backspace")
        input.value += character[0];
      else
        input.value = input.value.slice(0, input.value.length - 1);  //delete character
    }, character[1]);
  }
  div.textContent = "wpm: " + wpm + "    cpm: " + cpm;
}

function renderSessions(state) {

  for (const session of state) {
    const parsedSession = JSON.parse(session);
    let rgb = random_rgba();
    let prevWrapper = document.createElement("div");
    let prevSpeed = document.createElement("div");
    let input = document.createElement("textarea");
    let closeBtn = document.createElement("span");
    let repeatBtn = document.createElement("span");

    closeBtn.classList.add("close-btn")
    repeatBtn.classList.add("repeat-btn")
    closeBtn.textContent = "X";
    closeBtn.id = parsedSession.sessionId;
    repeatBtn.textContent = "↻";

    input.setAttribute("readonly", "")
    prevSpeed.classList.add("prev-speed");
    prevWrapper.classList.add("prev-wrapper");

    prevSpeed.style.backgroundColor = rgb;

    prevWrapper.appendChild(prevSpeed);
    prevWrapper.appendChild(repeatBtn);
    prevWrapper.appendChild(closeBtn);
    prevWrapper.appendChild(input);

    closeBtn.addEventListener("click", async (e) => { //todo: remove session
      let grandParent = input.parentNode.parentElement;
      let data = JSON.stringify({key: e.currentTarget.id.toString()});
      let res = await doRequest("DELETE", "https://typing-race.maksgalochkin2.workers.dev/delete", data);
      grandParent.removeChild(prevWrapper);
    });


    repeatBtn.addEventListener("click", (e) => {
      repeatSession(parsedSession, input, prevSpeed);
    });

    this.shadowRoot.querySelector("#previous-results").appendChild(prevWrapper);
    repeatSession(parsedSession, input, prevSpeed);
  }

}


class Reducers {
  static  handleInput(state, e) {
    let startTime;
    if (!state.startTime) {
      startTime = Date.now();
      state = JoiGraph.setIn(state, "startTime", startTime);
    }

    const key = e.detail.key;

    const selectionStart = e.detail.currentTarget.selectionStart;
    const selectionEnd = e.detail.currentTarget.selectionEnd;
    let selectionRange = selectionEnd - selectionStart;

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


    state = JoiGraph.setIn(state, "inputValues", inputValues);
    state = JoiGraph.setIn(state, "characterIndex", characterIndex);
    state = JoiGraph.setIn(state, "wordIndex", wordIndex);

    let currentWord = state.separateWords[wordIndex];

    state = JoiGraph.setIn(state, "typedCharacters", currentWord.slice(0, characterIndex));
    state = JoiGraph.setIn(state, "expectedCharacter", currentWord.charAt(characterIndex));

    state = JoiGraph.setIn(state, "remainedCharacters", currentWord.slice(characterIndex + 1, currentWord.length));
    state = JoiGraph.setIn(state, "typedWords", [...state.separateWords].slice(0, wordIndex));
    state = JoiGraph.setIn(state, "sessionHistory", [...state.sessionHistory, [key, Date.now() - state.startTime, characterIndex]]);
    state = JoiGraph.setIn(state, "remainedWords", [...state.separateWords].slice(wordIndex + 1, state.separateWords.length).join(" "));


    //last character of last word
    if (wordIndex === state.separateWords.length - 1 && characterIndex === state.separateWords[state.separateWords.length - 1].length) {
      let result = countWPM(state, Date.now() - state.startTime);
      state = JoiGraph.setIn(state, "sessionResult", "wpm: " + result.wpm.toFixed(0) + " cpm: " + result.cpm.toFixed(0));


      let data = JSON.stringify({
        sessionId: Date.now(),
        wpm: result.wpm.toFixed(2),
        cpm: result.cpm.toFixed(2),
        history: JSON.stringify([...state.sessionHistory])
      });


      doRequest("POST", "https://typing-race.maksgalochkin2.workers.dev/json", data).then(res=>{})

      renderSessions.call(this, [data]);
      state = JoiGraph.setIn(state, "typedCharacters", "");
      return this.getImmutableState();
    }

    return state;

  }

  static getAllSessions(state) {
    doRequest('GET', "https://typing-race.maksgalochkin2.workers.dev/getsessions").then(data => {
      renderSessions.call(this, data);
    });
    return state
  }
}




