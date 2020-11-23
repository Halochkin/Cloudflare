# HowTo: Google Github Auth with Cloudflare worker

## Why Cloudflare?

CloudFlare "accelerates" the work of the site by caching your site in its CDNs around the world. If you look at the map of CloudFlare servers distribution on their main page, you will see that more than 100 Cloudflare data centers locate around the world. Thus, a huge part of Internet users is almost in direct peering with them, so their CDN system is quite effective and allows you to "speed up" the work of your site, located, for example, in Ukraine, for users from, for example, Australia. 
Cloudflare uses CDN as an infrastructure to load your site faster. Hosting technologies of Cloudflare instantly optimize content. Reduces traffic consumption by 60% and 65% reduces the load on the server.


## Create and configure Google/Github App. Configure worker (Cloudflare).
Before you start, create and configure both [Google](HowTo_GoogleAuth.md) and [Github](HowTo_GithubAuth.md) application. Create new common worker and define global variables.

## Code the worker

Make a `handleRequest()` function:

```javascript
let rememberUser;

async function handleRequest(req) {
  const url = new URL(req.url);                                       
  const state = getState(STATE_SECRET_TTL_MS);                                                                     //[4]
  const encryptedState = await getEncryptedData(state);              
  const [ignore, action, data, rememberMe] = url.pathname.split('/'); 

  if (action === "login") {
    let redirect;
    rememberUser = !!(rememberMe && rememberMe === "rememberMe");     //depending on the value will be determined max-age of cookies
    if (data === 'github') {                                         
      redirect = makeRedirect(GITHUB_OAUTH_LINK, {
        state: encryptedState,
        client_id: GITHUB_CLIENTID,
        redirect_url: GITHUB_REDIRECT,
        scope: 'user',
      });
    } else if (data === 'google') {
      redirect = makeRedirect(GOOGLE_REDIRECT_1, {
        state: encryptedState,
        nonce: randomString(12),
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: GOOGLE_REDIRECT_2,
        scope: 'openid email profile',
        response_type: 'code',
      });
    } else
      return new Response('error1');
    return Response.redirect(redirect);
  }
  if (action === 'callback') {                        
    const stateParam = url.searchParams.get('state'); 
    let decryptedStateParam = await decryptData(stateParam, SECRET);  
    if (!await checkStateSecret(decryptedStateParam))                 
      return new Response(res);

    let userText;
    if (data === 'google')
      userText = {result: await googleProcessTokenPackage(code)} //the userText is the sub.
    else if (data === 'github')
      userText = {result: await githubProcessTokenPackage(code)}; //userText is the github id nr.
    else
      return new Response('404');
    
    const encryptedData = await getEncryptedData(JSON.stringify(userText.result)); // encrypt userText object

    return new Response(popup(userText.result, 'https://' + myDomain), { //set encryptedData as sessionID cookie value
      status: 201, headers: {
        'content-type': 'text/html',                                
        'Set-Cookie': `sessionID=${encryptedData}; HttpOnly; SameSite=Strict; Path=/; Domain=${myDomain};` + (rememberUser ? `Max-Age=10000;` : ``) //depending on the value of rememberUser we define cookies Max-Age 
      }
    });
  }

   // Remove cookie and response with login form if user log out
  if (action === 'logout') {
    return new Response(mainpage("logout", "", 'https://' + myDomain), {
      status: 201,
      headers: {
        'Content-Type': 'text/html',
        'Set-Cookie': `sessionID=undefined; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=-1; Domain=${myDomain}; `
      }
    });
  }

  const cookie = getCookieValue(req.headers.get('cookie'), 'sessionID');                                           //[1]
  if (cookie) {                                                                                                    //[2]
    let decryptedData = await decryptData(cookie, SECRET);
    return new Response(mainpage("logged", decryptedData, 'https://' + myDomain), {
      status: 201,
      headers: {
        'Content-Type': 'text/html',
      }
    });
  }

  return new Response(mainpage("logout", "", 'https://' + myDomain), {headers: {'Content-Type': 'text/html'}});    //[3]
}

```
1. Server will check the cookies before response.
2. If there are "sessionID" cookie, the server will not response with login form, but will assume that the user already logged in. It should be noted that the data that the server adds as the value of cookies encrypted, and without a key it is very difficult for attackers to spoof it.
   
