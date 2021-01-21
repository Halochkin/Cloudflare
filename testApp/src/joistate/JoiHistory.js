 class JoiHistory {

  constructor(state) {
    this.history = [];
    this.onChangeCB = [];
    state.onComplete((newState, task, startState, reducedState, computer, observer, error) => {
      const snap = JoiHistory.makeSnap(task, newState, startState, reducedState, computer, observer, error);
      this.history.push(snap);
      for (let func of this.onChangeCB)
        func(this.history);
    });
  }

  bindOnChange(cb) {
    this.onChangeCB.push(cb);
  }

  static makeSnap(task, newState, startState, reducedState, computer, observer, error) {
    return {
      task: JoiHistory._simplifyTask(task),
      newState,
      startState,
      reducedState,
      computerInfo: computer.functionsRegister,
      observerInfo: observer.functionsRegister,
      error
    };
  }

  static _simplifyTask(task) {
    task.stop = performance.now();
    task.timeOrigin = performance.timeOrigin;
    task.taskName = task.reducer.name;
    return task;
  }

  /**
   * todo Make history only store the reduced values, not the computed values of the state using
   * todo .computeFromScratch(reducedState)
   * todo
   * todo The benefit of this approach is to have less data to store.
   * todo The computed values should always be the same anyways, so they can be recalculated as needed.
   */
}