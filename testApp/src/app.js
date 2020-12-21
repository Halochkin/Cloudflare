class App extends HTMLElement {
  constructor() {
    super();
    // this.expression = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque faucibus maximus erat. Praesent luctus, quam nec consequat sagittis, justo erat iaculis mauris, sodales tristique odio enim non erat. Curabitur dapibus fermentum tellus ac viverra. Sed eros lorem, bibendum sit amet nisl sit amet, ultricies posuere ipsum. "
    this.expression = "Lorem ipsum ";
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

<!--<header>-->
<!-- TYPING RACE-->
<!--<span id="login-label">Log in to store your results-->
<!--<a href="/login/google"><img class="auth-logo" src="../static/img/google.png" alt="google auth"></a>-->
<!--<a href="/login/github"><img class="auth-logo" src="../static/img/github.png" alt="github auth"></a>-->
<!--</span>-->
<!--</header>-->

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

    this.wordIndex = 0;
    this.startTime = 0;
    this.inputValues = [];
    this.previousSessions = new Map();
    this.sessionTrack = [];

    this.words = this.expression.trim().split(" ");
    this.render(this.wordIndex, 0, undefined);
  }


  repeatSession(ctx, input, div){
    if(input.value.length)
      input.value = "";
    //get item value position inside map
    let item = Array.prototype.indexOf.call(input.parentNode.parentElement.children, input.parentNode);

    let [speed, characters] = [...ctx.previousSessions][item];
    for (const character of characters) {
      setTimeout(() => {
        if (character[0] !== "Backspace")
          input.value += character[0];
        else
          input.value = input.value.slice(0, input.value.length - 1);  //delete character
      }, character[1]);

    }
    div.textContent = "wpm: " + speed.wpm.toFixed(1) + "    cpm: " + speed.cpm.toFixed(1);

  }

  //test function. Map must be replace to kv
  showPrevious() {
    if (!this.previousSessions.size)
      return;

    let div = document.createElement("div");
    let div2 = document.createElement("div");
    let input = document.createElement("textarea");
    let span1 = document.createElement("span");
    let span2 = document.createElement("span");

    span1.classList.add("close-btn")
    span2.classList.add("repeat-btn")
    span1.textContent = "X";
    span2.textContent = "↻";

    input.setAttribute("readonly", "")
    div2.classList.add("prev-speed");
    div.classList.add("prev-wrapper")

    div.appendChild(input);
    div.appendChild(div2);
    div.appendChild(span1);
    div.appendChild(span2);

    span1.addEventListener("click",  (e)=> {
      let grandParent = input.parentNode.parentElement;
      let item = Array.prototype.indexOf.call(grandParent.children, input.parentNode);
      let key = [...this.previousSessions][item][0];

      this.previousSessions.delete(key);

      // delete from dom
      grandParent.removeChild(div);

    });
    span2.addEventListener("click",  (e) =>{
      //closure
      this.repeatSession(this, input, div2);
    });

    this.resultsBoard.appendChild(div);
    this.repeatSession(this, input, div2);

  }

  render(wordIndex, characterIndex) {
    let word = wordIndex !== this.words.length - 1 ? this.words[wordIndex] + " " : this.words[wordIndex];
    this.typedCharacters.textContent = word.slice(0, characterIndex) || ""; // correctly typed *words*
    this.expectedCharacter.textContent = word.charAt(characterIndex);      //expected character
    this.remainedCharacters.textContent = word.slice(characterIndex + 1, word.length); //+1 because expected also incude  <typed><expeted><remained> (<He><l><lo>)
    this.tail.textContent = this.words.slice(wordIndex + 1, this.words.length).join(" ")  // all next words
  }

  refresh() {
    this.expectedCharacter.textContent = "";
    this.correctWords.textContent = "";
    this.inputValues = [];
    this.sessionTrack = [];
    this.wordIndex = 0;
    this.startTime = undefined;
    this.showPrevious();
    setTimeout(() => {
      this.input.value = null;
    })
    this.render(0, 0, undefined);
  }

  //https://www.speedtypingonline.com/typing-equations
  // here we just take expression length to count characters, and split array to count words
  countWPM(durationMs) {
    let minutes = (durationMs) / 1000 / 60;
    return {wpm: (this.words.length / 5) / minutes, cpm: this.expression.length / minutes}
  }

  handleInput(e) {
    if (!this.startTime) {
      this.startTime = Date.now();
    }

    const key = e.key;

    if (key.length === 1) { //filter technical keys (Enter etc) but allow all another (even non a-Z)
      this.inputValues.push(key)
      this.sessionTrack.push([key, Date.now() - this.startTime]);
    }

    let characterIndex = this.inputValues.length;  //get current character
    let wordIndex = this.wordIndex;     // cet index of current word

    if (e.key === "Backspace" && this.inputValues.length) {
      this.inputValues.pop();        // remove last character
      this.sessionTrack.push([key, Date.now() - this.startTime]);

      characterIndex--;             // decrease manually, not outside. not happy about it
      this.render(wordIndex, characterIndex, key);
    }

    // When press Space
    if (key === " " && this.expectedCharacter.textContent === " " && wordIndex !== this.words.length - 1 && this.inputValues[this.inputValues.length - 2] !== " ") {
      wordIndex++;    //switch to next word after press Space
      characterIndex = 0;    //start count character from 0
      this.input.value = null;  //refresh input field
      this.inputValues = [];    //refresh typed characters
      this.correctWords.textContent += this.words[wordIndex - 1] + " "; // move previous word to non-editable span
    }

    //error handler
    if (this.inputValues.length && this.inputValues[this.inputValues.length - 1] !== this.expectedCharacter.textContent)
      this.typedCharacters.classList.add("err");          // add error if wrong character
    if (this.typedCharacters.textContent === this.inputValues.join(""))
      this.typedCharacters.classList.remove("err");   //remove error after fixing all errors

    //last character of last word
    if (wordIndex === this.words.length - 1 && characterIndex === this.words[this.words.length - 1].length && this.inputValues[this.inputValues.length - 1] === this.expectedCharacter.textContent) {
      this.correctWords.textContent += key;
      let result = this.countWPM(Date.now() - this.startTime);
      this.result.textContent = "wpm: " + result.wpm.toFixed(0) + " cpm: " + result.cpm.toFixed(0)
      this.previousSessions.set(result, this.sessionTrack);
      return this.refresh();
    }

    this.render(wordIndex, characterIndex, key)
    this.wordIndex = wordIndex;
  }
}

customElements.define("type-racer", App);