# HowTo: delete cookie

Just set the cookie on exactly the same name, path and domain, but with an `Expires` or `Max-Age` value in the past.  The server will be successful in removing the cookie only if the `Path` and the `Domain` attribute in the `Set-Cookie` header match the values used when the cookie added. Setting on exactly the same path is important. Many starters fail in this by using only the same name and domain and relying on the current request URL for the default path.

```javascript
        const myDomain = 'https://my-domain.workers.dev'
        //add cookie
        return new Response("cookie added", {
            status: 201,
            headers: {
                'Set-Cookie': `myCookie=helloSunshine; Secure; HttpOnly; SameSite=Strict; Path=/; Domain=${myDomain}; Max-Age=${60*1};`
            }
        });
        // delete cookie with the same path and domain attribute values
        return new Response("cookie deleted", {
            status: 201,
            headers: {
                'Set-Cookie': `myCookie=undefined; Secure; HttpOnly; SameSite=Strict; Path=/; Domain=${myDomain}; Max-Age=-1;`
            }
        });
```