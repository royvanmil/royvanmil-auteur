// Service worker de l'appli Roy Van Mil — ne touche que /app/
const V = 'rvm-app-202611201806';
const FICHIERS = ['/app/', '/app/index.html', '/app/manifest.webmanifest',
  '/app/img/logo.png', '/app/img/icon-192.png', '/app/img/icon-512.png',
  '/app/img/maison.jpg', '/app/img/deux.jpg', '/app/img/trois.jpg', '/app/img/quatre.jpg', '/app/img/cloche.jpg'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(FICHIERS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n.startsWith('rvm-app-') && n !== V).map(n => caches.delete(n)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || !u.pathname.startsWith('/app')) return;
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(V).then(x => x.put('/app/index.html', c)); return r; })
      .catch(() => caches.match('/app/index.html')));
    return;
  }
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
