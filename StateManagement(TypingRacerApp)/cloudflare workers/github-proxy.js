const link = "https://raw.githubusercontent.com/Halochkin/Cloudflare/master/StateManagement(TypingRacerApp)";
//todo add as global variable
let contentType;

async function makeFetch(path) {
  return await fetch(link + path)
    .then(response => response.text())
    .then(data => data)
    .catch(error => console.error(error))
}

async function handleRequest(request) {

  try {
    const url = new URL(request.url);
    const path = url.pathname;
    let res = await makeFetch(path);

    const type = path.substr(path.lastIndexOf('.') + 1);
    //if .css/.img etc
    if (type === 'js')
      contentType = 'application/javascript' ;
    else
      contentType =  'text/' + type;

    if(type === "/")
      contentType = 'text/html' ;


    return new Response(res, { status: 200, headers: { "Content-Type": contentType, "Access-Control-Allow-Origin": "https://github-proxy.maksgalochkin2.workers.dev/" } }); //'Referrer-Policy': 'unsafe-url',
  } catch (e) {
    return "404 Not found"
  }
}




addEventListener("fetch", e => {
  e.respondWith(handleRequest(e.request))
});