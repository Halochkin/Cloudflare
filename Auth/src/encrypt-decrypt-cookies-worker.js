let SECRET = "klasjdfoqjpwoekfj!askdfj"
const ROOT = "TODO.TODO.workers.dev"; //TODO                                        
const STATE_PARAM_TTL = 3 * 60;
const SESSION_TTL = 60 * 60 * 24 * 7;
let cachedPassHash;


//imported pure functions begins
function getCookieValue(cookie, key) {
  return cookie?.match(`(^|;)\\s*${key}\\s*=\\s*([^;]+)`)?.pop();
}

function uint8ToHexString(ar) {
  return Array.from(ar).map(b => ('00' + b.toString(16)).slice(-2)).join('');
}

function hexStringToUint8(str) {
  return new Uint8Array(str.match(/.{2}/g).map(byte => parseInt(byte, 16)));
}

function toBase64url(base64str) {
  return base64str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function fromBase64url(base64urlStr) {
  base64urlStr = base64urlStr.replace(/-/g, '+').replace(/_/g, '/');
  if (base64urlStr.length % 4 === 2)
    return base64urlStr + '==';
  if (base64urlStr.length % 4 === 3)
    return base64urlStr + '=';
  return base64urlStr;
}

async function passHash(pw) {
  return cachedPassHash || (cachedPassHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw)));
}

async function makeKeyAESGCM(password, iv) {
  const pwHash = await passHash(password);
  const alg = {name: 'AES-GCM', iv: iv};                            // specify algorithm to use
  return await crypto.subtle.importKey('raw', pwHash, alg, false, ['decrypt', 'encrypt']);  // use pw to generate key
}

async function encryptAESGCM(password, iv, plaintext) {
  const key = await makeKeyAESGCM(password, iv);
  const ptUint8 = new TextEncoder().encode(plaintext);                               // encode plaintext as UTF-8
  const ctBuffer = await crypto.subtle.encrypt({name: key.algorithm.name, iv: iv}, key, ptUint8);                   // encrypt plaintext using key
  const ctArray = Array.from(new Uint8Array(ctBuffer));                              // ciphertext as byte array
  return ctArray.map(byte => String.fromCharCode(byte)).join('');             // ciphertext as string
}

async function decryptAESGCM(password, iv, ctStr) {
  const key = await makeKeyAESGCM(password, iv);
  const ctUint8 = new Uint8Array(ctStr.match(/[\s\S]/g).map(ch => ch.charCodeAt(0))); // ciphertext as Uint8Array
  const plainBuffer = await crypto.subtle.decrypt({name: key.algorithm.name, iv: iv}, key, ctUint8);                 // decrypt ciphertext using key
  return new TextDecoder().decode(plainBuffer);                                       // return the plaintext
}

async function encryptData(data) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await encryptAESGCM(SECRET, iv, data);
  return uint8ToHexString(iv) + '.' + toBase64url(btoa(cipher));
}

async function decryptData(data, password) {
  const [ivText, cipherB64url] = data.split('.');
  const iv = hexStringToUint8(ivText);
  const cipher = atob(fromBase64url(cipherB64url));
  const payload = await decryptAESGCM(password, iv, cipher);
  let [iat, ttl, someOtherState] = payload.split('.');
  return [iat, ttl];
}

//imported pure functions ends

//max. the getState(ttl) and checkData(iat, ttl) functions are application specific, don't mix them in with the list of pure functions.
function getState(ttl) {
  return [Date.now(), STATE_PARAM_TTL, uint8ToHexString(crypto.getRandomValues(new Uint8Array(8)))].join('.');
}

function checkTTL(iat, ttl) {
  const now = Date.now();
  const stillTimeToLive = now < iat + ttl;
  const notAFutureDream = iat < now;
  return stillTimeToLive && notAFutureDream;
}

