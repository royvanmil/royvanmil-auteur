const ORIGINES = [
  "https://royvanmil.fr",
  "https://www.royvanmil.fr",
  "https://royvanmil.com",
  "https://www.royvanmil.com"
];

const CLES = ["accueil", "livre", "extraits", "clic-amazon", "livre1-maison", "livre3-cloche", "indiana", "audio-accessible"];

// livres qu'un visiteur peut noter (clé -> nom affiché)
const LIVRES = {
  "cette-maison": "Cette maison, elle vaut vraiment le prix ?",
  "un-instant": "Un instant, ou Deux…",
  "la-cloche": "La Cloche des Morts",
  "un-instant-trois": "Un instant, ou Trois…"
};

const MOT_DE_PASSE = "Locomotive48";

// limites de sécurité pour les avis
const MAX_NOM = 60;
const MAX_AVIS = 1500;
const DELAI_ANTI_SPAM = 10; // secondes entre deux envois depuis la même IP

// limites de sécurité pour les messages de contact
const MAX_MESSAGE = 2000;
const MAX_CHAMP = 100; // nom, prénom, rue, ville, email…

function cors(origine) {
  // autoriser tout royvanmil.fr / .com (avec ou sans www, http ou https)
  var ok = ORIGINES[0];
  if (origine && /^https?:\/\/(www\.)?royvanmil\.(fr|com)$/.test(origine)) {
    ok = origine;
  }
  return {
    "Access-Control-Allow-Origin": ok,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

// date du jour au format AAAA-MM-JJ (fuseau Europe/Paris)
function jourParis() {
  const d = new Date();
  const p = new Intl.DateTimeFormat("fr-CA", {
    timeZone: "Europe/Paris",
    year: "numeric", month: "2-digit", day: "2-digit"
  }).format(d);
  return p; // fr-CA donne déjà AAAA-MM-JJ
}

// nettoie un texte : enlève les balises, coupe à la longueur max
function nettoyer(txt, maxLen) {
  if (typeof txt !== "string") return "";
  return txt
    .replace(/<[^>]*>/g, "")   // retire toute balise HTML
    .replace(/\s+/g, " ")       // espaces multiples -> un seul
    .trim()
    .slice(0, maxLen);
}

export default {
  async fetch(request, env) {
    const origine = request.headers.get("Origin") || "";
    const entetes = cors(origine);
    try {
      const reponse = await gerer(request, env);
      // garantir les en-têtes CORS sur TOUTE réponse
      const nouveaux = new Headers(reponse.headers);
      for (const [k, v] of Object.entries(entetes)) nouveaux.set(k, v);
      return new Response(reponse.body, { status: reponse.status, headers: nouveaux });
    } catch (e) {
      // même en cas d'erreur, renvoyer du CORS pour que la page puisse lire
      return new Response(JSON.stringify({ ok: false, erreur: "serveur" }), {
        status: 500,
        headers: { ...entetes, "Content-Type": "application/json" }
      });
    }
  }
};

async function gerer(request, env) {
    const url = new URL(request.url);
    const origine = request.headers.get("Origin") || "";
    const entetes = cors(origine);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: entetes });
    }

    // ---- Incrémenter : /compte?c=extraits ----
    if (url.pathname === "/compte") {
      const cle = url.searchParams.get("c");
      if (!CLES.includes(cle)) {
        return new Response("cle inconnue", { status: 400, headers: entetes });
      }
      // 1) total historique (jamais remis à zéro)
      const actuel = parseInt(await env.COMPTEURS.get(cle) || "0", 10);
      await env.COMPTEURS.put(cle, String(actuel + 1));

      // 2) total depuis le dernier reset
      const cleReset = "reset:" + cle;
      const actuelReset = parseInt(await env.COMPTEURS.get(cleReset) || "0", 10);
      await env.COMPTEURS.put(cleReset, String(actuelReset + 1));

      // 3) compteur du jour (pour les courbes)
      const cleJour = "jour:" + cle + ":" + jourParis();
      const actuelJour = parseInt(await env.COMPTEURS.get(cleJour) || "0", 10);
      // les visites quotidiennes expirent après 400 jours pour ne pas encombrer le KV
      await env.COMPTEURS.put(cleJour, String(actuelJour + 1), { expirationTtl: 60 * 60 * 24 * 400 });

      return new Response("ok", { headers: entetes });
    }

    // ---- Lire les totaux : /stats ----
    if (url.pathname === "/stats") {
      const resultat = {};
      for (const cle of CLES) {
        resultat[cle] = {
          total: parseInt(await env.COMPTEURS.get(cle) || "0", 10),
          depuis_reset: parseInt(await env.COMPTEURS.get("reset:" + cle) || "0", 10)
        };
      }
      return new Response(JSON.stringify(resultat), {
        headers: { ...entetes, "Content-Type": "application/json" }
      });
    }

    // ---- Historique quotidien : /historique?jours=30 ----
    if (url.pathname === "/historique") {
      const nbJours = Math.min(parseInt(url.searchParams.get("jours") || "30", 10), 120);

      // construire la liste des derniers jours (du plus ancien au plus récent)
      const jours = [];
      const base = new Date();
      for (let i = nbJours - 1; i >= 0; i--) {
        const d = new Date(base.getTime() - i * 86400000);
        jours.push(
          new Intl.DateTimeFormat("fr-CA", {
            timeZone: "Europe/Paris",
            year: "numeric", month: "2-digit", day: "2-digit"
          }).format(d)
        );
      }

      const series = {};
      for (const cle of CLES) {
        const valeurs = [];
        for (const j of jours) {
          const v = parseInt(await env.COMPTEURS.get("jour:" + cle + ":" + j) || "0", 10);
          valeurs.push(v);
        }
        series[cle] = valeurs;
      }

      return new Response(JSON.stringify({ jours, series }), {
        headers: { ...entetes, "Content-Type": "application/json" }
      });
    }

    // ---- Remise à zéro (protégée) : /reset?c=accueil&code=XXXX ----
    if (url.pathname === "/reset") {
      const code = url.searchParams.get("code");
      if (code !== MOT_DE_PASSE) {
        return new Response("acces refuse", { status: 403, headers: entetes });
      }
      const cle = url.searchParams.get("c");
      if (!CLES.includes(cle)) {
        return new Response("cle inconnue", { status: 400, headers: entetes });
      }
      // remet à zéro uniquement le compteur "depuis reset" ; le total historique reste intact
      await env.COMPTEURS.put("reset:" + cle, "0");
      return new Response("ok", { headers: { ...entetes, "Content-Type": "text/plain" } });
    }

    // ====================================================================
    //  AVIS / TÉMOIGNAGES
    // ====================================================================

    // ---- Déposer un avis (POST) : /avis ----
    // corps JSON attendu : { livres:["un-instant",...], nom:"...", avis:"...", note:1-5 }
    if (url.pathname === "/avis" && request.method === "POST") {
      // 1) anti-spam : une même IP ne peut envoyer qu'un avis toutes les DELAI_ANTI_SPAM secondes
      const ip = request.headers.get("CF-Connecting-IP") || "inconnue";
      const cleAntiSpam = "avis-ip:" + ip;
      const dernier = await env.COMPTEURS.get(cleAntiSpam);
      if (dernier) {
        const ecoule = (Date.now() - parseInt(dernier, 10)) / 1000;
        if (ecoule < DELAI_ANTI_SPAM) {
          return new Response(JSON.stringify({ ok: false, erreur: "trop_rapide" }), {
            status: 429, headers: { ...entetes, "Content-Type": "application/json" }
          });
        }
      }

      // 2) lire et valider le corps
      let corps;
      try { corps = await request.json(); }
      catch (e) {
        return new Response(JSON.stringify({ ok: false, erreur: "format" }), {
          status: 400, headers: { ...entetes, "Content-Type": "application/json" }
        });
      }

      // livres : garder uniquement les clés connues
      let livres = Array.isArray(corps.livres) ? corps.livres : [];
      livres = livres.filter(function (l) { return LIVRES.hasOwnProperty(l); });

      const nom = nettoyer(corps.nom, MAX_NOM);
      const avis = nettoyer(corps.avis, MAX_AVIS);
      let note = parseInt(corps.note, 10);
      if (isNaN(note) || note < 1) note = 1;
      if (note > 5) note = 5;

      // vérifs minimales
      if (livres.length === 0 || nom.length < 2 || avis.length < 3) {
        return new Response(JSON.stringify({ ok: false, erreur: "incomplet" }), {
          status: 400, headers: { ...entetes, "Content-Type": "application/json" }
        });
      }

      // 3) enregistrer avec statut "en attente"
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      const entree = {
        id: id,
        livres: livres,
        nom: nom,
        avis: avis,
        note: note,
        date: new Date().toISOString(),
        statut: "attente"   // attente | publie
      };
      await env.COMPTEURS.put("avis:" + id, JSON.stringify(entree));

      // 4) poser le verrou anti-spam : on stocke l'heure de cet envoi.
      // TTL minimum autorisé par Cloudflare = 60 s (l'effet anti-spam se
      // déclenche lui sur DELAI_ANTI_SPAM via la comparaison ci-dessus).
      await env.COMPTEURS.put(cleAntiSpam, String(Date.now()), { expirationTtl: 60 });

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...entetes, "Content-Type": "application/json" }
      });
    }

    // ---- Liste complète des avis (protégé, pour la page admin) : /avis-liste?code=XXXX ----
    if (url.pathname === "/avis-liste") {
      const code = url.searchParams.get("code");
      if (code !== MOT_DE_PASSE) {
        return new Response("acces refuse", { status: 403, headers: entetes });
      }
      const liste = await env.COMPTEURS.list({ prefix: "avis:" });
      const avis = [];
      for (const cle of liste.keys) {
        const val = await env.COMPTEURS.get(cle.name);
        if (val) { try { avis.push(JSON.parse(val)); } catch (e) {} }
      }
      // plus récents en premier
      avis.sort(function (a, b) { return b.date < a.date ? -1 : 1; });
      return new Response(JSON.stringify(avis), {
        headers: { ...entetes, "Content-Type": "application/json" }
      });
    }

    // ---- Avis publiés uniquement (public, pour le site) : /avis-publics ----
    if (url.pathname === "/avis-publics") {
      const liste = await env.COMPTEURS.list({ prefix: "avis:" });
      const avis = [];
      for (const cle of liste.keys) {
        const val = await env.COMPTEURS.get(cle.name);
        if (val) {
          try {
            const e = JSON.parse(val);
            if (e.statut === "publie") {
              // on ne renvoie que le nécessaire (pas l'IP, etc.)
              avis.push({ id: e.id, livres: e.livres, nom: e.nom, avis: e.avis, note: e.note, date: e.date });
            }
          } catch (e) {}
        }
      }
      avis.sort(function (a, b) { return b.date < a.date ? -1 : 1; });
      return new Response(JSON.stringify(avis), {
        headers: { ...entetes, "Content-Type": "application/json" }
      });
    }

    // ---- Publier ou supprimer un avis (protégé) : /avis-action?code=XXXX&id=YYY&action=publier|supprimer ----
    if (url.pathname === "/avis-action") {
      const code = url.searchParams.get("code");
      if (code !== MOT_DE_PASSE) {
        return new Response("acces refuse", { status: 403, headers: entetes });
      }
      const id = url.searchParams.get("id") || "";
      const action = url.searchParams.get("action") || "";
      const cleAvis = "avis:" + id;
      const val = await env.COMPTEURS.get(cleAvis);
      if (!val) {
        return new Response(JSON.stringify({ ok: false, erreur: "introuvable" }), {
          status: 404, headers: { ...entetes, "Content-Type": "application/json" }
        });
      }

      if (action === "supprimer") {
        await env.COMPTEURS.delete(cleAvis);
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...entetes, "Content-Type": "application/json" }
        });
      }

      // publier -> en ligne ; cacher/restaurer -> en attente ; jeter -> corbeille
      if (action === "publier" || action === "cacher" || action === "jeter" || action === "restaurer") {
        const e = JSON.parse(val);
        if (action === "publier") e.statut = "publie";
        else if (action === "jeter") e.statut = "corbeille";
        else e.statut = "attente"; // cacher ou restaurer
        await env.COMPTEURS.put(cleAvis, JSON.stringify(e));
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...entetes, "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ ok: false, erreur: "action" }), {
        status: 400, headers: { ...entetes, "Content-Type": "application/json" }
      });
    }

    // ====================================================================
    //  CONTACT / DEMANDE DE LIVRE
    // ====================================================================

    // ---- Déposer un message (POST) : /contact ----
    // corps JSON attendu :
    //   type "message" : { type:"message", nom, email, mobile, message }
    //   type "livre"   : { type:"livre", nom, prenom, email, mobile, rue, cp, ville }
    if (url.pathname === "/contact" && request.method === "POST") {
      // 1) anti-spam par IP (même mécanisme que les avis)
      const ip = request.headers.get("CF-Connecting-IP") || "inconnue";
      const cleAntiSpam = "contact-ip:" + ip;
      const dernier = await env.COMPTEURS.get(cleAntiSpam);
      if (dernier) {
        const ecoule = (Date.now() - parseInt(dernier, 10)) / 1000;
        if (ecoule < DELAI_ANTI_SPAM) {
          return new Response(JSON.stringify({ ok: false, erreur: "trop_rapide" }), {
            status: 429, headers: { ...entetes, "Content-Type": "application/json" }
          });
        }
      }

      // 2) lire le corps
      let corps;
      try { corps = await request.json(); }
      catch (e) {
        return new Response(JSON.stringify({ ok: false, erreur: "format" }), {
          status: 400, headers: { ...entetes, "Content-Type": "application/json" }
        });
      }

      const type = (corps.type === "livre") ? "livre" : "message";
      const nom    = nettoyer(corps.nom, MAX_CHAMP);
      const email  = nettoyer(corps.email, MAX_CHAMP);
      const mobile = nettoyer(corps.mobile, MAX_CHAMP);

      // au moins un moyen de contact
      if (email.length < 3 && mobile.length < 5) {
        return new Response(JSON.stringify({ ok: false, erreur: "sans_contact" }), {
          status: 400, headers: { ...entetes, "Content-Type": "application/json" }
        });
      }

      const entree = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        type: type,
        nom: nom,
        email: email,
        mobile: mobile,
        date: new Date().toISOString(),
        statut: "nouveau"   // nouveau | lu | corbeille
      };

      if (type === "livre") {
        entree.prenom = nettoyer(corps.prenom, MAX_CHAMP);
        entree.rue    = nettoyer(corps.rue, MAX_CHAMP);
        entree.cp     = nettoyer(corps.cp, 12);
        entree.ville  = nettoyer(corps.ville, MAX_CHAMP);
        entree.motif  = nettoyer(corps.motif, MAX_MESSAGE);
        // vérifs minimales adresse + motif
        if (nom.length < 2 || entree.prenom.length < 2 || entree.rue.length < 3 ||
            entree.cp.length < 4 || entree.ville.length < 2 || entree.motif.length < 3) {
          return new Response(JSON.stringify({ ok: false, erreur: "adresse_incomplete" }), {
            status: 400, headers: { ...entetes, "Content-Type": "application/json" }
          });
        }
      } else {
        entree.message = nettoyer(corps.message, MAX_MESSAGE);
        if (nom.length < 2 || entree.message.length < 3) {
          return new Response(JSON.stringify({ ok: false, erreur: "incomplet" }), {
            status: 400, headers: { ...entetes, "Content-Type": "application/json" }
          });
        }
      }

      await env.COMPTEURS.put("contact:" + entree.id, JSON.stringify(entree));
      await env.COMPTEURS.put(cleAntiSpam, String(Date.now()), { expirationTtl: 60 });

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...entetes, "Content-Type": "application/json" }
      });
    }

    // ---- Liste des messages (protégé) : /contact-liste?code=XXXX ----
    if (url.pathname === "/contact-liste") {
      const code = url.searchParams.get("code");
      if (code !== MOT_DE_PASSE) {
        return new Response("acces refuse", { status: 403, headers: entetes });
      }
      const liste = await env.COMPTEURS.list({ prefix: "contact:" });
      const messages = [];
      for (const cle of liste.keys) {
        const val = await env.COMPTEURS.get(cle.name);
        if (val) { try { messages.push(JSON.parse(val)); } catch (e) {} }
      }
      messages.sort(function (a, b) { return b.date < a.date ? -1 : 1; });
      return new Response(JSON.stringify(messages), {
        headers: { ...entetes, "Content-Type": "application/json" }
      });
    }

    // ---- Marquer / jeter / supprimer un message (protégé) :
    //      /contact-action?code=XXXX&id=YYY&action=lu|nouveau|jeter|restaurer|supprimer ----
    if (url.pathname === "/contact-action") {
      const code = url.searchParams.get("code");
      if (code !== MOT_DE_PASSE) {
        return new Response("acces refuse", { status: 403, headers: entetes });
      }
      const id = url.searchParams.get("id") || "";
      const action = url.searchParams.get("action") || "";
      const cleMsg = "contact:" + id;
      const val = await env.COMPTEURS.get(cleMsg);
      if (!val) {
        return new Response(JSON.stringify({ ok: false, erreur: "introuvable" }), {
          status: 404, headers: { ...entetes, "Content-Type": "application/json" }
        });
      }

      if (action === "supprimer") {
        await env.COMPTEURS.delete(cleMsg);
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...entetes, "Content-Type": "application/json" }
        });
      }

      if (action === "lu" || action === "nouveau" || action === "jeter" || action === "restaurer") {
        const e = JSON.parse(val);
        if (action === "lu") e.statut = "lu";
        else if (action === "jeter") e.statut = "corbeille";
        else e.statut = "nouveau"; // nouveau (marquer non-lu) ou restaurer
        await env.COMPTEURS.put(cleMsg, JSON.stringify(e));
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...entetes, "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ ok: false, erreur: "action" }), {
        status: 400, headers: { ...entetes, "Content-Type": "application/json" }
      });
    }

    return new Response("Compteurs Roy van Mil", { headers: entetes });
}
