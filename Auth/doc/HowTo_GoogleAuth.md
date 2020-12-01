# HowTo: Google Authorization with Cloudflare workers

In order to add Google social login to a web application it is necessary:

## Google+ API

1. Go to [Google APIs](https://console.developers.google.com/) and login. 
2. Create a new document.
3. Go to the **Dashboard** tab.
4. Press the button **+ENABLE APIS AND SERVICES**.
5. In the search box, type "**Google + API**".
6. Open the API and press the **Manage** button. 
7. In the resulting API menu, go to the **Auth consent screen** tab.
8. Select **Internal** and click **Create**.
9. Fill in the required fields.
10. Go back to the **Credentials**" tab.
11 Click the **Create credentials** button, choose **Create OAuth client ID** from the list.
12. Select **Web application** as **Application type**. 
    1. Add a link to your application as a "Authorized JavaScript origins" value (for example `https://maxworker.maksgalochkin2.workers.dev`).
    2. As the value "**Authorized redirect URIs**" you need to specify the link that will be opened after successful authentication (for example `https://maxworker.maksgalochkin2.workers.dev/callback`).
    3. Press the **Save** button. 
13. API will generate **Client ID** and **Client secret**.


## Lifecycle

Let's consider the authentication lifecycle:

|step| action |  description | URL |
|---|---------- |----------      |----------  |
|1.| b=>s1   |  browser opens login page link |auth.example.com/login/google |
|2| s1=>b   |  auth.example.com receives the requests, generate a login link at google service, and sends a 302 redirect back to the user |  |
|3| b=>s2   | browser receives the redirect and automatically try to load the page from google | https://accounts.google.com/o/oauth2/v2/auth/identifier?state...  |
|4| s2=>b   |  google openid gets the request, and the returns a 200 response to the browser with an interface where the user can type his password. | |
|5| b=>s2 |    browser sends user+pass req to google | |
|6| s2=>b | google verify the user+pass and then sends a 302 redirect  | auth.example.com/callback/google?code  | 
|7| b=>s1 | browser receives the 302 and automatically requests to open | auth.example.com/callback/google?code | 
|8| s1=>s2=>s1 | server-server auth.example.com => google.com with the `code` param. the auth.example.com then processes the callback from google. It does so by contacting google directly via a fetch() to get the user data. using the code and the secret clientID. | |
|9| s1=>b   | 200 example.com => user with the user data | |
|10| the auth.example.com can now send the user data back to the user as a response to the request 7 from browser. | |

## Cloudflare worker

1. Open [Cloudflare dashboard] (https://dash.cloudflare.com/) and go to the **"Workers"** tab using the menu on the right side of the page.
2. Create a new worker.
3. Go to the **Settings** tab.
4. Inside **Environment Variables** field define next variables 
   * `GOOGLE_CLIENTID=<CLIENT_ID>.apps.googleusercontent.com` - Your _client ID_. 
   * `GOOGLE_CLIENTSECRET=<CLIENT_SECRET>` - Your _client Secret_.
   * `GOOGLE_CODE_LINK=https://oauth2.googleapis.com/token` - Google Auth access token.
   * `GOOGLE_OAUTH_LINK=https://accounts.google.com/o/oauth2/v2/auth` - to obtain user authorization. This endpoint handles active session lookup, authenticates the user, and obtains user consent.
   * `GOOGLE_REDIRECT=https://<WORKER-URL>/callback` - (_google-auth.maksgalochkin2.workers.dev/callback_ for example) - redirect url after successful authentication. Must retaliate against the name of the worker.
   * `COUNTER_KEY=dvAV77q6uaIOSzE_cgq6Bs_q-vojyIglNLW8lWHtiGUuWM03mLCZnaWIqTtlWYhk` - counterapi.xyz key. Check [HowToatomicCounter](https://github.com/orstavik/cloudflare-tutorial/blob/main/docs/2_worker_tricks/HowTo_atomicCounter.md) for description.
   * `SECRET=klasjdfoqjpwoekfj!askdfj` - cypher key.
   * `SESSION_COOKIE_NAME=GOOGLE_SESSIONID` - name of the cookies which contains encrypted sessionSecret. 
   * `SESSION_ROOT=google-auth.maksgalochkin2` - worker root url.
   * `SESSION_TTL=2592000` - session time to live.
   * `STATE_PARAM_TTL=180` - state param time to live.
Create new _KV_ and inside **KV Namespace Bindings** add variable
   * `KV_AUTH` - link to KV which uses as database.

## `handleRequest` function

Put the code

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
      const [providerId, username] = await googleProcessTokenPackage(code);           //[3]
      const uid = await getOrSetUid(providerId);                                      //[4]
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
1. Getting the URL values. 
2. Getting URL params which defines browser behaviour.
3. When /login to protect data it is necessary to create state (which include creation time, time to live, and remember-me parameter value) end encrypt it. How to encrypt described [here](HowTo_encrypt.md).
4.  Redirect to openid provider using state secret, using `login()`. Pass `GOOGLE_OAUTH_LINK` variable value as a base path, and an object which property and values will beused to make url parmeters. It contains next properties:
     * `state`  include the value of the anti-forgery unique session token, as well as any other information needed to recover the context when the user returns to your application, e.g., the starting URL.  
     * `nonce` random value generated by your app that enables replay protection when present.
     * `client_id` which you obtain from the API Console Credentials page .
     * `redirect_uri` should be the HTTP endpoint on your server that will receive the response from Google. The value must exactly match one of the authorized redirect URIs for the OAuth 2.0 client, which you configured in the API Console Credentials page.
      * `scope` basic request should be "openid email".
      * `response_type` which in a basic authorization code flow request should be code.
      
   ```javascript
    async function login(stateSecret) {
      return redirectUrl(GOOGLE_OAUTH_LINK, {
        state: stateSecret,
        nonce: randomString(12),
        client_id: GOOGLE_CLIENTID,
        redirect_uri: GOOGLE_REDIRECT,
        scope: 'openid email profile',
        response_type: 'code',
      });
    }
   
   function redirectUrl(path, params) {
     return path + '?' + Object.entries(params).map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&');
   }
   ```
   
## 2. Check state secret   
1. After successful authentication, the user will be redirected back to the web application with `/callback` action value.
2. Decrypt state param. How to decrypt described [here](HowTo_decrypt.md)
3. Check time to live is not stitched.
   ```javascript
   function checkTTL(iat, ttl) {
        const now = Date.now();
        if (iat > now)
          throw 'BAD: iat issued in the future';
        if (now > iat + ttl)
          throw 'timed out';
      }
   ```
 
## 3. Process Google Access Token
To get Google access token `googleProcessTokenPackage()` is used.
 ```javascript
     async function googleProcessTokenPackage(code) {
     const tokenPackage = await fetchAccessToken(                              //[1]
         GOOGLE_CODE_LINK, {
             code,
             client_id: GOOGLE_CLIENT_ID,
             client_secret: GOOGLE_CLIENT_SECRET,
             redirect_uri: GOOGLE_REDIRECT_2,
             grant_type: 'authorization_code'
         }
     );                                                       
       const jwt = await tokenPackage.json();                                  //[2]
       const [header, payloadB64url, signature] = jwt.id_token.split('.');     //[3]
       const payloadText = atob(fromBase64url(payloadB64url));                 //[4]
       const payload = JSON.parse(payloadText);                                //[5]
       return ['go' + payload.sub, payload.email];                             //[6]
     }
 ```
 
1. POST request used to get JWT.
   The request must include the following parameters in the POST body:
        * `code` the authorization code that is returned from the initial request.
        *` client_id`	the **client ID** that you obtain from the API Console Credentials page.
        * `client_secret`	the **client secret** that you obtain from the API Console Credentials page.
        * `redirect_uri` an authorized **redirect URI** for the given client_id specified in the API Console Credentials page.
        * `grant_type` this field must contain a  string value of "authorization_code".
2. The `json()` takes a response and reads it to completion. The result of execution is JWT.
3. Getting a header, payload u signature with JWT.
4. Decoding a string from base64url.
5. Conversion into object.
6. Return some user properties.
 
## 4. Get the uid
To create a unique key and use it like userID, `getOrSetUid()` is used. It based on `countapi.xyz` API described [here](https://github.com/orstavik/cloudflare-tutorial/blob/8094fe491167a9973201a8c7fa5b1d299e44750c/docs/2_worker_tricks/HowTo_atomicCounter.md). 
 
```javascript
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
```
 
## 5. Make the session secret and session object

1. The `sessionSecret` variable is encrypted `sessionObject` object which includes previously defined values:
  * `uid` user ID;
  * `username` received from google user name;
  * `provider` social network name (google in our case);
  * `iat` creation time;
  * `ttl` session time to live;
  * `v` version.
2. `selfClosingMessage` represent html template which contain `<script>` which pass non encrypted `sessionObject` from a pop-up window to main by `message` event, and self close login pop-up window.
  ```javascript
  function selfClosingMessage(msg, domain) {
    return `<script>
    window.opener.postMessage('${msg}', 'https://${domain}'); 
    window.close();
  </script>`;
  }
  ```
3. Make cookie using `bakeCookie()`. Despite remember-me, session or remember-me cookie will be created. Read more about cookie [here](HowTo_rememberMe_cookie.md).

```javascript
function bakeCookie(name, value, domain, ttl) {
  let cookie = `${name}=${value}; HttpOnly; Secure; SameSite=Strict; Path=/; Domain=${domain};`;
  if (ttl !== '')
    cookie += 'Max-age=' + ttl + ';';
  return cookie;
}
```
4. Response with script and set cookie.
## 6. Logout
To logout it is necessary to clear all previous set user information by:
 1. Pass empty `message` event to clear previously defined value.
 2. Remove cookies by setting 0 time to live.
 
## Example
 Full example here
 ```javascript

//imported pure functions begins
function randomString(length) {
  const iv = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(iv).map(b => ('00' + b.toString(16)).slice(-2)).join('');
}

function getCookieValue(cookie, key) {
  return cookie ?.match(`(^|;)\\s*${key}\\s*=\\s*([^;]+)`) ?.pop();
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

let cachedPassHash;

async function passHash(pw) {
  return cachedPassHash || (cachedPassHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw)));
}

async function makeKeyAESGCM(password, iv) {
  const pwHash = await passHash(password);
  const alg = { name: 'AES-GCM', iv: iv };                            // specify algorithm to use
  return await crypto.subtle.importKey('raw', pwHash, alg, false, ['decrypt', 'encrypt']);  // use pw to generate key
}

async function encryptAESGCM(password, iv, plaintext) {
  const key = await makeKeyAESGCM(password, iv);
  const ptUint8 = new TextEncoder().encode(plaintext);                               // encode plaintext as UTF-8
  const ctBuffer = await crypto.subtle.encrypt({ name: key.algorithm.name, iv: iv }, key, ptUint8);                   // encrypt plaintext using key
  const ctArray = Array.from(new Uint8Array(ctBuffer));                              // ciphertext as byte array
  return ctArray.map(byte => String.fromCharCode(byte)).join('');             // ciphertext as string
}

async function decryptAESGCM(password, iv, ctStr) {
  const key = await makeKeyAESGCM(password, iv);
  const ctUint8 = new Uint8Array(ctStr.match(/[\s\S]/g).map(ch => ch.charCodeAt(0))); // ciphertext as Uint8Array
  const plainBuffer = await crypto.subtle.decrypt({ name: key.algorithm.name, iv: iv }, key, ctUint8);                 // decrypt ciphertext using key
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
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: Object.entries(data).map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&')
  });
}

async function googleProcessTokenPackage(code) {
  const tokenPackage = await fetchAccessToken(
    GOOGLE_CODE_LINK, {
      code: code,
      client_id: GOOGLE_CLIENTID,
      client_secret: GOOGLE_CLIENTSECRET,
      redirect_uri: GOOGLE_REDIRECT,
      grant_type: 'authorization_code'
    }
  );
  const jwt = await tokenPackage.json();
  const [header, payloadB64url, signature] = jwt.id_token.split('.');
  const payloadText = atob(fromBase64url(payloadB64url));
  const payload = JSON.parse(payloadText);
  return ['go' + payload.sub, payload.email];
}

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

async function login(stateSecret) {
  return redirectUrl(GOOGLE_OAUTH_LINK, {
    state: stateSecret,
    nonce: randomString(12),
    client_id: GOOGLE_CLIENTID,
    redirect_uri: GOOGLE_REDIRECT,
    scope: 'openid email profile',
    response_type: 'code',
  });
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
      return Response.redirect(await login(stateSecret));
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
      const [providerId, username] = await googleProcessTokenPackage(code);
      //3. get the uid for the providerId
      const uid = await getOrSetUid(providerId);
      //4. make the session secret and session object
      const iat = Date.now();
      const ttl = state.rm === null ? null : SESSION_TTL;
      const sessionObject = { uid, username, provider, iat, ttl, v: 27 };
      const sessionSecret = await encryptData(JSON.stringify(sessionObject), SECRET);
      const txtIn = selfClosingMessage(JSON.stringify(sessionObject), SESSION_ROOT);
      const cookieIn = bakeCookie(SESSION_COOKIE_NAME, sessionSecret, SESSION_ROOT, sessionObject.ttl);
      console.log(txtIn)
      return new Response(txtIn, { status: 200, headers: { 'content-type': 'text/html', 'Set-Cookie': cookieIn } });
    }
    if (action === 'logout') {
      const txtOut = selfClosingMessage('', SESSION_ROOT);
      const cookieOut = bakeCookie(SESSION_COOKIE_NAME, 'LoggingOut', SESSION_ROOT, 0);
      return new Response(txtOut, { status: 200, headers: { 'content-type': 'text/html', 'Set-Cookie': cookieOut } });
    }
    throw `wrong action: ${action} in ${url.pathname}`;
  } catch (err) {
    return new Response(err.message, { status: 401 });
  }
}

addEventListener('fetch', e => e.respondWith(handleRequest(e.request)));
 ``` 
 
## Reference
  
  * [Live Google auth demo](https://google-auth.maksgalochkin2.workers.dev/login/google)
  * [OpenID Connect](https://developers.google.com/identity/protocols/oauth2/openid-connect)
  * [MDN: .json()](https://developer.mozilla.org/en-US/docs/Web/API/Body/json)
  * [Base64](https://en.wikipedia.org/wiki/Base64)
  * [Google APIs](https://console.developers.google.com/)
