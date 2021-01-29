const myDomain = `typing-app.maksgalochkin2.workers.dev`;



function getCookieValue(cookie, key) {
  return cookie ?.match(`(^|;)\\s*${key}\\s*=\\s*([^;]+)`) ?.pop();
}

//KV worker
async function handleRequest(request) {
  try {
    let headers = { "Access-Control-Allow-Origin": "https://github-proxy.maksgalochkin2.workers.dev" };
    let userdata;




    return new Response("JSON.stringify(res)", { headers: { ...headers, 'content-type': 'application/json' } })


    const url = new URL(request.url);
    const path = url.pathname;
    const [ignore, action] = path.split('/');
    if (!action)
      return new Response("no action", { header: { headers } })

    //rolling cookie
    const cookies = request.headers.get('cookie');
    const jwtCookie = getCookieValue(cookies, "sessionIDJwtCookie");

    // headers = Object.assign(headers, { "Content-Type": contentType });

    let userID; //hold userID in global scope to use it for session kv value (userid + sessionID)

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
        headers = Object.assign(headers, { "Set-Cookie": updatedCookie });
        userdata = JSON.parse(decryptedPayloadawait);
        userID = "_" + userdata.uid;
      }
    }



    let lastSession;

    // if (action === 'json') {
    //     if (request.method !== 'POST')
    //         return new Response('not post');
    //     if (request.headers.get('content-type') !== 'application/json')
    //         return new Response(request.headers.get('content-type') + "...");
    //     const json = JSON.stringify(await request.json());
    //     let session = JSON.parse(json);
    //     session.sessionId = userID + "-" + session.sessionId;
    //     lastSession = JSON.stringify(session);
    //     if (userID)
    //         await PREVIOUS_RESULTS.put(session.sessionId, JSON.stringify(session));
    //     return new Response(JSON.stringify({ status: !!userID, uId: userID }), { headers: Object.assign(headers, { 'Content-ype': 'application/json' }) });
    // }


    // if (action === "delete") {
    //     if (request.method !== 'DELETE')
    //         return new Response('not delete');
    //     const json = JSON.stringify(await request.json());
    //     const key = JSON.parse(json).key;
    //     await PREVIOUS_RESULTS.delete(key);
    //     return new Response(JSON.stringify({ deleted: key }), { headers: Object.assign(headers, { 'Content-Type': 'application/json' }) })

    // }

    if (action === "getsessions") {
      if (request.method !== 'GET')
        return new Response('not get request');
      const values = await PREVIOUS_RESULTS.list();
      console.log(userID)
      const res = [];
      for (key of values.keys) {
        if (key && key.name.startsWith(userID)) {
          let value = await PREVIOUS_RESULTS.get(key.name);
          await res.push(value);
        }
      }
      return new Response("JSON.stringify(res)", { headers: { ...headers, 'content-type': 'text/plain' } })
    }

    //todo: this is does not work!!!!
    // if (action === 'logout') {
    //     const txtOut = selfClosingMessage(' ', SESSION_ROOT);
    //     const cookieOut = bakeCookie("sessionIDJwtCookie", 'LoggingOut', SESSION_ROOT, 0);
    //     // headers = headers.assign(headers, { "Set-Cookie": cookieOut });
    //     // userdata = undefined
    //     // Response.redirect("https://typing-race.maksgalochkin2.workers.dev/test/index.html")
    //     return new Response(txtOut, { status: 200, headers: Object.assign(headers, { 'content-type': 'text/html', 'Set-Cookie': cookieOut }) });
    // }



    return new Response(userdata, { status: 200, headers: headers });


  } catch (err) {
    return new Response("My error   " + err, { status: 401 });
  }
}





addEventListener("fetch", e => {
  e.respondWith(handleRequest(e.request));
});