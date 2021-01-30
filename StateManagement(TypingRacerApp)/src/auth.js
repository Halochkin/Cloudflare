let loginWindow;
let loginWindowUrl;
// handle message event. When we got message event from /callback it means that user logged in, So just change location
function receiveLoginData(e) {
  // if (e.origin !== `${'https://' + window.location.origin}` || e.source !== loginWindow)
  //   return;  //todo: add some check
  window.location = window.origin + "/test/index.html";
}

window.addEventListener('message', receiveLoginData);

for (let link of document.querySelectorAll(".auth-logo, #logout-btn"))
  link.addEventListener('click', openRequestedSinglePopup);



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
  let url = "https://typing-auth.maksgalochkin2.workers.dev" + event.currentTarget.parentNode.pathname;
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