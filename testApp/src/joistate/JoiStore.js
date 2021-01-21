import {JoiCompute} from "./JoiCompute.js";
import {JoiGraph} from "./JoiGraph.js";
export {JoiGraph} from "./JoiGraph.js";

export class JoiStore {

  constructor(initial) {
    this.computer = new JoiCompute(100);
    this.observer = new JoiCompute(1);
    this.onCompletes = [];
    this.onErrors = [];
    this.state = JoiGraph.deepFreeze(initial || {});
    this.que = [];
  }

  /**
   * Dispatch a reducer action.
   * The dispatcher firsts ques all requests to ensure they are executed one by one.
   * When the que is ready, the given reducer function is called with the given data payload on the state.
   * @param {Function} reducer a static function such as MyReducers.seducerFunction1
   * @param {{}} data object passed as second argument to the reducer.
   */
  dispatch(reducer, data){
    this.que.push({reducer, data, start: performance.now()});
    if (this.que.length >= 2) //someone else is already running the que, this flow of control resigns
      return;
    while (this.que.length > 0){
      this._run(this.que[0]);
      this.que.shift();
    }
  }

  /**
   * Add a function that will compute and return a property every time the given argsAsStrings from the state changes.
   * Every time a compute is added, the state will update all the compute properties
   * (ie. the compute functions will run before the first dispatch call).
   *
   * @param argsAsStrings
   * @param returnProp
   * @param computeFunc
   */
  compute(argsAsStrings, returnProp, computeFunc) {
    this.computer.bind(computeFunc, argsAsStrings, returnProp);
    this.state = this.computer.computeFromScratch(this.state);
  }

  /**
   * The observers are only run after the first dispatch call
   * @param argsAsStrings
   * @param observeFunc
   */
  observe(argsAsStrings, observeFunc) {
    this.observer.bind(observeFunc, argsAsStrings);
  }

  /**
   * Add function to be called after every run triggered by a new action.
   * @param {Function} func
   */
  onComplete(func){
    this.onCompletes.push(func);
  }

  /**
   * Hook. Called every time an error is thrown when a reducer, computer or observer is called.
   * By default, all Errors are just catch'n'released.
   * @param {Error} error
   */
  onError(error) {
    throw error;
  }

  /**
   * Main control flow of the JoiStore machine.
   * 1. Call the single reduce function with the given data.
   * 2. Update all computed values based on all the computed functions bound based on the state changes caused by the reducer.
   * 3. Check all the observer functions bound based on the state changes done by the reducer and computer functions.
   * 4. Call the onComplete hook with the newState, and other debug values if needed.
   * X. If any Errors are thrown during reduction, computation or observation, then call onError.
   * @param task
   * @private
   */
  _run(task) {
    let error, reducedState, startState = this.state;
    try {
      reducedState = task.reducer(startState, task.data);
      if (startState !== reducedState) {
        this.state = this.computer.update(reducedState);
        this.observer.update(this.state);
      }
    } catch (err) {
      this.onError(error = err);
    } finally {
      for (let func of this.onCompletes)
        func(this.state, task, startState, reducedState, this.computer, this.observer, error);
    }
  }
}