```javascript
function mainpage(command, value, popupOrigin) {
  const login = `<a href='/login/google'>login google</a><br>
                 <a href='/login/github'>login github</a><br>
                 <label>RememberMe:
                     <input type='checkbox'>
                 </label>`
  const logout = `<span>Hello ${value}</span><a href="/logout">logout</a>`
  const script = `<script>
  let loginWindow;
  let loginWindowUrl;

  function receiveLoginData(e) {
    if (e.origin !== "${popupOrigin}" || e.source !== loginWindow)
      return;
    window.location = '${popupOrigin}';                           //open origin url after login
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
      return window.location = url;                  // return and change location to prevent open popup window when user log out
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
```
  
3. Server responds with `mainpage()` which provide HTML template with `<script>` if there is not cookies.
4. Both [Google](HowTo_GoogleAuth.md) and [Github](HowTo_GithubAuth.md) Auth tutorials describe `handleRequest()` variables and algoritm of execution.

 ### Example
 Full example here
```javascript
let GITHUB_ACCESS_TOKEN_LINK = "https://github.com/login/oauth/access_token"
let GITHUB_CLIENTID = "Iv1.8b7189daaf358732"
let GITHUB_CLIENTSECRET = "c54696046f8f0a050f5bd040e4bbce5d1e39d64c"
let GITHUB_OAUTH_LINK = "https://github.com/login/oauth/authorize"
let GITHUB_REDIRECT = "https://auth-go-gi.maksgalochkin2.workers.dev/callback/github"
let GOOGLE_CLIENT_ID = "1088792034478-t22k7p03nsenhlcthph8pdqidmq3skrb.apps.googleusercontent.com"
let GOOGLE_CLIENT_SECRET = "qwt--5urahCnsyuJ- Ttq6pHE"
let GOOGLE_CODE_LINK = "https://oauth2.googleapis.com/token"
let GOOGLE_REDIRECT_1 = "https://accounts.google.com/o/oauth2/v2/auth"
let GOOGLE_REDIRECT_2 = "https://auth-go-gi.maksgalochkin2.workers.dev/callback/google"
let SECRET = "klasjdfoqjpwoekfj!askdfj"
let STATE_SECRET_REGISTRY_LENGTH = 10000
let STATE_SECRET_TTL_MS = 300000

function randomString(length) {
  const iv = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(iv).map(b => ('00' + b.toString(16)).slice(-2)).join('');
}

function getCookieValue(cookie, key) {
  return cookie?.match(`(^|;)\\s*${key}\\s*=\\s*([^;]+)`)?.pop();
}

//Base64url
function toBase64url(base64str) {
  return base64str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function uint8ToHexString(ar) {
  return Array.from(ar).map(b => ('00' + b.toString(16)).slice(-2)).join('');
}

function hexStringToUint8(str) {
  return new Uint8Array(str.match(/.{2}/g).map(byte => parseInt(byte, 16)));
}


function fromBase64url(base64urlStr) {
  base64urlStr = base64urlStr.replace(/-/g, '+').replace(/_/g, '/');
  if (base64urlStr.length % 4 === 2)
    return base64urlStr + '==';
  if (base64urlStr.length % 4 === 3)
    return base64urlStr + '=';
  return base64urlStr;
}

let cachedPassHash;

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

function getState(ttl) {
  return [Date.now(), ttl, uint8ToHexString(crypto.getRandomValues(new Uint8Array(8)))].join('.');
}

async function getEncryptedData(data) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await encryptAESGCM(SECRET, iv, data);
  return uint8ToHexString(iv) + '.' + toBase64url(btoa(cipher));
}

//GET REDIRECT AND POST ACCESS_TOKEN
function makeRedirect(path, params) {
  return path + '?' + Object.entries(params).map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&');
}

async function fetchAccessToken(path, data) {
  return await fetch(path, {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: Object.entries(data).map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&')
  });
}


async function checkStateSecret(data) {
  let [iat, ttl, someOtherState] = data.split('.');
  iat = parseInt(iat);
  ttl = parseInt(ttl);
  const now = Date.now();
  const stillTimeToLive = now < iat + ttl;
  const notAFutureDream = iat < now;
  return stillTimeToLive && notAFutureDream;
}

async function decryptData(data, password) {
  const [ivText, cipherB64url] = data.split('.');
  const iv = hexStringToUint8(ivText);
  const cipher = atob(fromBase64url(cipherB64url));
  return await decryptAESGCM(password, iv, cipher);
}


async function googleProcessTokenPackage(code) {
  const tokenPackage = await fetchAccessToken(
    GOOGLE_CODE_LINK, {
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_2,
      grant_type: 'authorization_code'
    }
  );
  const jwt = await tokenPackage.json();
  const [header, payloadB64url, signature] = jwt.id_token.split('.');
  const payloadText = atob(fromBase64url(payloadB64url));
  const payload = JSON.parse(payloadText);
  return {
    name: payload.name,
    id: payload.sub
  };
}

async function githubProcessTokenPackage(code, state) {
  const accessTokenPackage = await fetchAccessToken(GITHUB_ACCESS_TOKEN_LINK, {
    code,
    client_id: GITHUB_CLIENTID,
    client_secret: GITHUB_CLIENTSECRET,
    redirect_uri: GITHUB_REDIRECT,
    state
  });
  const data = await accessTokenPackage.text();
  const x = {};
  data.split('&').map(pair => pair.split('=')).forEach(([k, v]) => x[k] = v);
  const accessToken = x['access_token'];
  const user = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': 'token ' + accessToken,
      'User-Agent': 'maksgalochkin2',
      'Accept': 'application/vnd.github.v3.raw+json'
    }
  });
  const userData = await user.json();
  return {
    name: userData.name,
    id: userData.id
  };
}

