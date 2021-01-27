// const COUNTER_KEY = 'dvAV77q6uaIOSzE_cgq6Bs_q-vojyIglNLW8lWHtiGUuWM03mLCZnaWIqTtlWYhk'

// const GITHUB_CLIENTID = 'Iv1.27dccdadf938e8bf'
// const GITHUB_CLIENTSECRET = '73a0e0caba381a5629bf42cd5c14d9e87d6f982e'
// const GITHUB_CODE_LINK = 'https://github.com/login/oauth/access_token'
// const GITHUB_OAUTH_LINK = 'https://github.com/login/oauth/authorize'
// const GITHUB_REDIRECT = 'https://typing-race.maksgalochkin2.workers.dev/callback/github'

// const GOOGLE_CLIENT_ID = '1052973726979-cra8ku89dp9tvg7m4tvjphp2dnsno6f2.apps.googleusercontent.com'
// const GOOGLE_CLIENT_SECRET = 'FTI7P9jkzPP6qkV4FfF0uvC'
// const GOOGLE_CODE_LINK = 'https://oauth2.googleapis.com/token'
// const GOOGLE_OAUTH_LINK = 'https://accounts.google.com/o/oauth2/v2/auth'
// const GOOGLE_REDIRECT = 'typing-race.maksgalochkin2.workers.dev/callback/google'


// const SECRET = 'klasjdfoqjpwoekfj!askdfj'
// const SESSION_COOKIE_NAME = 'sessionID'
// const SESSION_ROOT = '.maksgalochkin2.workers.dev'
// const SESSION_TTL = 2592000
// const STATE_SECRET_TTL_MS = 180


const link = "https://raw.githubusercontent.com/Halochkin/Cloudflare/master/testApp";

const myDomain = `typing-race.maksgalochkin2.workers.dev`;


async function makeFetch(path) {
  return await fetch(link + path)
    .then(response => response.text())
    .then(data => {
      return data
    })
    .catch(error => console.error(error))
}


