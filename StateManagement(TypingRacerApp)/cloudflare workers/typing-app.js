const myDomain = `typing-app.maksgalochkin2.workers.dev`;

const link = "https://raw.githubusercontent.com/Halochkin/Cloudflare/master/testApp";


function getCookieValue(cookie, key) {
  return cookie?.match(`(^|;)\\s*${key}\\s*=\\s*([^;]+)`)?.pop();
}


function getHeaderElement(credentials) {
  let logged;
  let base = `
<head>
     <meta charset="UTF-8">
     <title>Typing racer</title>
     <link rel="shortcut icon" type="image/png" href="../static/img/logo.png"/>
</head>
    `

  if (credentials)
    logged = `
<header>
    <span id="header-logo">TYPING RACE</span>
    <span>
     <a id="logout-btn" href="/logout">Logout</a>
     <span id="header-username" >${credentials.username}</span>
     <img id="header-photo" src="${credentials.photo}"/>
    </span>
</header>`;

  const notlogged = ` <header>
    <span id="header-logo">TYPING RACE</span>
    <span id="login-label">Log in to store your results
    <a href="/login/google"><img class="auth-logo" src="../static/img/google.png" alt="google auth"></a>
    <a href="/login/github"><img class="auth-logo" src="../static/img/github.png" alt="github auth"></a>
    <input id="remember-me" type="checkbox"/><label for="rember-me" style="float: right; color: #ffa429;">Remember Me </label>
    </span>
  </header>`;

  const script = `
    
<script>

  let loginWindow;
  let loginWindowUrl;

  // handle message event. When we got message event from /callback it means that user logged in, So just change location
  function receiveLoginData(e) {
       if (e.origin !== "${'https://' + myDomain}" || e.source !== loginWindow)
      return;
    window.location = e.origin + "/test/index.html";
  }

  window.addEventListener('message', receiveLoginData);

   for (let link of document.querySelectorAll(".auth-logo, #logout-btn"))
     link.addEventListener('click', openRequestedSinglePopup);


  function popupParameters() {
    const width = Math.min(600, window.screen.width);
    const height = Math.min(600, window.screen.height);
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    return "resizable,scrollbars,status,opener," +
      Object.entries({width, height, left, top}).map(kv => kv.join('=')).join(',');
  }

  function openRequestedSinglePopup(event) {
    event.preventDefault();
    let url = event.currentTarget.parentNode.href;
    if (event.currentTarget.pathname === "/logout"){
     url = event.currentTarget.href;     // return and change location to prevent open popup window
    }
    let input = document.querySelector('input[type=checkbox]');
    if (input && input.checked)
      url += '?remember-me';
    if (!loginWindow || loginWindow.closed) {
      loginWindow = window.open(url, "_blank", popupParameters());
    } else if (loginWindowUrl !== url)
      loginWindow.location = url;
    loginWindowUrl = url;
    loginWindow.focus();
  }


const githubProxy = 'https://github-proxy.maksgalochkin2.workers.dev';
const link = "https://raw.githubusercontent.com/Halochkin/Cloudflare/master/testApp";


  async function makeFetch(url) {
       return  await fetch(url)
            .then(response => response.text())
            .then(data => {
                return data;
            })
            .catch(error => console.error(error))
}


    async function LinkToStyle(el) {
        const href = el.getAttribute('href');

        const body = await makeFetch(link + href.slice(2, href.length))
            .then(response => response)
            // .then(data => {
            //     return data;
            // })
            .catch(error => console.error(error))
        if (body){
            const styleElement = document.createElement("style");
            styleElement.textContent = body;
            return styleElement
        }
    }

    
    
    
      //       .on('img.auth-logo', inlineMutator)
      //       .on("link", linkMutator)
      //       .on('link[href][rel="stylesheet"]', linkToStyle)

  (async ()=>{
    
    
    
    
    
        const path = window.location.pathname;
        let body = await makeFetch(githubProxy + path);
        const element = document.createElement("div");
        element.innerHTML = body;
        let allItems = element.querySelectorAll("*");

       let res =[];
       
       

 
       
       
        for(let item of allItems){
           let tagName = item.tagName;
           if(tagName==="LINK"&&item.getAttribute("rel") ==="stylesheet")                    // replace into obj properties
             item = await LinkToStyle(item);

             res.push(item);
        }

        document.body.appendChild(allItems);


        
        
        
  })();
  </script>`;

  return base + (credentials ? logged : notlogged) + script;

}

class InlineMutator {
  constructor(cookie, base) {
    this.cookie = cookie;
    this.firstBase = base;
  }

  async element(el) {
    const src = el.getAttribute('src');
    el.removeAttribute('src');
    const path = src.slice(2, src.length);
    el.setAttribute('src', link + path);
  }
}

//todo combine with Inline Mutator, temporary solution
class LinkMutator {
  constructor(cookie, base) {
    this.cookie = cookie;
    this.firstBase = base;
  }

  async element(el) {
    // console.log(el.tagName)
    const src = el.getAttribute('href');
    const path = src.slice(2, src.length)
    el.removeAttribute('href');
    el.setAttribute('href', link + path);
  }
}

class LinkToStyle {

  constructor(location) {
    this.firstBase = location.href;
    this.secondBase = undefined;
  }

