# HowTo: Google Authorization with Cloudflare workers

In order to add Google social login to a web application it is necessary:

### Google+ API

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

### Cloudflare worker

1. Open [Cloudflare dashboard] (https://dash.cloudflare.com/) and go to the **"Workers"** tab using the menu on the right side of the page.
2. Create a new worker.
3. Go to the **Settings** tab.
4. Define global variables 
   * `GOOGLE_CLIENTID=<CLIENT_ID>.apps.googleusercontent.com` - Your _client ID_. 
   * `GOOGLE_CLIENTSECRET=<CLIENT_SECRET>` - Your _client Secret_.
   * `GOOGLE_CODE_LINK=https://oauth2.googleapis.com/token` - Google Auth access token.
   * `GOOGLE_REDIRECT_1=https://accounts.google.com/o/oauth2/v2/auth` - to obtain user authorization. This endpoint handles active session lookup, authenticates the user, and obtains user consent.
   * `GOOGLE_REDIRECT_2=https://<auth-go-gi.2js-no>.workers.dev/callback` - redirect url after successful authentication. Must retaliate against the name of the worker.

5. Inside `handleRequest()` put the code
  ```javascript
  async function handleRequest(request) {
    const url = new URL(request.url);                                                   //[2]
    const state = getState(STATE_SECRET_TTL_MS);                                        //[3] 
    const encryptedState = await getEncryptedData(state);                               //[4] 
    const [empty, action] = url.pathname.split('/');                                    //[5]
    if (action === "login") {                                                           //[6]
     let redirect = makeRedirect(GOOGLE_REDIRECT_1, {                                   //[7]
        state: encryptedState,
        nonce: randomString(12),
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: GOOGLE_REDIRECT_2,
        scope: 'openid email profile',
        response_type: 'code',
      });
      return Response.redirect(redirect);                                               //[8]
    }
    if (action === "callback") {                                                        //[9]
      const stateParam = url.searchParams.get('state');                                 //[10]
      let decryptedStateParam = await decryptData(stateParam, SECRET);                  //[11]
      if (!await checkStateSecret(decryptedStateParam))                                 //[12]
        return new Response("Wrong code param"); 
      const code = url.searchParams.get('code');                                        //[13]
      let userInfo = await googleProcessTokenPackage(code);                             //[14]
      return new Response(JSON.stringify(userInfo));                                    //[15]
    }
    const mainpage = `<a href='/login'>login google</a>`;
    return new Response(mainpage, { headers: { 'Content-Type': 'text/html' } });        //[1]
  }
  ```

1. Render _Login_ button if user not logged in.
2. Getting the URL values. 
3. To protect data it is necessary to create state which include creation time, time to live and random string. To get a state `getState()` is used. 
  ```javascript
    function getState(ttl) {
        return [Date.now(), ttl, uint8ToHexString(crypto.getRandomValues(new Uint8Array(8)))].join('.');
    }
  ```
4. Encrypt state string. How to encrypt described [here](HowTo_encrypt.md).
5. Defining `action` that defines the following behavior of an application.
6. Clicking on the button add "/login" to the url.
7. After clicking on the login button, the user redirect to the Google login form provided by the API in a pop-up window. 
   For authentication the browser must make a request and pass next parameters:
      * `state`  include the value of the anti-forgery unique session token, as well as any other information needed to recover the context when the user returns to your application, e.g., the starting URL.  
      * `client_id`  credential generated client ID value.        
      * `nonce` random value generated by your app that enables replay protection when present.
      * `responce_uri` should be the HTTP endpoint on your server that will receive the response from Google. The value must exactly match one of the authorized redirect URIs for the OAuth 2.0 client, which you configured in the API Console Credentials page.
      * `scope` basic request should be "openid email".
   `makeRedirect()` return url string with request parameters.
 ```javascript
function makeRedirect(path, params) {
  return path + '?' + Object.entries(params).map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&');
}
```
 
8. Server do redirect to Google login page.
9. After successful authentication, the user will be redirected back to the web application with `/callback` action value.
10. Get state param from response url.
11. Decrypt state param. How to decrypt described [here](HowTo_decrypt.md)
12. Check If both states (initial from step 1 and `state` param value) are the same, this confirms that request and response sent in the same browser. If state parameters are different, someone else has initiated the request. To check it we use `checkStateSecret()`. 
   ```javascript
    async function checkStateSecret(data) {
        let [iat, ttl, someOtherState] = data.split('.');
        iat = parseInt(iat);
        ttl = parseInt(ttl);
        const now = Date.now();
        const stillTimeToLive = now < iat + ttl;   // check that difference between  sum of initial ttl and responded ttl is not more than the maximum allowed value. 
        const notAFutureDream = iat < now;
        return stillTimeToLive && notAFutureDream;
    }
   ```
13. The response includes a `code` parameter, a one-time authorization code that your server can exchange for an access token and ID token.
14. `code` param represents google access token. To get user value, server makes this exchange by sending an HTTPS POST request using `googleProcessTokenPackage()`. 
 
## Process Google Access Token
  
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
       return JSON.stringify({                                                 //[6]
           id: payload.sub,
           email: payload.email,
           fullname: (payload.given_name + payload.family_name),
           provider: payload.iss
       });
     }
 ```
 
1. POST request is used to get JWT.
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
6. Return some user object properties.
 
 ### Example
 Full example here
 ```javascript
