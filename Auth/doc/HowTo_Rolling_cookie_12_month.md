# HowTo: Rolling cookies on month

As mentioned in [HowTo: rolling cookie](HowTo_rolling_cookie.md), rolling cookies create rolling sessions, a session whose TTL is automatically extended while the user is active. Such cookies are needed for the convenience and comfort of users when working on the Web. For example, you are registered at the forum and not to re-enter the login and password each time you visit the site, cookies save this information and the visitor comes to the forum from his PC automatically. Agree, it's pretty convenient. COOKIES save individual user settings and their interests on the Internet. It also avoids repeated requests to an external server. But even rolling cookies must have max-age, This max-age can be long enough, but not longer than 6 month.

Let's consider an example where the rolling cookies will be updated every time the user visits the page, but this update will be possible for 6 months after logging in. After 6 months user must login again.

So the strategy is:

1. Every time user visit a page, server check weather login cookie exist or not. If cookie exist, check their ttl, and if it is not expired - refresh `iat` (issue at time) property value. If cookie expired - response with login form.
2. If user visit page first time, wait until user open login form and do authentication.
3. After successful authentication, make custom JWT which include only a header and payload. It contain encrypted information from `Google JWT` we get as url param after `/callback`. This JWT encrypted and converted into base64url format and set as cookie value.


```javascript
async function handleRequest(request) {
  try {
    const url = new URL(request.url);
    const [ignore, action, provider] = url.pathname.split('/');
    const cookies = request.headers.get('cookie');                                                                 //[1]
    const jwtCookie = getCookieValue(cookies, 'sessionIDJwtCookie');                                               //[1.1]
    if (jwtCookie) {
      let jwtObj = JSON.parse(atob(fromBase64url(jwtCookie)));                                                     //[1.2]
      //make string to decrypt
      let decryptedPayloadawait = await decryptData(jwtObj.header.iv + "." + jwtObj.payload);                      //[1.3]
      if (Date.now() < jwtObj.header.Iat + jwtObj.header.Uat) {                                                    //[1.4]
        // refesh jwt cookie iat
        jwtObj.header.iat = Date.now();                                                                            //[1.5]
        // make new cookie
        const jwtCookie = bakeCookie("sessionIDJwtCookie", toBase64url(btoa(JSON.stringify(jwtObj)), SECRET), SESSION_ROOT, jwtObj.header.uat) //[1.6]
        return new Response(decryptedPayloadawait + "fromCookie", {
          headers: {
            'content-type': 'text/html',
            'Set-Cookie': jwtCookie
          }
        });                                                                                                        //[1.7]
      }
    }

    if (action === 'login') {                                                                                      //[2]
      //rolling cookie
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
      const jwt = await googleProcessTokenPackage(code);                                                           //[3]
      const [header, payloadB64url, signature] = jwt.split('.');                
      //   const [year, month] = getLoginTime();
      const payloadText = atob(fromBase64url(payloadB64url));                           
      const payloadObj = JSON.parse(payloadText);
      const providerId = 'go' + payloadObj.sub;
      const username = payloadObj.email; // cant shortcut, bug with a dot
      // just encrypt whole payload obj. Of course I can encrypt only some properties
      
      let encryptedPayload = (await encryptData(payloadText, SECRET)).split(".");                                  //[4]
      const iat = Date.now();                                                    
      const jwtUatMonths = 6;

      const uatMs = 60 * 60 * 24 * 30 * jwtUatMonths;                                                             //[4.1]
      let handledJwt = {                                                                                          //[4.2]
        header: {
          alg: "aes256-gcm",
          iv: encryptedPayload[0],    // encrypted payload string iv
          key: new Date().getUTCMonth() + 1,
          Iat: iat,
          Uat: uatMs
        },
        payload: encryptedPayload[1]    //encrypted payload cypher string
      }
      
      const uid = await getOrSetUid(providerId);                                                                   //[5]                  
      const ttl = state.rm === null ? null : SESSION_TTL;                                                          //[6]
      const sessionObject = {uid, username, provider, iat, ttl, v: 27};
      const sessionSecret = await encryptData(JSON.stringify(sessionObject), SECRET);
      const txtIn = selfClosingMessage(JSON.stringify(sessionObject), SESSION_ROOT);
      const cookieIn = bakeCookie(SESSION_COOKIE_NAME, sessionSecret, SESSION_ROOT, sessionObject.ttl);
      //JWT cookie
      const jwtCookie = bakeCookie("sessionIDJwtCookie", toBase64url(btoa(JSON.stringify(handledJwt)), SECRET), SESSION_ROOT, uatMs)
      return new Response(JSON.stringify(sessionObject), {
        status: 200,
        headers: {'content-type': 'text/html', 'Set-Cookie': cookieIn, 'Set-Cookie': jwtCookie}
      });
    }
    if (action === 'logout') {                                                                                     //[7]
      const txtOut = selfClosingMessage('', SESSION_ROOT);
      const cookieOut = bakeCookie(SESSION_COOKIE_NAME, 'LoggingOut', SESSION_ROOT, 0);
      const jwtCookie = bakeCookie("sessionIDJwtCookie", 'RollingOut', SESSION_ROOT, 0)
      return new Response(txtOut, {status: 200, headers: {'content-type': 'text/html', 'Set-Cookie': cookieOut}});
    }
    throw `wrong action: ${action} in ${url.pathname}`;
  } catch (err) {
    return new Response(err.message, {status: 401});
  }
}
```

1. Get all cookies.
    1. Check `sessionIDJwtCookie`.
    2. If `sessionIDJwtCookie` exist, then user already logged in before. Parse cookie value and convert from _base64_ format.
    3. Concat iv and cypher values by `.` and decrypt.
    4. Check whether cookie not expired.
    5. Update `iat` value to current time. Next time server will use this value to check expire.
    6. Make cookie. Check [how to bake cookie](HowTo_GoogleAuth.md#5-make-the-session-secret-and-session-object) for more description.
    7. Response with decrypted user info.
2. Render the login form if there are no cookies in the browser. How to make Stae secret described [here](HowTo_GoogleAuth.md#1-make-state-secret).
3. Read [how to JWT](HowTo_JWT.md) for more information how to get user info. 
4. Read [how to check state secret](HowTo_GoogleAuth.md#2-check-state-secret) for more info.
    1. Convert 6 month in ms.
    2. Make custom JWT which include header and payload as properties.
        * **header** contain alg (information about cypher), iv, key, iat (issue at time) and uat (update at time). 
        * **payload** contain Google JWT encrypted data.
5. Read [how to get the uid for the providerId](HowTo_GoogleAuth.md#4-get-the-uid) for info. 
6. Read [how make the session secret and session object](HowTo_GoogleAuth.md#5-make-the-session-secret-and-session-object).
7. Remove cookie when /logout.