 # HowTo inline JavaScript

JS Inline is similar to [inline CSS](HowTo_inline_css.md). Use `linkToStyle()` from [inine CSS example](HowTo_inline_css.md#example)

The difference is in the use of additional element handlers : `InlineMutator` and `ScriptInliner`;

* `InlineMutator` as well as `LinkToStyle` sets the new value of the root folder when the `<base>` element received. The difference is that it does not create a new element (`<style>`), but edits an existing one by changing attributes and content. Obviously, the use of the `FILES` object used as a simple example. The `InlineMutator` gets a script using `fetch()` to demonstrate use with large scripts that are stored externally.
* `scriptInliner` adds the scripts to the <head> element top. As an example, the `window.serverData` property used.

```javascript
const HTML = `<html>
<head>
  <title>Inline js </title>
  <base target='_browser_ignore_target_attribute' href="../test2/">
  <link rel="stylesheet" href="test2.css">
  <script app-inline src="test.js"></script>
  <script>console.log('not inlined');</script>
</head>
<body>
<h1>hello sunshine</h1>
</body>
</html>`;

const FILES = {
    '/test/test.js': `console.log('testRed1', window.serverData?.username);`,
    '/test2/test.js': `console.log('testBlue2', window.serverData?.username);`,
    '/test/index.html': HTML
};

class ScriptInliner {
    constructor(data) {
        this.data = data;
    }

    async element(el) {
        const prependHeadAppendBody = el.tagName === 'head' ? 'prepend' : 'append';
        const script = `<script>window.serverData = ${JSON.stringify(this.data)}</script>`
        el[prependHeadAppendBody](script, { html: true });
    }
}

class InlineMutator {
    constructor(cookie, base) {
        this.cookie = cookie;
        this.firstBase = base;
    }

    async element(el) {
        if (el.tagName === 'base') {
            if (!this.secondBase)
                this.secondBase = new URL(el.getAttribute('href'), this.firstBase).href;
            return;
        }

        const src = el.getAttribute('src');
        el.removeAttribute('src');
        el.removeAttribute('app-inline');
        const path = new URL(src, this.secondBase || this.firstBase).pathname;
        const link = "https://raw.githubusercontent.com/orstavik/cloudflare-tutorial/main/docs/3_rawgit_tutorial/pureHtmlTest/" + path;
        const body = await fetch(link)
            .then(response => response.text())
            .then(data => {
               return data 
            })
            .catch(error => console.error(error))
        if (body)
            el.setInnerContent(body);
    }
}

async function handleRequest(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const body = FILES[path];
    const headers = { "content-type": 'text/' + path.substr(path.lastIndexOf('.') + 1) };
    if (!('text/' + path.substr(path.lastIndexOf('.') + 1) === 'text/html'))
        return new Response(body, { status: 200, headers });
    const linkToStyle = new LinkToStyle(url);                                                                
    const inlineMutator = new InlineMutator('Mr. Sunshine', url);                                                  //[1]
    const scriptInliner = new ScriptInliner({ username: 'Mr. Sunshiny Day' });                                     //[2]
    return new HTMLRewriter()
        .on('base[href]', linkToStyle)
        .on('script[app-inline]', inlineMutator)
        .on('head', scriptInliner)
        .transform(new Response(body, { status: 200, headers }));
}

addEventListener("fetch", e => e.respondWith(handleRequest(e.request)));
```

# Reference 

* [MDN: fetch()](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)