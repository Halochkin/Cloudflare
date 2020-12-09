### HowTo: Error status code

HTTP status code - part of the first line of the server response for requests over the HTTP protocol.  Initially, the HTTP status code invented as a web server status code.

Every time you click on a link or enter a URL in the address bar, you send a request to the server. It processes it and generates a response where the initial part shows the server status code.

The first three digits and the phrase in English give the user (browser), the crawler and the search robot an idea of how the site responded to a request for a certain page or document. For example, the response code of page 200 OK speaks for itself: "Everything is OK, you have addressed to the right address".

All response codes divided into 5 classes and are distinguished by their first digit:


* `1xx` - Browser request accepted and processed.
* `2xx` - successful request processing by the server. 
* `3xx` - indicates the request redirected from one address to another. 
* `4xx` - Error on the user side.
* `5xx` - Server side error.
 
When creating a server, the developer determines the response code of each respondent himself. 
```javascript
...
if(requestedData)
 return new Response (JSON.stringify(requestedData), { status: 200, ...})
else 
 return new Response("Error", {status: 404,...})
```

The disadvantage of this approach is that the explaining error phrase does not always accurately describe the problem, and the developer should apply the closest possible status code. An alternative solution instead of using different HTTP response statuses for different errors, you can always give the status 200 and the real status code as part of the JSON response:

```text
HTTP/1.1 200 OK

Content-Type: application/json; charset=UTF-8

{
    "success": false,
    "data": {
        "name": "Not Found Exception",
        "message": "The requested resource was not found.",
        "code": 0,
        "status": 404
    }
}

or


{
  "error": {
    "message": "(#803) Some of the aliases you requested do not found: 5asdsad", 
    "type": "OAuthException", 
    "code": 404
  }
}


```


## Status 200

 
 
 
 **Benefist**

1. **Typemustmatch:** can leak status code and content-type to third-party scripts. //todo: research this more
2. **Simplicity.** One level is per def simpler than two levels. Produces much clearer code, both server side and browser side. User only need to check message body, and dont worry that browser or other client stuff will react strange on different headers that are not 200.
3. **Status code = documentation code = confusion.** Everybody agrees that people often confuse 403 with 404 f.ex., and that this doesn't matter much as long as it is in the 400 range. But people also use 200 and 404 differently. And this ruffles some featers. The point here is that the status code functions as documentation shortcuts, but these shortcuts are used differently by different people. And this confusion might be more problematic than knowing you don't know to begin with. If you think an error in a server must be presented as a 4xx code, and then it is a 2xx code, then that might make you look elsewhere for hours, instead of looking inside the request you thought was wrong in the beginning. The answer is, you can't rely on shortcut documentation. You make your interface intuitive and you document it individually. Always. 
4. Some internet devices (some firewalls and corporate proxies, for example) intercept HTTP 4xx and 5xx and prevent the response from being returned to the viewer. If you substitute 200, the response typically won't be intercepted.
5. You might want to return a 200 status code (OK) and static website so your customers don't know that your website is down.
 
 **Faults**
 
 * Status 200 without JSON error message is uninformative. The web server has worked, but how - you do not know. Looked into the body of the response, there is json with the status OK - that means everything is fine, status error - something went wrong, maybe the parameters are invalid there. 
 
 
 
 

//todo 
Ok. The point here is that the browser Firefox will react differently to an object that is loaded using typemustmatch attribute on object element that tries to load from a different site. And so, if you post something other than 200 all the time, then a different page/script will be able to detect if you are logged in. In Firefox.
This is leak of sensitive user info. With this insight any page can find out if there exists a valid cookie on the computer, and you don't want that.
Also. The http status codes is not really relevant. From js, you expect a result (which might be null/false), or the fetch function to throw an error. You don't really expect a result, then check if that result is not really null/error, and then search for the value of this error in an antiquated number system.
So, returning 200 always is better. And expect that the result might be null/error msg.
If you don't send a cookie to this api, you can do 200+404, but sending out info about what type of error is naive and unnecessary in terms of security.
If there is a cookie, then to avoid leaking info about such cookies existence, always return 200. Else, if there is no cookie, you can choose always 200 or 200+404.
Too many people have been given a hammer and a box of screws, and cannot understand that they should not use the screws, only the nails that they have in their other hand.



## Refence

* [HTTP response status codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