function mainpage(command, value, popupOrigin) {
  const login = `<a href='/login/google'>login google</a><br>
                 <a href='/login/github'>login github</a><br>
                 RememberMe: <input type='checkbox'/><hr>`
  const logout = `<span>Hello ${value}</span><a href="/logout">logout</a>`

  const script = `<script>
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

function popup(cookieData, myDomain) {
  return `
 <script>
  setTimeout(function () {
    window.opener.postMessage('${cookieData}', '${myDomain}');
    window.close();
  }, 200);
</script>`;
}

const myDomain = 'auth-go-gi.maksgalochkin2.workers.dev';
let rememberUser;


async function handleRequest(req) {
  const url = new URL(req.url);
  const state = getState(STATE_SECRET_TTL_MS);
  const encryptedState = await getEncryptedData(state);
  const [ignore, action, data, rememberMe] = url.pathname.split('/');

  if (action === "login") {
    let redirect;

    rememberUser = !!(rememberMe && rememberMe === "rememberMe");
    if (data === 'github') {
      redirect = makeRedirect(GITHUB_OAUTH_LINK, {
        state: encryptedState,
        client_id: GITHUB_CLIENTID,
        redirect_url: GITHUB_REDIRECT,
        scope: 'user',
      });
    } else if (data === 'google') {
      redirect = makeRedirect(GOOGLE_REDIRECT_1, {
        state: encryptedState,
        nonce: randomString(12),
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: GOOGLE_REDIRECT_2,
        scope: 'openid email profile',
        response_type: 'code',
      });
    } else
      return new Response('error1' + action + data);
    return Response.redirect(redirect);
  }

  if (action === 'callback') {
    const stateParam = url.searchParams.get('state');
    let decryptedStateParam = await decryptData(stateParam, SECRET);
    if (!await checkStateSecret(decryptedStateParam))
      return new Response("Wrong code param");
    const code = url.searchParams.get('code');

    //AES-GCM
    let userText;
    if (data === 'google')
      userText = {result: await googleProcessTokenPackage(code)} //the userText is the sub.
    else if (data === 'github')
      userText = {result: await githubProcessTokenPackage(code)}; //userText is the github id nr.
    else
      return new Response('404');
    const encryptedData = await getEncryptedData(JSON.stringify(userText.result));    // encrypt userText object
    return new Response(popup(userText.result, 'https://' + myDomain), {      //set user info as cookie
      status: 201, headers: {
        'content-type': 'text/html',
        'Set-Cookie': `sessionID=${encryptedData}; HttpOnly; SameSite=Strict; Path=/; Domain=${myDomain};` + (rememberUser ? `Max-Age=10000;` : ``)
      }
    });
  }

  if (action === 'logout') {
    return new Response(mainpage("logout", "", 'https://' + myDomain), {
      status: 201,
      headers: {
        'Content-Type': 'text/html',    /// set Max-Age to -1 to remove cookie
        'Set-Cookie': `sessionID=undefined; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=-1; Domain=${myDomain}; `
      }
    });
  }

  const cookie = getCookieValue(req.headers.get('cookie'), 'sessionID');
  if (cookie) {
    let decryptedData = await decryptData(cookie, SECRET);
    return new Response(mainpage("logged", decryptedData, 'https://' + myDomain), {
      status: 201,
      headers: {
        'Content-Type': 'text/html',
      }
    });
  }

  return new Response(mainpage("logout", "", 'https://' + myDomain), {headers: {'Content-Type': 'text/html'}});
}

addEventListener('fetch', e => e.respondWith(handleRequest(e.request)));
```

## Reference
 * [OpenID Connect](https://developers.google.com/identity/protocols/oauth2/openid-connect)
 * [Base64](https://en.wikipedia.org/wiki/Base64)
 * [Live demo](https://dash.cloudflare.com/a6df9be02f0ec82fea09296ccf4d316d/workers/edit/auth-go-gi)
