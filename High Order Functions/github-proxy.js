const link = "https://raw.githubusercontent.com/Halochkin/Cloudflare/master/StateManagement(TypingRacerApp)";
//todo add as global variable
let contentType;

function getCookieValue(cookie, key) {
  return cookie ?.match(`(^|;)\\s*${key}\\s*=\\s*([^;]+)`) ?.pop();
}

async function makeFetch(path) {
  return await fetch(link + path)
    .then(response => response.text())
    .then(data => data)
    .catch(error => console.error(error, " ", path + " blocked by brwoser"))
}

function memoize(original) {
  const cache = {};
  const error = {};
  return function memoized(...args) { //how to await efficiently?
    const key = JSON.stringify(args);
    if (cache[key])
      return cache[key];
    if (error[key])
      throw error[key];
    try {
      // debugger
      const res = original(...args);
      return cache[key] = res;
    } catch (err) {
      throw error[key] = err;
    }
  }
}


async function handleRequest(request) {

  try {
    const url = new URL(request.url);
    const path = url.pathname;
    // if (path) {

    const efficientGet = memoize(makeFetch);

    let res = await memoize(path);  //todo: clarify this

    const type = path.substr(path.lastIndexOf('.') + 1);
    //if .css/.img etc
    if (type === 'js')
      contentType = 'application/javascript';
    else
      contentType = 'text/' + type;

    if (type === "/")
      contentType = 'text/html';

    return new Response(res, { status: 200, headers: { "Content-Type": contentType } }); //'Referrer-Policy': 'unsafe-url',
  } catch (e) {
    return "404 Not found"
  }
}




addEventListener("fetch", e => {
  e.respondWith(handleRequest(e.request))
});