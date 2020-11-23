# HowTo: Google Github Auth

Often the user has accounts in several social networks, so most web applications offer several login options. Authorization through social networks increases the loyalty of users who do not have to register. An additional advantage for the owner will be access to users' personal data, which can be used for marketing purposes. In this article we will consider Google and Github authentication. 

## Create and configure Google/Github App. Create worker (Cloudflare).
Before you start, create and configure both [Google](../HowTo_GoogleAuth.md) and [Github](../HowTo_GithubAuth.md) application. Create new common worker and define global variables.

## Code the worker

Make a `handleRequest()` function:

```javascript
async function handleRequest(req) {                                                                                  
    const url = new URL(req.url);                                                                                  //[2]
    let state = await getStateSecret(STATE_SECRET_TTL_MS);                                                         //[3]
    const [ignore, action, data] = url.pathname.split('/');                                                        //[4]
    if (action === 'login') {                                                                                      //[5]
        let redirect;
        if (data === 'github') {    
            redirect = makeRedirect(
                GITHUB_OAUTH_LINK, {
                    state,
                    client_id: GITHUB_CLIENTID,
                    redirect_url: GITHUB_REDIRECT,
                    scope: 'user',
                }
            );
        } else if (data === 'google') {
            redirect = makeRedirect(GOOGLE_REDIRECT_1, {
                state,
                nonce: randomString(12),
                client_id: GOOGLE_CLIENT_ID,
                redirect_uri: GOOGLE_REDIRECT_2,
                scope: 'openid email',
                response_type: 'code',
            });
        } else
            return new Response('error1');
        return Response.redirect(redirect);
    }
    if (action === 'callback') {                                                                                   //[6]
        const stateParam = url.searchParams.get('state');                                                          //[7]
        let isValid = await checkStateSecret(stateParam, SECRET);                                                  //[8]
        if (!isValid)
            return new Response('Error 667: state timed out');
        const code = url.searchParams.get('code');                                                                 //[9]
        let userText;
        if (data === 'google')                                                                                    //[10]
            userText = 'go' + await googleProcessTokenPackage(code); //the userText is the sub.
        else if (data === 'github')
            userText = 'gi' + await githubProcessTokenPackage(code); //userText is the github id nr.
        else
            return new Response('error2');
        return new Response(userText, { status: 201 });
    }
    const mainpage = `hello sunshine GITHUB oauth28 <a href='/login/google'>login google</a> - - - <a href='/login/github'>login github</a>`;
    return new Response(mainpage, { headers: { 'Content-Type': 'text/html' } });                                   //[1]
}
```
1. Render _Login_ button if user not logged in.
2. Getting the URL parameters values.
3. Both Google and Github have parameters that are random string. getStateSecret() generate such string. In simple words it is used to protect against XSRF. Your application generates a random string and send it to the authorization server using the state (Google also has nonce) parameter. The authorization server send back the state parameter. If both states are the same, this confirms that the request and the response were sent in the same browser. If state parameters are differents, someone else has initiated the request.
```javascript
async function getStateSecret(ttl) {
  const state = [Date.now(), ttl, uint8ToHexString(crypto.getRandomValues(new Uint8Array(8)))].join('.');          //[1]
  const iv = crypto.getRandomValues(new Uint8Array(12));                                                           //[2]
  const cipher = await encryptAESGCM(SECRET, iv, state);                                                           //[3]
  return uint8ToHexString(iv) + '.' + toBase64url(btoa(cipher));                                                   //[4]
}
```
                                                                                                                         
1. Generated state initial value.
2. An initialization vector (IV) is an arbitrary number that can be used along with a secret key for data encryption. This number, also called a nonce, is employed only one time in any session.
3. Make state value using AESGCM encryption mode.
  ```javascript
  let cachedPassHash;

  function toBase64url(base64str) {
    return base64str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }
  
  function uint8ToHexString(ar) {
    return Array.from(ar).map(b => ('00' + b.toString(16)).slice(-2)).join('');
  }

  async function passHash(pw) {
    return cachedPassHash || (cachedPassHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw)));
  }
  
  async function makeKeyAESGCM(password, iv) {
    const pwHash = await passHash(password);                    //Generate a digest of the given data.
    const alg = { name: 'AES-GCM', iv: iv };                    //Specify algorithm to use.
    return await crypto.subtle.importKey('raw', pwHash, alg, false, ['decrypt', 'encrypt']);  //Generate key
  }
  
  async function encryptAESGCM(password, iv, plaintext) {
    const key = await makeKeyAESGCM(password, iv);                                    //Make AESGCM key to encryption
    const ptUint8 = new TextEncoder().encode(plaintext);                              //Encode plaintext as UTF-8
    const ctBuffer = await crypto.subtle.encrypt({ name: key.algorithm.name, iv: iv }, key, ptUint8);  //Encrypt plaintext using key
    const ctArray = Array.from(new Uint8Array(ctBuffer));                             //Ciphertext as byte array
    return ctArray.map(byte => String.fromCharCode(byte)).join('');                   //Ciphertext as string
  }
  ``` 

