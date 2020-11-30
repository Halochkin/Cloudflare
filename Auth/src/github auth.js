addEventListener('fetch', e => e.respondWith(handleRequest(e.request)));

const STATE_PARAM_TTL = 3 * 60;

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
  const ctBuffer = await crypto.subtle.encrypt({name: key.algorithm.name, iv: iv}, key, ptUint8); // encrypt plaintext using key
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
  return new Response(mainpage, {headers: {'Content-Type': 'text/html'}});                              //[1]
}