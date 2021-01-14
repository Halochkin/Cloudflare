class App extends HTMLElement {
  constructor() {
    super();
    // this.expression = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque faucibus maximus erat. Praesent luctus, quam nec consequat sagittis, justo erat iaculis mauris, sodales tristique odio enim non erat. Curabitur dapibus fermentum tellus ac viverra. Sed eros lorem, bibendum sit amet nisl sit amet, ultricies posuere ipsum. "
    this.expression = "Lorem ipsum dolor sit amet";
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
    float: right;
    height: fit-content;
    width: fit-content;
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

.prev-speed {
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
    this.result = this.shadowRoot.querySelector("#main-result");
    this.resultsBoard = this.shadowRoot.querySelector("#previous-results");
    // sentence
    this.correctWords = this.shadowRoot.querySelector("#done"); //only correct inputs
    //separate word
    this.typedCharacters = this.shadowRoot.querySelector("#typed");  //currently typing word, can
    this.expectedCharacter = this.shadowRoot.querySelector("#expected");
    this.remainedCharacters = this.shadowRoot.querySelector("#remains");

    this.tail = this.shadowRoot.querySelector("#tail"); // exclude current and done
    //input
    this.button = this.shadowRoot.querySelector("button");
    this.input.addEventListener("keydown", this.handleInput.bind(this));

    this.wordIndex = 0;
    this.characterIndex = 0;
    this.startTime = 0;
    this.inputValues = [];
    this.previousSessions = new Map();
    this.sessionTrack = [];
    this.words = this.expression.trim().split(" ");
    this.getAllSessions(false, undefined);
    this.render(this.wordIndex, this.characterIndex, undefined);
  }

  repeatSession(session, input, div) {
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

  random_rgba() {
    let o = Math.round, r = Math.random, s = 255;
    return 'rgba(' + o(r() * s) + ',' + o(r() * s) + ',' + o(r() * s) + ',' + r().toFixed(1) + ')';
  }


  async getAllSessions(onlyLastSession, justTypedData) {
    //firs time it will be empty, because put to kv takes some time
    let sessions = await this.request('GET', "https://typing-race.maksgalochkin2.workers.dev/getsessions");
    // if first typing, request return nothing, use justTypedData instead
    if (!sessions.length && justTypedData)
      sessions.push(justTypedData);
    // render only last session, get only last item
    if (onlyLastSession)
      sessions = [sessions[sessions.length - 1]]

    for (const session of sessions) {
      const parsedSession = JSON.parse(session);
      let rgb = this.random_rgba();

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
        let res = await this.request("DELETE", "https://typing-race.maksgalochkin2.workers.dev/delete", data);
        grandParent.removeChild(prevWrapper);
      });


      repeatBtn.addEventListener("click", (e) => {
        this.repeatSession(parsedSession, input, prevSpeed);
      });

      this.resultsBoard.appendChild(prevWrapper);

      this.repeatSession(parsedSession, input, prevSpeed);
    }


  }

  render(wordIndex, characterIndex) {
    let word = wordIndex !== this.words.length - 1 ? this.words[wordIndex] + " " : this.words[wordIndex];
    this.typedCharacters.textContent = word.slice(0, characterIndex) || ""; // correctly typed *words*
    this.expectedCharacter.textContent = word.charAt(characterIndex);      //expected character
    this.remainedCharacters.textContent = word.slice(characterIndex + 1, word.length);
    this.tail.textContent = this.words.slice(wordIndex + 1, this.words.length).join(" ")  // all next words
  }

  refresh(justTypedData) {
    this.expectedCharacter.textContent = "";
    this.correctWords.textContent = "";
    this.inputValues = [];
    this.sessionTrack = [];
    this.wordIndex = 0;
    this.startTime = undefined;
    this.getAllSessions(true, justTypedData); // true means that only last data need to bu updated, not iterate all kv, like at firs time

    setTimeout(() => {
      this.input.value = null;

    })
    this.render(0, 0, undefined);
  }

  //https://www.speedtypingonline.com/typing-equations
  countWPM(durationMs) {
    let minutes = (durationMs) / 1000 / 60;
    return {wpm: (this.words.length / 5) / minutes, cpm: this.expression.length / minutes}
  }


  async request(method, path, body) {
    const options = {
      method,
      headers: {'Content-Type': 'application/json'}
    }
    if (body)
      options.body = body;
    let res = await fetch(path, options);
    return res.json();
  }


  async handleInput(e) {
    if (!this.startTime)
      this.startTime = Date.now();
    const key = e.key;

    let selectionStart = e.currentTarget.selectionStart;
    let selectionEnd = e.currentTarget.selectionEnd;
    let selectionRange = selectionEnd - selectionStart;

    if (key.length === 1) { //exclude technical keys (Enter etc) but allow all another (even non a-Z) //todo regex here?
      if (selectionRange) {
        this.inputValues.splice(selectionStart, selectionRange, key);
        this.characterIndex = selectionStart + 1;
      } else {
        this.inputValues.splice(selectionStart, 0, key);
        this.characterIndex = this.inputValues.length;
      }
      this.sessionTrack.push([key, Date.now() - this.startTime, this.characterIndex]);
    }

    if (e.key === "Backspace" && this.inputValues.length) {
      if (selectionRange) {  //someone selected text and removed
        this.characterIndex = selectionStart;
        this.inputValues.splice(selectionStart, selectionRange);
      } else if (selectionStart !== 0) {
        this.characterIndex--;
        this.inputValues.splice(selectionStart - 1, 1);
      } else
        this.inputValues.pop();
      this.sessionTrack.push([key, Date.now() - this.startTime]);
      this.render(this.wordIndex, this.characterIndex, key);
    }

    // When press Space
    if (key === " " && this.expectedCharacter.textContent === " " && this.input.value === this.words[this.wordIndex] && selectionEnd === this.words[this.wordIndex].length) {
      this.wordIndex++;    //switch to next word after press Space
      this.characterIndex = 0;    //start count character from 0
      setTimeout(() => {
        this.input.value = null;
      })
      this.inputValues = [];    //refresh typed characters
      this.correctWords.textContent += this.words[this.wordIndex - 1] + " "; // move previous word to non-editable span
    }

    //last character of last word
    if (this.wordIndex === this.words.length - 1 && this.characterIndex === this.words[this.words.length - 1].length && this.inputValues[this.inputValues.length - 1] === this.expectedCharacter.textContent) {
      let result = this.countWPM(Date.now() - this.startTime);
      this.result.textContent = "wpm: " + result.wpm.toFixed(0) + " cpm: " + result.cpm.toFixed(0)

      let data = JSON.stringify({
        sessionId: Date.now(),
        wpm: result.wpm.toFixed(2),
        cpm: result.cpm.toFixed(2),
        history: JSON.stringify(this.sessionTrack)
      });


      let res = await this.request("POST", "https://typing-race.maksgalochkin2.workers.dev/json", data);


      // if (!res.status) // success POST returns status,  unlogged user, push sessions locally
      //   this.previousSessions.set(result, this.sessionTrack); //todo, non logged user


      //uuuuuglyy
      if (res.uId) {
        data = JSON.parse(data);
        data.sessionId = res.uId + "-" + data.sessionId;
        data = JSON.stringify(data);
      }

      // post data takes some time, so we will use existing data to not wait
      return this.refresh(data);
    }

    //error handler
    if (this.inputValues.length && this.inputValues[this.inputValues.length - 1] !== this.expectedCharacter.textContent)
      this.typedCharacters.classList.add("err");          // add error
    if (this.typedCharacters.textContent === this.inputValues.join("") || this.inputValues.join("") === this.words[this.wordIndex] || this.inputValues.join("") === this.words[this.wordIndex].slice(0, this.characterIndex))
      this.typedCharacters.classList.remove("err");   //remove error

    this.render(this.wordIndex, this.characterIndex, selectionStart)
  }


}


customElements.define("type-racer", App);