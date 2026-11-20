/* T.A.A. — en-tête, menu ☰, pied de page et visionneuse photos (communs à toutes les pages) */
(function () {
  var pages = [
    ['index.html', 'Accueil'],
    ['nouvelles.html', 'Nouvelles'],
    ['stands.html', 'Les stands'],
    ['disciplines.html', 'Disciplines & compétitions'],
    ['le-club.html', 'Le club'],
    ['devenir-membre.html', 'Devenir membre'],
    ['reglementation.html', 'Armes & démarches'],
    ['divers.html', 'Divers'],
    ['jeu.html', 'Teste ta précision']
  ];
  // Cloudflare enlève le « .html » des adresses (/taa/stands au lieu de /taa/stands.html) : on le remet
  var ici = location.pathname.split('/').pop() || 'index.html';
  if (ici.indexOf('.') === -1) ici += '.html';

  var liens = pages.map(function (p) {
    return '<a href="' + p[0] + '"' + (p[0] === ici ? ' class="actif"' : '') + '>' + p[1] + '</a>';
  }).join('');

  var entete =
    '<header class="entete"><div class="entete-in">' +
      '<a class="marque" href="index.html"><img src="images/logo-taa.gif" alt="Logo T.A.A.">' +
      '<span><b>T.A.A.</b><small>Tireurs et Arquebusiers de l\'Armagnac</small></span></a>' +
      '<button class="burger" aria-label="Menu"><span></span><span></span><span></span></button>' +
    '</div></header>' +
    '<div class="voile"></div>' +
    '<nav class="menu"><button class="fermer" aria-label="Fermer">×</button>' + liens +
      '<a class="membres" href="espace-membres.html">🔒 Espace membres</a></nav>';

  document.body.insertAdjacentHTML('afterbegin', entete);
  document.body.insertAdjacentHTML('beforeend',
    '<footer class="pied">Tireurs et Arquebusiers de l\'Armagnac — Eauze / Bascous (Gers)<br>' +
    'Site de démonstration · réalisé par Roy VAN MIL · <a href="mentions-legales.html">Mentions légales</a></footer>');


  /* Compteur de visites (même Worker que royvanmil.fr) */
  var CLES = {'index.html':'taa-accueil','stands.html':'taa-stands','devenir-membre.html':'taa-devenir-membre',
    'reglementation.html':'taa-armes-demarches','divers.html':'taa-divers','comment-ca-marche.html':'taa-comment',
    'espace-membres.html':'taa-espace-membres','membres-accueil.html':'taa-membres-accueil','tirs-controle.html':'taa-tirs-controle',
    'membres.html':'taa-qui-est-qui','reglement-interieur.html':'taa-reglement','ventes.html':'taa-ventes',
    'le-club.html':'taa-club','disciplines.html':'taa-disciplines','nouvelles.html':'taa-nouvelles','mentions-legales.html':'taa-mentions','jeu.html':'taa-jeu'};
  var cle = CLES[ici];
  if (cle) {
    var url = 'https://compteurs.royvanmil86.workers.dev/compte?c=' + cle;
    try { if (!(navigator.sendBeacon && navigator.sendBeacon(url))) fetch(url, {mode:'cors', keepalive:true}); } catch (e) {}
  }

  /* Appli (PWA) */
  if ('serviceWorker' in navigator) { try { navigator.serviceWorker.register('sw.js'); } catch (e) {} }

  /* Bandeau de bienvenue, seulement dans l'appli installée */
  var dansAppli = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  var vu = false; try { vu = localStorage.getItem('taa-bienvenue') === '1'; } catch (e) {}
  if (dansAppli && !vu) {
    document.querySelector('.entete').insertAdjacentHTML('afterend',
      '<div class="bienvenue-appli"><div><b>📱 Bienvenue dans l\'application mobile du T.A.A. !</b><br>' +
      'Tout le site est disponible, même hors connexion. L\'application se met à jour automatiquement.</div>' +
      '<button aria-label="Fermer">×</button></div>');
    document.querySelector('.bienvenue-appli button').onclick = function () {
      try { localStorage.setItem('taa-bienvenue', '1'); } catch (e) {}
      this.parentNode.remove();
    };
  }

  function ouvrir() { document.body.classList.add('menu-ouvert'); }
  function fermer() { document.body.classList.remove('menu-ouvert'); }
  document.querySelector('.burger').onclick = ouvrir;
  document.querySelector('.menu .fermer').onclick = fermer;
  document.querySelector('.voile').onclick = fermer;

  /* Visionneuse photos */
  var imgs = [].slice.call(document.querySelectorAll('.photos img, .zoom img'));
  if (!imgs.length) return;
  document.body.insertAdjacentHTML('beforeend',
    '<div class="visio"><button class="x">×</button><button class="g">❮</button>' +
    '<img alt=""><button class="d">❯</button></div>');
  var v = document.querySelector('.visio'), vi = v.querySelector('img'), groupe = [], n = 0;
  function montrer() { vi.src = groupe[n].src; vi.alt = groupe[n].alt; }
  imgs.forEach(function (im) {
    im.onclick = function () {
      var g = im.closest('.photos'); groupe = g ? [].slice.call(g.querySelectorAll('img')) : [im];
      n = groupe.indexOf(im); montrer(); v.classList.add('ouvert');
    };
  });
  function pas(k) { n = (n + k + groupe.length) % groupe.length; montrer(); }
  v.querySelector('.x').onclick = function () { v.classList.remove('ouvert'); };
  v.querySelector('.g').onclick = function () { pas(-1); };
  v.querySelector('.d').onclick = function () { pas(1); };
  v.onclick = function (e) { if (e.target === v) v.classList.remove('ouvert'); };
  document.addEventListener('keydown', function (e) {
    if (!v.classList.contains('ouvert')) return;
    if (e.key === 'Escape') v.classList.remove('ouvert');
    if (e.key === 'ArrowLeft') pas(-1);
    if (e.key === 'ArrowRight') pas(1);
  });
})();