const STATE_PARAM_TTL = 3 * 60;

function randomString(length) {
  const iv = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(iv).map(b => ('00' + b.toString(16)).slice(-2)).join('');
}

function getCookieValue(cookie, key) {
  return cookie ?.match(`(^|;)\\s*${key}\\s*=\\s*([^;]+)`) ?.pop();
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
  const alg = { name: 'AES-GCM', iv: iv };                            // specify algorithm to use
  return await crypto.subtle.importKey('raw', pwHash, alg, false, ['decrypt', 'encrypt']);  // use pw to generate key
}

async function encryptAESGCM(password, iv, plaintext) {
  const key = await makeKeyAESGCM(password, iv);
  const ptUint8 = new TextEncoder().encode(plaintext);                               // encode plaintext as UTF-8
  const ctBuffer = await crypto.subtle.encrypt({ name: key.algorithm.name, iv: iv }, key, ptUint8); // encrypt plaintext using key
  const ctArray = Array.from(new Uint8Array(ctBuffer));                              // ciphertext as byte array
  return ctArray.map(byte => String.fromCharCode(byte)).join('');             // ciphertext as string
}

async function decryptAESGCM(password, iv, ctStr) {
  const key = await makeKeyAESGCM(password, iv);
  const ctUint8 = new Uint8Array(ctStr.match(/[\s\S]/g).map(ch => ch.charCodeAt(0))); // ciphertext as Uint8Array
  const plainBuffer = await crypto.subtle.decrypt({ name: key.algorithm.name, iv: iv }, key, ctUint8);                 // decrypt ciphertext using key
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
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: Object.entries(data).map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&')
  });
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

function checkTTL(iat, ttl) {
  const now = Date.now();
  const stillTimeToLive = now < iat + ttl;
  const notAFutureDream = iat < now;
  return stillTimeToLive && notAFutureDream;
}

async function decryptData(data, password) {
  const [ivText, cipherB64url] = data.split('.');
  const iv = hexStringToUint8(ivText);
  const cipher = atob(fromBase64url(cipherB64url));
  const payload = await decryptAESGCM(password, iv, cipher);
  let [iat, ttl, someOtherState] = payload.split('.');
  return [iat, ttl];
}


async function handleRequest(request) {
  const url = new URL(request.url);                                                                         //[2]
  const state = getState(STATE_PARAM_TTL);                                                                  //[3] 
  const encryptedState = await getEncryptedData(state);                                                     //[4] 
  const [empty, action] = url.pathname.split('/');                                                          //[5]

  if (action === "login") {                                                                                 //[6]
 let redirect = makeRedirect(GOOGLE_REDIRECT_1, {
        state: encryptedState,
        nonce: randomString(12),
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: GOOGLE_REDIRECT_2,
        scope: 'openid email profile',
        response_type: 'code',
      });
    return Response.redirect(redirect);                                                                   //[8]
  }
  else if (action === "callback") {                                                                       //[9]
    const stateParam = url.searchParams.get('state');                                                     //[10]
    let [_iat, _ttl] = await decryptData(stateParam, SECRET); // return decrypted value.
    if (!checkTTL(_iat, _ttl))    //Expiration check
      return new Response("Error: state param timed out");
    let code = url.searchParams.get("code");                                                              //[13]
    let userToken = await googleProcessTokenPackage(code);                                                //[14]
    return new Response(JSON.stringify(userToken));                                                       //[15]
  }
    const mainpage = `<a href='/login'>login google</a>`;
    return new Response(mainpage, { headers: { 'Content-Type': 'text/html' } });
}

addEventListener('fetch', e => e.respondWith(handleRequest(e.request)));
 ```
 ### Reference
 
 * [Cloudflare demo](https://dash.cloudflare.com/a6df9be02f0ec82fea09296ccf4d316d/workers/edit/maxworker)
 * [Live demo](https://maxworker.maksgalochkin2.workers.dev)
 * [OpenID Connect](https://developers.google.com/identity/protocols/oauth2/openid-connect)
 * [MDN: .json()](https://developer.mozilla.org/en-US/docs/Web/API/Body/json)
 * [Base64](https://en.wikipedia.org/wiki/Base64)
 * [Google APIs](https://console.developers.google.com/)
 * [Live demo](https://maxworker.maksgalochkin2.workers.dev/)