import {EventJoiStore, JoiGraph} from "../../src/joistate/EventJoiStore.js";

class App extends HTMLElement {
  constructor() {
    super();
    const initialState = {
      key: "",
      someProperty: "hello world"
    }

    const state = {...initialState};

    this.innerText = "Last pressed key is : " + state.key;
    this.joiState = new EventJoiStore(state);

    this.joiState.addEventReducer("keypress", this.onKeyPress.bind(this));
    this.joiState.addEventReducer("contextmenu", this.onContextmenu.bind(this));

    this.joiState.observe([""], (state) => this.observeAllProperties(state));
    this.joiState.observe(["someProperty"], newValue => this.observeParticularProperty(newValue));
  }

  onKeyPress(state, e) {
    this.innerText = e.key;
    state = JoiGraph.setIn(state, "key", e.key);
    return state;
  }

  onContextmenu(state, e) {
    state = JoiGraph.setIn(state, "someProperty", "boo");
    return state;
  }

  observeParticularProperty(newValue) {
    console.log("someValue has been changed to : " + newValue);
  }

  observeAllProperties(newValue) {
    console.log("Either key or someValue has been changed to : " + JSON.stringify(newValue))
  }
}

customElements.define("app-element", App);