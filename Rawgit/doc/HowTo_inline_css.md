# HowTo: inline css

Cloudflare workers allow you to generate CSS code by converting a string value that can be obtained from different sources, such as fetch request, or a regular string. Let's consider an example where the folder structure imitated. The subject of the imitation is an object whose properties match the relative path of files, and the values match the content of files. 

 >A relative path is a path relative to the current working directory of the user. The address contains neither protocol nor domain name, and starts with `/` sign that points to the root folder. To go to the directory above, use `../file.html` below - `/folder/file.html`.
>
# Example
Let's look at an example

1. HTML template which:
   * Uses `<link>` element refer to `test.css` file located in the same folder specifying the file name as the value of the href attribute. Obviously a red color will be applied to the `<h1>` element. 
   * Uses `<base>` element that defines a folder to which new relative path will be applied. From this it is clear - all the following files will refer to the `test2` folder even though `index.html` is in the `test` folder. But such logic will only be applied to the following elements. 
   * Uses `<link>` element to refer `test2.css` file, which is located in the folder `test2`. A `lightblue` background color will be applied to the `<h1>` element.

2.  Let us assume that we have two folders: `test` and `test2`. Both are in the same root folder. Inside both folders are 2 `.css` files: `test.css` and `test2.css`. Css files define the opposite `color` and `background` properties of the text. Inside the `test` folder is an additional `index.html` which contain HTML template from a previous step. Properties and values of the `FILES` object match the structure and content of each file.

3. Get `url.path` from after `fetch` event, and use its value to select "file content" from the `FILES` object.

4. If a non-html file requested, its content will be presented with the corresponding value `content-type'.

## HowTo: HTMLRewriter 

5. An element handler responds to any incoming element, when attached using the .on function of an `HTMLRewriter` instance. The element handler respond to `element(el)` when `.on(element, Element Handler)` is called. It allows:
   * Implement the default logic for the `<base>` element. The server does not allow to implement the `<base>` element default action.  The `LinkToStyle` class used to define a new relative path to the file.    
   * Select a relative .css document and add its value inside the `<style>` tag. That is, convert it to HTML format.
6. The `HTMLRewriter` class allows build comprehensive and expressive HTML parsers inside of a Cloudflare Workers application. It allows to use CSS selectors to create a sample of elements that call the element handler for each element to be passed. After searching for each element of the sample, the result is new Response containing the processed elements. 

```javascript
const HTML = `<html>                                               <!--[2]-->                                 
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
  '/test/test.css': `h1 { color: red; }`,                         //[1]
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
    if(body)
      el.replace(`<style>${body}</style>`, {html: true});
  }
}

async function handleRequest(request) {                                              //[3]
  const url = new URL(request.url);
  const path = url.pathname;
  const body = FILES[path];
  if (!body)
    return new Response("404 Not Found")
  const headers = {"content-type": 'text/' + path.substr(path.lastIndexOf('.') + 1)};

  if (!('text/' + path.substr(path.lastIndexOf('.') + 1) === 'text/html'))         //[4]
    return new Response(body, {status: 200, headers});  
  
  const linkToStyle = new LinkToStyle(url);                                        //[5]
  return new HTMLRewriter()                                                        //[6]
    .on('link[href][rel="stylesheet"]', linkToStyle)
    .on('base[href]', linkToStyle)
    .transform(new Response(body, {status: 200, headers}));
}

addEventListener("fetch", e => e.respondWith(handleRequest(e.request)));
```

# Reference
* [Live demo](https://rawgit-inline-css.maksgalochkin2.workers.dev/test/index.html)
* [HTMLRewriter](https://developers.cloudflare.com/workers/runtime-apis/html-rewriter)