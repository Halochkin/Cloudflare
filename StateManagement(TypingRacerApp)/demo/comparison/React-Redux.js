import React, {Component} from 'react';
import ReactDOM from 'react-dom';
import {connect, Provider} from "react-redux";
import {createStore} from "redux";

const initialState = {
  key: "",
  someProperty: "hello world"
}

const rootReducer = (state = initialState, action) => {
  switch (action.type) {
    case "CHANGE-KEY" :
      return {...state, key: action.payload}
    case "CHANGE-SOME-PROPERTY" :
      return {...state, someProperty: "boo"}
    default:
      return {...state}
  }
}

function dispatchChangeKeyAction(e) {
  return {
    type: "CHANGE-KEY",
    payload: e.key
  }
}

function dispatchChangeSomePropertyAction(e) {
  return {
    type: "CHANGE-SOME-PROPERTY",
    payload: "boo"
  }
}

class App extends Component {
  constructor(props) {
    super(props);
    window.addEventListener("keypress", this.onKeyPress.bind(this));
    window.addEventListener("contextmenu", this.onContextmenu.bind(this));
  }

  onKeyPress = (e) => {
    this.props.dispatchChangeKeyAction(e);
  }

  onContextmenu = (e) => {
    this.props.dispatchChangeSomePropertyAction(e);
  }

  render() {
    return (
      <div>Last pressed key is: {this.props.state.key}</div>)
  }
}

function mapStateToProps(state) {
  return {
    state: state
  }
}

const mapDispatchToProps = {
  dispatchChangeKeyAction,
  dispatchChangeSomePropertyAction
}


const ConnectedApp = connect(mapStateToProps, mapDispatchToProps)(App); // add props to App
const state = createStore(rootReducer);

const {subscribe} = state;

subscribe(() => {
  console.log("Some value has been changed, but don`t know which")
})

ReactDOM.render(
  <Provider store={state}>
    <ConnectedApp/>
  </Provider>,
  document.getElementById('root')
);