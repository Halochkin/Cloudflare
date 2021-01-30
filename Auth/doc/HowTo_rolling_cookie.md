# HowTo: rolling cookies

Rolling cookies create rolling sessions, a session whose TTL is automatically extended while the user is active.

To create a rolling cookie, the server/worker sets a 'medium' `Max-age`: for example 4 hours (a long lunch break) or 10days (a short holiday).
 While the user remains active, this timeframe is continuously pushed into the future every time the browser interacts with the server. This is achieved by the cloudflare worker always sending the browser an update cookie with an updated `Max-Age` attribute.
  
  The cloudflare worker must keep track internally to for example only update Rolling Cookie upto a rolling cookie `Max-Age`. This functionality the cloudflare worker must implement itself, there is no support for it in the HTTP cookie standard. (It is of course possible to only update the session once for example it is halfway spent: for example only give a new 4 hour session once the current rolling session has less than 2hours left on the clock. Such a simple check can dramatically reduce the network overhead needed to extend the rolling cookie on each interaction).

The idea is that a cookie value should store both the value of the last update cookie value separated by `.`. 

```javascript
function getCookieValue(cookie, key) {
  return cookie ?.match(`(^|;)\\s*${key}\\s*=\\s*([^;]+)`) ?.pop();
}

async function handleRequest(req) {
  const url = new URL(req.url);
  const [ignore, action] = url.pathname.split('/');
  const maxAge = 60 * 1;
  const cookies = req.headers.get('cookie');
  const iatString = getCookieValue(cookies, 'iat');
  const [iatDate, value] = iatString ?.split('.') || [];
  const iat = new Date(parseInt(iatDate || Date.now()));
    return new Response('rolling cookie: ' + iat.toUTCString(), {
      status: 201,
      headers: {
        'Content-type': 'text/html',
        'Set-Cookie': `iat=${Date.now() + '.' + 'roll'}; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge};`
      }
    });
}

addEventListener('fetch', e => e.respondWith(handleRequest(e.request)));
```