# HowTo: Github Auth with worker

## WhatIs: difference between Github and Google auth?

Github auth is similar to [Google auth](HowTo_GoogleAuth.md).
We create a Github App (similar to the Google App that accessed the Google+ API), which will give us a client ID and Client Secret we can use when the user authenticates with Github.

The differences between the two are:
1. Google returns the user info as a `id_token` together immediately with the `access_token`.

vs.

1. Github only returns an access token from the code callback, so you must go an extra roundtrip to the github user api in order to get the name and id of the github user.

2. Google returns the user info as a JWT token. This means that we must deconstruct the JSON data of the JWT in order to read the sub (user id) and first name and last name.
vs.
3. Github returns the user data as plain JSON. This means that we don't need to do much decoding of the user data in order to read user id and user name.

## Lifecycle

The authentication lifecycle the same as in [google auth](HowTo_GoogleAuth.md#lifecycle).

## Create and configure Github App

1. Sign in to your Github account.
2. Open **Settings** - **Developer setting**s and press **New GitHub App** button.
3. Confirm a password.
4. Set application name.
5. Set cloudflare worker link to **Homepage URL** input (for example `https://maxworker.maksgalochkin2.workers.dev`).
6. Specify the link that will be opened after successful authentication to **User authorization callback URL** (for example `https://maxworker.maksgalochkin2.workers.dev/callback`).
7. Deselect **Active** checkbox (this is used for logging purposes, but we don't need that because we can do this directly in the auth worker).
8. Press **Create GitHub App** button.
9. Press **Generate a new client secret** button.
10. Copy the **Client ID** and **client secret**.  

## Create worker (Cloudflare)

1. Open [Cloudflare dashboard] (https://dash.cloudflare.com/) and go to the **"Workers"** tab using the menu on the right side of the page.
2. Create a new worker.
3. Go to the **Settings** tab.
4. Inside **Environment Variables** field define next variables 
   * `GITHUB_CLIENTID` - Your _client ID_. 
   * `GITHUB_CLIENTSECRET` - Your _client Secret_.
   * `GITHUB_OAUTH_LINK: https://github.com/login/oauth/authorize` - to obtain user authorization, handle active session lookup, authenticates the user, and obtains user consent.
   * `GITHUB_REDIRECT https://github-auth.maksgalochkin2.workers.dev/callback/github` redirect url after successful authentication. 
   * `GITHUB_TOKEN	https://github.com/login/oauth/access_token` Github access token. 
   * `COUNTER_KEY=dvAV77q6uaIOSzE_cgq6Bs_q-vojyIglNLW8lWHtiGUuWM03mLCZnaWIqTtlWYhk` - `counterapi.xyz` key. Check [HowToatomicCounter](https://github.com/orstavik/cloudflare-tutorial/blob/main/docs/2_worker_tricks/HowTo_atomicCounter.md) for description.
   * `SECRET=klasjdfoqjpwoekfj!askdfj` - cypher key.
   * `SESSION_COOKIE_NAME=GOOGLE_SESSIONID` - name of the cookies which contains encrypted sessionSecret. 
   * `SESSION_ROOT=google-auth.maksgalochkin2` - worker root url.
   * `SESSION_TTL=2592000` - session time to live.
   * `STATE_PARAM_TTL=180` - state param time to live.
 Create new _KV_ and inside **KV Namespace Bindings** and define variable:
   * `KV_AUTH` - link to KV which uses as database.
   
## `handleRequest` function

Copy code from Google [`handleRequest()`](HowTo_GoogleAuth.md#handlerequest-function). Use `githubProcessTokenPackage()` instead of `googleProcessTokenPackage()`.

## Process Github Access Token
To get Github access token `githubProcessTokenPackage()` is used.

```javascript
async function githubProcessTokenPackage(code) {
 const accessTokenPackage = await fetchAccessToken(GITHUB_TOKEN, {                //[1]
        code,
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        redirect_uri: GITHUB_REDIRECT,
    });
  const tokenText = await accessTokenPackage.text();                              //[2]
  const x = {};
  data.split('&').map(pair => pair.split('=')).forEach(([k, v]) => x[k] = v);
  const accessToken = x['access_token'];                                          //[3]
  const user = await fetch('https://api.github.com/user', {                       //[4]
    headers: {
      'Authorization': 'token ' + accessToken,
      'User-Agent': 'maksgalochkin2',
      'Accept': 'application/vnd.github.v3.raw+json'
    }
  });
  const userData = await user.json();
  return ['gi' + userData.id, 'github.com/' + userData.login];                    //[5]
}
```
  1. POST request used to get JWT. The request must include the following parameters as body of request:
    * `code` The code param you received as a response.
    * `client_id` The client ID you received from GitHub for your GitHub App.
    * `client_secret` The client secret you received from GitHub for your GitHub App.
    * `redirect_uri` The URL in your application where users are sent after authorization.
    * `state` The unguessable random string.
  2. `text()` method takes a response stream and reads it to completion.  
  3. To get information about the user you should use the value of the `access_token` property. Since the object returned as a string, it is necessary to get its value by split.
  4. GET request to get a user.
  5. Return some userData properties.
 
## Reference
* [Github-auth demo](https://github-auth.maksgalochkin2.workers.dev/login/github)
* [Authorizing OAuth Apps](https://developer.github.com/apps/building-oauth-apps/authorizing-oauth-apps/)
