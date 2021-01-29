





As you may have noticed, we always add a response header named `Access-Control-Allow-Origin` to the static response. The Access-Control-Allow-Origin response header indicates whether the response can be shared with requesting code from the given origin. CORS headers designed to protect sources from access by other sites. If we try to run our application directly on the client (browser side), the browser will apply CORS policies to the domains you are trying to test and block those requests. 


Limiting the possible `Access-Control-Allow-Origin` values to a set of allowed origins requires code on the server side to check the value of the Origin request header, compare that to a list of allowed origins, and then if the Origin value is in the list, to set the Access-Control-Allow-Origin value to the same value as the Origin value.


A response that tells the browser to allow requesting code from the origin `https://proxy.max.workers.dev` to access a resource.



## Example

### **1. Proxy worker**

1. Open `https://proxy.max.workers.dev/script.js` url in your browser to fetch script file. 

```javascript

const link = "https://raw.githubusercontent.com/Halochkin/Cloudflare/master/StateManagement(TypingRacerApp)/demo/";
let contentType;

async function makeFetch(path) {
    return await fetch(link + path)
        .then(response => response.text())
        .then(data => data)
        .catch(error => console.error(error, " ", path + " blocked by brwoser"))
}

async function handleRequest(request) {
    try {
        const url = new URL(request.url);
        const path = url.pathname;
        const type = path.substr(path.lastIndexOf('.') + 1);
        if(type === "/")
         return new Response("My Error: File extension not defined");
     
        if (type === 'js')
          contentType = 'application/javascript' ;
        else
          contentType =  'text/' + type;

        let res = await makeFetch(path);
        console.log(res)
        return new Response(res, { status: 200, headers: { "Content-Type": contentType} });
    } catch (e) {
        return "404 Not found"
    }
}

addEventListener("fetch", e => {
    e.respondWith(handleRequest(e.request))
});
```

 1.1 HTML file with inline script 
```html
<html>
 <script>
  (async function(){
    document.body.innerText = await fetch("https://kv.max.workers.dev/data.json").then(response=> response.json()).then(data=> data);
  })();
 </script>
</html>
```

1.2 get value from kv using inline script.



**2. KV worker**
```javascript
async function handleRequest(request) {
  let headers = { "Access-Control-Allow-Origin": "https://proxy.maksgalochkin2.workers.dev" };
  const url = new URL(request.url);
  const path = url.pathname;
  const [ignore, key] = path.split('/');
  const type = path.substr(path.lastIndexOf('.') + 1);

  if (!key)
    return new Response("no action", { header: headers });

  if (request.method !== 'GET')
    return new Response('Not GET request');

  const value = await KV_STORE.get(key);
  if (value === null)
    return new Response("Value not found", { status: 404 });
  return new Response(value, { headers: { ...headers, 'content-type': 'application/' + type } });
}

addEventListener("fetch", e => {
  e.respondWith(handleRequest(e.request));
});
```

1. The server (that the POST request is sent to) needs to include the Access-Control-Allow-Headers header (etc) in its response. Putting them in your request from the client has no effect.

### What CORS headers must kv worker set on the outgoing response object for data.json?

content-type and access-control-allow-origin

4. do proxy.workers.dev need to set any headers on the response object for index.html?

  1. content-type 