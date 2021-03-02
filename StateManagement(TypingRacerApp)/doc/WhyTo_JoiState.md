
Plan 

- helloWorld demo which demonstrate how to change state with user event
- implement that demo for
  - redux
  - react-redux (hooks implementation)
  - react hooks


```javascript
import {combineReducers} from "redux";

const initialState = {
  hello: "world",
}

const getState  = (state = initialState, action) => {
  switch (action.type) {
    case "CHANGE-STATE" :
      return {...state, hello: action.payload}
    default:
      return {...state}
  }
}

const state = combineReducers({
  getState,
})



```  