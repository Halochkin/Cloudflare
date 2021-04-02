# What is: IfElse monad

The implementation of the if/else construct. For effective representation, chaining methods will be used.

The monad represents the following methods:

* `ifCondition(fun)` : represents logic (if(<condition>) where the condition is the passed function) and executes the instruction if the result of the function is executed (true).
* `callConvert(fun)` : performs the task of a separate block of code {}, executed or ignored, depending on the result of the previous condition check method. The previous result is passed as context property.
* `else` : allows or disallows execution of the next method.
* `endIf` : defines context, current or previous method in the chain.
* `callSideEffect()` is used to display the current state if one exists.

Translated with www.DeepL.com/Translator (free version)

```javascript
 const request = {
    url: {
      pathName: "abc"
    }
  }

  class IfElseMonad {
    constructor(obj, parent) {
      this.state = obj;                                                 //[1]
      this.parent = parent;                                             //[2]
    }

    ifCondition(fun) {
      const condition = this.state === null ? false : fun(this.state);  //[3]
      return new IfElseMonad(condition ? this.state : null, this);      //[4]
    }


    callConvert(fun) {                                                  //[5]  
      let newState = this.state ? {...this.state, action: fun(this.state)} : null;
      return new IfElseMonad(newState, this.parent);                    //[6]
    }

    else() {                                                            //[7]  
      if (this.state === null)                                          //[8]  
        return new IfElseMonad(this.parent.state, this.parent);
      else
        return new IfElseMonad(null, this);
    }

    endIf() {
      if (this.state === null)                                           //[9]
        return new IfElseMonad(this.parent.state, this.parent);
      return new IfElseMonad(this.state, this);
    }

    callSideEffect(fun) {
      this.state !== null && fun(this.state);                           //[10]
      return this;
    }
  }

  new IfElseMonad({request})                                       
    .ifCondition((state) => state.request.url.pathName === "abc")
    .callConvert(state => state.action = '123')
    .else()
    .callConvert(state => state.action = 'abc')
    .endIf()
    .callSideEffect(state => console.log(state.action))
     //abc
```

1. When creating a new instance of an IfElse class, the `.state` property stores an initial state that can be modified during runtime.
2. `this.parent` property stores the states of the previous method in the call chain. This allows you to use a common context for all methods in the call chain and modify it at runtime.
3. If the result of the `fun` function call returns `true` this means that all conditions are met, and the first block of code (which corresponds to the `if` construct) can be executed, the other (else) is ignored. In order to determine which block should be used, the method returns a new instance of the `IfElse` class. As `.state.value` the current state value defined if the check function returns true and `null` if false. 
4. As mentioned earlier, for the chaining, each method in the chain must return a context (this) in order for the next method to be called in the context of the previous one. In our case, the methods return a new instance of the `IfElse` class.
5. Imitates an `if` or `else` block logic. The execution of a certain block is determined by the value of this.state. If the value is not null, it means the previous method was tested and the fun function can be called. If the .state is `null` it means that the conditions have not been met and `func` cannot be called and will be ignored until the method is called again with `this.state` not `null`.
6. As in .ifCondition(), it returns the context that will be used for the next method in the call chain.
7. Allows you to switch between code blocks. Since the `if/else` construct calls only one of the code blocks, we block or allow access to the second block, depending on the value of `this.state`.
8. In the case if `ifCondition()` returns _false_, and the previous `callConvert(fun)` did not call fun(), the next time you call `.callConvert(fun)`, fun() will be called.
9. Ensures that the call chain returns a context that has `.state` property.
10. Store the current state, if the filter function does not match, _can be `null` if called in a chain that has only one call to `callConvert(fun)`._

# Reference
* [Medium: Understanding Method Chaining In Javascript](https://medium.com/backticks-tildes/understanding-method-chaining-in-javascript-647a9004bd4f)