  async element(el) {
    const href = el.getAttribute('href');
    const body = await fetch(href)
      .then(response => response.text())
      .then(data => {
        return data
      })
      .catch(error => console.error(error))
    if (body)
      el.replace(`<style>${body}</style>`, {html: true});

  }
}


async function handleRequest(e) {
  let req = e.request;
  request = new Request(req)
  request.headers.set('Referrer-Policy', 'unsafe-url')


  try {
    const url = new URL(request.url);
    const path = url.pathname;
    const [ignore, action, provider] = path.split('/');
    const inlineMutator = new InlineMutator('Mr. Sunshine', url);
    const linkMutator = new LinkMutator('', url);
    const linkToStyle = new LinkToStyle(url);
    let userdata;
    let headers = {"Content-Type": 'text/html'}
    // let headers = { "Content-Type": 'text/html',  'Referrer-Policy': 'origin-when-cross-origin' }


    //rolling cookie
    const cookies = request.headers.get('cookie');
    const jwtCookie = getCookieValue(cookies, "sessionIDJwtCookie");


    let userID; //hold userID in global scope to use it for session kv value (userid + sessionID)

    // if (jwtCookie) {
    //     let jwtObj = JSON.parse(atob(fromBase64url(jwtCookie)));
    //     //make string to decrypt
    //     decryptedPayloadawait = await decryptData(jwtObj.header.iv + "." + jwtObj.payload, SECRET);

    //     //if too old
    //     if (Date.now() < jwtObj.header.Iat + jwtObj.header.Uat) {  //fix this, because checkTTL throws errors.  try catch here, I think no. Just check wheather cookies is not expired and return responce with existing cookies. If expired just let browser to make redirect to /callback ???
    //         // refesh jwt cookie iat (issue at time)
    //         jwtObj.header.iat = Date.now();
    //         // make new cookie
    //         let updatedCookie = bakeCookie("sessionIDJwtCookie", toBase64url(btoa(JSON.stringify(jwtObj)), SECRET), SESSION_ROOT, jwtObj.header.Uat)
    //         headers = Object.assign(headers, { "Set-Cookie": updatedCookie });
    //         userdata = JSON.parse(decryptedPayloadawait);
    //         userID = "_" + userdata.uid;
    //     }
    // }


    let lastSession;

    if (action === 'json') {
      if (request.method !== 'POST')
        return new Response('not post');
      if (request.headers.get('content-type') !== 'application/json')
        return new Response(request.headers.get('content-type') + "...");
      const json = JSON.stringify(await request.json());
      let session = JSON.parse(json);
      session.sessionId = userID + "-" + session.sessionId;
      lastSession = JSON.stringify(session);
      if (userID)
        await PREVIOUS_RESULTS.put(session.sessionId, JSON.stringify(session));
      return new Response(JSON.stringify({
        status: !!userID,
        uId: userID
      }), {headers: {'content-type': 'application/json'}});
    }


    if (action === "delete") {
      if (request.method !== 'DELETE')
        return new Response('not delete');
      const json = JSON.stringify(await request.json());
      const key = JSON.parse(json).key;
      await PREVIOUS_RESULTS.delete(key);
      return new Response(JSON.stringify({deleted: key}), {headers: {'content-type': 'application/json'}})

    }

    if (action === "getsessions") {
      if (request.method !== 'GET')
        return new Response('not get request');
      const values = await PREVIOUS_RESULTS.list();
      const res = [];
      for (key of values.keys) {
        if (key && key.name.startsWith(userID)) {
          let value = await PREVIOUS_RESULTS.get(key.name);
          await res.push(value);
        }
      }

      return new Response(JSON.stringify(res), {headers: {'content-type': 'application/json'}})
    }

    //todo: this is does not work!!!!
    if (action === 'logout') {
      const txtOut = selfClosingMessage(' ', SESSION_ROOT);
      const cookieOut = bakeCookie("sessionIDJwtCookie", 'LoggingOut', SESSION_ROOT, 0);
      // headers = headers.assign(headers, { "Set-Cookie": cookieOut });
      // userdata = undefined
      // Response.redirect("https://typing-race.maksgalochkin2.workers.dev/test/index.html")
      return new Response(txtOut, {status: 200, headers: {'content-type': 'text/html', 'Set-Cookie': cookieOut}});
    }


    //default header
    const headerElement = getHeaderElement(userdata);
    // console.log(headerElement)


    //get requested file type
    const type = path.substr(path.lastIndexOf('.') + 1);


    //if .css/.img etc
    // if ((type === 'js'))
    //     return new Response(body, { status: 200, headers: { "Content-Type": 'application/javascript' } });

    // if ((type !== 'html'))
    //     return new Response(body, { status: 200, headers: { "Content-Type": 'text/' + type } });

    return new HTMLRewriter()
      .on('img.auth-logo', inlineMutator)
      .on("link", linkMutator)
      .on('link[href][rel="stylesheet"]', linkToStyle)
      .transform(new Response(headerElement, {status: 200, headers: headers}));
  } catch (err) {
    return new Response("My error   " + err, {status: 401});
  }
}


addEventListener("fetch", e => {
  e.respondWith(handleRequest(e));
});