function mainpage(command, value, popupOrigin) {
  const login = `<a href='/login/google'>login google</a><br>
                   <a href='/login/github'>login github</a><br>
                  RememberMe: <input type='checkbox'/><hr>`
  const logout = `<span>Hello ${value}</span><a href="/logout">logout</a>`

  const script = `<script>


  class CustomWebComp extends HTMLElement{
    constructor() {
      super();
     this.shadowRoot
    }
  }

  let loginWindow;
  let loginWindowUrl;


  // handle message event. When we got message event from /callback it means that user logged in, So just change location
  function receiveLoginData(e) {
    if (e.origin !== "${popupOrigin}" || e.source !== loginWindow)
      return;
    window.location = '${popupOrigin}';
  }

  window.addEventListener('message', receiveLoginData);


  for (let link of document.querySelectorAll("a"))
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
    let url = event.currentTarget.href;
    if (event.currentTarget.pathname === "/logout"){
      return window.location = url;                  // return and change location to prevent open popup window
    }
    let input = document.querySelector('input');
    if (input && input.checked)
      url += '/rememberMe';
    if (!loginWindow || loginWindow.closed) {
      loginWindow = window.open(url, "_blank", popupParameters());
    } else if (loginWindowUrl !== url)
      loginWindow.location = url;
    loginWindowUrl = url;
    loginWindow.focus();
  }
</script>`;
  return (command === "logged" ? logout : login) + script;
}


async function handleRequest(request) {
  const url = new URL(request.url);                                                      //[1] get current url
  const [ignore, action] = url.pathname.split('/');                              // split url to extract command
  const stateParam = url.searchParams.get('state');       // state parameter check, appears after redirection and contains an encrypted state value
  if (!action && !stateParam) {                           // match condition only once
    //1. first time
    //2. worker makes a state param, with ttl, iat, passphrase and encrypts it with SECRET
    const state = getState(STATE_PARAM_TTL);             // get state array which contain: current date, time to live and random string in hex format
    const encryptedState = await encryptData(state);    // encrypt state - (convert into a string which contain iv and encrypted data, divided by dot)
    const redirectUrl = "https://" + ROOT + "/?state=" + encodeURIComponent(encryptedState);  // make redirect url and set state param with a encrypted state value
    //3. browser <= REDIRECT: my.worker.dev/?state=.... <= worker
    return new Response.redirect(redirectUrl);            // do redirect. It will recall handleRequest() but this block of code will not execute
  }
  //4. browser => GET my.worker.dev/?state=... => worker
  if (!action && stateParam) {
    // 5. worker get state param decrypts the state param with the same SECRET, checks the ttl, iat, and passphrase
    let [_iat, _ttl] = await decryptData(stateParam, SECRET); // return decrypted value.
    if (!checkTTL(_iat, _ttl))    //Expiration check
      return new Response("Error: state param timed out");
    // 6. creates a new sessionID object with iat, ttl, userId (which is just a fixed value like 'Max') and convert it into a string
    let sessionID = JSON.stringify({iat: Date.now(), ttl: SESSION_TTL, uid: "Max"});
    let encryptedSessionID = await encryptData(sessionID);   //encrypt object before set it as cookie value
    return new Response(`<a href="/showCookie">get cookies</a>`, {  // render anchor element which provide showCookie action when clicked
      status: 200,
      headers: {
        'content-type': 'text/html',         //convert into html
        // 7. sets this sessionID as a cookie
        'Set-Cookie': `SESSIONID=${encryptedSessionID}; HttpOnly; Secure; SameSite=Strict; Path=/; Domain=${ROOT};`
      }
    });
  }
  //9. browser => GET my.worker.dev/showCookie => worker
  if (action === "showCookie") {                               // will execute only after anchor element click
    const cookie = getCookieValue(request.headers.get('cookie'), 'SESSIONID'); // get cookie
    if (cookie) {
      // 10. worker decrypts the cookie coming with the http request, using the same SECRET, checks the ttl, iat, and finds the uid.
      let [cookieData, ignore] = await decryptData(cookie, SECRET); // decrypt cookie value
      let cookieDataObj = JSON.parse(cookieData);    // convert from string into object
      if (!checkTTL(cookieDataObj.iat, cookieDataObj.ttl))  // expiration check
        return new Response("Error: session timed out");
      //11. browser <= 200: my.worker.dev/showCookie with the value of the userId <= worker
      return new Response(cookieDataObj.uid);  //response with encrypted cookie value
    }
    return new Response("no cookie! :(");
  }


}

addEventListener('fetch', e => e.respondWith(handleRequest(e.request)));