4. Get an action and data which define the following behavior of an application. 
5. After clicking on the button for authentication (Google or Github), the user must be redirected to the `/login` which represents form provided by the API. For successful authentication the browser must make a request by passing some parameters using the URL:
           * `state`: An unguessable random string. It is used to protect against cross-site request forgery attacks.
           * `client_id` The client ID you received from GitHub when you registered.
           * `redirect_uri` (Google) / `redirect_uri` (Github)  The URL in your application where users will be sent after authorization.
           * `scope` must be "user" string for Github and "openid email profile" for Google.
           * `nonce` (Google only) random value generated by your app that enables replay protection.
           * `response_type` (Google only) launches a basic authorization code flow.
6. After successful authentication, the user is redirected back, but the url has a `/redirect` address.
7. The authorization server send back the `state` parameter.
8. Check `state` parameter value with initial `state`.
```javascript
function hexStringToUint8(str) {
  return new Uint8Array(str.match(/.{2}/g).map(byte => parseInt(byte, 16)));
}

async function decryptAESGCM(password, iv, ctStr) {
  const key = await makeKeyAESGCM(password, iv);                                                       // make  key to decryption. 
  const ctUint8 = new Uint8Array(ctStr.match(/[\s\S]/g).map(ch => ch.charCodeAt(0)));                  // ciphertext as Uint8Array
  const plainBuffer = await crypto.subtle.decrypt({ name: key.algorithm.name, iv: iv }, key, ctUint8); // decrypt ciphertext using key
  return new TextDecoder().decode(plainBuffer);                                                        // return the plaintext
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
```
  
9. The response includes a `code` parameter, a one-time authorization code that your server can exchange for an access token and ID token.
10. Processing of request. Read how to process [Google](../HowTo_GoogleAuth.md#process-access-token) and [Github](../HowTo_GithubAuth.md#process-access-token) request.

 ### Example
 Full example here

```javascript
function randomString(length) {
  const iv = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(iv).map(b => ('00' + b.toString(16)).slice(-2)).join('');
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

async function getStateSecret(ttl) {
  const state = [Date.now(), ttl, uint8ToHexString(crypto.getRandomValues(new Uint8Array(8)))].join('.');
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await encryptAESGCM(SECRET, iv, state);
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
      'User-Agent': '2js-no',
      'Accept': 'application/vnd.github.v3.raw+json'
    }
  });
  const userData = await user.json();
  return userData.id;
}

async function handleRequest(req) {
  const url = new URL(req.url);
  let state = await getStateSecret(STATE_SECRET_TTL_MS);
  const [ignore, action, data] = url.pathname.split('/');

  if (action === 'login') {
    let redirect;
    if (data === 'github') {
      redirect = makeRedirect(
        GITHUB_OAUTH_LINK, {
          state,
          client_id: GITHUB_CLIENTID,
          redirect_url: GITHUB_REDIRECT,
          scope: 'user',
        }
      );
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
      return new Response('Error 667: state timed out');
    const code = url.searchParams.get('code');
    let userText;
    if (data === 'google')
      userText = 'go' + await googleProcessTokenPackage(code); //the userText is the sub.
    else if (data === 'github')
      userText = 'gi' + await githubProcessTokenPackage(code); //userText is the github id nr.
    else
      return new Response('error2');
    return new Response(userText, {status: 201});
  }

  const mainpage = `hello sunshine GITHUB oauth28 <a href='/login/google'>login google</a> - - - <a href='/login/github'>login github</a>`;
  return new Response(mainpage, {headers: {'Content-Type': 'text/html'}});
}

addEventListener('fetch', e => e.respondWith(handleRequest(e.request)));
```
## Reference
 * [OpenID Connect](https://developers.google.com/identity/protocols/oauth2/openid-connect)
 * [MDN: .json()](https://developer.mozilla.org/en-US/docs/Web/API/Body/json)
 * [Base64](https://en.wikipedia.org/wiki/Base64)
 * [Google APIs](https://console.developers.google.com/)
 * [Authorizing OAuth Apps](https://developer.github.com/apps/building-oauth-apps/authorizing-oauth-apps/)
 * [Live demo](https://auth-go-gi.maksgalochkin2.workers.dev/)

