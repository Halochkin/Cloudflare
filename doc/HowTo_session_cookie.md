# HowTo: session cookie


Session cookies, aka. ForgetMe cookies, are delete by the browser every time the full browser window with that cookie is closed by the user (closing a tab in a window is not enough to forget a session cookie). To create a forgetMe cookie simply do NOT set neither `Max-Age` nor `Expires` attributes on the cookie.

```javascript
async function handleRequest(req) {

  const url = new URL(req.url);
  const [ignore, action] = url.pathname.split("/")

  if (action === "setCookie")
    return new Response('hello cookie', {
      status: 200, headers: {
        'Set-Cookie': 'myCookie=hello sunshine; SameSite=Strict; Path=/;'
      }
    })

  return new Response('<a href="setCookie">set cookie</a>', {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
    }
  })
}

addEventListener('fetch', e => e.respondWith(handleRequest(e.request)));
```

## Reference

* [MDN: Set-Cookie ](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie)