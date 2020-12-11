#  WhatIs: cookie


HTTP cookie provide the server with a mechanism for storing and receiving status information in the client application system. This mechanism allows web applications to store information about selected elements, user preferences, registration information and keeping a user in the same place on a web page if they lose their Internet connection, or to store simple site display settings.

A cookie is a key-value data pair that is stored in the user's browser until a certain period expires. The browser will store this information and pass it to the server with each request as part of the HTTP header. In technical terms, cookies are small text files.  

There are a number of limitations to consider when using cookies. There are no strict limitations on their size and number.
 RFC 6265 sets only requirements for the web browser: it must store from 50 cookie values per domain with the size of each, along with attributes from 4096 bytes. The browser may well store more values, but it is safer to keep within guaranteed limits. When creating an application, you should take into account scenarios of unexpected deletion, any modification or addition of new cookie values: the data coming into cookies is not at all safer than data from web forms.

A session is created on the server, and cookies are stored on the user's computer. The HTTP protocol cannot determine the connection between two requests from the same user. 
The session identifier is automatically saved in the user's browser as a cookie, and if the browser does not support cookies, the identifier is automatically added to the page address and all the links on it. This means that when updating a page, the browser itself will send a session identifier to the server, regardless of the user's actions.
 
## `Set-Cookie` HTTP response header

 The Set-Cookie HTTP response header is used to send cookies from the server to the user agent.
 When the user agent receives a `Set-Cookie` header, the user agent stores the cookie together with its attributes.  Subsequently, when the user agent makes an HTTP request, the user agent includes the applicable, non-expired cookies in the Cookie header. If the user agent receives a new cookie with the same cookie-name, domain-value, and path-value as a cookie that it has already stored, the existing cookie is evicted and replaced with the new cookie. Notice that servers can delete cookies by sending the user agent.


## `Set-Cookie` header attributes.

> Cookies have a number of settings, many of which are important and must be set. These settings specified after the `key=value` pair and are separated by a `;`.

 Attributes are set by the server to control the processing of cookies on the client. They are all optional and have default values:
 
 - `expires` - date and time of expiration. By default, cookies are valid until the web browser session ends;
 - `max-age` - lifetime of cookie in seconds. If specified, it overrides the expires value;
 - `domain` - limits the scope of cookie validity to the specified domain and all its subdomains;
 - `path`  - is a path that limits the scope of the cookie. `It consists of directory components, separated by the symbol /`. A cookie is included in requests whose URI starts with the corresponding path components. If no attribute is set, the path is taken from the request URI.
 - `secure` - the flag set in Secure allows the transfer of cookies only through a secure channel. In particular, if the flag is set, the cookie will not be transmitted `over HTTP, but will be over HTTPS`. By default, the flag is not set.
 - `httponly` - the flag set in HttpOnly, limits the scope of cookie use only within the HTTP protocol. If this flag is enabled, it will not be possible to access cookies from JavaScript through the browser API. This flag is not set by default.

 > Session cookies removed when the client shuts down. Cookies are session cookies if they don't specify the `Expires` or `Max-Age` attributes.

## remember me vs forget me
 
#### remember me
To prevent the user from having to enter his password every day (after the session ends), it is customary to remember that he is authorized in a cookie.

Usually, cookies set for a certain period (for example, a month) or permanently. In the second case, the user will be logged in (i.e. he will be able to log in without entering his password) until he clicks the 'Logout' link or accesses the site from another browser.

How can this be implemented correctly? The principle is as follows: a random string should be written into the user's cookie and simultaneously into the database.
- The first thing we do when entering the site is to check if the session is running. If it is running, the user is authorized. If it is not, then we look at the cookie and look there for a note about authorization.
 - If a cookie is marked, then we shall search the database for a user with such login and check whether a random string from the cookie matches a random string from the database for that user.
- If it matches, we shall authorize it, i.e. start the session (the same procedure as for login and password authentication).
- If there is no match, we shall show him the authorization form.
- When authorising by login and password, we shall write a random line to the user in a cookie and a database. This shall be done only if the user has ticked the 'Remember me' box. Why? Because the user may not be at his computer and therefore does not want another person after him to be able to log in under his cookie login (i.e. without entering the password!).
Therefore it is always worth giving the user a choice - he wants his browser to remember him in a cookie or not.

#### forget me
In order to automatically log out a user, after he closes the tab, you need to set the expiration date to a certain date in the past or not to determine it at all.  If a cookie has neither the `Max-Age` nor the Expires attribute, the user agent will retain the cookie until "the current session is over" (as defined by the user agent).


### References 

* [Sessions and Cookies](https://auth0.com/docs/sessions-and-cookies)
* [MDN: Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
* [RFC 6265](https://tools.ietf.org/html/rfc6265#section-4.1)
* [Blog: "Just how many web users really disable cookies or JavaScript?"](https://blog.yell.com/2016/04/just-many-web-users-disable-cookies-javascript/)