function getHeaderElement(credentials) {
  let logged;
  let base = `
<head>
     <meta charset="UTF-8">
     <title>Typing racer</title>
     <link rel="shortcut icon" type="image/png" href="../static/img/logo.png"/>
</head>
    `

  if (credentials)
    logged = `
<header>
    <span id="header-logo">TYPING RACE</span>
    <span>
     <a id="logout-btn" href="/logout">Logout</a>
     <span id="header-username" >${credentials.username}</span>
     <img id="header-photo" src="${credentials.photo}"/>
    </span>
</header>`;

  const notlogged = ` <header>
    <span id="header-logo">TYPING RACE</span>
    <span id="login-label">Log in to store your results
    <a href="/login/google"><img class="auth-logo" src="../static/img/google.png" alt="google auth"></a>
    <a href="/login/github"><img class="auth-logo" src="../static/img/github.png" alt="github auth"></a>
    <input id="remember-me" type="checkbox"/><label for="rember-me" style="float: right; color: #ffa429;">Remember Me </label>
    </span>
  </header>`;

  const script = `
    
<script>

  let loginWindow;
  let loginWindowUrl;

  // handle message event. When we got message event from /callback it means that user logged in, So just change location
  function receiveLoginData(e) {
       if (e.origin !== "${'https://' + myDomain}" || e.source !== loginWindow)
      return;
    window.location = e.origin + "/test/index.html";
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
    let url = event.currentTarget.parentNode.href;
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

  return base + (credentials ? logged : notlogged) + script;

}

function randomString(length) {
  const iv = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(iv).map(b => ('00' + b.toString(16)).slice(-2)).join('');
}

function getCookieValue(cookie, key) {
  return cookie?.match(`(^|;)\\s*${key}\\s*=\\s*([^;]+)`)?.pop();
}

function bakeCookie(name, value, domain, ttl) {
  let cookie = `${name}=${value}; HttpOnly; Secure; SameSite=Strict; Path=/; Domain=${domain};`;
  if (ttl !== '')
    cookie += 'Max-age=' + ttl + ';';
  return cookie;
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

function checkTTL(iat, ttl) {
  const now = Date.now();
  if (iat > now)
    throw 'BAD: iat issued in the future';
  if (now > iat + ttl)    //now 15:00  iat 10:00  + 6mth in ms
    throw 'timed out';
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

async function encryptData(data, password) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await encryptAESGCM(password, iv, data);
  return uint8ToHexString(iv) + '.' + toBase64url(btoa(cipher));
}

async function decryptAESGCM(password, iv, ctStr) {
  const key = await makeKeyAESGCM(password, iv);
  const ctUint8 = new Uint8Array(ctStr.match(/[\s\S]/g).map(ch => ch.charCodeAt(0))); // ciphertext as Uint8Array
  const plainBuffer = await crypto.subtle.decrypt({name: key.algorithm.name, iv: iv}, key, ctUint8);                 // decrypt ciphertext using key
  return new TextDecoder().decode(plainBuffer);                                       // return the plaintext
}


async function decryptData(data, password) {
  try {
    const [ivText, cipherB64url] = data.split('.');
    const iv = hexStringToUint8(ivText);
    const cipher = atob(fromBase64url(cipherB64url));
    const payload = await decryptAESGCM(password, iv, cipher);
    return payload;
  } catch (err) {
    throw 'error decrypting: ' + data;
  }
}

class InlineMutator {
  constructor(cookie, base) {
    this.cookie = cookie;
    this.firstBase = base;
  }

  async element(el) {
    const src = el.getAttribute('src');
    el.removeAttribute('src');
    const path = src.slice(2, src.length)
    el.setAttribute('src', link + path);
  }
}

//todo combine with Inline Mutator, temporary solution
class LinkMutator {
  constructor(cookie, base) {
    this.cookie = cookie;
    this.firstBase = base;
  }

  async element(el) {
    // console.log(el.tagName)
    const src = el.getAttribute('href');
    el.removeAttribute('href');
    const path = src.slice(2, src.length)
    el.setAttribute('href', link + path);
  }
}

class LinkToStyle {

  constructor(location) {
    this.firstBase = location.href;
    this.secondBase = undefined;
  }

  async element(el) {
    const href = el.getAttribute('href');
    const body = await fetch(href)
      .then(response => response.text())
      .then(data => {
        return data
      })
      .catch(error => console.error(error))
    if (body)
      el.replace(`<style>${body}</style>`, {html: true});

  }
}

function redirectUrl(path, params) {
  return path + '?' + Object.entries(params).map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&');
}

async function login(stateSecret, provider) {
  let redirect;
  if (provider === "google")
    redirect = redirectUrl(GOOGLE_OAUTH_LINK, {
      state: stateSecret,
      nonce: randomString(12),
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_REDIRECT,
      scope: 'openid email profile',
      response_type: 'code',
    });
  else if (provider === 'github') {
    redirect = redirectUrl(GITHUB_OAUTH_LINK, {
      state: stateSecret,
      client_id: GITHUB_CLIENTID,
      redirect_url: GITHUB_REDIRECT,
      scope: 'user',
    });

  } else
    throw 'BAD: wrong authentification provider';
  return redirect
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
      redirect_uri: GOOGLE_REDIRECT,
      grant_type: 'authorization_code'
    }
  );
  const jwt = await tokenPackage.json();
  const [header, payloadB64url, signature] = jwt.id_token.split('.');
  const payloadText = atob(fromBase64url(payloadB64url));
  const payload = JSON.parse(payloadText);
  return ['go' + payload.sub, payload.name, payload.picture];
}

async function githubProcessTokenPackage(code, state) {
  const accessTokenPackage = await fetchAccessToken(GITHUB_CODE_LINK, {
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
      'User-Agent': '2js-no',
      'Accept': 'application/vnd.github.v3.raw+json'
    }
  });
  const userData = await user.json();
  return ['gi' + userData.id, userData.name, userData.avatar_url];
}


function selfClosingMessage(msg, domain) {
  return `<script>
  window.opener.postMessage('${msg}', 'https://${domain}'); 
  window.close();
</script>`;
}


const hitCounter = `https://api.countapi.xyz/hit/${SESSION_ROOT}/${COUNTER_KEY}`;

async function count() {
  const nextCount = await fetch(hitCounter);
  const data = await nextCount.json();
  return data.value;
}

async function getOrSetUid(providerId) {
  const oldUid = await KV_AUTH.get(providerId);
  if (oldUid)
    return oldUid;
  const newUid = (await count()).toString(36);
  await KV_AUTH.put(providerId, newUid);
  await KV_AUTH.put('_' + newUid, providerId);
  return newUid;
}


async function handleRequest(request) {


  try {
    const url = new URL(request.url);
    const path = url.pathname;
    const [ignore, action, provider] = path.split('/');
    const inlineMutator = new InlineMutator('Mr. Sunshine', url);
    const linkMutator = new LinkMutator('', url);
    const linkToStyle = new LinkToStyle(url);
    let userdata;
    let headers = {"Content-Type": 'text/html'}


    if (action === "login") {
      const stateSecret = await encryptData(JSON.stringify({
        iat: Date.now(),
        ttl: STATE_PARAM_TTL,
        provider: provider,
        rm: url.searchParams.get('remember-me')
      }), SECRET);
      return Response.redirect(await login(stateSecret, provider));
    }


    if (action === 'callback') {
      //1. decrypt and verify state secret
      const stateParam = url.searchParams.get('state');
      const state = JSON.parse(await decryptData(stateParam, SECRET));
      checkTTL(state.iat, state.ttl);
      if (state.provider !== provider)
        throw 'BAD: valid stateSecret but unknown provider?';
      //2. process callback using code and state
      const code = url.searchParams.get('code');

      let providerId, username, photo;
      if (provider === 'google')
        [providerId, username, photo] = await googleProcessTokenPackage(code);  //the userText is the sub.
      else if (provider === 'github')
        [providerId, username, photo] = await githubProcessTokenPackage(code); //userText is the github id nr.
      else
        return new Response('404'); //todo throw error

      //3. get the uid for the providerId
      const uid = await getOrSetUid(providerId);

      //4. make the session secret and session object
      const iat = Date.now();
      const jwtUatMonths = 6;
      const uatMs = 60 * 60 * 24 * 30 * jwtUatMonths;
      const ttl = state.rm === null ? null : SESSION_TTL;
      const sessionObject = {uid, username, photo, provider, iat, ttl, v: 27};
      const sessionSecret = await encryptData(JSON.stringify(sessionObject), SECRET);
      const sessionArray = sessionSecret.split(".");


      // make JWT
      let handledJwt = {
        header: {
          alg: "aes256-gcm",
          iv: sessionArray[0],    // encrypted payload string iv
          key: new Date().getUTCMonth() + 1,
          Iat: iat,
          Uat: uatMs
        },
        payload: sessionArray[1]    //encrypted payload cypher string
      }

      const txtIn = selfClosingMessage(JSON.stringify(sessionObject), SESSION_ROOT);
      const jwtCookie = bakeCookie("sessionIDJwtCookie", toBase64url(btoa(JSON.stringify(handledJwt))), SESSION_ROOT, uatMs)
      return new Response(txtIn, {status: 200, headers: {'Content-Type': 'text/html', 'Set-Cookie': jwtCookie}}); //todo
    }


    //rolling cookie
    const cookies = request.headers.get('cookie');
    const jwtCookie = getCookieValue(cookies, "sessionIDJwtCookie");


    let userID, decryptedPayloadawait; //hold userID in global scope to use it for session kv value (userid + sessionID)

    if (jwtCookie) {
      let jwtObj = JSON.parse(atob(fromBase64url(jwtCookie)));
      //make string to decrypt
      decryptedPayloadawait = await decryptData(jwtObj.header.iv + "." + jwtObj.payload, SECRET);

      //if too old
      if (Date.now() < jwtObj.header.Iat + jwtObj.header.Uat) {  //fix this, because checkTTL throws errors.  try catch here, I think no. Just check wheather cookies is not expired and return responce with existing cookies. If expired just let browser to make redirect to /callback ???
        // refesh jwt cookie iat (issue at time)
        jwtObj.header.iat = Date.now();
        // make new cookie
        let updatedCookie = bakeCookie("sessionIDJwtCookie", toBase64url(btoa(JSON.stringify(jwtObj)), SECRET), SESSION_ROOT, jwtObj.header.Uat)
        headers = Object.assign(headers, {"Set-Cookie": updatedCookie});
        userdata = JSON.parse(decryptedPayloadawait);
        userID = "_" + userdata.uid;
      }
    }


    let lastSession;

    if (action === 'json') {
      if (request.method !== 'POST')
        return new Response('not post');
      if (request.headers.get('content-type') !== 'application/json')
        return new Response(request.headers.get('content-type') + "...");
      const json = JSON.stringify(await request.json());
      let session = JSON.parse(json);
      session.sessionId = userID + "-" + session.sessionId;
      lastSession = JSON.stringify(session);
      if (userID)
        await PREVIOUS_RESULTS.put(session.sessionId, JSON.stringify(session));
      return new Response(JSON.stringify({
        status: !!userID,
        uId: userID
      }), {headers: {'content-type': 'application/json'}});
    }


    if (action === "delete") {
      if (request.method !== 'DELETE')
        return new Response('not delete');
      const json = JSON.stringify(await request.json());
      const key = JSON.parse(json).key;
      await PREVIOUS_RESULTS.delete(key);
      return new Response(JSON.stringify({deleted: key}), {headers: {'content-type': 'application/json'}})

    }

    if (action === "getsessions") {
      if (request.method !== 'GET')
        return new Response('not get request');
      const values = await PREVIOUS_RESULTS.list();
      console.log(values)
      const res = [];
      for (key of values.keys) {
        if (key && key.name.startsWith(userID)) {
          let value = await PREVIOUS_RESULTS.get(key.name);
          await res.push(value);
        }
      }

      return new Response(JSON.stringify(res), {headers: {'content-type': 'application/json'}})
    }


    //todo: this is does not work!!!!
    if (action === 'logout') {
      const txtOut = selfClosingMessage(' ', SESSION_ROOT);
      const cookieOut = bakeCookie("sessionIDJwtCookie", 'LoggingOut', SESSION_ROOT, 0);
      // headers = headers.assign(headers, { "Set-Cookie": cookieOut });
      // userdata = undefined
      // Response.redirect("https://typing-race.maksgalochkin2.workers.dev/test/index.html")
      return new Response(txtOut, {status: 200, headers: {'content-type': 'text/html', 'Set-Cookie': cookieOut}});
    }

    //default header
    const headerElement = getHeaderElement(userdata);


    //get requested file type
    const type = path.substr(path.lastIndexOf('.') + 1);
    //get file body
    let body = await makeFetch(path);
    //if .css/.img etc
    if ((type === 'js'))
      return new Response(body, {status: 200, headers: {"Content-Type": 'application/javascript'}});

    if ((type !== 'html'))
      return new Response(body, {status: 200, headers: {"Content-Type": 'text/' + type}});

    return new HTMLRewriter()
      .on('img.auth-logo', inlineMutator)
      .on("link", linkMutator)
      .on('link[href][rel="stylesheet"]', linkToStyle)
      .transform(new Response(headerElement + body, {status: 200, headers: headers}));
  } catch (err) {
    return new Response("ї My error   " + err, {status: 401});
  }
}

addEventListener("fetch", e => {

  e.respondWith(handleRequest(e.request))


});