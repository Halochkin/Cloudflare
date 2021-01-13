class App extends HTMLElement {
  constructor() {
    super();
    // this.expression = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque faucibus maximus erat. Praesent luctus, quam nec consequat sagittis, justo erat iaculis mauris, sodales tristique odio enim non erat. Curabitur dapibus fermentum tellus ac viverra. Sed eros lorem, bibendum sit amet nisl sit amet, ultricies posuere ipsum. "
    this.expression = "Lorem ipsum";
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
        padding: 1px;
        display: block;
        float: right;
        height: fit-content;
        width: fit-content;
    }

    textarea {
        width: 60vw;
        height: auto;
    }

    #expected {
        background-color: rgba(0, 128, 6, 0.29);
        border-radius: 5px;
        font-size: 25px;
        
        background-image: url(data:image/gif;base64,R0lGODlhAQAoAPABAERmZv///yH5BAg1AAAAIf8LTkVUU0NBUEUyLjADAQAAACwAAAAAAQAoAAACBYSPqctYACH5BAg1AAAALAAAAAABACgAgP///////wIFhI+py1gAOw==);
    background-repeat: repeat-y;
}
    }

    #main-input {
        user-select: none;
        width: 65vw;
    }

    .prev-speed {
        float: right;
        width: fit-content;
        font-size: 2vw;
    }

    .prev-wrapper {
        border: 0.5px solid gray;
        background-color: antiquewhite;
        padding: 1vw;
        margin: 1vw;
        width: auto;
    }

    #string-field {
        background-color: lightyellow;
        border-radius: 5px;
        padding: 10px;
    }

    #app {
        padding: 3vw;

    }

    .close-btn {
        float: left;
        margin: 1vh;
        font-size: 3vw;
        color: red;
        font-family: cursive;
        cursor: pointer;

    }

    .repeat-btn {
        color: #607D8B;
        font-family: cursive;
        cursor: pointer;
        float: left;
        margin: 1vh;
        font-size: 3vw;
    }
 
    
</style>
<div id="app">
<div id="previous-results"></div>
<hr>

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

    //fetch event handler


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

  repeatSession(ctx, session, input, div) {
    if (input.value.length)
      input.value = "";
    //get item value position inside map
    let item = Array.prototype.indexOf.call(input.parentNode.parentElement.children, input.parentNode);


    const parsedHistory = JSON.parse(session.history);
    const wpm = session.wpm;
    const cpm = session.cpm;
    const sessionId = session.sessionId;

    // let [speed, characters] = [...ctx.previousSessions][item];


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



  async getAllSessions(onlyLast, lastSession) { //must pass lastSession because get reques too long, and when end type and push data to kv is too long.
    // if (!this.previousSessions.size)
    //   return;


    let request = await fetch("https://typing-race.maksgalochkin2.workers.dev/getsessions", {
      method: 'GET',
    });

    let sessions = await request.json();

    if (!sessions.length && lastSession)
      sessions = [lastSession]


    if(onlyLast)
      sessions = [sessions[sessions.length-1]]
    console.log(sessions);

    for (const session of sessions) {
      const parsedSession = JSON.parse(session);

      let div = document.createElement("div");
      let div2 = document.createElement("div");
      let input = document.createElement("textarea");
      let span1 = document.createElement("span");
      let span2 = document.createElement("span");

      span1.classList.add("close-btn")
      span2.classList.add("repeat-btn")
      span1.textContent = "X";
      span1.id = parsedSession.sessionId;
      span2.textContent = "↻";

      input.setAttribute("readonly", "")
      div2.classList.add("prev-speed");
      div.classList.add("prev-wrapper")

      div.appendChild(input);
      div.appendChild(div2);
      div.appendChild(span1);
      div.appendChild(span2);

      span1.addEventListener("click", (e) => {
        let grandParent = input.parentNode.parentElement;
        let item = Array.prototype.indexOf.call(grandParent.children, input.parentNode);
        let key = [...this.previousSessions][item][0];
        this.previousSessions.delete(key);
        // delete from dom
        grandParent.removeChild(div);
      });


      span2.addEventListener("click", (e) => {
        //closure
        this.repeatSession(this,parsedSession, input, div2);
      });

      this.resultsBoard.appendChild(div);

      this.repeatSession(this, parsedSession, input, div2);
    }






  }

  render(wordIndex, characterIndex) {
    let word = wordIndex !== this.words.length - 1 ? this.words[wordIndex] + " " : this.words[wordIndex];
    this.typedCharacters.textContent = word.slice(0, characterIndex) || ""; // correctly typed *words*
    this.expectedCharacter.textContent = word.charAt(characterIndex);      //expected character
    this.remainedCharacters.textContent = word.slice(characterIndex + 1, word.length);
    this.tail.textContent = this.words.slice(wordIndex + 1, this.words.length).join(" ")  // all next words
  }

  async refresh() {
    this.expectedCharacter.textContent = "";
    this.correctWords.textContent = "";
    this.inputValues = [];
    this.sessionTrack = [];
    this.wordIndex = 0;
    this.startTime = undefined;
    await this.getAllSessions(true);// notify that new session has been added, and render only new one

    setTimeout(() => {
      this.input.value = null;
    },100)
    this.render(0, 0, undefined);
  }

  //https://www.speedtypingonline.com/typing-equations
  countWPM(durationMs) {
    let minutes = (durationMs) / 1000 / 60;
    return {wpm: (this.words.length / 5) / minutes, cpm: this.expression.length / minutes}
  }

  async postData(url = '', data = {}) {
    const response = await fetch(url, {
      method: 'POST', // *GET, POST, PUT, DELETE, etc.
      // mode: 'cors', // no-cors, *cors, same-origin
      // cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
      // credentials: 'same-origin', // include, *same-origin, omit
      headers: {
        'Content-Type': 'application/json'
        // 'Content-Type': 'application/x-www-form-urlencoded',
      },
      // redirect: 'follow', // manual, *follow, error
      // referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
      body: data // body data type must match "Content-Type" header
    });
    return await response.json();

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


      let res = await this.postData("https://typing-race.maksgalochkin2.workers.dev/json", data);

      if (!res.uId) // unlogged user, push sessions locally //todo, non logged user
        this.previousSessions.set(result, this.sessionTrack);


      return this.refresh(); // post data takes some time and when we try to get that data from kv to render session it will return empty array, so pass data manually here
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