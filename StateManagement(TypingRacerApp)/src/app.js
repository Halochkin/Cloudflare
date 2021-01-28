 import {EventJoiStore, JoiGraph} from "./joistate/EventJoiStore.js";
 import {Reducers} from "./Reducers.js";

 class App extends HTMLElement {
  constructor() {
    super();
    // this.expression = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque faucibus maximus erat. Praesent luctus, quam nec consequat sagittis, justo erat iaculis mauris, sodales tristique odio enim non erat. Curabitur dapibus fermentum tellus ac viverra. Sed eros lorem, bibendum sit amet nisl sit amet, ultricies posuere ipsum. "
    this.attachShadow({mode: "open"});
    this.shadowRoot.innerHTML = `
<style>
* {
    font-size: 20px;
}

.current {
    text-decoration: underline;
}

.err {
    background-color: rgba(255, 0, 0, 0.8);
    border-radius: 5px;
}

#done {
    color: forestgreen;
}

#result {
    border: 0.5px solid black;
}

#main-result {
    background-color: khaki;
    text-align: center;
    display: block;
    height: 2em;
    float: right;
    width: 13vw;
    line-height: 4vh;
    font-size: 82%;
    border-radius: 3px;
    padding: 3px;
}

textarea {
    width: 73vw;
    height: auto;
    resize: none;
    margin: 1vw;
}

#expected {
    background-color: rgba(0, 128, 6, 0.29);
    border-radius: 5px;
    font-size: 25px;

    background-image: url(data:image/gif;base64,R0lGODlhAQAoAPABAERmZv///yH5BAg1AAAAIf8LTkVUU0NBUEUyLjADAQAAACwAAAAAAQAoAAACBYSPqctYACH5BAg1AAAALAAAAAABACgAgP///////wIFhI+py1gAOw==);
    background-repeat: repeat-y;
}

#main-input {
   width: 77vw;
    padding: 3px;
    margin-left: 3vw;
}

.previous-speed {
    font-size: 1em;
    display: block;
    margin: -1vw -1vw 1vw -1vw;
    padding: 0.2vw;
}

.prev-wrapper {
    background-color: white;
    padding: 1vw;
    margin: 1vw;
   width: 85vw;
    box-shadow: 0px 0px 4px 0px #be9f9f;
    border-radius: 0 0 5px 5px;
    overflow: hidden;
}

#string-field {
   background-color: lightyellow;
    border-radius: 5px;
    padding: 1vw;
    margin-left: 3vw;
    width: 85vw;
    border: 1px solid gray;
    box-shadow: inset 0px 0px 2px 0px #b1adad;
}
#previous-results{
    overflow-y: scroll;
    padding: 2vw;
    height: 46vh;
    overflow-x: hidden;
}

#main-input {
    margin-left: 3vw;
    width: 75vw;
}

.prev-wrapper:first-child{
margin-top: -2vw;
}

#app {
    padding: 3vw;

}

.close-btn {
    float: left;
    margin: 10px;
    font-size: 1em;
    color: red;
    margin-top: 1.3em;
    background-color: #2a272700;
    width: 1.3em;
    text-align: center;
    height: 1.3em;
    border-radius: 50%;
    font-family: cursive;
    cursor: pointer;
    box-shadow: inset 0 0 2px 0px #131212;

}

.repeat-btn {
    color: #4CAF50;
    font-family: cursive;
    cursor: pointer;
    float: left;
    margin: 10px;
    margin-top: 1.3em;
    box-shadow: inset 0 0 2px 0px #131212;
    width: 1.3em;
    text-align: center;
    line-height: 1.2em;
    height: 1.3em;
    border-radius: 50%;
    font-size: 1em;
    text-shadow: box-shadow: 10px 5px 5px red;
    text-shadow: 0px 0px 0px black;
}
    
</style>
<div id="app">
<div id="previous-results"></div>

<br>
<div id="string-field">
    <!--   correct non editable string-->
    <span id="done"></span>
    <!--    current word-->
    <span class="current" id="typed"></span>
    <span class="current" id="expected"></span>
    <span class="current" id="remains"></span>
    <span id="tail"></span>
</div>
<br>
<div>
    <input id="main-input" aria-selected="false" type="text"> <span id="main-result"></span>
</div>
 </div>
`;

    this.input = this.shadowRoot.querySelector("#main-input");

    this.input.addEventListener("keydown", e => {
      if (e.key.length > 1 && e.key !== "Backspace") return;
      this.dispatchEvent(new CustomEvent("input-keydown", {composed: true, bubbles: true, detail: e}));
    })

    const getSeparateWords = (expression) => {
      let separateWords = expression.trim().split(" ");
      for (let i = 0; i < separateWords.length - 1; i++) {  //add space to each word beside last one
        separateWords[i] += " ";
      }
      return separateWords;
    }

    const expression = "Lorem ipsum";

    const separateWords = getSeparateWords(expression);

    const initialState = {
      wordIndex: 0,
      characterIndex: 0,
      startTime: 0,
      inputValues: [],
      sessionHistory: [],
      separateWords: separateWords,
      typedWords: [],
      typedCharacters: "",
      sessionResult: "",
      expectedCharacter: separateWords[0][0],
      remainedCharacters: separateWords[0].slice(1, separateWords[0].length),
      remainedWords: separateWords.slice(1, separateWords.length).join(" ")
    }

    this.getImmutableState = (state = initialState) => {
      return {...state}
    }

    this.joiState = new EventJoiStore(this.getImmutableState());
    this.joiState.addEventReducer("input-keydown", Reducers.handleInput.bind(this));
    this.joiState.addEventReducer("DOMContentLoaded", Reducers.getAllSessions.bind(this));

    this.joiState.observe([""], this.render.bind(this));

    this.render(this.joiState.state);
  }

  render(state) {
    const typedItem = this.shadowRoot.querySelector("#typed");
    typedItem.textContent = state.typedCharacters;
    this.shadowRoot.querySelector("#expected").textContent = state.expectedCharacter;
    this.shadowRoot.querySelector("#remains").textContent = state.remainedCharacters;
    this.shadowRoot.querySelector("#tail").textContent = state.remainedWords;
    this.shadowRoot.querySelector("#done").textContent = state.typedWords && state.typedWords.join("") || "";   // (state.separateWords[state.wordIndex - 1] || "") + " "; // move previous word to non-editable span
    this.shadowRoot.querySelector("#main-result").textContent = state.sessionResult || "";

    if (state.inputValues.length && state.inputValues[state.inputValues.length - 1] !== state.expectedCharacter)
      typedItem.classList.add("err");          // add error
    if (state.typedCharacters === state.inputValues.join("") || state.inputValues.join("") === state.separateWords[state.wordIndex] || state.inputValues.join("") === state.separateWords[state.wordIndex].slice(0, state.characterIndex))
      typedItem.classList.remove("err");   //remove error
    if (!state.inputValues.length)
      setTimeout(() => {
        this.shadowRoot.querySelector("#main-input").value = ""
      })
    return state;
  }

  async doRequest(method, path, body) {
    const options = {
      method,
      headers: {'Content-Type': 'application/json'}
    }
    if (body)
      options.body = body;
    // let res = await fetch(path, options);
    // let result =  await res.json();
    return await fetch(path, options).then(response => response.json()).then(data=> data);
   }

  countWPM(state, durationMs) {
    let minutes = (durationMs) / 1000 / 60;
    return {wpm: (state.separateWords.length / 5) / minutes, cpm: state.separateWords.join("").length / minutes}
  }

  random_rgba() {
    let o = Math.round, r = Math.random, s = 255;
    return 'rgba(' + o(r() * s) + ',' + o(r() * s) + ',' + o(r() * s) + ',' + r().toFixed(1) + ')';
  }

  repeatSession(session, input, div) {
    const parsedHistory = JSON.parse(session.history);
    // to disable sync repeating.
    if (input.value && input.value !== session.expression)
      return;

    if (input.value.length)
      input.value = "";

    //todo: disable double repeating  at the same time
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

  renderSessions(state) {
    for (const session of state) {
      const parsedSession = JSON.parse(session);
      let rgb = this.random_rgba();

      let prevWrapper = document.createElement("div");
      let prevSpeed = document.createElement("div");
      let input = document.createElement("textarea");

      let closeBtn = document.createElement("span");
      let repeatBtn = document.createElement("span");

      closeBtn.classList.add("close-btn");
      closeBtn.textContent = "X";
      closeBtn.id = parsedSession.sessionId;
      closeBtn.addEventListener("click", async (e) => { //todo: remove session
        let grandParent = input.parentNode.parentElement;
        let data = JSON.stringify({key: e.currentTarget.id.toString()});
        await this.doRequest("DELETE", "https://typing-race.maksgalochkin2.workers.dev/delete", data);
        grandParent.removeChild(prevWrapper);
      });

      repeatBtn.textContent = "↻";
      repeatBtn.classList.add("repeat-btn");

      repeatBtn.addEventListener("click", (e) => {
        this.repeatSession(parsedSession, input, prevSpeed);
      });

      input.setAttribute("readonly", "");

      prevSpeed.classList.add("previous-speed");
      prevSpeed.style.backgroundColor = rgb;

      prevWrapper.classList.add("prev-wrapper");
      prevWrapper.appendChild(prevSpeed);
      prevWrapper.appendChild(repeatBtn);
      prevWrapper.appendChild(closeBtn);
      prevWrapper.appendChild(input);

      this.shadowRoot.querySelector("#previous-results").appendChild(prevWrapper);
      this.repeatSession(parsedSession, input, prevSpeed);
    }
  }
}


customElements.define("type-racer", App);