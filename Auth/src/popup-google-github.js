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

async function decryptUser(data, password) {
  const [ivText, cipherB64url] = data.split('.');
  const iv = hexStringToUint8(ivText);
  const cipher = atob(fromBase64url(cipherB64url));
  return await decryptAESGCM(password, iv, cipher);
}

async function getEncryptedData(ttl) {
  const state = [Date.now(), ttl, uint8ToHexString(crypto.getRandomValues(new Uint8Array(8)))].join('.');
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await encryptAESGCM(SECRET, iv, state);
  return uint8ToHexString(iv) + '.' + toBase64url(btoa(cipher));
}

async function encryptUserData(data) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await encryptAESGCM(SECRET, iv, data);
  return uint8ToHexString(iv) + '.' + toBase64url(btoa(cipher));

}

//The state secret is a nonce.
//If it is read once, then it is also deleted from the state secret registry at the same time.
function hasStateSecretOnce(state) {
  const index = states.indexOf(state);
  return index >= 0 ? states.splice(index, 1) : false;
}

//CROSS REQUEST STATE SECRET end

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


async function checkStateSecret(data, password) {
  const [ivText, cipherB64url] = data.split('.');
  const iv = hexStringToUint8(ivText);
  const cipher = atob(fromBase64url(cipherB64url));
  const payload = await decryptAESGCM(password, iv, cipher);
  let [iat, ttl, someOtherState] = payload.split('.');
  iat = parseInt(iat);
  ttl = parseInt(ttl);
  const now = Date.now();
  const stillTimeToLive = now < iat + ttl;
  const notAFutureDream = iat < now;
  return stillTimeToLive && notAFutureDream;
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
  return payload.sub;
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
  return userData.login;
}


let logout = `<a href='/logout'>logout</a>`


function mainpage(command, value, popupOrigin) {
  const login = `<a href='/login/google'>login google</a><br>
                  <a href='/login/github'>login github</a><br>
                  RememberMe: <input type='checkbox'/><hr>`
  const logout = `<span>Hello${value}</span><a href="/logout">logout</a>`

  const script = `<script>
  let loginWindow;
  let loginWindowUrl;

  // handle message event. When we got message event from /callback it means that user logged in, So just change location
  function receiveLoginData(e) {
    if (e.origin !== "${popupOrigin}" || e.source !== loginWindow)
      return;
    window.location = e.origin;
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
    if (event.currentTarget.pathname === "/logout")
      return window.location = url;                  // return and change location to prevent open popup window
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
  if (command === "login")
    return logout + script;
  return login + script;
}

function popup(cookieData) {
  return `
 <script>
  setTimeout(function () {
    window.opener.postMessage('${cookieData}');
    window.close();
  }, 200);
</script>`;
}

const myDomain = 'auth-go-gi.maksgalochkin2.workers.dev';
let rememberUser;


async function handleRequest(req) {
  const url = new URL(req.url);
  let state = await getEncryptedData(STATE_SECRET_TTL_MS);
  const [ignore, action, data, rememberMe] = url.pathname.split('/');
  let redirect;


  if (action === 'logout') {
    return new Response(mainpage("logout", "", 'https://' + myDomain), {
      status: 201,
      headers: {
        'Content-Type': 'text/html',
        'Set-Cookie': `sessionID=undefined; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=-1; Domain=${myDomain}; `
      }
    });
  }


  if (action === "login") {
    rememberUser = !!(rememberMe && rememberMe === "rememberMe");
    if (data === 'github') {
      redirect = makeRedirect(GITHUB_OAUTH_LINK, {
        state, client_id: GITHUB_CLIENTID, redirect_url: GITHUB_REDIRECT, scope: 'user',
      });
    } else if (data === 'google') {
      redirect = makeRedirect(GOOGLE_REDIRECT_1, {
        state,
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
    if (!await checkStateSecret(stateParam, SECRET))
      return new Response(res);
    const code = url.searchParams.get('code');

    //AES-GCM
    let userText;
    if (data === 'google')
      userText = {result: await googleProcessTokenPackage(code)} //the userText is the sub.
    else if (data === 'github')
      userText = {result: await githubProcessTokenPackage(code)}; //userText is the github id nr.
    else
      return new Response('404');

    // encrypt userText object
    const encryptedData = await getEncryptedData(JSON.stringify(userText.result));

    //set user info as cookie
    return new Response(popup(userText.result, 'https://' + myDomain), {
      status: 201, headers: {
        'content-type': 'text/html',
        'Set-Cookie': `sessionID=${encryptedData}; HttpOnly; SameSite=Strict; Path=/; Domain=${myDomain};` + (rememberUser ? `Expires=25920300; Max-Age=10000;` : ``) // Max-Age=2592000;
      }
    });
  }
  const cookie = getCookieValue(req.headers.get('cookie'), 'sessionID');
  //  const cookie = "e6e4caf0cf4ddd66ab597d67.FsKL12LgAA5ihsn0am4Dijd40JPwl28g9UkL";
  if (cookie) {
    let decryptData = await decryptUser(cookie, SECRET);
    return new Response(mainpage("login", decryptData, 'https://' + myDomain), {
      status: 201,
      headers: {
        'Content-Type': 'text/html',
      }
    });
  }


  return new Response(mainpage("logout", "", 'https://' + myDomain), {headers: {'Content-Type': 'text/html'}});

}

addEventListener('fetch', e => e.respondWith(handleRequest(e.request)));

