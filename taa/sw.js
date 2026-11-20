/* T.A.A. — service worker : tout le site hors connexion, mises à jour automatiques (généré) */
const PAGES = 'taa-pages-202611202350';
const MEDIAS = 'taa-medias';
const LISTE_PAGES = ["./comment-ca-marche.html", "./devenir-membre.html", "./disciplines.html", "./divers.html", "./espace-membres.html", "./index.html", "./jeu.html", "./le-club.html", "./manifest.webmanifest", "./membres-accueil.html", "./membres.html", "./mentions-legales.html", "./nouvelles.html", "./reglement-interieur.html", "./reglementation.html", "./stands.html", "./style.css", "./taa.js", "./tirs-controle.html", "./ventes.html"];
const LISTE_MEDIAS = ["./docs/manuel-initiation-fftir.pdf", "./docs/reglement-interieur-2026.pdf", "./docs/tirs-controle-2026-2027.pdf", "./images/EcoleDeTir10m.avif", "./images/EcoleDeTir10m2.avif", "./images/V2601-01_1.avif", "./images/V2602-02_1.avif", "./images/V2604-03_1.avif", "./images/V2604-04_1.avif", "./images/V2604-04_2.avif", "./images/V2609-05_1.avif", "./images/app/apple-touch-icon.png", "./images/app/icon-192.png", "./images/app/icon-512.png", "./images/app/icon-maskable-512.png", "./images/bd-decouvrir.jpg", "./images/info-01.jpg", "./images/info-02.jpg", "./images/info-03.jpg", "./images/info-04.jpg", "./images/info-05.jpg", "./images/logo-taa.gif", "./images/membres/roy-van-mil.jpg", "./images/og-taa.jpg", "./images/roi-des-tirs.jpg", "./images/stand200m.avif", "./images/stand200m2.avif", "./images/stand25m.avif", "./images/stand25m2.avif", "./images/stand25m3.avif", "./images/stand25m4.avif", "./images/stand25m5.avif", "./images/stand25m6.avif", "./images/stand25m7.avif", "./images/stand25m8.avif", "./images/standBalltrap.avif", "./images/standPoudreNoir.avif", "./images/standPoudreNoir2.avif", "./images/standPoudreNoir3.avif", "./images/standPoudreNoir4.avif", "./images/yt/armes-expliquees.jpg", "./images/yt/deville.jpg", "./images/yt/dubourg.jpg", "./images/yt/fftir.jpg", "./images/yt/gauloiserie.jpg", "./images/yt/jeremy.jpg", "./images/yt/klaim.jpg", "./images/yt/lara.jpg", "./images/yt/morzak.jpg", "./images/yt/pasdetir.jpg", "./images/yt/pistolerie.jpg", "./images/yt/sauvage.jpg", "./images/yt/tirnational.jpg"];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const p = await caches.open(PAGES);
    await p.addAll(['./'].concat(LISTE_PAGES));
    const m = await caches.open(MEDIAS);
    for (const u of LISTE_MEDIAS) { if (!(await m.match(u))) { try { await m.add(u); } catch (err) {} } }
    self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== PAGES && n !== MEDIAS).map(n => caches.delete(n)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || !u.pathname.includes('/taa/')) return;
  const page = e.request.mode === 'navigate' || /\.(html|css|js|webmanifest)$/.test(u.pathname) || u.pathname.endsWith('/');
  if (page) {
    e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(PAGES).then(x => x.put(e.request, c)); return r; })
      .catch(async () => {
        let r = await caches.match(e.request, { ignoreSearch: true });
        if (!r && !/\.[a-z]+$/.test(u.pathname)) r = await caches.match(u.pathname.replace(/\/?$/, '') + '.html');
        return r || caches.match('./index.html');
      }));
  } else {
    e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request)));
  }
});
