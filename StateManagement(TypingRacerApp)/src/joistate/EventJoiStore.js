

//todo write test for this one
 class EventJoiStore extends JoiStore{

  constructor(initial) {
    super(initial);
    this.reducers = {};
  }

  destructor() {
    for (let type in this.reducers)
      this.detachReducer(type);
  }

  addEventReducer(eventName, reducer) {
    this.reducers[eventName] = event => this.dispatch(reducer, event);
    window.addEventListener(eventName, this.reducers[eventName]);
  }

  removeEventReducer(eventName) {
    window.removeEventListener(eventName, this.reducers[eventName]);
    delete this.reducers[eventName];
  }
}