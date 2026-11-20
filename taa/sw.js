/* T.A.A. — service worker : pages lisibles hors connexion, mises à jour automatiques */
const CACHE = 'taa-v2';
const BASE = ['./', './index.html', './style.css', './taa.js', './images/logo-taa.gif', './tirs-controle.html', './reglement-interieur.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE).map(n => caches.delete(n)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || !u.pathname.includes('/taa/')) return; // météo, compteurs… : réseau direct
  const page = e.request.mode === 'navigate' || /\.(html|css|js)$/.test(u.pathname) || u.pathname.endsWith('/');
  if (page) {
    // pages : réseau d'abord (toujours à jour), sinon la copie hors connexion
    e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('./index.html'))));
  } else {
    // images, PDF : cache d'abord
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(rr => { const c = rr.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return rr; })));
  }
});
