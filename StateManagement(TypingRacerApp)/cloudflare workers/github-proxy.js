// const link = "https://raw.githubusercontent.com/Halochkin/Cloudflare/master/testApp";
// //todo add as global variable
//
// async function makeFetch(path) {
//   return await fetch(link + path)
//     .then(response => response.text())
//     .then(data => {
//       return data
//     })
//     .catch(error => console.error(error))
// }
//
// async function handleRequest(request) {
//   try {
//     const url = new URL(request.url);
//     const path = url.pathname;
//     return await makeFetch(path);
//   }catch (e) {
//     return "404 Not found"
//   }
// }
//
// addEventListener("fetch", e => {
//   return handleRequest(e.request);
// });


const link = "https://raw.githubusercontent.com/Halochkin/Cloudflare/master/testApp";


async function makeFetch(url) {
  return await fetch(url)
    .then(response => response.text())
    .then(data => {
      return data;
    })
    .catch(error => console.error(error))
}


function LinkMutator(el) {
  const src = el.getAttribute('href');
  el.removeAttribute('href');
  el.setAttribute('href', src);
  document.head.appendChild(el);

}

function InlineMutator(el) {
  const src = el.getAttribute('src');
  el.removeAttribute('src');
  const path = src.slice(2, src.length);
  el.setAttribute('src', link + path);
}

async function LinkToStyle(el) {
  const href = el.getAttribute('href');

  const body = await makeFetch(link + href.slice(2, href.length))
    .then(response => response)
    .catch(error => console.error(error))
  if (body) {
    const styleElement = document.createElement("style");
    styleElement.textContent = body;
    document.head.appendChild(styleElement);
  }
}


(async () => {
  const path = window.location.pathname;
  let body = await makeFetch(githubProxy + path);
  const element = document.createElement("div");
  element.innerHTML = body;
  let allItems = Array.from(element.children);

  let res = [];

  for (let item of allItems) {

    let tagName = item.tagName;

    if (tagName === "LINK" && item.getAttribute("rel") === "stylesheet")
      await LinkToStyle(item)



    if (tagName === "SCRIPT")
      document.head.appendChild(item);


    if (item.tagName === "IMG" && item.classList.contains("auth-logo"))
      InlineMutator(item)

    document.body.appendChild(item)


  }

  // document.body.appendChild(element);


})();