/* T.A.A. — en-tête, menu ☰, pied de page et visionneuse photos (communs à toutes les pages) */
(function () {
  var pages = [
    ['index.html', 'Accueil'],
    ['stands.html', 'Les stands'],
    ['devenir-membre.html', 'Devenir membre'],
    ['reglementation.html', 'Armes & démarches'],
    ['divers.html', 'Divers']
  ];
  var ici = location.pathname.split('/').pop() || 'index.html';

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
    'Site de démonstration · réalisé par Roy VAN MIL</footer>');

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
