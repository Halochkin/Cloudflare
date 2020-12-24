const COUNTER_KEY = 'dvAV77q6uaIOSzE_cgq6Bs_q-vojyIglNLW8lWHtiGUuWM03mLCZnaWIqTtlWYhk'

const GITHUB_CLIENTID = 'Iv1.27dccdadf938e8bf'
const GITHUB_CLIENTSECRET = '73a0e0caba381a5629bf42cd5c14d9e87d6f982e'
const GITHUB_CODE_LINK = 'https://github.com/login/oauth/access_token'
const GITHUB_OAUTH_LINK = 'https://github.com/login/oauth/authorize'
const GITHUB_REDIRECT = 'https://typing-race.maksgalochkin2.workers.dev/callback/github'

const GOOGLE_CLIENT_ID = '1052973726979-cra8ku89dp9tvg7m4tvjphp2dnsno6f2.apps.googleusercontent.com'
const GOOGLE_CLIENT_SECRET = 'FTI7P9jkzPP6qkV4FfF0uvC'
const GOOGLE_CODE_LINK = 'https://oauth2.googleapis.com/token'
const GOOGLE_OAUTH_LINK = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_REDIRECT = 'typing-race.maksgalochkin2.workers.dev/callback/google'


const SECRET = 'klasjdfoqjpwoekfj!askdfj'
const SESSION_COOKIE_NAME = 'sessionID'
const SESSION_ROOT = '.maksgalochkin2.workers.dev'
const SESSION_TTL = 2592000
const STATE_SECRET_TTL_MS = 180


const link = "https://raw.githubusercontent.com/Halochkin/Cloudflare/master/testApp"

function bakeCookie(name, value, domain, ttl) {
  let cookie = `${name}=${value}; HttpOnly; Secure; SameSite=Strict; Path=/; Domain=${domain};`;
  if (ttl !== '')
    cookie += 'Max-age=' + ttl + ';';
  return cookie;
}


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


async function encryptData(data, password) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await encryptAESGCM(password, iv, data);
  return uint8ToHexString(iv) + '.' + toBase64url(btoa(cipher));
}

//GET REDIRECT AND POST ACCESS_TOKEN
function redirectUrl(path, params) {
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
  try {
    const [ivText, cipherB64url] = data.split('.');
    const iv = hexStringToUint8(ivText);
    const cipher = atob(fromBase64url(cipherB64url));
    return await decryptAESGCM(password, iv, cipher);
  } catch (err) {
    throw 'error decrypting: ' + data;
  }
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
  return {
    name: payload.name,
    id: payload.sub
  };
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


function getHeaderElement(credentials) {
  if (credentials) {
    return `<header>
 TYPING RACE
 <a href="/login/github">Logout</a>
 </span>
</header>`;
  } else
    return ` <header>
    TYPING RACE
    <span id="login-label">Log in to store your results
    <a href="/login/google"><img class="auth-logo" src="../static/img/google.png" alt="google auth"></a>
    <a href="/login/github"><img class="auth-logo" src="../static/img/github.png" alt="github auth"></a>
    </span>
  </header>`;
}

function selfClosingMessage(msg, domain) {
  return `<script>
  window.opener.postMessage('${msg}', 'https://${domain}'); 
  window.close();
</script>`;
}

function checkTTL(iat, ttl) {
  const now = Date.now();
  if (iat > now)
    throw 'BAD: iat issued in the future';
  if (now > iat + ttl)    //now 15:00  iat 10:00  + 6mth in ms
    throw 'timed out';
}

async function login(provider, stateSecret) {
  if (provider === "github")
    return redirectUrl(GITHUB_OAUTH_LINK, {
      state: stateSecret,
      client_id: GITHUB_CLIENTID,
      redirect_url: GITHUB_REDIRECT,
      scope: 'user'
    });
  else if (provider === "google")
    return redirectUrl(GOOGLE_OAUTH_LINK, {
      state: stateSecret,
      nonce: randomString(12),
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_REDIRECT,
      scope: 'openid email profile',
      response_type: 'code',
    });
  else
    throw 'login error: incorrect provider: ' + provider;
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


async function makeFetch(path) {
  return await fetch(link + path)
    .then(response => response.text())
    .then(data => {
      return data
    })
    .catch(error => console.error(error))
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

const myDomain = 'typing-race.maksgalochkin2.workers.dev';
let rememberUser;

async function handleRequest(request) {
  try {
    const url = new URL(request.url);
    const path = url.pathname;
    const [ignore, action, provider] = path.split('/');
    const inlineMutator = new InlineMutator('Mr. Sunshine', url);

    let headers;
    //1. rolling cookie
    const cookies = request.headers.get('cookie');
    const jwtCookie = getCookieValue(cookies, 'sessionID');
    //todo
    if (jwtCookie) {

      let jwtObj = JSON.parse(atob(fromBase64url(jwtCookie)));
      //make string to decrypt
      let decryptedPayloadawait = await decryptData(jwtObj.header.iv + "." + jwtObj.payload);

      let type = path.substr(path.lastIndexOf('.') + 1);

      const body = await makeFetch(path);
      const headerElement = getHeaderElement(decryptedPayloadawait);

      if (Date.now() < jwtObj.header.Iat + jwtObj.header.Uat) {  //fix this, because checkTTL throws errors.  try catch here, I think no. Just check wheather cookies is not expired and return responce with existing cookies. If expired just let browser to make redirect to /callback ???
        // refesh jwt cookie iat
        jwtObj.header.iat = Date.now();
        // make new cookie
        const jwtCookie = bakeCookie("sessionID", toBase64url(btoa(JSON.stringify(jwtObj)), SECRET), SESSION_ROOT, jwtObj.header.uat)
        const requestHeaders = {'content-type': 'text/'+ type, 'Set-Cookie': jwtCookie};

        if ((type !== 'html'))
          return new Response(body, {status: 200, requestHeaders});

        return new HTMLRewriter()
          .on('img', inlineMutator)
          .transform(new Response(headerElement + body, {status: 200, requestHeaders}));
      }
    }


    if (action === "login") {
      let redirect;
      //2. make state secret
      const stateSecret = await encryptData(JSON.stringify({
        iat: Date.now(),
        ttl: STATE_PARAM_TTL,
        provider: provider,
        rm: url.searchParams.get('remember-me')
      }), SECRET);
      //3. redirect to openid provider using state secret
      return Response.redirect(await login(provider, stateSecret));
    }

    if (action === 'callback') {
      //1. decrypt and verify state secret
      const stateSecret = url.searchParams.get('state');
      const state = JSON.parse(await decryptData(stateSecret, SECRET));
      checkTTL(state.iat, state.ttl);
      if (state.provider !== provider)
        throw 'BAD: valid stateSecret but unknown provider?';
//2. process callback using code and state
      const code = url.searchParams.get('code');




      // //AES-GCM
      let jwt;
      if (provider === 'google')
        jwt = {result: await googleProcessTokenPackage(code)} //the userText is the sub.
      else if (provider === 'github')
        jwt = {result: await githubProcessTokenPackage(code)}; //userText is the github id nr.
      else
        return new Response('404');

      const [header, payloadB64url, signature] = jwt.split('.');
      //   const [year, month] = getLoginTime();
      const payloadText = atob(fromBase64url(payloadB64url));
      const payloadObj = JSON.parse(payloadText);

      const providerId = provider === 'google'? 'go': 'gi' + payloadObj.sub;
      const username = payloadObj.email; // cant shortcut, bug with a dot

      let encryptedPayload = (await encryptData(payloadText, SECRET)).split(".");

      const iat = Date.now();
      const jwtUatMonths = 6;

      const uatMs = 60 * 60 * 24 * 30 * jwtUatMonths;
      // make JWT
      let handledJwt = {
        header: {
          alg: "aes256-gcm",
          iv: encryptedPayload[0],    // encrypted payload string iv
          key: new Date().getUTCMonth() + 1,
          Iat: iat,
          Uat: uatMs
        },
        payload: encryptedPayload[1]    //encrypted payload cypher string
      }

      //3. get the uid for the providerId
      const uid = await getOrSetUid(providerId);
      //4. make the session secret and session object
      const ttl = state.rm === null ? null : SESSION_TTL;
      const sessionObject = { uid, username, provider, iat, ttl, v: 27 };
      const sessionSecret = await encryptData(JSON.stringify(sessionObject), SECRET);
      const txtIn = selfClosingMessage(JSON.stringify(sessionObject), SESSION_ROOT);
      const cookieIn = bakeCookie(SESSION_COOKIE_NAME, sessionSecret, SESSION_ROOT, sessionObject.ttl);
      //JWT cookie
      const jwtCookie = bakeCookie("sessionID", toBase64url(btoa(JSON.stringify(handledJwt)), SECRET), SESSION_ROOT, uatMs)
      //
      // // encrypt userText object
      // const encryptedData = await getEncryptedData(JSON.stringify(userText.result));
      //
      // //set user info as cookie
      // return new Response(popup(userText.result, 'https://' + myDomain), {
      //   status: 201, headers: {
      //     'content-type': 'text/html',
      //     'Set-Cookie': `sessionID=${encryptedData}; HttpOnly; SameSite=Strict; Path=/; Domain=${myDomain};` + (rememberUser ? `Expires=25920300; Max-Age=10000;` : ``) // Max-Age=2592000;
      //   }
      // });
    }

    // const cookie = getCookieValue(request.headers.get('cookie'), 'sessionID');
    //
    // let headerElement;
    // if (cookie) {
    //   let decryptedData = await decryptData(cookie, SECRET);
    //   headerElement = getHeaderElement(decryptedData);
    //   console.log(JSON.parse(decryptedData));
    // } else
    //   headerElement = getHeaderElement(null);

    // else


    // const headers = ;
    let type = path.substr(path.lastIndexOf('.') + 1);

    const body = await makeFetch(path);
    const headerElement = getHeaderElement(null);


    if ((type !== 'html'))
      return new Response(body, {status: 200, headers: {"content-type": 'text/' + type}});

    // if (action === 'logout') {
    //   new HTMLRewriter()
    //     .transform(new Response(getHeaderElement(null) + body), {
    //       status: 201,
    //       headers: {
    //         'Content-Type': 'text/' + type,
    //         'Set-Cookie': `sessionID=undefined; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=-1; Domain=${myDomain}; `
    //       }
    //     })
    // }

    return new HTMLRewriter()
      .on('img', inlineMutator)
      .transform(new Response(headerElement + body, {status: 200, headers: {"content-type": 'text/' + type}}));
  } catch (err) {
    return new Response(err.message, {status: 401});
  }
}

addEventListener("fetch", e => e.respondWith(handleRequest(e.request)));