/* Dans l'appli installée : les liens « Accueil / Retour » ramènent à l'appli */
(function () {
  var appli = false;
  try { appli = matchMedia('(display-mode: standalone)').matches || navigator.standalone; } catch (e) {}
  if (!appli) return;
  /* pas de popups du site dans l'appli */
  var st = document.createElement('style');
  st.textContent = '.pop-fond,.popup-backdrop{display:none!important}';
  (document.head || document.documentElement).appendChild(st);
  function accueil(h) {
    try { var u = new URL(h, location.href); return u.origin === location.origin && /^\/(index(\.html)?)?$/.test(u.pathname); } catch (e) { return false; }
  }
  function corriger() {
    document.querySelectorAll('a[href]').forEach(function (a) { if (accueil(a.getAttribute('href'))) a.setAttribute('href', '/app/'); });
  }
  corriger();
  document.addEventListener('DOMContentLoaded', corriger);
  window.addEventListener('load', corriger);
  var b = document.createElement('a');
  b.href = '/app/'; b.textContent = '← Appli';
  b.style.cssText = 'position:fixed;bottom:calc(16px + env(safe-area-inset-bottom));left:14px;z-index:99999;padding:.8rem 1.2rem;border-radius:999px;' +
    'background:#1b1b1f;color:#fff;font:600 .9rem Inter,system-ui,sans-serif;text-decoration:none;box-shadow:0 6px 16px rgba(0,0,0,.25)';
  (document.body ? Promise.resolve() : new Promise(function (r) { document.addEventListener('DOMContentLoaded', r); }))
    .then(function () { document.body.appendChild(b); });
})();
