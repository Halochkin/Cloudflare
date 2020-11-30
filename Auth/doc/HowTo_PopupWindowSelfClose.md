# HowTo Self close popup window

To make a self-closing window, `window.close();` is used.


```html
<input type="text">
<button>Send messege</button>

<script>
  const input = document.querySelector("input[type=text]");
  const btn = document.querySelector("button");
  btn.addEventListener("click", sendMessage);

  function sendMessage(e) {
    let value = input.value;
    if (value)
      setTimeout(function () {
        window.opener.postMessage(value, window.opener.location.href);
        window.close();
      }, 200);
  }
</script>
```