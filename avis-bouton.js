/* ============================================================
   Bouton flottant « Avis » — royvanmil.fr
   Se pose en bas à droite de chaque page où ce fichier est inclus.
   Affiche la note moyenne des avis publiés (rien tant qu'il n'y en a pas).
   ============================================================ */
(function () {
  var API = "https://compteurs.royvanmil86.workers.dev";
  var LIEN = "temoignages.html";

  // 1) styles
  var css = document.createElement("style");
  css.textContent =
    ".avis-flottant{position:fixed;bottom:20px;right:20px;z-index:9999;" +
      "display:inline-flex;flex-direction:column;align-items:center;justify-content:center;" +
      "width:78px;height:78px;border-radius:50%;text-decoration:none;" +
      "background:linear-gradient(180deg,#f2b544 0%,#dfa02a 100%);" +
      "color:#2b1d10;border:1px solid #f0c86f;" +
      "box-shadow:0 8px 20px rgba(242,181,68,.28),inset 0 1px 0 rgba(255,255,255,.3);" +
      "font-family:'EB Garamond',Georgia,serif;transition:transform .2s,box-shadow .2s;}" +
    ".avis-flottant:hover{transform:scale(1.06);" +
      "box-shadow:0 12px 26px rgba(242,181,68,.36),inset 0 1px 0 rgba(255,255,255,.34);}" +
    ".avis-flottant .mot{font-weight:700;font-size:.95rem;letter-spacing:.03em;line-height:1;}" +
    ".avis-flottant .note{font-size:.78rem;font-weight:600;margin-top:.2rem;opacity:.9;}" +
    ".avis-flottant .note:empty{display:none;}" +
    /* coussin en bas de page pour ne jamais cacher le dernier mot */
    "body{padding-bottom:120px;}" +
    "@media(max-width:600px){.avis-flottant{width:66px;height:66px;bottom:14px;right:14px;}" +
      ".avis-flottant .mot{font-size:.85rem;}.avis-flottant .note{font-size:.72rem;}}";
  document.head.appendChild(css);

  // 2) bouton
  var a = document.createElement("a");
  a.className = "avis-flottant";
  a.href = LIEN;
  a.setAttribute("aria-label", "Laisser ou lire un avis");
  a.innerHTML = '<span class="mot">Avis</span><span class="note" id="avis-note-moy"></span>';
  document.body.appendChild(a);

  // 3) note moyenne (silencieux s'il n'y a pas encore d'avis)
  fetch(API + "/avis-publics")
    .then(function (r) { return r.json(); })
    .then(function (avis) {
      if (!avis || avis.length === 0) return;
      var somme = avis.reduce(function (t, e) { return t + (e.note || 0); }, 0);
      var moy = (somme / avis.length).toFixed(1);
      var el = document.getElementById("avis-note-moy");
      if (el) el.textContent = moy + "/5";
    })
    .catch(function () { /* silencieux */ });
})();
