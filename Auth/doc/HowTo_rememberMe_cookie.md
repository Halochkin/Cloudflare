# HowTo: rememberMe cookie

RememberMe cookies, aka permanent cookies, are saved by the browser even when the browser closes that browser window. The browser deletes the cookie when the Max-Age is reached. To create a rememberMe cookie, set a Max-age several days into the future, for example 1 day or 30 days. If the browser has already set a rememberMe cookie, do not set the cookie again.

RememberMe cookies should not last infinitely. If a RememberMe cookie is set up to last for 365 days, then if it leaks, a leaked cookie might be valid for many months. To avoid such problems, rolling cookies can be used.

```javascript
function getCookieValue(cookie, key) {
  return cookie?.match(`(^|;)\\s*${key}\\s*=\\s*([^;]+)`)?.pop();
}

async function handleRequest(req) {
  const url = new URL(req.url);
  const [ignore, action, rememberMe] = url.pathname.split("/");
  const maxAge = rememberMe ? 60 : 3 * 1;
  if (action === "login")
    return new Response("logged in " + (rememberMe ? " and remember" : ""), {
      status: 200, headers: {
        'Set-Cookie': `myCookie=hello sunshine; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}; `
      }
    })

  return new Response(`<a href="login">login</a><br>
  <label>Remember Me
    <input type="checkbox">
  </label>
  <script>
  document.querySelector("a").addEventListener("click", e=>{
  e.preventDefault();
   let input = document.querySelector('input');
   let url = e.currentTarget.href;
      if (input && input.checked)
       url += '/rememberMe';
   return window.location = url;    
  })
  </script>
  `, {
    status: 200, headers: {'Content-Type': 'text/html',}
  })
}

addEventListener('fetch', e => e.respondWith(handleRequest(e.request)));
```