addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request))
})

function makeRandomString(length) {
  return [...Array(length)].map(() => Math.random().toString(36)[2]).join('')
}

function fromBase64url(base64urlStr) {
  base64urlStr = base64urlStr.replace(/-/g, '+').replace(/_/g, '/');
  if (base64urlStr.length % 4 === 2)
    return base64urlStr + '==';
  if (base64urlStr.length % 4 === 3)
    return base64urlStr + '=';
  return base64urlStr;
}

async function fetchAccessToken(data) {
  return await fetch(GOOGLE_CODE_LINK, {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: data
  });
}

async function googleProcessTokenPackage(code) {
  const bodyString = `code=${encodeURIComponent(code)}&client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}&client_secret=${encodeURIComponent(GOOGLE_CLIENT_SECRET)}&redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_2)}&grant_type=authorization_code`
  const tokenPackage = await fetchAccessToken(bodyString);
  const jwt = await tokenPackage.json();
  const [header, payloadB64url, signature] = jwt.id_token.split('.');
  const payloadText = atob(fromBase64url(payloadB64url));
  const payload = JSON.parse(payloadText);
  return payload;
}


//https://developers.google.com/identity/protocols/oauth2/openid-connect

async function handleRequest(request) {
  const url = new URL(request.url);
  const [empty, action] = url.pathname.split('/');
  if (action === "login") {
    let redirect = GOOGLE_REDIRECT_1 + `?state=${encodeURIComponent(makeRandomString(12))}&client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}&nonce=${encodeURIComponent(makeRandomString(24))}&response_type=${encodeURIComponent("code")}&redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_2)}&scope=${encodeURIComponent("openid email")}&`;
    return Response.redirect(redirect);
  }
  if (action === "callback") {
    const code = url.searchParams.get('code');
    let userInfo = await googleProcessTokenPackage(code);
    return new Response(JSON.stringify(userInfo));
  }
  const mainpage = `<a href='/login'>login google</a>`;
  return new Response(mainpage, {headers: {'Content-Type': 'text/html'}});
}