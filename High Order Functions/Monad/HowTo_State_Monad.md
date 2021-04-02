# HowTo: State monad


State management is one of the biggest problems in application development. This is why more and more state management libraries appear every day, and many of them are developed over existing solutions.

State management looks something like this: actions, reducers, stores, middleware, a hook here, a hook there... All this is extremely complicated and slows down application development! So why jump through so many fire hoops to implement simple functionality?
To solve our problem of finding a simple way to manage state, we first need to understand what state management is.

## Why manage the state?

The term "state management," around which there is so much noise, is almost always interpreted incorrectly. Why? Because functionality generates state - but not vice versa.  Incorrect interpretation leads to the creation of unnecessarily confusing libraries and approaches. For example, Redux: focusing on state management leads to using middleware for asynchronous operations, i.e. trying to "squeeze" state out of functionality. This is the main reason why a state is "overgrown" with a lot of unnecessary functionality needed to support that state.

The essence of the concept is that state is an integral part of functionality; they are like two sides of the same coin, like yin and yang. So why are we jumping through hoops of fire and developing functionality independently of state, if functionality naturally generates state. Such functionality is inherent in every application.

An example of such functionality would be the "normal" output of the layouts you produce, such as animated html elements on the screen or a response object from a web server. But, **in addition to the normal output**, you also need to create a series of **RAPPORTS** from the application instance. These rapports are for different eyes (the developer himself, the unit tester, the user analyzer, the data analyzer, the security expert, the machine learning, you name it).
However. 

So. What is this rapport? A rapport is a declarative, short, textual description of a slice of time from your app's run. Put simply, the rapport contains **two** things: 
1) a json description of the _end state_, and 
2) a _trace of all the key functions_ called to produce this state and their input/output values: the state + the trace. If you have that, all your "other users" will be happy.

However. While your normal user needs a special beast of an output: a weird DOM animation or a custom response object with a text with a more or less custom format. It is like your app running doesn't only have **one** user, but **ten** users. However, all the ten other users are more or less happy seeing a version of more or less the same output: the `rapport`.

So, why manage state? You manage state to produce this rapport of "start+end state object" and "start to end trace".

It is possible to make such a concept with the help of the state monad.

## What is state monad?

The state monad is there to
a) store in memory and organize all the start+end state objects,
b) remember which functions were called (and implicitly not called) on the way from start to end, and their input, output data.

The Monad State is useful when there is some state that we are constantly changing. The purpose of the state monad is to hide the passing of state between functions.

So, why state monad? to produce the rapport when  it is ready, to preserve the start to end trace, and to manage the _start+end_ state object.

### Example

The example uses the IfElse monad principle. The example implements state management using approaches described above.

```javascript
import {JoiGraph} from "JoiStore.js";

  class JoiStateMonad {

    constructor(obj, parent) {
      this.state = obj;
      this.parent = parent;
    }

    ifCondition(fun) {
      const condition = this.state === null ? null : fun(this.state);
      return new JoiStateMonad(condition ? this.state : null, this);
    }

    setIn(path, fun) {
      let newState = this.state ?? JoiGraph.setIn(this.state, path, fun(this.state));
      return new JoiStateMonad(newState, this.parent);
    }

    else() {
      if (this.state === null)
        return new JoiStateMonad(this.parent.state, this.parent);
      else
        return new JoiStateMonad(null, this);
    }


    endIf() {
      if (this.state === null)
        return new JoiStateMonad(this.parent.state, this.parent);
      return new JoiStateMonad(this.state, this);
    }


    callSideEffect(fun) {
      this.state !== null && fun(this.state);
      return this;
    }
  }

  const state = {
    pathName: "C"
  }

  new JoiStateMonad(state)
    .ifCondition(state => state.pathName === 'A')
    .setIn('action.name', state => state?.pathName?.toUpperCase())
    .else()
    .setIn('action.name', () => 'B')
    .endIf()
    .callSideEffect(state => console.log(state))
```

Output will be: 

```
{
 action: {name: "B"},
 pathName: "C"
}
```

## Reference
* [Why State Management is All Wrong](https://medium.com/@bradfordlemley/why-state-management-is-all-wrong-ca9f3bbde869)