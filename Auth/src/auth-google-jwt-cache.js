// when you log in, you get the key of the month. And then, your session will roll as long as the month is no more than 6mnths in the past.
//   And then, you can update the 6mnths keys that are not currently in use without disturbing anything.

// So, if you login on sept.11.2001, the keynr is 0109. Then, next time you send the cookie to the server worker is oct 23 2001. Your cookie is then rolled, because the month is then 0110, only one month later. You stay active every month, but on 0203 (March 2002), you must log in again, because the cookie can only be rolled 6mnths.
//   And yes. We need jwt. Because we also need IAT (issue at time) in the header. And then the key numbers can be simple number 1-12 again.
//   And then we can base the rolling algorithm based on the iat. If we also add an UAT (updated at time).
// Ok.
//   Jwt
// { header:
// {alg: "aes256-gcm",
//   iv: hexString,
//   key: 1-12,
//   Iat: 11.9.2001,
//   Uat: 5.10.2001
// },
//   payload: encryptedText,
//     signature: null
// }



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
  if (now > iat + ttl)    //now 15:00  iat 10:00  + 6mth in ms
    throw 'timed out';
}

function getLoginTime() {
  const date = new Date();
  const year = date.getFullYear() % 100;
  const month = date.getMonth() + 1;
  return [year, month];
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
      code,
      client_id: GOOGLE_CLIENTID,
      client_secret: GOOGLE_CLIENTSECRET,
      redirect_uri: GOOGLE_REDIRECT,
      grant_type: 'authorization_code'
    }
  );
  const jwt = await tokenPackage.json();
  return jwt.id_token;
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
      //rolling cookie
      const cookies = request.headers.get('cookie');
      const jwtCookie = getCookieValue(cookies, 'sessionIDJwtCookie');
      if (jwtCookie) {
        let jwtObj = JSON.parse(atob(fromBase64url(jwtCookie)));
        //make string to decrypt
        let decryptedPayloadawait = await decryptData(jwtObj.header.iv + "." + jwtObj.payload);
        if (Date.now() < jwtObj.header.Iat + jwtObj.header.Uat) {  //fix this, because checkTTL throws errors.  try catch here, I think no. Just check wheather cookies is not expired and return responce with existing cookies. If expired just let browser to make redirect to /callback ???
          // refesh jwt cookie iat
          jwtObj.header.iat = Date.now();
          // make new cookie
          const jwtCookie = bakeCookie("sessionIDJwtCookie", toBase64url(btoa(JSON.stringify(jwtObj)), SECRET), SESSION_ROOT, jwtObj.header.uat)
          return new Response(decryptedPayloadawait + "fromCookie", { status: 200, headers: { 'content-type': 'text/html', 'Set-Cookie': jwtCookie } });
        }

      }
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

      // handle JWT
      const jwt = await googleProcessTokenPackage(code);

      const [header, payloadB64url, signature] = jwt.split('.');
      //   const [year, month] = getLoginTime();
      const payloadText = atob(fromBase64url(payloadB64url));
      const payloadObj = JSON.parse(payloadText);

      const providerId = 'go' + payloadObj.sub;
      const username = payloadObj.email; // cant shortcut, bug with a dot

      // just encrypt whole payload obj. Of course I can encrypt only some properties
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
      const jwtCookie = bakeCookie("sessionIDJwtCookie", toBase64url(btoa(JSON.stringify(handledJwt)), SECRET), SESSION_ROOT, uatMs)
      return new Response(JSON.stringify(sessionObject), { status: 200, headers: { 'content-type': 'text/html', 'Set-Cookie': cookieIn, 'Set-Cookie': jwtCookie } });
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