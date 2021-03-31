# WhatIs: Method Chaining
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
To chain methods together, we need to make sure that each method we define has a return value, which is `this`, so we can call next method in that context. When you create your own constructor functions, it is sufficient to end each method with the `return this` line to make it possible to execute methods in sequence.

### Method Chaining Example in ES5

```javascript
  function Chain(val) {
    this.myValue = val;
  }

  Chain.prototype.one = function (fn) {
    console.log("one");
    fn(this.myValue);
    this.myValue = "Goodbye";
    return this;
  }

  Chain.prototype.two = function (fn) {
    console.log("two");
    fn(this.myValue);
    return this;
  }
  Chain.prototype.three = function (fn) {
    console.log("three");
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

### Method Chaining Example in ES6

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

If current method does not return `this`, the next method will be called in the context of the global visibility (`window`), which will cause an error. Therefore, each method must return its context to provide a single context for all methods in the chain.

### Reference

* [JavaScript Function Chaining](https://medium.com/technofunnel/javascript-function-chaining-8b2fbef76f7f)

