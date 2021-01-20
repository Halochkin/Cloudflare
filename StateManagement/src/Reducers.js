class Reducers {

  static testReducer(state, evt) {
    return JoiGraph.setIn(state, "value", "new Value")
  }

  static customClick(state, event){
    return JoiGraph.setIn(state, "boolean", false);
  }
}