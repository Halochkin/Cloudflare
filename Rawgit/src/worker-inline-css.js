

const HTML = `<html>                                                                               
<head>
  <title>Inline CSS</title>
  <link rel="stylesheet" href="test.css">         
  <base target='_browser_ignore_target_attribute' href="../test2/">   
  <link rel="stylesheet" href="test2.css">       
</head>
<body>
<h1>hello sunshine</h1>
</body>
</html>`;

const FILES = {
  '/test/test.css': `h1 { color: red; }`,
  '/test/test2.css': `h1 { background: pink; }`,

  '/test2/test.css': `h1 { color: blue; }`,
  '/test2/test2.css': `h1 { background: lightblue; }`,

  '/test/index.html': HTML
};



class LinkToStyle {

  constructor(location) {
    this.firstBase = location.href;
    this.secondBase = undefined;
  }

  async element(el) {
    //update base
    if (el.tagName === 'base') {
      if (!this.secondBase)
        this.secondBase = new URL(el.getAttribute('href'), this.firstBase).href;
      return;
    }

    const href = el.getAttribute('href');
    const url = new URL(href, this.secondBase || this.firstBase);
    const body = FILES[url.pathname];
    if (body)
      el.replace(`<style>${body}</style>`, { html: true });
  }
}

async function handleRequest(request) {                                              //[3]
  const url = new URL(request.url);
  const path = url.pathname;
  const body = FILES[path];
  if (!body)
    return new Response("404 Not Found")
  const headers = { "content-type": 'text/' + path.substr(path.lastIndexOf('.') + 1) };

  if (!('text/' + path.substr(path.lastIndexOf('.') + 1) === 'text/html'))         //[4]
    return new Response(body, { status: 200, headers });

  const linkToStyle = new LinkToStyle(url);                                        //[5]
  return new HTMLRewriter()                                                        //[6]
    .on('link[href][rel="stylesheet"]', linkToStyle)
    .on('base[href]', linkToStyle)
    .transform(new Response(body, { status: 200, headers }));
}

addEventListener("fetch", e => e.respondWith(handleRequest(e.request)));