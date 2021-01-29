function getHeaderElement(credentials) {
  let logged;

  if (credentials && credentials instanceof Object)
    credentials = JSON.parse(credentials);

  logged = `
<header>
    <span id="header-logo">TYPING RACE</span>
    <span>
     <a id="logout-btn" href="/logout">Logout</a>
     <span id="header-username" >${credentials.username}</span>
     <img id="header-photo" src="${credentials.photo}"/>
    </span>
</header>`;

  const notlogged = ` 
<header>
    <span id="header-logo">TYPING RACE</span>
    <span id="login-label">Log in to store your results
    <a href="/login/google"><img class="auth-logo" src="https://raw.githubusercontent.com/Halochkin/Cloudflare/master/StateManagement(TypingRacerApp)/static/img/google.png" alt="google auth"></a>
    <a href="/login/github"><img class="auth-logo" src="https://raw.githubusercontent.com/Halochkin/Cloudflare/master/StateManagement(TypingRacerApp)/static/img/github.png" alt="github auth"></a>
    <input id="remember-me" type="checkbox"/><label for="rember-me" style="float: right; color: #ffa429;">Remember Me </label>
    </span>
</header>`;

  const script = `
<script>
  let loginWindow;
  let loginWindowUrl;
  // handle message event. When we got message event from /callback it means that user logged in, So just change location
  function receiveLoginData(e) {
       if (e.origin !== "${'https://' + window.location.href}" || e.source !== loginWindow)
      return;
    window.location = e.origin + "/test/index.html";
  }

  window.addEventListener('message', receiveLoginData);

   for (let link of document.querySelectorAll(".auth-logo, #logout-btn"))
     link.addEventListener('click', openRequestedSinglePopup);
   
   console.log("boo");
   
   

  function popupParameters() {
    const width = Math.min(600, window.screen.width);
    const height = Math.min(600, window.screen.height);
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    return "resizable,scrollbars,status,opener," +
      Object.entries({width, height, left, top}).map(kv => kv.join('=')).join(',');
  }

  function openRequestedSinglePopup(event) {
    event.preventDefault();
    // let url = event.currentTarget.parentNode.href;
    let url = "https://typing-auth.maksgalochkin2.workers.dev" + event.currentTarget.parentNode.pathName;
    if (event.currentTarget.pathname === "/logout"){
     url = event.currentTarget.href;     // return and change location to prevent open popup window
    }
    let input = document.querySelector('input[type=checkbox]');
    if (input && input.checked)
      url += '?remember-me';
    if (!loginWindow || loginWindow.closed) {
      loginWindow = window.open(url, "_blank", popupParameters());
    } else if (loginWindowUrl !== url)
      loginWindow.location = url;
    loginWindowUrl = url;
    loginWindow.focus();
  }
  </script>`;


  return {
    header: credentials ? logged : notlogged,
    // script: script
  }
}

(async () => {
  const getUserdata = await fetch("https://typing-auth.maksgalochkin2.workers.dev/")
    .then(response => response.text())
    .then(data => data);

  const headerElements = getHeaderElement(getUserdata);

//todo: fix this
  const prependElement = (node, elements) => {
    for (const [key, value] of Object.entries(elements)) {
      let element = document.createElement("div");
      element.innerHTML = value;
      node.prepend(element.firstElementChild);
    }
  }


  prependElement(document.body, headerElements)

})();





