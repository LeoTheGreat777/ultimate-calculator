// Ultimate Calculator's service worker: keeps a copy of the app on the device so it opens without internet.
//
// The page (index.html) comes from the network first, so a new version shows up on the next load as before; the saved
// copy is used only when offline, or when the network takes longer than TIMEOUT. Scripts and styles carry ?v=VERSION,
// so each version has its own addresses and a saved file never goes stale: they come from the saved copy first.
// Every fresh page saves the files it uses and deletes those of older versions. Other files (icons, manifest) come from
// the saved copy and are refreshed in the background.
// Cloudflare's human check (calc.kampaxis.com): when its cookie has run out, Cloudflare answers the page with its check
// page (403, header cf-mitigated) instead of the app. That page is shown, not the saved copy (which would be an older
// version, and Ctrl+Shift+R was the only way past it); once the check passes, the new version loads. Cloudflare's own
// files (/cdn-cgi/) are never saved.
// Registered by main.js. Nothing here to update when the version changes. It works the same on the deployed site, where
// tools/build.mjs has joined the scripts into one js/app.js: it saves whatever files the page links to.
const SCOPE = new URL(self.registration.scope);
// One saved copy per address: the app at / and the test version at /preview/ (the preview branch) keep their own.
const CACHE = 'uc-app' + (SCOPE.pathname === '/' ? '' : SCOPE.pathname);
const TIMEOUT = 3000;
const VERSIONED = /[?&]v=/;

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(fetch(SCOPE.href, {cache: 'no-cache'}).then(r => r.ok && saveVersion(r, true)).catch(() => {}));
});

self.addEventListener('activate', event => {
  // Caches from older service workers are removed; this one takes over open pages straight away.
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(key => key !== CACHE && !key.startsWith('uc-app/')).map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || request.cache === 'no-store') return;  // no-store: the app's version check (main.js)
  const url = new URL(request.url);
  if (url.origin !== SCOPE.origin || !url.pathname.startsWith(SCOPE.pathname)) return;
  if (SCOPE.pathname === '/' && url.pathname.startsWith('/preview/')) return;  // the test version has its own
  if (url.pathname.startsWith('/cdn-cgi/')) return;  // Cloudflare's check and its scripts
  const isPage = request.mode === 'navigate' && (url.pathname === SCOPE.pathname || url.pathname === SCOPE.pathname + 'index.html');
  event.respondWith(isPage ? page(event) : file(event));
});

async function page(event) {
  const cache = await caches.open(CACHE);
  const saved = await cache.match(SCOPE.href);
  const network = fetch(event.request.url, {cache: 'no-cache'}).then(plain);
  if (!saved) {
    const response = await network;  // first visit: nothing saved yet, so behave like a normal page load
    if (response.ok) event.waitUntil(saveVersion(response.clone(), true));
    return response;
  }
  const fresh = network.then(r => (r.ok || cloudflareCheck(r) ? r : null), () => null);
  let timer;
  const tooSlow = new Promise(resolve => { timer = setTimeout(() => resolve(null), TIMEOUT); });
  const response = await Promise.race([fresh, tooSlow]);
  clearTimeout(timer);
  if (response) {
    if (response.ok) event.waitUntil(saveVersion(response.clone(), true));
    return response;
  }
  // Offline or slow: open the saved copy. If the network answers later, save that version for next time, but keep
  // the files of the saved one, which this page is about to load.
  event.waitUntil(fresh.then(r => r && r.ok && saveVersion(r, false)));
  return saved;
}

async function file(event) {
  const cache = await caches.open(CACHE);
  const saved = await cache.match(event.request);
  const download = () => fetch(event.request).then(r => {
    if (r.ok && r.type === 'basic') cache.put(event.request, r.clone()).catch(() => {});
    return r;
  });
  if (!saved) return download();
  if (!VERSIONED.test(event.request.url)) event.waitUntil(download().catch(() => {}));
  return saved;
}

// Saves the page and every file it uses; with prune, also deletes the files of other versions.
async function saveVersion(response, prune) {
  const html = await response.clone().text();
  const files = [...html.matchAll(/(?:src|href)="([^"#:]+)"/g)].map(m => new URL(m[1].replace(/&amp;/g, '&'), SCOPE).href);
  const cache = await caches.open(CACHE);
  await cache.put(SCOPE.href, response);
  await Promise.all(files.map(async url => {
    if (await cache.match(url)) return;
    try {
      const r = await fetch(url, {cache: 'no-cache'});
      if (r.ok) await cache.put(url, r);
    } catch {}
  }));
  if (!prune) return;
  const keep = new Set(files);
  for (const request of await cache.keys()) {
    if (VERSIONED.test(request.url) && !keep.has(request.url)) await cache.delete(request);
  }
}

// Cloudflare's human check instead of the page (its cookie ran out): the browser has to show it.
function cloudflareCheck(response) {
  return response.headers.has('cf-mitigated');
}

// A page that arrived through a redirect can't be handed to the browser as is; copy it into a plain response.
function plain(response) {
  if (!response.redirected) return response;
  return response.blob().then(body => new Response(body, {status: response.status, statusText: response.statusText, headers: response.headers}));
}
