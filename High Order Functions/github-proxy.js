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


function callSequenceCombinator(...originals) {
  const invocations = [];

  function readCallSequence() {
    return [...invocations];
  }

  const regulators = originals.map(original => {
    return function regulator(...args) {
      invocations.push(original.name);
      return original(...args);
    }
  });
  return [...regulators, readCallSequence];
}



const [request, response, callSequence ] = callSequenceCombinator(handleRequest, makeFetch);



async function handleRequest(request) {

  try {
    const url = new URL(request.url);
    const path = url.pathname;
    // if (path) {
    let res = await response(path);

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
  e.respondWith(request(e.request));
  console.log(callSequence)
});