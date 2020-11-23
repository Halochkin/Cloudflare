# HowTo: Pop-up window interaction
Sometimes there are situations where it is necessary to transfer some data from a pop-up window to the main window. This can be done by using a **`message`** event. The message event is send using the `postMessage()`. 

```javascript
   otherWindow.postMessage( message ,targetOrigin);
```
  * `otherWindow` - a link to another (main) window;
  * `message` - data (can be of any type) to be sent to another window. 
  * `targetOrigin` - url of the window to which data are to be sent.  The value "*" indicates that data can be transferred to a window with any url.

Consider a simple example where a pop-up window contain form with input field and submit button inside. 
When the form submitted, the pop-up window will send the input field value to the main window and add it to the list. 

### pop-up-window.html

```html
<form>
    <input type="text">
    <input type="submit">
</form>
<script>
  const input = document.querySelector("input[type=text]");
  const form = document.querySelector("form");
  form.addEventListener("submit", sendMessage);

  function sendMessage(e) {
    let value = input.value;
    if (value)
      window.opener.postMessage(value, window.opener.location.href); //post message to main.html
  }
</script>
```

### main.html

```html
<a href="login">login</a>
<ul></ul>
<script>
  let loginWindow;
  const aLink = document.querySelector("a");
  let ul = document.querySelector("ul");
  aLink.addEventListener("click", handleEvent);
  window.addEventListener("message", handleMessage);  

  function handleMessage(e) {            //recieve message event from pop-up.html
    let li = document.createElement("li");
    li.innerText = e.data;
    ul.appendChild(li);
  }

  function popupParameters() {
    const width = Math.min(600, window.screen.width);
    const height = Math.min(600, window.screen.height);
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    return "resizable,scrollbars,status,opener," +
      Object.entries({width, height, left, top}).map(kv => kv.join('=')).join(',');
  }

  function handleEvent(e) {
    e.preventDefault();
    let url = "popup-login.html";
    if (!loginWindow || loginWindow.closed)
      loginWindow = window.open(url, "_blank", popupParameters());
    loginWindow.focus();
  }

</script>
```

## Reference
 * [MDN: window.opener](https://developer.mozilla.org/en-US/docs/Web/API/Window/opener)
 * [MDN: postMessage()](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)