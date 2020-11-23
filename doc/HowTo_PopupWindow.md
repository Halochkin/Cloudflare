# HowTo: Pop-up window
 A pop-up window is a floating container that appears from outside the screen or appears immediately above the information. In most cases, users are annoyed when they see pop-up windows because most of them contain intrusive advertising. This is why Google Chrome has added the ability to block pop-ups.
 Pop-ups do not have to be intrusive or disturbing. If used correctly, you can enable the website visitor to perform the action you need, such as authorization on the website using a social login. 

The main idea is to open a pop-up window in the middle of the screen, and that if user have opened the same popup before, then the same window reused (so that user only get one window).
 
In order to do this, it is necessary:
 
1. Create html file (e.g. pop-up-window.html), which will be rendered inside the pop-up window.

### pop-up-window.html

```html
<div style="color: blue;">Hello sunshine</div>
<script>
alert("");
</script>
```
2. Create a main html file that listens to user actions and opens a pop-up window.
### main.html
```html
<a href="login">login</a>
<script>
  let loginWindow;
  const aLink = document.querySelector("a");
  aLink.addEventListener("click", handleEvent);

  function popupParameters() {  // Options for the pop-up window. Positioning and properties            
    const width = Math.min(600, window.screen.width);   
    const height = Math.min(600, window.screen.height);
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    return "resizable,scrollbars,status,opener," +  
      Object.entries({width, height, left, top}).map(kv => kv.join('=')).join(',');
  }

  function handleEvent(e) {
    e.preventDefault();                                            //[1]
    let url = "pop-up-window.html";                                //[2]
    if (!loginWindow || loginWindow.closed)                        //[3]
      loginWindow = window.open(url, "_blank", popupParameters()); //[4]
    loginWindow.focus();                                           //[5]          
  }
</script>
```
1. Prevent `a` element default action to avoid page reloading.
2. Define pop-up window url.
3. Checking a previously opened pop-up window. If such a window is already open, the new window will not open.
4. Opens a new pop-up window with defined parameters. These parameters are the height, width, margin left/top and the different settings responsible for the window's interaction with the user.
5. Focusing on the window, moving it to the foreground.

## Reference
* [MDN: pop-up features](https://developer.mozilla.org/en-US/docs/Web/API/Window/open#Toolbar_and_UI_parts_features)
