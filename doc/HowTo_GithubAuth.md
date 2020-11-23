# HowTo: Github Auth with worker

## WhatIs: difference between Github and Google auth?

Github auth is similar to [Google auth](HowTo_GoogleAuth.md).
We create a Github App (similar to the Google App that accessed the Google+ API), which will give us a client ID and Client Secret we can use when the user authenticates with Github.

The differences between the two are:
1. Google returns the user info as a id_token together immediately with the accesstoken.

vs.

1. Github only returns an access token from the code callback, so you must go an extra roundtrip to the github user api in order to get the name and id of the github user.

2. Google returns the user info as a JWT token. This means that we must deconstruct the JSON data of the JWT in order to read the sub (user id) and first name and last name.
vs.
2. Github returns the user data as plain JSON. This means that we don't need to do much decoding of the user data in order to read user id and user name.


## Create and configure Github App

1. Sign in to your Github account.
2. Open **Settings** - **Developer setting**s and press **New GitHub App** button.
3. Confirm password.
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
4. Define next global variables 
   * `GITHUB_CLIENT_ID`
   * `GITHUB_CLIENT_SECRET`
   * `GITHUB_LINK1_LOGIN: https://github.com/login/oauth/authorize` to obtain user authorization, handle active session lookup, authenticates the user, and obtains user consent.
   * `GITHUB_LINK2_CALLBACK https://github-auth.maksgalochkin2.workers.dev/callback` redirect url after successful authentication. 
   * `GITHUB_TOKEN	https://github.com/login/oauth/access_token` Github access token. 
   * `GITHUB_LINK4_USER_API	https://api.github.com/user` Github API from where we get the JSON data about user. 
   
## Code the worker

Make a `handleRequest()` function:

```javascript
      async function handleRequest(request) {
         const url = new URL(request.url);                                                                         //[2]
         const state = getState(STATE_SECRET_TTL_MS);                                                              //[3] 
         const encryptedState = await getEncryptedData(state);                                                     //[4] 
         const [empty, action] = url.pathname.split('/');                                                          //[5]
         if (action === "login") {                                                                                 //[6]
               let redirect = makeRedirect(GITHUB_OAUTH_LINK, {                                                    //[7]
                    state: encryptedState,
                    client_id: GITHUB_CLIENTID,
                    redirect_url: GITHUB_REDIRECT,
                    scope: 'user',
                  });               
             return Response.redirect(redirect);                                                                   //[8]
         }
         if (action === "callback") {                                                                              //[9]
          const stateParam = url.searchParams.get('state');                                                        //[10]
          let decryptedStateParam = await decryptData(stateParam, SECRET);                                         //[11]
           if (!await checkStateSecret(decryptedStateParam))                                                       //[12]
             return new Response("Wrong code param");  
           let code = url.searchParams.get("code");                                                                //[13]
           let userToken = await githubProcessTokenPackage(code);                                                  //[14]
           return new Response(JSON.stringify(userToken));                                                         //[15]
         }
     
         const mainpage = `<a href='/login'>login github</a>`;
         return new Response(mainpage, { headers: { 'Content-Type': 'text/html' } });                              //[1]
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
7. After clicking on the button for authentication (Login), the user must be redirected to the login form provided by the API. 
 `makeRedirect()` return url string with request parameters.
  ```javascript
 function makeRedirect(path, params) {
   return path + '?' + Object.entries(params).map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&');
 }
  ```
For authentication the browser must make a request by passing next parameters using the URL. To get redirection url `makeRedirect()` get next parameters:
        * `state` An unguessable random string. It is used to protect against cross-site request forgery attacks.
        * `client_id` The client ID you received from GitHub when you registered.
        * `redirect_uri` The URL in your application where users will be sent after authorization.
        * `scope` must be "user" string.

8. User redirect to Github login page.
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
14. Server makes this exchange by sending an HTTPS POST request. The POST request sent to the token endpoint, which you should retrieve from the Discovery document using the token_endpoint metadata value.

## Process Github Access Token

```javascript
async function githubProcessTokenPackage(code) {
 const accessTokenPackage = await fetchAccessToken(GITHUB_TOKEN, {               //[1]
        code,
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        redirect_uri: GITHUB_REDIRECT,
    });
  const tokenText = await accessTokenPackage.text();                              //[2]
  const access_token = tokenText.split('&')[0].split("=")[1];                     //[3]
  const user = await fetch('https://api.github.com/user', {                       //[4]
    headers: {
      'Authorization': 'token ' + accessToken,
      'User-Agent': 'maksgalochkin2',
      'Accept': 'application/vnd.github.v3.raw+json'
    }
  });
  const userData = await user.json();
  return {                                                                        //[5]
    name: userData.name,
    id: userData.id
  };
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

## Demo

```javascript

addEventListener('fetch', e => e.respondWith(handleRequest(e.request)));

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

async function githubProcessTokenPackage(code) {
    const accessTokenPackage = await fetchAccessToken(GITHUB_TOKEN, {   //[1]
        code,
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        redirect_uri: GITHUB_REDIRECT_URL,
    });

    const tokenText = await accessTokenPackage.text();                              //[2]
    console.log(tokenText)

    const access_token = tokenText.split('&')[0].split("=")[1];                     //[3]
    const user = await fetch('https://api.github.com/user', {                       //[4]
        headers: {
            'Authorization': 'token ' + access_token,
            'User-Agent': 'maksgalochkin2',
            'Accept': 'application/vnd.github.v3.raw+json'
        }
    });
    const userData = await user.json();
    return {                                                                        //[5]
        name: userData.name,
        id: userData.id
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
        let redirect = makeRedirect(GITHUB_OAUTH_LINK, {                                                      //[7]
            state: encryptedState,
            client_id: GITHUB_CLIENT_ID,
            redirect_url: GITHUB_REDIRECT_URL,
            scope: 'user',
        });
        return Response.redirect(redirect);                                                                   //[8]
    }
    if (action === "callback") {                                                                              //[9]
        const stateParam = url.searchParams.get('state');                                                     //[10]
        let [_iat, _ttl] = await decryptData(stateParam, SECRET); // return decrypted value.
        if (!checkTTL(_iat, _ttl))    //Expiration check
            return new Response("Error: state param timed out");
        let code = url.searchParams.get("code");                                                              //[13]
        let userToken = await githubProcessTokenPackage(code);                                                //[14]
        return new Response(JSON.stringify(userToken));                                                       //[15]
    }

    const mainpage = `<a href='/login'>login github</a>`;
    return new Response(mainpage, { headers: { 'Content-Type': 'text/html' } });                              //[1]
}

```

## Reference
* [Cloudflare demo](https://dash.cloudflare.com/a6df9be02f0ec82fea09296ccf4d316d/workers/edit/github-auth)
* [Live demo](https://github-auth.maksgalochkin2.workers.dev)
* [Authorizing OAuth Apps](https://developer.github.com/apps/building-oauth-apps/authorizing-oauth-apps/)
* [Live demo](https://github-auth.maksgalochkin2.workers.dev/)