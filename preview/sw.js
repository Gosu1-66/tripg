// TripG 離線快取：同網站的檔案先上網拿最新版，沒網路就用上次存下來的。
// 快取名稱依網址分開（預覽版、正式版各用各的），清舊快取時只清自己的，不會刪到另一個版本。
const SCOPE = new URL(self.registration.scope).pathname;           // 例如 /tripg/preview/
const PREFIX = 'tripg:' + SCOPE + ':';
const C = PREFIX + 'v2';
const CORE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(C).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => (k.startsWith(PREFIX) && k !== C) || k === 'tripg-v1').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin !== location.origin || !u.pathname.startsWith(SCOPE)) return;
  // 只快取 App 本身的檔案和分享行程，不會無限制地存
  const keep = req.mode === 'navigate' || /\/(index\.html|manifest\.json|icon-\d+\.png)$/.test(u.pathname) || u.pathname.startsWith(SCOPE + 'shared/');
  e.respondWith(fetch(req).then(r => { if (r.ok && keep) { const cp = r.clone(); caches.open(C).then(c => c.put(req, cp)); } return r; })
    .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
});
