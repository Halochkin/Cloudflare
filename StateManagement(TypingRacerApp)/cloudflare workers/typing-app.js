const myDomain = `typing-app.maksgalochkin2.workers.dev`;



function getCookieValue(cookie, key) {
  return cookie ?.match(`(^|;)\\s*${key}\\s*=\\s*([^;]+)`) ?.pop();
}

let cachedPassHash;

async function passHash(pw) {
  return cachedPassHash || (cachedPassHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw)));
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

async function makeKeyAESGCM(password, iv) {
  const pwHash = await passHash(password);
  const alg = { name: 'AES-GCM', iv: iv };                            // specify algorithm to use
  return await crypto.subtle.importKey('raw', pwHash, alg, false, ['decrypt', 'encrypt']);  // use pw to generate key
}

async function decryptAESGCM(password, iv, ctStr) {
  const key = await makeKeyAESGCM(password, iv);
  const ctUint8 = new Uint8Array(ctStr.match(/[\s\S]/g).map(ch => ch.charCodeAt(0))); // ciphertext as Uint8Array
  const plainBuffer = await crypto.subtle.decrypt({ name: key.algorithm.name, iv: iv }, key, ctUint8);                 // decrypt ciphertext using key
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





//KV worker
async function handleRequest(request) {
  try {
    let userdata;

    let headers = {
      "Access-Control-Allow-Origin": "https://github-proxy.maksgalochkin2.workers.dev",
      'Content-Type': 'application/json',
      "Access-Control-Allow-Credentials": true,
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTION, DELETE"
    };





    // return new Response("JSON.stringify(res)", { headers: { ...headers, 'content-type': 'application/json' } })


    const url = new URL(request.url);
    const path = url.pathname;
    const [ignore, action] = path.split('/');
    if (!action)
      return new Response("no action", { header: { headers } })



    let userID, decryptedPayloadawait, lastSession; //hold userID in global scope to use it for session kv value (userid + sessionID)

    const cookies = request.headers.get('cookie');
    const jwtCookie = getCookieValue(cookies, "sessionIDJwtCookie");


    if (jwtCookie) {
      let jwtObj = JSON.parse(atob(fromBase64url(jwtCookie)));
      //make string to decrypt
      decryptedPayloadawait = await decryptData(jwtObj.header.iv + "." + jwtObj.payload, SECRET);
      userID = "_" + JSON.parse(decryptedPayloadawait).uid;
    }



    if (action === 'json') {
      let session = await request.json();
      session.sessionId = userID + "-" + session.sessionId;
      lastSession = JSON.stringify(session);
      if (userID)
        await PREVIOUS_RESULTS.put(session.sessionId, JSON.stringify(session));
      return new Response(JSON.stringify({ status: !!userID, uId: userID }), { headers: headers });
    }


    if (action === "delete") {

      const json = JSON.stringify(await request.json());

      return new Response(JSON.stringify({ deleted: json }), { headers: headers });

      const key = JSON.parse(json).key;
      await PREVIOUS_RESULTS.delete(key);
      return new Response(JSON.stringify({ deleted: key }), { headers: headers });




      // let sessionId = await request.json();
      // console.log(sessionId);

      // let session = JSON.parse(sessionId);
      // console.log(session)
      // let res =
      //   const sessionId = JSON.stringify(await request.json());


      // let key = JSON.parse(sessionId).key;



      // return new Response(JSON.stringify({ "val": key }), { headers: headers });

      // let key = JSON.parse(sessionId).key;

      // await PREVIOUS_RESULTS.delete(key);

    }

    if (action === "getsessions") {
      // if (request.method !== 'GET')
      //     return new Response('not get request'); //describe preflight request
      const values = await PREVIOUS_RESULTS.list();
      const res = [];
      for (key of values.keys) {
        if (key && key.name.startsWith(userID)) {
          let value = await PREVIOUS_RESULTS.get(key.name);
          await res.push(value);
        }
      }
      return new Response(JSON.stringify(res), { headers: headers })
    }

    return new Response("Bad Request", { status: 400, headers: headers });


  } catch (err) {
    return new Response("My error   " + err, { status: 401 });
  }
}





addEventListener("fetch", e => {
  e.respondWith(handleRequest(e.request));
});