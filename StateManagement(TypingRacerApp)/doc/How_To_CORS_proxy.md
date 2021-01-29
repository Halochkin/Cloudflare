

### Example

**1. Proxy worker**
```html
<html>
 <script>
  (async function(){
    const resp = await fetch("https://kv.max.workers.dev/data.json");
    document.body = await JSON.stringify(await resp.json());
  })();
 </script>
</html>
```



**2. KV worker**
```javascript
async function handleRequest(request) {
  let headers = { "Access-Control-Allow-Origin": "https://github-proxy.maksgalochkin2.workers.dev" };
  const url = new URL(request.url);
  const path = url.pathname;
  const [ignore, action] = path.split('/');
  const type = path.substr(path.lastIndexOf('.') + 1);

  if (!action)
    return new Response("no action", { header:  headers });

  if (action === "data") {
    if (request.method !== 'GET')
      return new Response('Not GET request');
    const value = await KV_STORE.get(action);
    if (value === null) 
      return new Response("Value not found", {status: 404});
    return new Response(value, { headers: { ...headers, 'content-type': 'application/'+ type }});
  }   
}

addEventListener("fetch", e => {
    e.respondWith(handleRequest(e.request));
});
```

1. The server (that the POST request is sent to) needs to include the Access-Control-Allow-Headers header (etc) in its response. Putting them in your request from the client has no effect.
