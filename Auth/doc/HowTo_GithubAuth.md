# HowTo: Github Auth with worker

## WhatIs: difference between Github and Google auth?

Github auth is similar to [Google auth](HowTo_GoogleAuth.md).
We create a Github App (similar to the Google App that accessed the Google+ API), which will give us a client ID and Client Secret we can use when the user authenticates with Github.

The differences between the two are:
1. Google returns the user info as a `id_token` together immediately with the `access_token`.

vs.

1. Github only returns an access token from the code callback, so you must go an extra roundtrip to the github user api in order to get the name and id of the github user.

2. Google returns the user info as a JWT token. This means that we must deconstruct the JSON data of the JWT in order to read the sub (user id) and first name and last name.
vs.
2. Github returns the user data as plain JSON. This means that we don't need to do much decoding of the user data in order to read user id and user name.

## Lifecycle

The authentication lifecycle the same as in [google auth](HowTo_GoogleAuth.md#lifecycle)

## Create and configure Github App

1. Sign in to your Github account.
2. Open **Settings** - **Developer setting**s and press **New GitHub App** button.
3. Confirm a password.
4. Set application name.
5. Set cloudflare worker link to **Homepage URL** input (for example `https://maxworker.maksgalochkin2.workers.dev`).
6. Specify the link that will be opened after successful authentication to **User authorization callback URL** (for example `https://maxworker.maksgalochkin2.workers.dev/callback`).
7. Deselect **Active** checkbox (this is used for logging purposes, but we don't need that because we can do this directly in the auth worker).
8. Press **Create GitHub App** button.
9. Press **Generate a new client secret** button.
10. Copy the **Client ID** and **client secret**.  

## Create worker (Cloudflare)

1. Open [Cloudflare dashboard] (https://dash.cloudflare.com/) and go to the **"Workers"** tab using the menu on the right side of the page.
2. Create a new worker.
3. Go to the **Settings** tab.
4. Inside **Environment Variables** field define next variables 
   * `GITHUB_CLIENTID` - Your _client ID_. 
   * `GITHUB_CLIENTSECRET` - Your _client Secret_.
   * `GITHUB_OAUTH_LINK: https://github.com/login/oauth/authorize` - to obtain user authorization, handle active session lookup, authenticates the user, and obtains user consent.
   * `GITHUB_REDIRECT https://github-auth.maksgalochkin2.workers.dev/callback/github` redirect url after successful authentication. 
   * `GITHUB_TOKEN	https://github.com/login/oauth/access_token` Github access token. 
   * `COUNTER_KEY=dvAV77q6uaIOSzE_cgq6Bs_q-vojyIglNLW8lWHtiGUuWM03mLCZnaWIqTtlWYhk` - counterapi.xyz key. Check [HowToatomicCounter](https://github.com/orstavik/cloudflare-tutorial/blob/main/docs/2_worker_tricks/HowTo_atomicCounter.md) for description.
   * `SECRET=klasjdfoqjpwoekfj!askdfj` - cypher key.
   * `SESSION_COOKIE_NAME=GOOGLE_SESSIONID` - name of the cookies which contains encrypted sessionSecret. 
   * `SESSION_ROOT=google-auth.maksgalochkin2` - worker root url.
   * `SESSION_TTL=2592000` - session time to live.
   * `STATE_PARAM_TTL=180` - state param time to live.
 Create new _KV_ and inside **KV Namespace Bindings** add variable
   * `KV_AUTH` - link to KV which uses as database.
   

Inside `handleRequest()` put the code
 ```javascript
async function handleRequest(request) {
  try {
    const url = new URL(request.url);                                                 //[1.1]
    const [ignore, action, provider] = url.pathname.split('/');                       //[1.2]
    if (action === 'login') {                               
      const stateSecret = await encryptData(JSON.stringify({                          //[1.3]
        iat: Date.now(),
        ttl: STATE_PARAM_TTL,
        rm: url.searchParams.get('remember-me')
      }), SECRET);
      return Response.redirect(await login(stateSecret));                             //[1.4]
    }

    if (action === 'callback') {                                                      //[2.1]
      //1. decrypt and verify state secret
      const stateSecret = url.searchParams.get('state');                              
      const state = JSON.parse(await decryptData(stateSecret, SECRET));               //[2.2]
      checkTTL(state.iat, state.ttl);                                                 //[2.3]
      if (state.provider !== provider)
        throw 'BAD: valid stateSecret but unknown provider?';
      const code = url.searchParams.get('code');
      const [providerId, username] = await githubProcessTokenPackage(code, stateSecret);  //[3]
      const uid = await getOrSetUid(providerId);                                          //[4]
      const iat = Date.now();
      const ttl = state.rm === null ? null : SESSION_TTL;                              
      const sessionObject = { uid, username, provider, iat, ttl, v: 27 };             //[5]
      const sessionSecret = await encryptData(JSON.stringify(sessionObject), SECRET); //[5.1]
      const txtIn = selfClosingMessage(JSON.stringify(sessionObject), SESSION_ROOT);  //[5.2]
      const cookieIn = bakeCookie(SESSION_COOKIE_NAME, sessionSecret, SESSION_ROOT, sessionObject.ttl); //[5.3]
      return new Response(txtIn, { status: 200, headers: { 'content-type': 'text/html', 'Set-Cookie': cookieIn } }); //[5.4]
    } 
    if (action === 'logout') {                                                                          //[6]
      const txtOut = selfClosingMessage('', SESSION_ROOT);                                              //[6.1]
      const cookieOut = bakeCookie(SESSION_COOKIE_NAME, 'LoggingOut', SESSION_ROOT, 0);                 //[6.2]               
      return new Response(txtOut, { status: 200, headers: { 'content-type': 'text/html', 'Set-Cookie': cookieOut } });
    }
    throw `wrong action: ${action} in ${url.pathname}`;
  } catch (err) {
    return new Response(err.message, { status: 401 });
  }
}
  ```

## 1. Make state secret
How to make state secret described in [HowTo: Google Auth](HowTo_GoogleAuth.md#1-make-state-secret);

## 2. Check state secret   
How to check state secred desribed in [HowTo: Google Auth: check state secret](HowTo_GoogleAuth.md#2-check-state-secret);

## 3. Process Github Access Token
To get Github access token `githubProcessTokenPackage()` is used.

```javascript
async function githubProcessTokenPackage(code) {
 const accessTokenPackage = await fetchAccessToken(GITHUB_TOKEN, {                //[1]
        code,
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        redirect_uri: GITHUB_REDIRECT,
    });
  const tokenText = await accessTokenPackage.text();                              //[2]
  const x = {};
  data.split('&').map(pair => pair.split('=')).forEach(([k, v]) => x[k] = v);
  const accessToken = x['access_token'];                                          //[3]
  const user = await fetch('https://api.github.com/user', {                       //[4]
    headers: {
      'Authorization': 'token ' + accessToken,
      'User-Agent': 'maksgalochkin2',
      'Accept': 'application/vnd.github.v3.raw+json'
    }
  });
  const userData = await user.json();
  return ['gi' + userData.id, 'github.com/' + userData.login];                    //[5]
}
```
  1. POST request used to get JWT. The request must include the following parameters as body of request:
    * `code` The code param you received as a response.
    * `client_id` The client ID you received from GitHub for your GitHub App.
    * `client_secret` The client secret you received from GitHub for your GitHub App.
    * `redirect_uri` The URL in your application where users are sent after authorization.
    * `state` The unguessable random string.
  2. `text()` method takes a response stream and reads it to completion.  
  3. To get information about the user you should use the value of the `access_token` property. Since the object returned as a string, it is necessary to get its value by split.
  4. GET request to get a user.
  5. Return some userData properties.

## 4. Get the uid
How to create a unique key and use it like userID described in [google auth: get the uid](HowTo_GoogleAuth.md#4-get-the-uid).
 

## 5. How Make the session secret and session object
How Make the session secret and session object described [here](HowTo_GoogleAuth.md#5-make-the-session-secret-and-session-object).

## 6. Logout
Check [google-auth: logout](HowTo_GoogleAuth.md#6-logout).
 
 
## Demo

```javascript

let cachedPassHash;

//imported pure functions begins
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

async function encryptData(data, password) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await encryptAESGCM(password, iv, data);
  return uint8ToHexString(iv) + '.' + toBase64url(btoa(cipher));
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

function checkTTL(iat, ttl) {
  const now = Date.now();
  if (iat > now)
    throw 'BAD: iat issued in the future';
  if (now > iat + ttl)
    throw 'timed out';
}

//imported pure functions ends

//imported authentication functions
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
      'Accept': 'application/vnd.github.v3+json'
    }
  });
  const userData = await user.json();
  return ['gi' + userData.id, 'github.com/' + userData.login];
}

//imported authentication functions ends

//imported counter
const hitCounter = `https://api.countapi.xyz/hit/${SESSION_ROOT}/${COUNTER_KEY}`;

async function count() {
  const nextCount = await fetch(hitCounter);
  const data = await nextCount.json();
  return data.value;
}

//imported counter ends

async function getOrSetUid(providerId) {
  const oldUid = await KV_AUTH.get(providerId);
  if (oldUid)
    return oldUid;
  const newUid = (await count()).toString(36);
  await KV_AUTH.put(providerId, newUid);
  await KV_AUTH.put('_' + newUid, providerId);
  return newUid;
}

async function login(provider, stateSecret) {
    return redirectUrl(GITHUB_OAUTH_LINK, {
      state: stateSecret,
      client_id: GITHUB_CLIENTID,
      redirect_url: GITHUB_REDIRECT,
      scope: 'user'
    });
  throw 'login error: incorrect provider: ' + provider;
}

function selfClosingMessage(msg, domain) {
  return `<script>
  window.opener.postMessage('${msg}', 'https://${domain}'); 
  window.close();
</script>`;
}

async function handleRequest(request) {
  try {
    const url = new URL(request.url);
    const [ignore, action, provider] = url.pathname.split('/');

    if (action === 'login') {
      //1. make state secret
      const stateSecret = await encryptData(JSON.stringify({
        iat: Date.now(),
        ttl: STATE_PARAM_TTL,
        provider: provider,
        rm: url.searchParams.get('remember-me')
      }), SECRET);
      //2. redirect to openid provider using state secret
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
      const [providerId, username] = await githubProcessTokenPackage(code, stateSecret);
    
      //3. get the uid for the providerId
      const uid = await getOrSetUid(providerId);

      //4. make the session secret and session object
      const iat = Date.now();
      const ttl = state.rm === null ? null : SESSION_TTL;
      const sessionObject = {uid, username, provider, iat, ttl, v: 27};
      const sessionSecret = await encryptData(JSON.stringify(sessionObject), SECRET);

      const txtIn = selfClosingMessage(JSON.stringify(sessionObject), SESSION_ROOT);
      const cookieIn = bakeCookie(SESSION_COOKIE_NAME, sessionSecret, SESSION_ROOT, sessionObject.ttl);
      return new Response(txtIn, {status: 200, headers: {'content-type': 'text/html', 'Set-Cookie': cookieIn}});
    }
    if (action === 'logout') {
      const txtOut = selfClosingMessage('', SESSION_ROOT);
      const cookieOut = bakeCookie(SESSION_COOKIE_NAME, 'LoggingOut', SESSION_ROOT, 0);
      return new Response(txtOut, {status: 200, headers: {'content-type': 'text/html', 'Set-Cookie': cookieOut}});
    }
    throw `wrong action: ${action} in ${url.pathname}`;
  } catch (err) {
    return new Response(err.message, {status: 401});
  }
}

addEventListener('fetch', e => e.respondWith(handleRequest(e.request)));
```
 

## Reference
* [Github-auth demo](https://github-auth.maksgalochkin2.workers.dev/login/github)
* [Authorizing OAuth Apps](https://developer.github.com/apps/building-oauth-apps/authorizing-oauth-apps/)
