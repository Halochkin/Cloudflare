function getHeaderElement(credentials) {
  let logged;
  logged = `
<header>
    <span id="header-logo">TYPING RACE</span>
    <span>
     <a id="logout-btn" href="https://typing-auth.maksgalochkin2.workers.dev/logout">Logout</a>
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
  return JSON.stringify(credentials)!== "{}" ? logged : notlogged;
}

(async () => {
  const getUserdata = await fetch("https://typing-auth.maksgalochkin2.workers.dev", {cookies: "asssa"})
    .then(response => response.json())
    .then(data => data);

  const headerElements = getHeaderElement(getUserdata);


  // prependElement(document.body, headerElements)
  let element = document.createElement("div");
  element.innerHTML = headerElements;
  document.body.prepend(element.firstElementChild);


  let script = document.createElement("script");
  script.src = "../src/auth.js";
  document.body.appendChild(script)


})();





