# HowTo: IfElse monad
Quite often in programming, you need to transform a piece of data many times in a row to bring it to the desired final state. Each of these conversions will be performed by a specific function/method and must be performed in a specific order.

Usually you read the code from top to bottom, from left to right. So if you've seen a piece of code that looks something like this, your instinct will read it as follows:

```javascript
myObject.method1(
   myObject.method2(
      myObject.method3()
  )
)
```

However, the flow of data through a series of functions is actually the opposite. The innermost nested function actually passes the return value up the list.

As a result, to ensure that you get the correct return value, you will largely have to write functions in reverse order of how they are used when you create them. In this example, you have to write method3 first, since it will run first and handle the data first.

As you understand, the more functions you add, the harder it becomes to debug them. But it would be much easier to understand a little code if we could execute the functions in the order we read them.

### Method Chaining

Chaining is a technique that returns the original object after each method call, so you can perform several methods in sequence instead of calling them individually. Many libraries, such as jQuery, are based on this technique:

```javascript
$('div').addClass('active').on('click', function() {
  fetch('http://someurl.com/example')
  .then(response => response.json())
  .then(data => console.log(data))
});
```
To chain methods together, we need to make sure that each method we define has a return value, which is `this`, so we can call next method in that context. . When you create your own constructor functions, it is sufficient to end each method with the `return this` line to make it possible to execute methods in sequence:

```javascript
  class Chain {
    constructor(val) {
      this.myValue = val;
    }

    one(fn) {
      console.log("one");
      fn(this.myValue);
      this.myValue = "Goodbye";
      return this;
    }

    two(fn) {
      console.log("two");
      fn(this.myValue);
      return this;
    }

    three(fn) {
      console.log("three");
    }
  }
  
  const chainInstance = (value) => new Chain(value);

  chainInstance("Hello")
    .one(msg => console.log(msg + " world"))
    .two(msg => console.log(msg + " world"))
    .three();

```

Output will be: 

```
 one
 Hello world
 two
 Goodbye world
 three
```

If current method does not return `this`, the next method will be called in the context of the global visibility (`window`), which will cause an error. Therefore, each method must return its context to provide a single context for all methods in the chain.

### IfElse monad

```javascript
 const request = {
    url: {
      pathName: "abc"
    }
  }

  class IfElseMonad {
    constructor(obj, parent) {
      this.state = obj;          //[1]
      this.parent = parent;      //[2]
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
9. Ensures that the call chain returns a context that has a .state property.
10. Store the current state, if the filter function does not match, _can be null if called in a chain that has only one call to callConvert(fun)._

# Reference
* [Medium: Understanding Method Chaining In Javascript](https://medium.com/backticks-tildes/understanding-method-chaining-in-javascript-647a9004bd4f)