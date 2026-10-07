/* EVAD bêta : état du projet (synchronisé avec Supabase), navigation et logique des écrans. */
(function () {
  "use strict";
  var D = window.EVAD_DATA;
  var KEY_PREFIX = "evad-beta-v2-";
  var SOL = {}; D.solutions.forEach(function (s) { SOL[s.id] = s; });
  var ICI = {}; D.ici.forEach(function (x) { ICI[x.id] = x; });
  var FAM = {}; D.familles.forEach(function (f) { FAM[f.id] = f; });
  var STATUS_LABEL = { prevu: "prévu", encours: "en cours", verifie: "vérifié" };
  var DATA_KEYS = ["pinned", "spaces", "selectedSpace", "chosen", "icis", "placed", "proofs"];

  var user = null;          // compte Supabase connecté
  var publicPlaces = [];    // lieux publics des autres testeurs
  var syncStatus = "idle";  // idle | saving | saved | error

  /* ================= État ================= */
  function defaultState() {
    return {
      v: 2,
      projectId: null,
      localUpdatedAt: 0,
      project: { name: "", promesse: "", reve: "", collectif: "", lieu: "", loc: null, public: true },
      pinned: [],
      spaces: D.espaces.map(function (e) { return { id: e.id, nom: e.nom }; }),
      selectedSpace: D.espaces[0].id,
      chosen: [],
      icis: [],
      placed: [],
      proofs: [],
      proposals: []
    };
  }
  var state = defaultState();
  function cacheKey() { return KEY_PREFIX + (user ? user.id : "invite"); }
  function loadCache() {
    try {
      var raw = localStorage.getItem(cacheKey());
      if (raw) { var s = JSON.parse(raw); if (s && s.v === 2) return Object.assign(defaultState(), s); }
    } catch (e) { /* stockage indisponible */ }
    return null;
  }
  function writeCache() { try { localStorage.setItem(cacheKey(), JSON.stringify(state)); } catch (e) { /* ignore */ } }
  function save() { state.localUpdatedAt = Date.now(); writeCache(); scheduleSync(); }
  function uid(p) { return (p || "x") + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  // Projet <-> ligne Supabase
  function toRow() {
    var p = state.project, data = {};
    DATA_KEYS.forEach(function (k) { data[k] = state[k]; });
    return { nom: p.name.trim(), promesse: p.promesse.trim(), reve: p.reve.trim(), collectif: p.collectif.trim(), lieu: p.lieu.trim(),
      lat: p.loc ? p.loc.lat : null, lng: p.loc ? p.loc.lng : null, public: p.public !== false, statut: projectStatut(), data: data };
  }
  function fromRow(r) {
    var s = defaultState(), d = r.data || {};
    s.projectId = r.id;
    s.localUpdatedAt = Date.parse(r.updated_at) || 0;
    s.project = { name: r.nom || "", promesse: r.promesse || "", reve: r.reve || "", collectif: r.collectif || "", lieu: r.lieu || "",
      loc: (r.lat != null && r.lng != null) ? { lat: r.lat, lng: r.lng } : null, public: r.public !== false };
    DATA_KEYS.forEach(function (k) { if (d[k] !== undefined) s[k] = d[k]; });
    return s;
  }

  // Sauvegarde en ligne, différée pour regrouper les frappes.
  var syncTimer = null;
  function scheduleSync() {
    if (!user || !window.EvadDB) return;
    clearTimeout(syncTimer); setSync("saving");
    syncTimer = setTimeout(syncNow, 600);
  }
  function syncNow() {
    syncTimer = null;
    return EvadDB.saveProject(state.projectId, toRow()).then(function (id) {
      if (!state.projectId) { state.projectId = id; writeCache(); }
      setSync("saved");
    }).catch(function (e) { console.warn("[EVAD] sauvegarde :", e.message); setSync("error"); });
  }
  function setSync(s) {
    syncStatus = s;
    var el = $(".snav-sync"); if (!el) return;
    el.dataset.state = s;
    el.textContent = { saving: "Enregistrement…", saved: "Enregistré en ligne", error: "Hors ligne : gardé sur cet appareil", idle: "" }[s] || "";
  }

  function projectName() { return state.project.name.trim() || "Mon lieu"; }
  function verifiedCount() { return state.proofs.length; }
  function projectStatut() {
    if (verifiedCount() >= 3) return "prouve";
    if (verifiedCount() > 0 || state.placed.some(function (p) { return p.status !== "prevu"; })) return "encours";
    return "reve";
  }
  var fricheStatut = projectStatut;
  function spaceName(id) { var s = state.spaces.find(function (x) { return x.id === id; }); return s ? s.nom : "Lieu"; }
  function stepDone(id) {
    if (id === "rever") return !!state.project.name.trim();
    if (id === "explorer") return state.chosen.length > 0;
    if (id === "generer") return state.placed.length > 0;
    if (id === "entreprendre") return state.placed.some(function (p) { return p.status !== "prevu"; });
    if (id === "nourrir") return verifiedCount() >= 3;
    return false;
  }

  /* ================= Utilitaires ================= */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function param(name) { var m = new RegExp("[?&]" + name + "=([^&]+)").exec(location.search); return m ? decodeURIComponent(m[1]) : null; }
  function today() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function frDate(iso) { try { return new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }); } catch (e) { return iso; } }

  var LEAF_PATH = '<path d="M3 17C3 8.5 8.5 3 17 3c0 8.5-5.5 14-14 14z"/><path class="vein" d="M4.5 15.5C7.5 12 10.5 9 14 6.5"/>';
  function leafSvg(cls) { return '<svg class="leaf ' + (cls || "") + '" viewBox="0 0 20 20" aria-hidden="true" focusable="false">' + LEAF_PATH + "</svg>"; }
  var ICON = {
    close: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    check: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M4.5 10.5l3.5 3.5 7.5-8" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    arrow: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M4 10h11M11 6l4 4-4 4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    back: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M16 10H5M9 6l-4 4 4 4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    pin: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M10 18s-5.5-5.2-5.5-9.2a5.5 5.5 0 0 1 11 0C15.5 12.8 10 18 10 18z" fill="currentColor"/><circle cx="10" cy="8.6" r="2" fill="#FFFDF7"/></svg>',
    photo: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3" y="6" width="18" height="13" rx="3" stroke="currentColor" stroke-width="1.8" fill="none"/><circle cx="12" cy="12.5" r="3.4" stroke="currentColor" stroke-width="1.8" fill="none"/><path d="M8.5 6l1.5-2h4l1.5 2" stroke="currentColor" stroke-width="1.8" fill="none"/></svg>',
    search: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><circle cx="9" cy="9" r="5.5" stroke="currentColor" stroke-width="2" fill="none"/><path d="M13 13l4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    commun: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M10 5.5C8.5 4 6.5 3.7 4 4v10c2.5-.3 4.5 0 6 1.5 1.5-1.5 3.5-1.8 6-1.5V4c-2.5-.3-4.5 0-6 1.5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M10 5.5v10" stroke="currentColor" stroke-width="1.6"/></svg>'
  };
  var BRAND_LEAF = '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path d="M5 27C5 13 13 5 27 5c0 14-8 22-22 22z" fill="#5F7F52"/><path d="M7 25C12 19 17 14 23 9.5" stroke="#FAF6EA" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M13 19.5l-1-5M17.5 15l-.5-4.5M13 19.5l5 .5M17.5 15l4.5.2" stroke="#FAF6EA" stroke-width="1.4" stroke-linecap="round"/></svg>';

  var LEVEL_WORDS = ["à semer", "qui germe", "qui pousse", "qui s'étoffe", "foisonnante", "foisonnante"];
  function levelFrom(sum) { return Math.min(5, Math.ceil(sum / 2)); }
  function familySums(filter) {
    var r = { ecologie: 0, social: 0, economie: 0 };
    state.placed.forEach(function (p) {
      if (filter && !filter(p)) return;
      var e = SOL[p.solId].effets; for (var k in r) r[k] += e[k] || 0;
    });
    return r;
  }

  function toast(msg) {
    var t = $("#toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("show");
    clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove("show"); }, 3200);
  }

  function openModal(title, body, actions) {
    var dlg = $("#modal");
    if (!dlg) { dlg = document.createElement("dialog"); dlg.id = "modal"; dlg.className = "modal"; dlg.setAttribute("aria-labelledby", "modal-title"); document.body.appendChild(dlg); }
    dlg.innerHTML = '<div class="modal-inner"><div class="modal-head"><h2 id="modal-title">' + esc(title) + '</h2>' +
      '<button type="button" class="icon-btn" data-close aria-label="Fermer">' + ICON.close + '</button></div>' +
      '<div class="modal-body">' + body + '</div>' +
      (actions ? '<div class="modal-actions">' + actions + '</div>' : "") + "</div>";
    $all("[data-close]", dlg).forEach(function (b) { b.addEventListener("click", function () { dlg.close(); }); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
    return dlg;
  }

  /* ================= Barre du haut et pied de page ================= */
  var BRAND = '<a class="brand" href="index.html" aria-label="EVAD, retour à la carte vivante"><img class="brand-logo" src="assets/logo-evad.svg" alt="EVAD" width="92" height="30"></a>';

  function renderTopbar(page) {
    var top = $("#topbar"); if (!top) return;
    // Pages avec sidebar : barre du haut réduite au logo (+ accès sur les pages publiques).
    if (document.getElementById("deva")) {
      top.className = "topbar topbar-slim";
      var isWorkspace = D.steps.some(function (s) { return s.id === page; });
      var right = isWorkspace ? "" : '<a class="btn btn-primary btn-sm" href="rever.html">Créer mon projet</a>';
      var tagline = '<span class="brand-tagline">écosystème vivant autonome et décentralisé</span>';
      top.innerHTML = BRAND + tagline + (right ? '<div class="top-right">' + right + "</div>" : "");
      return;
    }
    var steps = D.steps.map(function (s, n) {
      var active = s.id === page, done = stepDone(s.id);
      var cls = active ? "is-active" : done ? "is-done" : "is-todo";
      var state = active ? "étape en cours" : done ? "faite" : "à venir";
      return '<li><a class="step ' + cls + '" href="' + s.href + '"' + (active ? ' aria-current="step"' : "") + ' aria-label="Étape ' + (n + 1) + ", " + s.label + ", " + state + '">' +
        '<span class="step-dot" aria-hidden="true">' + (done && !active ? ICON.check : n + 1) + '</span><span class="step-lbl">' + s.label + "</span></a></li>";
    }).join("");
    var st = fricheStatut();
    top.className = "topbar";
    top.innerHTML = BRAND +
      '<nav class="stepper" aria-label="Parcours REGEN"><span class="stepper-kicker" aria-hidden="true">REGEN</span><ol>' + steps + "</ol></nav>" +
      '<div class="top-right">' +
      '<a class="toplink' + (page === "commun" ? " is-current" : "") + '" href="commun.html"' + (page === "commun" ? ' aria-current="page"' : "") + ">Le Commun</a>" +
      '<a class="project-pill" href="rever.html" title="Mon projet"><span class="pill-dot st-' + st + '" aria-hidden="true"></span><span class="pill-name">' + esc(projectName()) + '</span><span class="sr-only">, ' + D.statuts[st].label + "</span></a>" +
      "</div>";
  }

  // Bloc Vision 2030 en haut du rail d'accueil (Deva raconte la vision juste en dessous).
  function renderHomeVision() {
    var inner = document.querySelector("#deva .deva-inner"); if (!inner) return;
    if (inner.querySelector(".deva-vision")) return;
    inner.insertAdjacentHTML("afterbegin",
      '<div class="deva-vision"><p class="snav-title">La vision EVAD 2030</p>' +
      "<h1>Un monde régénératif désirable, déjà en train de pousser</h1>" +
      "<p class=\"deva-vision-sub\">Du rêve à la preuve, et la preuve rouvre le rêve.</p></div>");
  }

  // Navigation « espace de travail » (pages du parcours, une fois le projet lancé) :
  // mon lieu, parcours REGEN, Le Commun, déconnexion. Pas sur les pages publiques (accueil, Commun).
  function renderSidebarNav(page) {
    if (!D.steps.some(function (s) { return s.id === page; })) return;
    var inner = document.querySelector("#deva .deva-inner"); if (!inner) return;
    var st = fricheStatut();
    var steps = D.steps.map(function (s, n) {
      var active = s.id === page, done = stepDone(s.id);
      var cls = active ? "is-active" : done ? "is-done" : "is-todo";
      var etat = active ? "étape en cours" : done ? "faite" : "à venir";
      return '<li><a class="snav-step ' + cls + '" href="' + s.href + '"' + (active ? ' aria-current="step"' : "") + ' aria-label="Étape ' + (n + 1) + ", " + s.label + ", " + etat + '">' +
        '<span class="snav-dot" aria-hidden="true">' + (done && !active ? ICON.check : n + 1) + "</span><span>" + s.label + "</span></a></li>";
    }).join("");
    var html = '<div class="deva-nav">' +
      '<a class="snav-place" href="index.html?focus=mine" title="Voir mon lieu sur la carte">' +
      '<span class="pill-dot st-' + st + '" aria-hidden="true"></span>' +
      '<span class="snav-place-txt"><span class="snav-kicker">Mon lieu</span><strong>' + esc(projectName()) + '</strong></span></a>' +
      '<nav class="snav-regen" aria-label="Parcours REGEN"><p class="snav-title">Parcours REGEN</p><ol>' + steps + "</ol></nav>" +
      '<a class="snav-commun' + (page === "commun" ? " is-current" : "") + '" href="commun.html"' + (page === "commun" ? ' aria-current="page"' : "") + ">" + ICON.commun + "<span>Le Commun</span></a>" +
      "</div>";
    var existing = inner.querySelector(".deva-nav");
    if (existing) existing.outerHTML = html; else inner.insertAdjacentHTML("afterbegin", html);
  }
  function renderFooter() {
    var f = $("#footer"); if (!f) return;
    f.className = "footer";
    f.innerHTML = "<p>EVAD bêta" + (window.EvadDB && EvadDB.env !== "prod" ? " (base de test)" : "") +
      ". Ton projet est gardé sur cet appareil ; la carte et le Commun sont ouverts à tous.</p>" +
      '<a class="link-btn" href="mailto:contact@evad.org?subject=Retour%20b%C3%AAta%20EVAD">Donner un retour</a>';
  }
  function refreshChrome() { renderTopbar(document.body.dataset.page); renderSidebarNav(document.body.dataset.page); }

  /* ================= Projets et maquettes ================= */
  // Terrain vierge : le lieu de chaque testeur part d'une parcelle vide à aménager.
  var BLANK_SCENE = { grille: 9, chemin: null, structures: [], personnages: [] };
  function jaugesFromPlaced(placed) {
    var r = { ecologie: 0, social: 0, economie: 0 };
    (placed || []).forEach(function (p) {
      var e = p.status === "verifie" && SOL[p.solId] && SOL[p.solId].effets; if (!e) return;
      for (var k in r) r[k] += e[k] || 0;
    });
    return { ecologie: Math.min(4, Math.round(r.ecologie / 1.5)), social: Math.min(4, Math.round(r.social / 1.5)), economie: Math.min(4, Math.round(r.economie / 1.5)) };
  }
  function myProject() {
    var p = state.project;
    return { id: "mine", isMine: true, nom: projectName(), lieu: p.lieu.trim() || "Lieu à préciser", statut: projectStatut(),
      promesse: p.promesse.trim() || "Promesse à écrire à l'étape Rêver.", collectif: p.collectif.trim() || "Collectif à présenter à l'étape Rêver.",
      jauges: jaugesFromPlaced(state.placed) };
  }
  function allProjects() {
    var list = [];
    if (state.project.loc) list.push(myProject());
    publicPlaces.forEach(function (r) {
      if (r.id === state.projectId) return;
      list.push({ id: "p:" + r.id, isPublic: true, nom: r.nom, lieu: r.lieu || "", statut: r.statut || "reve", lat: r.lat, lng: r.lng,
        promesse: r.promesse || "", collectif: r.collectif || "", placedRemote: r.placed || [], jauges: jaugesFromPlaced(r.placed) });
    });
    D.projets.forEach(function (p) { list.push(Object.assign({ isExample: true }, p)); });
    return list;
  }
  function freeCells(structures, n, path) {
    var occ = {};
    structures.forEach(function (s) { for (var a = 0; a < (s.w || 1); a++) for (var b = 0; b < (s.d || 1); b++) occ[(s.i + a) + "," + (s.j + b)] = 1; });
    var out = [];
    for (var i = 0; i < n; i++) for (var j = 0; j < n; j++) if (!occ[i + "," + j] && i !== path && j !== path) out.push({ i: i, j: j });
    out.sort(function (a, b) { return (Math.abs(a.i - 4.5) + Math.abs(a.j - 4.5)) - (Math.abs(b.i - 4.5) + Math.abs(b.j - 4.5)); });
    return out;
  }
  function sceneOptionsFor(project) {
    if (project.isMine || project.isPublic) {
      var placed = project.isMine ? state.placed : project.placedRemote;
      var vit = project.isMine ? verifiedCount() / 3 : { reve: 0, encours: 0.4, prouve: 1 }[project.statut];
      return Object.assign({}, BLANK_SCENE, { placed: placed, solutions: SOL, vitalite: vit, label: "Maquette 2.5D de " + project.nom });
    }
    var structures = D.presets[project.preset] || [];
    var cells = freeCells(structures, 9, 4);
    var map = { reve: "prevu", encours: "encours", prouve: "verifie" };
    var placedEx = (project.solutions || []).map(function (s, k) { var c = cells[k * 3 % cells.length]; return { uid: project.id + k, solId: s[0], status: map[s[1]], i: c.i, j: c.j }; });
    return { grille: 9, chemin: 4, structures: structures, placed: placedEx, solutions: SOL, personnages: [{ i: 4, j: 2, c: "#C06848" }, { i: 6, j: 4, c: "#2C5234" }],
      vitalite: { reve: 0, encours: 0.4, prouve: 1 }[project.statut], label: "Maquette 2.5D de " + project.nom };
  }
  function myScene(extra) {
    return Object.assign({}, BLANK_SCENE, { placed: state.placed, solutions: SOL, vitalite: verifiedCount() / 3, label: "Maquette 2.5D de " + projectName() }, extra || {});
  }

  function jaugesHtml(j) {
    return '<div class="jauges">' + D.iciFamilles.map(function (f) {
      var lv = j[f.id] || 0, leaves = "";
      for (var k = 0; k < 4; k++) leaves += leafSvg(k < lv ? "on-green" : "off");
      var words = ["pas encore vérifié", "premiers signes", "vérifié", "bien vérifié", "largement vérifié"];
      return '<div class="jauge"><span class="jauge-lbl">' + f.label + '</span><span class="leaves" role="img" aria-label="' + f.label + " : " + words[lv] + '">' + leaves + '</span><span class="jauge-word">' + words[lv] + "</span></div>";
    }).join("") + "</div>";
  }
  function statutBadge(st) { return '<span class="badge st-' + st + '">' + D.statuts[st].label + "</span>"; }

  /* ================= Carte vivante ================= */
  var MAP_DECOR =
    '<rect width="1000" height="700" fill="#FAF6EA"/>' +
    '<path d="M0 0H190C172 110 196 220 180 330 166 440 160 540 150 700H0Z" fill="#DCEAE2"/>' +
    '<g stroke="#C4DBD0" stroke-width="2" fill="none" stroke-linecap="round"><path d="M40 140q14-8 28 0t28 0"/><path d="M70 300q14-8 28 0t28 0"/><path d="M30 470q14-8 28 0t28 0"/><path d="M80 610q14-8 28 0t28 0"/></g>' +
    '<text x="70" y="400" transform="rotate(-80 70 400)" class="map-label map-sea">Océan Atlantique</text>' +
    '<path d="M190 40C330 12 560 30 720 58 860 86 955 180 945 320 935 460 880 600 740 662 580 700 380 690 220 672 172 600 160 480 175 360 188 240 168 120 190 40Z" fill="#EEF0D8"/>' +
    '<g fill="#E3E7C6"><ellipse cx="820" cy="250" rx="110" ry="70"/><ellipse cx="860" cy="430" rx="80" ry="95"/><ellipse cx="700" cy="160" rx="90" ry="45"/></g>' +
    '<g fill="#D3E2B8"><ellipse cx="290" cy="560" rx="95" ry="85"/><ellipse cx="360" cy="630" rx="70" ry="40"/><ellipse cx="240" cy="470" rx="45" ry="60"/><ellipse cx="640" cy="560" rx="70" ry="45"/><ellipse cx="520" cy="130" rx="60" ry="35"/></g>' +
    '<g fill="#BFD6A0">' + (function () { var s = ""; for (var k = 0; k < 46; k++) { var a = Math.sin(k * 12.9) * 43758.5; a -= Math.floor(a); var b = Math.sin(k * 78.2) * 12345.6; b -= Math.floor(b); s += '<circle cx="' + (215 + a * 170).toFixed(0) + '" cy="' + (485 + b * 150).toFixed(0) + '" r="' + (6 + (k % 4) * 2) + '"/>'; } return s; })() + "</g>" +
    '<g fill="none" stroke="#A9CCCB" stroke-linecap="round"><path d="M735 690C650 620 560 560 470 522 400 492 330 462 282 422 245 392 214 370 186 342" stroke-width="7"/>' +
    '<path d="M905 360C820 382 742 400 650 406 560 412 470 440 330 440" stroke-width="5"/><path d="M650 406C640 380 620 350 600 330" stroke-width="3"/>' +
    '<path d="M640 168C560 196 470 230 400 242 330 252 260 262 188 250" stroke-width="4"/></g>' +
    '<g fill="none" stroke="#D8C9A2" stroke-width="2.4" stroke-dasharray="2 7" stroke-linecap="round"><path d="M330 430C380 460 460 480 500 490"/><path d="M500 490C540 450 560 420 585 395"/><path d="M585 395C640 370 690 350 730 330"/><path d="M470 300C400 330 330 350 245 370"/><path d="M290 290C360 290 420 295 470 300"/><path d="M290 570C300 520 310 480 330 430"/></g>' +
    '<text x="560" y="548" class="map-label" transform="rotate(20 560 548)">Garonne</text><text x="760" y="392" class="map-label">Dordogne</text><text x="330" y="236" class="map-label" transform="rotate(-6 330 236)">Charente</text><text x="250" y="660" class="map-label">Landes</text>';

  /* Coordonnées réelles d'un projet. Le lieu créé par le visiteur est géolocalisable
     (state.project.loc) ; tant qu'il n'est pas situé, il n'apparaît pas. */
  function projectLoc(p) {
    if (p.isMine) return state.project.loc;
    return (p.lat != null) ? { lat: p.lat, lng: p.lng } : null;
  }
  function distKm(a, b) {
    var R = 6371, t = Math.PI / 180, dLat = (b.lat - a.lat) * t, dLng = (b.lng - a.lng) * t;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  /* Carte open source (Leaflet + OpenStreetMap). Repli sur la carte SVG stylisée si Leaflet
     n'est pas chargé (hors-ligne). */
  function renderMap(host, opts) {
    opts = opts || {};
    if (!window.L) return renderMapSvg(host, opts);
    var projects = allProjects();
    var map = host._lmap;
    if (!map) {
      map = L.map(host, { zoomControl: false, attributionControl: true });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(map);
      L.control.zoom({ position: "topright" }).addTo(map);
      map.setView([45.5, -0.2], 7);
      host._lmap = map;
      host._lmarkers = L.layerGroup().addTo(map);
      map.on("click", function (e) { if (host._locateMove) host._locateMove(e.latlng.lat, e.latlng.lng); });
    }
    host._locateMove = opts.locate ? opts.locate.onMove : null;
    var layer = host._lmarkers; layer.clearLayers();
    var bounds = [], selLatLng = null;
    projects.forEach(function (p) {
      if (opts.filter && !opts.filter(p)) return;
      var loc = projectLoc(p); if (!loc) return;
      bounds.push([loc.lat, loc.lng]);
      if (opts.selected === p.id) selLatLng = [loc.lat, loc.lng];
      var sel = opts.selected === p.id, hl = opts.highlight && opts.highlight(p);
      var icon = L.divIcon({ className: "lmark-ico", iconSize: [32, 42], iconAnchor: [16, 38], html:
        '<span class="lmark st-' + p.statut + (p.isMine ? " is-mine" : "") + (sel ? " is-selected" : "") + (hl ? " is-highlight" : "") + '">' +
        (p.isMine ? '<i class="lmark-pulse"></i>' : "") + '<i class="lmark-pin"></i></span>' });
      var m = L.marker([loc.lat, loc.lng], { icon: icon, title: p.nom, riseOnHover: true, draggable: !!(opts.locate && p.isMine), keyboard: true, alt: p.nom });
      m.bindTooltip(p.nom, { direction: "top", offset: [0, -36], permanent: !!p.isMine, className: "lmark-tip" });
      if (opts.onSelect) m.on("click", function () { opts.onSelect(p.id); });
      if (opts.locate && p.isMine) m.on("dragend", function (e) { var ll = e.target.getLatLng(); if (host._locateMove) host._locateMove(ll.lat, ll.lng); });
      m.addTo(layer);
    });
    if (!host._lfit && bounds.length) { map.fitBounds(bounds, { padding: [48, 48], maxZoom: 9 }); host._lfit = true; }
    if (selLatLng && host._lastSel !== opts.selected) { map.panTo(selLatLng, { animate: true }); }
    host._lastSel = opts.selected;
    setTimeout(function () { map.invalidateSize(); }, 60);
  }

  function renderMapSvg(host, opts) {
    opts = opts || {};
    var projects = allProjects();
    var svg = '<svg class="map-svg" viewBox="' + (opts.viewBox || "0 0 1000 700") + '" preserveAspectRatio="xMidYMid meet" role="group" aria-label="Carte vivante des projets régénératifs en Nouvelle-Aquitaine">' + MAP_DECOR + '<g class="markers">';
    projects.forEach(function (p) {
      if (!p.pos) return; // repli hors-ligne : seuls les exemples ont une position stylisée
      var hidden = opts.filter && !opts.filter(p);
      var cls = "marker st-" + p.statut + (p.isMine ? " is-mine" : "") + (opts.selected === p.id ? " is-selected" : "") + (hidden ? " is-hidden" : "") + (opts.highlight && opts.highlight(p) ? " is-highlight" : "");
      var sc = p.isMine ? 1.25 : 1;
      svg += '<g class="' + cls + '" data-id="' + p.id + '" transform="translate(' + p.pos.x + " " + p.pos.y + ')"' + (hidden ? ' aria-hidden="true"' : ' role="button" tabindex="0" aria-label="' + esc(p.nom) + ", " + D.statuts[p.statut].label + (p.isMine ? ", ton projet" : "") + '"') + ">" +
        (p.isMine ? '<circle class="pulse" r="18" cy="-4"/>' : "") +
        '<ellipse class="m-shadow" rx="9" ry="3.5" cy="1"/>' +
        '<g transform="scale(' + sc + ')"><path class="m-pin" d="M0 0C-9-11-14-17-14-24A14 14 0 1 1 14-24C14-17 9-11 0 0Z"/>' +
        '<path class="m-leaf" d="M-6-19C-6-26-1-31 7-31 7-23 2-18-6-18Z"/></g>' +
        '<text class="m-label" y="' + (p.isMine ? 20 : 17) + '">' + esc(p.nom) + "</text></g>";
    });
    svg += "</g></svg>";
    host.innerHTML = svg;
    $all(".marker[role=button]", host).forEach(function (m) {
      function go() { if (opts.onSelect) opts.onSelect(m.getAttribute("data-id")); }
      m.addEventListener("click", go);
      m.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
    });
  }
  function projectById(id) { return allProjects().find(function (p) { return p.id === id; }); }

  /* ================= Écran 1 : accueil ================= */
  function pageIndex() {
    var selected = null, fStat = { reve: true, encours: true, prouve: true }, fFam = "", nearMe = false;
    var host = $("#map");
    function filter(p) {
      if (!fStat[p.statut]) return false;
      if (fFam && !p.isMine && !(p.solutions || []).some(function (s) { return SOL[s[0]].famille === fFam; })) return false;
      if (nearMe && !p.isMine) { var me = state.project.loc, at = projectLoc(p); if (me && at && distKm(me, at) > 80) return false; }
      return true;
    }
    function draw() { renderMap(host, { onSelect: openFiche, selected: selected, filter: filter }); }
    draw();

    $all("[data-fstat]").forEach(function (b) {
      b.addEventListener("click", function () { var k = b.dataset.fstat; fStat[k] = !fStat[k]; b.setAttribute("aria-pressed", String(fStat[k])); draw(); });
    });
    var famSel = $("#f-famille");
    famSel.innerHTML = '<option value="">Toutes les familles</option>' + D.familles.map(function (f) { return '<option value="' + f.id + '">' + f.label + "</option>"; }).join("");
    famSel.addEventListener("change", function () { fFam = famSel.value; draw(); });
    $("#f-near").addEventListener("click", function () {
      if (!state.project.loc) { toast("Situe d'abord ton lieu à l'étape Rêver."); return; }
      nearMe = !nearMe; this.setAttribute("aria-pressed", String(nearMe)); draw(); });

    var filters = $(".map-filters"), ftoggle = $("#filters-toggle");
    ftoggle.addEventListener("click", function () {
      var collapsed = filters.classList.toggle("is-collapsed");
      ftoggle.setAttribute("aria-expanded", String(!collapsed));
      ftoggle.setAttribute("aria-label", collapsed ? "Afficher les filtres" : "Réduire les filtres");
    });

    var fiche = $("#fiche");
    function closeFiche() { $(".map-stage").classList.remove("has-fiche"); fiche.classList.remove("open"); fiche.setAttribute("aria-hidden", "true"); selected = null; draw(); }
    function openFiche(id) {
      var p = projectById(id); if (!p) return; selected = id; draw();
      var nextStep = D.steps.find(function (s) { return !stepDone(s.id); }) || D.steps[4];
      var toSol = function (x) { return [x.solId, { prevu: "reve", encours: "encours", verifie: "prouve" }[x.status]]; };
      var sols = p.isMine ? state.placed.map(toSol) : p.isPublic ? (p.placedRemote || []).filter(function (x) { return SOL[x.solId]; }).map(toSol) : (p.solutions || []);
      var detail = sols.length
        ? "<ul class='sol-list'>" + sols.map(function (s) { return "<li><a class='sol-link' href='commun.html?sol=" + s[0] + "'><span class='dot st-" + s[1] + "' aria-hidden='true'></span><span>" + esc(SOL[s[0]].nom) + " <span class='muted'>(" + D.statuts[s[1]].label.toLowerCase() + ")</span></span><span class='sol-link-go' aria-hidden='true'>" + ICON.arrow + "</span></a></li>"; }).join("") + "</ul>"
        : "<p class='muted'>Aucune solution posée pour l'instant. Commence le parcours pour faire pousser ce lieu.</p>";
      fiche.innerHTML =
        '<div class="fiche-head"><span>' + statutBadge(p.statut) + (p.isExample ? ' <span class="badge badge-exemple" title="Projet fictif, pour illustrer">Exemple</span>' : "") + '</span><button type="button" class="icon-btn" id="fiche-close" aria-label="Fermer la fiche">' + ICON.close + "</button></div>" +
        '<div class="fiche-scene" id="fiche-scene"></div>' +
        '<h2 class="fiche-title" id="fiche-title">' + esc(p.nom) + "</h2>" +
        '<p class="fiche-lieu">' + esc(p.lieu) + (p.isMine ? " · ton projet" : p.isPublic ? " · lieu d'un collectif bêta" : "") + "</p>" +
        '<p class="fiche-promesse">' + esc(p.promesse) + "</p>" +
        '<p class="fiche-collectif"><strong>Collectif</strong> ' + esc(p.collectif) + "</p>" +
        "<h3 class='mini-title'>Impact vérifié</h3>" + jaugesHtml(p.jauges) +
        '<div class="fiche-actions">' +
        '<button type="button" class="btn btn-ghost" id="fiche-explore" aria-expanded="false" aria-controls="fiche-detail">Explorer ce projet</button>' +
        (p.isMine
          ? '<a class="btn btn-primary" href="' + nextStep.href + '">Reprendre mon parcours</a>'
          : '<button type="button" class="btn btn-primary" id="fiche-inspire">M\'en inspirer pour créer le mien</button>') +
        "</div>" +
        '<div class="fiche-detail" id="fiche-detail" hidden><h3 class="mini-title">Solutions du Commun sur ce lieu</h3>' + detail + "</div>";
      EvadScene.render($("#fiche-scene"), sceneOptionsFor(p));
      fiche.classList.add("open"); fiche.setAttribute("aria-hidden", "false"); $(".map-stage").classList.add("has-fiche");
      $("#fiche-close").addEventListener("click", closeFiche);
      $("#fiche-explore").addEventListener("click", function () {
        var d = $("#fiche-detail"); d.hidden = !d.hidden; this.setAttribute("aria-expanded", String(!d.hidden));
        this.textContent = d.hidden ? "Explorer ce projet" : "Replier le détail";
      });
      var insp = $("#fiche-inspire");
      if (insp) insp.addEventListener("click", function () {
        if (state.pinned.indexOf(p.id) < 0) state.pinned.push(p.id);
        save(); location.href = "rever.html";
      });
      $("#fiche-title").setAttribute("tabindex", "-1"); $("#fiche-title").focus({ preventScroll: true });
    }
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && fiche.classList.contains("open")) closeFiche(); });

    if (param("focus")) openFiche(param("focus"));
  }

  /* ================= Écran 2 : le Commun ================= */
  function solutionCard(s, extra) {
    var diff = ""; for (var k = 1; k <= 3; k++) diff += '<span class="pip' + (k <= s.difficulte ? " on" : "") + '"></span>';
    var diffWord = ["", "accessible", "demande de l'organisation", "exigeante"][s.difficulte];
    var coutWord = ["", "modeste", "moyen", "important"][s.cout];
    return '<article class="card sol-card fam-' + s.famille + '" data-sol="' + s.id + '">' +
      '<div class="card-top"><span class="fam-tag fam-' + s.famille + '">' + FAM[s.famille].label + "</span>" + (extra && extra.badge ? extra.badge : "") + "</div>" +
      "<h3>" + esc(s.nom) + "</h3><p>" + esc(s.change) + "</p>" +
      '<dl class="meta"><div><dt>Difficulté</dt><dd><span class="pips" aria-hidden="true">' + diff + '</span> ' + diffWord + "</dd></div>" +
      "<div><dt>Coût</dt><dd>" + coutWord + "</dd></div>" +
      "<div><dt>Éprouvé</dt><dd>sur " + s.eprouve + " projets</dd></div></dl>" +
      '<ul class="ici-chips" aria-label="ICI nourris">' + s.ici.map(function (i) { return '<li class="ici-chip">' + esc(ICI[i].nom) + "</li>"; }).join("") + "</ul>" +
      (extra && extra.actions ? '<div class="card-actions">' + extra.actions + "</div>" : "") +
      "</article>";
  }
  function iciCard(x, actions) {
    var nourri = D.solutions.filter(function (s) { return s.ici.indexOf(x.id) >= 0; }).map(function (s) { return s.nom; });
    var fam = D.iciFamilles.find(function (f) { return f.id === x.famille; });
    return '<article class="card ici-card"><div class="card-top"><span class="ici-tag">ICI · ' + fam.label + "</span></div>" +
      "<h3>" + esc(x.nom) + '</h3><p>' + esc(x.observe) + '</p><p class="muted small">Nourri par : ' + esc(nourri.join(", ")) + "</p>" +
      (actions ? '<div class="card-actions">' + actions + "</div>" : "") + "</article>";
  }
  function familyChips(host, current, onChange, withAll) {
    host.innerHTML = (withAll !== false ? '<button type="button" class="chip" data-fam="" aria-pressed="' + (!current) + '">Toutes</button>' : "") +
      D.familles.map(function (f) { return '<button type="button" class="chip fam-chip fam-' + f.id + '" data-fam="' + f.id + '" aria-pressed="' + (current === f.id) + '">' + f.label + "</button>"; }).join("");
    $all("[data-fam]", host).forEach(function (b) { b.addEventListener("click", function () { onChange(b.dataset.fam); }); });
  }

  function pageCommun() {
    var fam = "", q = "";
    function draw() {
      familyChips($("#commun-fams"), fam, function (f) { fam = f; draw(); });
      var list = D.solutions.filter(function (s) {
        if (fam && s.famille !== fam) return false;
        if (q) { var t = (s.nom + " " + s.change + " " + FAM[s.famille].label + " " + s.ici.map(function (i) { return ICI[i].nom; }).join(" ")).toLowerCase(); if (t.indexOf(q) < 0) return false; }
        return true;
      });
      $("#commun-grid").innerHTML = list.length ? list.map(function (s) { return solutionCard(s); }).join("") : '<p class="empty">Rien ne correspond encore dans le Commun. C\'est peut-être à toi de le proposer.</p>';
      var icis = D.ici.filter(function (x) { return !q || (x.nom + " " + x.observe).toLowerCase().indexOf(q) >= 0; });
      $("#ici-grid").innerHTML = icis.map(function (x) { return iciCard(x); }).join("");
      $("#commun-count").textContent = list.length ? "" : "";
    }
    $("#commun-search").addEventListener("input", function () { q = this.value.trim().toLowerCase(); draw(); });
    draw();

    // volet « Proposer une solution »
    var drawer = $("#propose");
    $("#p-famille").innerHTML = D.familles.map(function (f) { return '<option value="' + f.id + '">' + f.label + "</option>"; }).join("");
    $("#p-ici").innerHTML = D.ici.map(function (x) { return '<label class="check"><input type="checkbox" name="ici" value="' + x.id + '"> ' + esc(x.nom) + "</label>"; }).join("");
    function openDrawer() { drawer.classList.add("open"); drawer.setAttribute("aria-hidden", "false"); $("#propose-form").hidden = false; $("#propose-ok").hidden = true; $("#p-nom").focus(); }
    function closeDrawer() { drawer.classList.remove("open"); drawer.setAttribute("aria-hidden", "true"); $("#open-propose").focus(); }
    $("#open-propose").addEventListener("click", openDrawer);
    $all("[data-close-propose]").forEach(function (b) { b.addEventListener("click", closeDrawer); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && drawer.classList.contains("open")) closeDrawer(); });
    $("#propose-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var nom = $("#p-nom").value.trim();
      if (!nom) { $("#p-nom").focus(); $("#p-nom").setAttribute("aria-invalid", "true"); return; }
      state.proposals.push({ id: uid("pr"), nom: nom, famille: $("#p-famille").value, change: $("#p-change").value.trim(), ici: $all("input[name=ici]:checked").map(function (c) { return c.value; }), ou: $("#p-ou").value.trim() });
      save();
      this.reset(); $("#p-nom").removeAttribute("aria-invalid");
      this.hidden = true; $("#propose-ok").hidden = false; $("#propose-ok").focus();
      drawProposals();
    });
    function drawProposals() {
      var box = $("#my-proposals");
      box.hidden = !state.proposals.length;
      box.innerHTML = '<h3 class="mini-title">Tes propositions en relecture</h3><ul>' + state.proposals.map(function (p) { return '<li><span class="badge st-reve">En relecture</span> ' + esc(p.nom) + ' <span class="muted">(' + FAM[p.famille].label + ")</span></li>"; }).join("") + "</ul>";
    }
    drawProposals();

    // Arrivée depuis « Explorer ce projet » : mettre en avant la solution ciblée.
    var target = param("sol");
    if (target && SOL[target]) {
      var card = $('#commun-grid [data-sol="' + target + '"]');
      if (card) {
        card.classList.add("is-highlight");
        card.setAttribute("tabindex", "-1");
        setTimeout(function () { card.scrollIntoView({ behavior: "smooth", block: "center" }); card.focus({ preventScroll: true }); }, 120);
        setTimeout(function () { card.classList.remove("is-highlight"); }, 3200);
      }
    }
  }

  /* ================= Écran 3 : Rêver ================= */
  function pageRever() {
    var sel = null;
    var host = $("#map");
    var locateMove = function (lat, lng) { state.project.loc = { lat: lat, lng: lng }; save(); draw(); };
    function draw() {
      renderMap(host, { viewBox: "185 190 610 440", onSelect: select, selected: sel, locate: { onMove: function (la, ln) { locateMove(la, ln); } }, highlight: function (p) { return p.statut === "prouve" || state.pinned.indexOf(p.id) >= 0; } });
    }
    function select(id) {
      sel = id; draw();
      var p = projectById(id), card = $("#mini-fiche");
      var pinned = state.pinned.indexOf(id) >= 0;
      card.innerHTML = '<button type="button" class="icon-btn mini-close" aria-label="Fermer la mini-fiche">' + ICON.close + "</button>" +
        '<div class="mini-scene" id="mini-scene"></div><div class="mini-body">' + statutBadge(p.statut) +
        '<h3 id="mini-title" tabindex="-1">' + esc(p.nom) + '</h3><p class="muted small">' + esc(p.lieu) + "</p><p>" + esc(p.promesse) + "</p>" +
        (p.isMine ? '<p class="muted small">C\'est ton projet.</p>' : '<button type="button" class="btn ' + (pinned ? "btn-ghost" : "btn-primary") + ' btn-sm" id="pin-btn" aria-pressed="' + pinned + '">' + ICON.pin + (pinned ? " Épinglé" : " Épingler") + "</button>") + "</div>";
      card.hidden = false;
      EvadScene.render($("#mini-scene"), sceneOptionsFor(p));
      $(".mini-close", card).addEventListener("click", function () { card.hidden = true; sel = null; draw(); });
      var pb = $("#pin-btn");
      if (pb) pb.addEventListener("click", function () {
        var k = state.pinned.indexOf(id);
        if (k >= 0) { state.pinned.splice(k, 1); Deva.react("unpin"); } else { state.pinned.push(id); Deva.react("pin"); }
        save(); select(id); drawPins();
      });
      $("#mini-title").focus({ preventScroll: true });
    }
    draw();

    var name = $("#v-nom"), prom = $("#v-promesse"), reve = $("#v-reve"), coll = $("#v-collectif"), pub = $("#v-public"), next = $("#to-explorer");
    name.value = state.project.name; prom.value = state.project.promesse; reve.value = state.project.reve;
    coll.value = state.project.collectif; pub.checked = state.project.public !== false;
    function sync() {
      state.project.name = name.value; state.project.promesse = prom.value; state.project.reve = reve.value;
      state.project.collectif = coll.value; state.project.public = pub.checked; save();
      var ok = !!name.value.trim();
      next.disabled = !ok;
      $("#next-hint").hidden = ok && !!state.project.loc;
      $("#next-hint").textContent = !ok ? "Donne un nom à ton lieu pour continuer." : "Pense à situer ton lieu pour qu'il apparaisse sur la carte.";
      refreshChrome();
    }
    [name, prom, reve, coll].forEach(function (f) { f.addEventListener("input", sync); });
    pub.addEventListener("change", sync);
    var named = !!state.project.name.trim();
    name.addEventListener("change", function () { if (name.value.trim() && !named) { named = true; Deva.react("nom"); } });
    next.addEventListener("click", function () { if (!next.disabled) location.href = "explorer.html"; });

    // Géolocalisation du lieu : recherche d'adresse (Nominatim, OpenStreetMap) ou clic sur la carte.
    var geo = $("#v-geo"), geoRes = $("#v-geo-results"), geoStatus = $("#v-geo-status");
    geo.value = state.project.lieu;
    function shortLabel(r) {
      var a = r.address || {}, town = a.city || a.town || a.village || a.municipality || a.hamlet || "";
      var road = a.road ? (a.house_number ? a.house_number + " " : "") + a.road : "";
      return [road, town].filter(Boolean).join(", ") + (a.postcode ? " (" + a.postcode + ")" : "") || r.display_name;
    }
    function setLieu(lat, lng, label, recenter) {
      state.project.loc = { lat: +lat, lng: +lng };
      if (label) { state.project.lieu = label; geo.value = label; }
      geoStatus.textContent = "Lieu situé" + (label ? " : " + label : "") + ".";
      save(); sync(); draw();
      if (recenter && host._lmap) host._lmap.setView([+lat, +lng], 13);
    }
    function search() {
      var q = geo.value.trim(); if (q.length < 3) { geoStatus.textContent = "Tape au moins 3 caractères."; return; }
      geoStatus.textContent = "Recherche…"; geoRes.innerHTML = "";
      fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&countrycodes=fr&accept-language=fr&q=" + encodeURIComponent(q))
        .then(function (r) { return r.json(); })
        .then(function (list) {
          if (!list.length) { geoStatus.textContent = "Aucun résultat. Essaie avec la commune seule, ou clique directement la carte."; return; }
          geoStatus.textContent = list.length + " résultat" + (list.length > 1 ? "s" : "") + " : choisis le bon.";
          geoRes.innerHTML = list.map(function (r, k) { return '<li><button type="button" data-k="' + k + '">' + esc(r.display_name) + "</button></li>"; }).join("");
          $all("button", geoRes).forEach(function (b) { b.addEventListener("click", function () {
            var r = list[+b.dataset.k]; geoRes.innerHTML = ""; setLieu(r.lat, r.lon, shortLabel(r), true);
          }); });
          var first = $("button", geoRes); if (first) first.focus();
        })
        .catch(function () { geoStatus.textContent = "Recherche indisponible pour l'instant. Clique directement la carte pour situer ton lieu."; });
    }
    $("#v-geo-btn").addEventListener("click", search);
    geo.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); search(); } });
    // Clic ou glisser sur la carte : on situe, puis on retrouve la commune.
    locateMove = function (lat, lng) {
      setLieu(lat, lng, null, false);
      fetch("https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=16&accept-language=fr&lat=" + lat + "&lon=" + lng)
        .then(function (r) { return r.json(); })
        .then(function (r) { if (r && r.address) { state.project.lieu = shortLabel(r); geo.value = state.project.lieu; geoStatus.textContent = "Lieu situé : " + state.project.lieu + "."; save(); } })
        .catch(function () { /* la position suffit */ });
    };
    if (state.project.loc && host._lmap) host._lmap.setView([state.project.loc.lat, state.project.loc.lng], 11);
    sync();

    function drawPins() {
      var ul = $("#pins");
      if (!state.pinned.length) { ul.innerHTML = '<li class="empty">Aucun projet épinglé. Clique un projet sur la carte pour t\'en inspirer.</li>'; return; }
      ul.innerHTML = state.pinned.map(function (id) {
        var p = projectById(id); if (!p) return "";
        return '<li class="pin-item"><span class="dot st-' + p.statut + '" aria-hidden="true"></span><button type="button" class="link-btn" data-show="' + id + '">' + esc(p.nom) + '</button><button type="button" class="icon-btn icon-sm" data-unpin="' + id + '" aria-label="Retirer ' + esc(p.nom) + ' de mes inspirations">' + ICON.close + "</button></li>";
      }).join("");
      $all("[data-unpin]", ul).forEach(function (b) { b.addEventListener("click", function () { state.pinned.splice(state.pinned.indexOf(b.dataset.unpin), 1); save(); drawPins(); if (sel) select(sel); }); });
      $all("[data-show]", ul).forEach(function (b) { b.addEventListener("click", function () { select(b.dataset.show); }); });
    }
    drawPins();

    /* Deva t'accueille : raconte ton lieu idéal, elle propose des projets voisins dont t'inspirer. */
    var STOP = " le la les un une des de du d et a au aux en dans pour par sur avec sans vers chez que qui quoi ou mon ma mes ton ta tes son sa ses notre nos leur leurs ce cet cette ces on nous vous ils elles il elle je tu se est sont etre avoir plus moins tres bien plutot aussi comme lieu projet envie reve rever ".split(" ");
    function nrm(s) { return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
    function toks(s) { return nrm(s).split(/[^a-z0-9]+/).filter(function (w) { return w.length >= 3 && STOP.indexOf(w) < 0; }); }
    // Corpus par projet : promesse, collectif, lieu, familles et noms des solutions.
    function corpus(p) {
      var sols = (p.solutions || []).map(function (s) { var so = SOL[s[0]]; return so ? so.nom + " " + (FAM[so.famille] ? FAM[so.famille].label : "") : ""; }).join(" ");
      return nrm([p.nom, p.promesse, p.collectif, p.lieu, sols].join(" "));
    }
    function matchProjects(txt) {
      var words = toks(txt);
      if (!words.length) return [];
      var scored = D.projets.map(function (p) {
        var c = corpus(p), s = 0;
        words.forEach(function (w) { if (c.indexOf(w) >= 0) s += 1; });
        if (p.statut === "prouve") s += 0.3; // à mots égaux, on met en avant ce qui est prouvé
        return { p: p, s: s };
      }).filter(function (x) { return x.s > 0; }).sort(function (a, b) { return b.s - a.s; });
      return scored.slice(0, 3).map(function (x) { return x.p; });
    }
    function proven() { return D.projets.filter(function (p) { return p.statut === "prouve"; }).slice(0, 3); }
    function onDream(txt) {
      state.project.reveBrief = txt; save();
      var found = matchProjects(txt), fallback = !found.length;
      var list = fallback ? proven() : found;
      var actions = list.map(function (p) { return { label: p.nom, once: false, onClick: function () { select(p.id); if (host._lmap && p.lat != null) host._lmap.setView([p.lat, p.lng], 9); } }; });
      actions.push({ label: "Reprendre mes mots dans ma vision", primary: true, onClick: function () {
        reve.value = reve.value.trim() ? reve.value + "\n" + txt : txt;
        state.project.reve = reve.value; save(); reve.focus();
      } });
      var intro = fallback
        ? "Joli rêve. Je n'ai pas trouvé de jumeau évident, alors inspire-toi de ces lieux déjà prouvés. Clique pour les voir, épingle ceux qui te parlent :"
        : "Ton lieu idéal me fait penser à " + (list.length > 1 ? "ces projets" : "ce projet") + ". Clique pour les voir sur la carte et épingle ceux qui t'inspirent :";
      return { text: intro, actions: actions };
    }
    if (!state.project.name.trim() && !state.project.reveBrief && window.Deva && Deva.prompt) {
      setTimeout(function () {
        Deva.prompt("Avant de nommer ton lieu, raconte-moi ton lieu idéal en quelques mots : ce qu'on y fait, pour qui, ce que ça change autour.", onDream);
      }, 700);
    }
  }

  /* ================= Écran 4 : Explorer ================= */
  function wrapWords(text, max) {
    var words = text.split(/\s+/), lines = [], cur = "";
    words.forEach(function (w) { if ((cur + " " + w).trim().length > max && cur) { lines.push(cur); cur = w; } else cur = (cur + " " + w).trim(); });
    if (cur) lines.push(cur);
    return lines;
  }
  function pageExplorer() {
    var fam = "", pulse = null;
    function chosenIn(spaceId) { return state.chosen.filter(function (c) { return c.spaceId === spaceId; }); }

    function drawMind() {
      var W = 620, H = 450, cx = 310, cy = 222, n = state.spaces.length;
      var svg = '<svg viewBox="0 0 ' + W + " " + H + '" class="mind-svg" role="group" aria-label="Carte mentale des espaces du projet">';
      var nodes = state.spaces.map(function (s, k) {
        var a = -Math.PI / 2 + k * 2 * Math.PI / n;
        return { s: s, x: cx + Math.cos(a) * 205, y: cy + Math.sin(a) * 158 };
      });
      nodes.forEach(function (nd) { svg += '<path class="mind-line' + (nd.s.id === state.selectedSpace ? " is-sel" : "") + '" d="M' + cx + " " + cy + " Q" + ((cx + nd.x) / 2) + " " + ((cy + nd.y) / 2 + 18) + " " + nd.x + " " + nd.y + '"/>'; });
      var lines = wrapWords(projectName(), 13);
      svg += '<g class="mind-center"><circle cx="' + cx + '" cy="' + cy + '" r="62"/>' + lines.map(function (l, k) { return '<text x="' + cx + '" y="' + (cy + (k - (lines.length - 1) / 2) * 18 + 6) + '">' + esc(l) + "</text>"; }).join("") + "</g>";
      nodes.forEach(function (nd) {
        var sols = chosenIn(nd.s.id), shown = sols.slice(0, 3), h = 44 + (sols.length ? shown.length * 17 + (sols.length > 3 ? 17 : 0) + 4 : 0), w = 180;
        var sel = nd.s.id === state.selectedSpace;
        svg += '<g class="mind-node' + (sel ? " is-sel" : "") + (pulse === nd.s.id ? " pulse-once" : "") + '" role="button" tabindex="0" data-space="' + nd.s.id + '" aria-pressed="' + sel + '" aria-label="Espace ' + esc(nd.s.nom) + (sols.length ? ", solutions : " + esc(sols.map(function (c) { return SOL[c.solId].nom; }).join(", ")) : ", aucune solution") + '">' +
          '<rect x="' + (nd.x - w / 2) + '" y="' + (nd.y - 23) + '" width="' + w + '" height="' + h + '" rx="16"/>' +
          '<text class="mind-name" x="' + nd.x + '" y="' + (nd.y + 5) + '">' + esc(nd.s.nom) + "</text>" +
          shown.map(function (c, k) { return '<text class="mind-sol" x="' + (nd.x - w / 2 + 16) + '" y="' + (nd.y + 32 + k * 17) + '">+ ' + esc(SOL[c.solId].nom.length > 21 ? SOL[c.solId].nom.slice(0, 20) + "…" : SOL[c.solId].nom) + "</text>"; }).join("") +
          (sols.length > 3 ? '<text class="mind-sol" x="' + (nd.x - w / 2 + 16) + '" y="' + (nd.y + 32 + 3 * 17) + '">et ' + (sols.length - 3 === 1 ? "une autre" : "d'autres") + "</text>" : "") +
          "</g>";
      });
      svg += "</svg>";
      $("#mind").innerHTML = svg;
      pulse = null;
      $all(".mind-node").forEach(function (g) {
        function pick() { state.selectedSpace = g.dataset.space; save(); drawAll(); var el = $('.mind-node[data-space="' + g.dataset.space + '"]'); if (el) el.focus(); }
        g.addEventListener("click", pick);
        g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
      });
      $("#sel-space").textContent = spaceName(state.selectedSpace);
    }

    function drawCommun() {
      familyChips($("#ex-fams"), fam, function (f) { fam = f; drawCommun(); });
      var sugg = D.suggestionsParEspace[state.selectedSpace] || [];
      var list = D.solutions.filter(function (s) { return !fam || s.famille === fam; });
      list.sort(function (a, b) { return (sugg.indexOf(a.id) < 0) - (sugg.indexOf(b.id) < 0); });
      $("#ex-list").innerHTML = list.map(function (s) {
        var c = state.chosen.find(function (x) { return x.solId === s.id; });
        var actions = c
          ? '<span class="added">' + ICON.check + " Dans " + esc(spaceName(c.spaceId)) + '</span><button type="button" class="link-btn" data-remove="' + s.id + '">Retirer</button>'
          : '<button type="button" class="btn btn-primary btn-sm" data-add="' + s.id + '">Ajouter à mon projet</button>';
        return solutionCard(s, { badge: sugg.indexOf(s.id) >= 0 ? '<span class="deva-badge">' + leafSvg("") + "Deva propose</span>" : "", actions: actions });
      }).join("") + '<h3 class="col-sub">Indicateurs ICI</h3>' + D.ici.map(function (x) {
        var on = state.icis.indexOf(x.id) >= 0;
        return iciCard(x, on ? '<span class="added">' + ICON.check + ' Suivi dans mon projet</span><button type="button" class="link-btn" data-ici-off="' + x.id + '">Retirer</button>' : '<button type="button" class="btn btn-amber btn-sm" data-ici="' + x.id + '">Ajouter à mon projet</button>');
      }).join("");
      $all("[data-add]").forEach(function (b) { b.addEventListener("click", function () {
        state.chosen.push({ id: uid("c"), solId: b.dataset.add, spaceId: state.selectedSpace }); save();
        pulse = state.selectedSpace; drawAll(); Deva.react("add:" + b.dataset.add, "add");
        var again = $('[data-remove="' + b.dataset.add + '"]'); if (again) again.focus();
      }); });
      $all("[data-remove]").forEach(function (b) { b.addEventListener("click", function () {
        var c = state.chosen.find(function (x) { return x.solId === b.dataset.remove; });
        state.chosen = state.chosen.filter(function (x) { return x !== c; });
        state.placed = state.placed.filter(function (p) { return p.chosenId !== c.id; });
        save(); drawAll();
      }); });
      $all("[data-ici]").forEach(function (b) { b.addEventListener("click", function () { state.icis.push(b.dataset.ici); save(); drawCommun(); toast("ICI ajouté : tu pourras le nourrir avec tes preuves."); }); });
      $all("[data-ici-off]").forEach(function (b) { b.addEventListener("click", function () { state.icis = state.icis.filter(function (x) { return x !== b.dataset.iciOff; }); save(); drawCommun(); }); });
    }

    function drawChosen() {
      var ul = $("#chosen");
      if (!state.chosen.length) { ul.innerHTML = '<li class="empty">Aucune solution choisie. Sélectionne un espace, puis ajoute des solutions du Commun à droite.</li>'; return; }
      ul.innerHTML = state.chosen.map(function (c) {
        return '<li class="chosen-item fam-' + SOL[c.solId].famille + '"><span class="fam-dot" aria-hidden="true"></span><span><strong>' + esc(SOL[c.solId].nom) + '</strong> <span class="muted">dans ' + esc(spaceName(c.spaceId)) + '</span></span><button type="button" class="icon-btn icon-sm" data-unchoose="' + c.id + '" aria-label="Retirer ' + esc(SOL[c.solId].nom) + '">' + ICON.close + "</button></li>";
      }).join("");
      $all("[data-unchoose]", ul).forEach(function (b) { b.addEventListener("click", function () {
        state.chosen = state.chosen.filter(function (x) { return x.id !== b.dataset.unchoose; });
        state.placed = state.placed.filter(function (p) { return p.chosenId !== b.dataset.unchoose; });
        save(); drawAll();
      }); });
    }
    function drawAll() { drawMind(); drawCommun(); drawChosen(); refreshChrome(); }

    $("#add-space").addEventListener("submit", function (e) {
      e.preventDefault();
      var input = $("#space-name"), nom = input.value.trim() || "Nouvel espace";
      if (state.spaces.length >= 8) { toast("Huit espaces, c'est déjà un beau lieu. Regroupe avant d'en ajouter."); return; }
      var s = { id: uid("s"), nom: nom }; state.spaces.push(s); state.selectedSpace = s.id; save();
      input.value = ""; pulse = s.id; drawAll(); Deva.react("espace");
    });
    drawAll();
  }

  /* ================= Vadance (jauges en feuilles) ================= */
  function vadanceHtml() {
    var all = familySums(), enc = familySums(function (p) { return p.status !== "prevu"; }), ver = familySums(function (p) { return p.status === "verifie"; });
    return D.iciFamilles.map(function (f) {
      var la = levelFrom(all[f.id]), le = levelFrom(enc[f.id]), lv = levelFrom(ver[f.id]), leaves = "";
      for (var k = 0; k < 5; k++) leaves += leafSvg(k < lv ? "on-green" : k < le ? "on-amber" : k < la ? "on-grey" : "off");
      return '<div class="vad-row"><div class="vad-head"><span class="vad-lbl">' + f.label + '</span><span class="vad-word">' + LEVEL_WORDS[la] + '</span></div><span class="leaves leaves-lg" role="img" aria-label="' + f.label + " : impact prévu " + LEVEL_WORDS[la] + '">' + leaves + "</span></div>";
    }).join("");
  }

  /* ================= Écran 5 : Générer ================= */
  function pageGenerer() {
    var armed = null, api = null;
    var wrap = $("#scene-wrap"), stage = $("#scene");
    function toPlace() { return state.chosen.filter(function (c) { return !state.placed.some(function (p) { return p.chosenId === c.id; }); }); }

    function drawBar() {
      var bar = $("#to-place"), list = toPlace();
      if (!state.chosen.length) {
        bar.innerHTML = '<p class="empty">Tu n\'as pas encore choisi de solutions. <a href="explorer.html">Retourner à Explorer</a> ou <button type="button" class="link-btn" id="take-sugg">reprendre les suggestions de Deva</button>.</p>';
        $("#take-sugg").addEventListener("click", function () {
          ["haie", "recup-eau", "solaire", "four"].forEach(function (id, k) { if (!state.chosen.some(function (c) { return c.solId === id; })) state.chosen.push({ id: uid("c"), solId: id, spaceId: ["jardin", "jardin", "atelier", "cafe"][k] }); });
          save(); drawBar(); refreshChrome(); Deva.say("Voici quatre solutions éprouvées du Commun. Tu restes libre de les poser ou non.");
        });
        return;
      }
      if (!list.length) { bar.innerHTML = '<p class="empty">Toutes tes solutions sont posées. Tu peux <a href="explorer.html">en ajouter</a> ou passer à Entreprendre.</p>'; return; }
      bar.innerHTML = list.map(function (c) {
        var s = SOL[c.solId];
        return '<button type="button" class="sol-chip fam-' + s.famille + (armed === c.id ? " is-armed" : "") + '" draggable="true" data-chosen="' + c.id + '" aria-pressed="' + (armed === c.id) + '"><span class="fam-dot" aria-hidden="true"></span>' + esc(s.nom) + "</button>";
      }).join("");
      $all(".sol-chip", bar).forEach(function (b) {
        b.addEventListener("dragstart", function (e) { armed = b.dataset.chosen; e.dataTransfer.setData("text/plain", b.dataset.chosen); e.dataTransfer.effectAllowed = "copy"; wrap.classList.add("is-dropping"); });
        b.addEventListener("dragend", function () { wrap.classList.remove("is-dropping"); if (api) api.showHover(null); });
        b.addEventListener("click", function () { armed = armed === b.dataset.chosen ? null : b.dataset.chosen; drawBar(); drawHint(); var again = $('[data-chosen="' + b.dataset.chosen + '"]'); if (again) again.focus(); });
      });
    }
    function drawHint() {
      var h = $("#place-hint");
      if (!armed) { h.hidden = true; wrap.classList.remove("is-armed"); return; }
      var c = state.chosen.find(function (x) { return x.id === armed; });
      h.hidden = false; wrap.classList.add("is-armed");
      h.innerHTML = "Clique une case d'herbe libre pour poser <strong>" + esc(SOL[c.solId].nom) + '</strong>. <button type="button" class="link-btn" id="auto-place">Poser sur une case libre</button> <button type="button" class="link-btn" id="cancel-arm">Annuler</button>';
      $("#auto-place").addEventListener("click", function () { var cell = api.firstFree(function (x) { return Math.abs(x.i - 4) + Math.abs(x.j - 4); }); if (cell) place(armed, cell.i, cell.j); });
      $("#cancel-arm").addEventListener("click", function () { armed = null; drawBar(); drawHint(); });
    }
    function drawScene(focusUid) {
      api = EvadScene.render(stage, myScene({ interactive: true, label: "Maquette 2.5D de " + projectName() + ". Glisse une solution sur une case d'herbe libre." }));
      $all(".iso-item", stage).forEach(function (g) {
        g.addEventListener("click", function (e) { e.stopPropagation(); openMenu(g.dataset.uid, g); });
        g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openMenu(g.dataset.uid, g); } });
      });
      if (focusUid) { var f = $('.iso-item[data-uid="' + focusUid + '"]', stage); if (f) f.focus({ preventScroll: true }); }
    }
    function drawVadance() { $("#vadance").innerHTML = vadanceHtml(); }
    function place(chosenId, i, j) {
      var c = state.chosen.find(function (x) { return x.id === chosenId; }); if (!c) return;
      if (!api.isFree(i, j)) { toast("Cette case est occupée. Choisis une case d'herbe libre."); return; }
      var p = { uid: uid("p"), chosenId: c.id, solId: c.solId, spaceId: c.spaceId, i: i, j: j, status: "prevu" };
      state.placed.push(p); save(); armed = null;
      drawScene(p.uid); drawBar(); drawHint(); drawVadance(); refreshChrome();
      Deva.react("place:" + c.solId, "place");
    }
    // glisser-déposer
    wrap.addEventListener("dragover", function (e) { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; api.showHover(api.cellFromPoint(e.clientX, e.clientY)); });
    wrap.addEventListener("dragleave", function (e) { if (!wrap.contains(e.relatedTarget)) api.showHover(null); });
    wrap.addEventListener("drop", function (e) {
      e.preventDefault(); wrap.classList.remove("is-dropping"); api.showHover(null);
      var id = e.dataTransfer.getData("text/plain") || armed, cell = api.cellFromPoint(e.clientX, e.clientY);
      if (!cell) { toast("Dépose la solution sur le terrain."); return; }
      place(id, cell.i, cell.j);
    });
    // poser au clic (tactile et souris)
    stage.addEventListener("mousemove", function (e) { if (armed) api.showHover(api.cellFromPoint(e.clientX, e.clientY)); });
    stage.addEventListener("mouseleave", function () { if (armed) api.showHover(null); });
    stage.addEventListener("click", function (e) {
      if (!armed) return;
      var cell = api.cellFromPoint(e.clientX, e.clientY);
      if (cell) place(armed, cell.i, cell.j);
    });

    // mini-menu d'un élément posé
    var menu = $("#item-menu");
    function closeMenu(refocus) { if (menu.hidden) return; var u = menu.dataset.uid; menu.hidden = true; if (refocus) { var g = $('.iso-item[data-uid="' + u + '"]'); if (g) g.focus(); } }
    function openMenu(u, g) {
      var p = state.placed.find(function (x) { return x.uid === u; }); if (!p) return;
      var r = g.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
      menu.dataset.uid = u;
      menu.innerHTML = '<p class="menu-title">' + esc(SOL[p.solId].nom) + ' <span class="badge st-' + ({ prevu: "reve", encours: "encours", verifie: "prouve" })[p.status] + '">' + STATUS_LABEL[p.status] + "</span></p>" +
        (p.status === "prevu" ? '<button type="button" role="menuitem" data-act="encours"><span class="dot st-encours"></span>Marquer en cours</button>' : "") +
        (p.status === "encours" ? '<button type="button" role="menuitem" data-act="prevu"><span class="dot st-reve"></span>Remettre en prévu</button>' : "") +
        (p.status === "verifie" ? '<a role="menuitem" href="nourrir.html"><span class="dot st-prouve"></span>Voir la preuve</a>' : '<a role="menuitem" href="nourrir.html?pour=' + u + '"><span class="dot st-prouve"></span>Apporter une preuve</a>') +
        '<button type="button" role="menuitem" data-act="retirer" class="danger">Retirer</button>';
      menu.hidden = false;
      var x = Math.min(Math.max(8, r.left - wr.left + r.width / 2 - 110), wr.width - 228), y = r.top - wr.top + r.height + 6;
      if (y + menu.offsetHeight > wr.height) y = Math.max(8, r.top - wr.top - menu.offsetHeight - 6);
      menu.style.left = x + "px"; menu.style.top = y + "px";
      $all("[data-act]", menu).forEach(function (b) { b.addEventListener("click", function () {
        var act = b.dataset.act;
        if (act === "retirer") { state.placed = state.placed.filter(function (x) { return x.uid !== u; }); Deva.react("retire"); closeMenu(); }
        else { p.status = act; if (act === "encours") Deva.react("encours"); }
        save(); menu.hidden = true; drawScene(act === "retirer" ? null : u); drawBar(); drawVadance(); refreshChrome();
      }); });
      var first = $("[role=menuitem]", menu); if (first) first.focus();
    }
    menu.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu(true);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        var items = $all("[role=menuitem]", menu), k = items.indexOf(document.activeElement);
        e.preventDefault(); items[(k + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length].focus();
      }
    });
    document.addEventListener("click", function (e) { if (!menu.contains(e.target) && !e.target.closest(".iso-item")) closeMenu(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && armed) { armed = null; drawBar(); drawHint(); } });

    $("#luanti").addEventListener("click", function () {
      openModal("Visiter en 3D dans Luanti", "<p><strong>Bientôt disponible.</strong></p><p>Tu pourras te promener dans ta maquette en 3D, dans Luanti, un monde libre et ouvert, avant même le premier coup de pioche. Idéal pour la montrer aux voisins et aux partenaires.</p>", '<button type="button" class="btn btn-primary" data-close>J\'ai compris</button>');
    });

    drawBar(); drawScene(); drawVadance();
  }

  /* ================= Écran 6 : Entreprendre ================= */
  function questFor(p) {
    var q = D.quetes.find(function (x) { return x.solution === p.solId; });
    return { titre: q ? q.titre : "Mettre en place : " + SOL[p.solId].nom.toLowerCase(), aide: q ? q.aide : "Un premier chantier simple, à caler en conseil de lieu." };
  }
  function pageEntreprendre() {
    var skip = 0;
    var COLS = [{ id: "prevu", label: "À faire" }, { id: "encours", label: "En cours" }, { id: "verifie", label: "Vérifié" }];
    function move(u, to) {
      var p = state.placed.find(function (x) { return x.uid === u; }); if (!p || p.status === to) return;
      if (to === "verifie") {
        Deva.react("quest-proof");
        openModal("Une preuve pour passer en vérifié", "<p>Une quête passe en <strong>vérifié</strong> seulement avec une preuve de terrain : une photo, une mesure, une date.</p><p class='muted'>Quête : " + esc(questFor(p).titre) + "</p>",
          '<button type="button" class="btn btn-ghost" data-close>Plus tard</button><a class="btn btn-primary" href="nourrir.html?pour=' + u + '">Apporter la preuve</a>');
        return;
      }
      if (p.status === "verifie") { toast("Cette quête est vérifiée par une preuve, elle reste au vert."); return; }
      p.status = to; save();
      if (to === "encours") Deva.react("quest-start");
      draw(); refreshChrome();
      var c = $('.q-card[data-uid="' + u + '"]'); if (c) c.focus();
    }
    function drawNext() {
      var box = $("#next-step");
      var todo = state.placed.filter(function (p) { return p.status === "prevu"; });
      var doing = state.placed.filter(function (p) { return p.status === "encours"; });
      var html;
      if (!state.placed.length) {
        html = '<p class="kicker">Le prochain pas, proposé par Deva</p><h2>Pose d\'abord tes solutions sur la maquette</h2><p>Chaque solution posée à l\'étape Générer devient ici une quête.</p><div class="next-actions"><a class="btn btn-amber" href="generer.html">C\'est parti</a></div>';
      } else if (todo.length) {
        var p = todo[skip % todo.length], q = questFor(p);
        html = '<p class="kicker">Le prochain pas, proposé par Deva</p><h2>' + esc(q.titre) + "</h2><p>" + esc(q.aide) + ' C\'est un pas simple et visible pour lancer le collectif.</p><div class="next-actions"><button type="button" class="btn btn-amber" id="go-next" data-uid="' + p.uid + '">C\'est parti</button>' + (todo.length > 1 ? '<button type="button" class="btn btn-on-dark" id="other-next">Proposer un autre pas</button>' : "") + "</div>";
      } else if (doing.length) {
        var d = doing[0];
        html = '<p class="kicker">Le prochain pas, proposé par Deva</p><h2>Apporter la preuve : ' + esc(questFor(d).titre.toLowerCase()) + '</h2><p>Une photo et une mesure suffisent pour que ton lieu passe au vert.</p><div class="next-actions"><a class="btn btn-amber" href="nourrir.html?pour=' + d.uid + '">C\'est parti</a></div>';
      } else {
        html = '<p class="kicker">Le prochain pas, proposé par Deva</p><h2>Tout est vérifié. La preuve rouvre le rêve.</h2><p>Ajoute un nouvel espace ou une nouvelle solution pour continuer à faire pousser le lieu.</p><div class="next-actions"><a class="btn btn-amber" href="explorer.html">C\'est parti</a></div>';
      }
      box.innerHTML = html;
      var go = $("#go-next"); if (go) go.addEventListener("click", function () { move(go.dataset.uid, "encours"); });
      var other = $("#other-next"); if (other) other.addEventListener("click", function () { skip++; drawNext(); $("#other-next").focus(); });
    }
    function draw() {
      drawNext();
      var board = $("#kanban");
      board.innerHTML = COLS.map(function (col) {
        var items = state.placed.filter(function (p) { return p.status === col.id; });
        return '<section class="k-col k-' + col.id + '" data-col="' + col.id + '" aria-labelledby="kh-' + col.id + '"><h2 class="k-head" id="kh-' + col.id + '"><span class="dot st-' + ({ prevu: "reve", encours: "encours", verifie: "prouve" })[col.id] + '" aria-hidden="true"></span>' + col.label + "</h2>" +
          '<ul class="k-list">' + (items.length ? items.map(function (p) {
            var q = questFor(p), s = SOL[p.solId];
            var btns = col.id === "prevu" ? '<button type="button" class="btn btn-sm btn-ghost" data-move="encours" data-uid="' + p.uid + '">Démarrer ' + ICON.arrow + "</button>"
              : col.id === "encours" ? '<button type="button" class="btn btn-sm btn-ghost icon-left" data-move="prevu" data-uid="' + p.uid + '" aria-label="Remettre à faire">' + ICON.back + '</button><button type="button" class="btn btn-sm btn-primary" data-move="verifie" data-uid="' + p.uid + '">Vérifier ' + ICON.arrow + "</button>"
              : '<span class="added">' + ICON.check + " Preuve reçue</span>";
            return '<li class="q-card" draggable="' + (col.id !== "verifie") + '" tabindex="-1" data-uid="' + p.uid + '"><p class="q-title">' + esc(q.titre) + '</p><p class="q-meta"><span class="fam-tag fam-' + s.famille + '">' + esc(s.nom) + '</span><span class="muted">' + esc(spaceName(p.spaceId)) + '</span></p><div class="q-actions">' + btns + "</div></li>";
          }).join("") : '<li class="k-empty">' + (col.id === "prevu" && !state.placed.length ? 'Rien pour l\'instant. <a href="generer.html">Poser des solutions</a>' : "Glisse une quête ici") + "</li>") + "</ul></section>";
      }).join("");
      $all("[data-move]", board).forEach(function (b) { b.addEventListener("click", function () { move(b.dataset.uid, b.dataset.move); }); });
      $all(".q-card[draggable=true]", board).forEach(function (c) {
        c.addEventListener("dragstart", function (e) { e.dataTransfer.setData("text/plain", c.dataset.uid); c.classList.add("is-dragging"); });
        c.addEventListener("dragend", function () { c.classList.remove("is-dragging"); });
      });
      $all(".k-col", board).forEach(function (col) {
        col.addEventListener("dragover", function (e) { e.preventDefault(); col.classList.add("is-over"); });
        col.addEventListener("dragleave", function (e) { if (!col.contains(e.relatedTarget)) col.classList.remove("is-over"); });
        col.addEventListener("drop", function (e) { e.preventDefault(); col.classList.remove("is-over"); move(e.dataTransfer.getData("text/plain"), col.dataset.col); });
      });
      drawProgress();
    }
    function drawProgress() {
      var box = $("#progress");
      var spaces = state.spaces.filter(function (s) { return state.placed.some(function (p) { return p.spaceId === s.id; }); });
      if (!spaces.length) { box.innerHTML = '<p class="empty">L\'avancement par espace apparaîtra quand tu auras posé des solutions.</p>'; return; }
      box.innerHTML = spaces.map(function (s) {
        var ps = state.placed.filter(function (p) { return p.spaceId === s.id; });
        var order = { verifie: 0, encours: 1, prevu: 2 }; ps.sort(function (a, b) { return order[a.status] - order[b.status]; });
        var all = ps.every(function (p) { return p.status === "verifie"; }), some = ps.some(function (p) { return p.status !== "prevu"; });
        var word = all ? "tout est vérifié" : some ? "ça avance" : "tout reste à faire";
        return '<div class="prog-row"><span class="prog-lbl">' + esc(s.nom) + '</span><div class="prog-bar" role="img" aria-label="' + esc(s.nom) + " : " + word + '">' + ps.map(function (p) { return '<span class="seg seg-' + p.status + '" title="' + esc(SOL[p.solId].nom) + " : " + STATUS_LABEL[p.status] + '"></span>'; }).join("") + '</div><span class="prog-word">' + word + "</span></div>";
      }).join("");
    }
    draw();
  }

  /* ================= Écran 7 : Nourrir ================= */
  function pageNourrir() {
    var photo = false, justVerified = null;
    var sel = $("#pr-item"), iciSel = $("#pr-ici"), mesure = $("#pr-mesure"), date = $("#pr-date");
    date.value = today();
    iciSel.innerHTML = D.iciFamilles.map(function (f) {
      return '<optgroup label="' + f.label + '">' + D.ici.filter(function (x) { return x.famille === f.id; }).map(function (x) { return '<option value="' + x.id + '">' + esc(x.nom) + (state.icis.indexOf(x.id) >= 0 ? " (suivi)" : "") + "</option>"; }).join("") + "</optgroup>";
    }).join("");

    function drawSelect(pref) {
      var form = $("#proof-form"), none = $("#proof-none");
      if (!state.placed.length) { form.hidden = true; none.hidden = false; return; }
      form.hidden = false; none.hidden = true;
      var order = { encours: 0, prevu: 1, verifie: 2 };
      var list = state.placed.slice().sort(function (a, b) { return order[a.status] - order[b.status]; });
      sel.innerHTML = list.map(function (p) { return '<option value="' + p.uid + '">' + esc(SOL[p.solId].nom) + " (" + STATUS_LABEL[p.status] + ")</option>"; }).join("");
      if (pref && list.some(function (p) { return p.uid === pref; })) sel.value = pref;
      syncIci();
    }
    function current() { return state.placed.find(function (p) { return p.uid === sel.value; }); }
    function syncIci() {
      var p = current(); if (!p) return;
      var s = SOL[p.solId]; iciSel.value = s.ici[0];
      mesure.placeholder = "Ex. " + s.mesureExemple.toLowerCase();
    }
    sel.addEventListener("change", syncIci);
    $("#pr-example").addEventListener("click", function () { var p = current(); if (p) { mesure.value = SOL[p.solId].mesureExemple; mesure.removeAttribute("aria-invalid"); $("#pr-err").hidden = true; } });
    $("#pr-photo").addEventListener("click", function () {
      photo = !photo; this.classList.toggle("has-photo", photo); this.setAttribute("aria-pressed", String(photo));
      $("#pr-photo-txt").textContent = photo ? "Photo ajoutée (factice). Toucher pour retirer" : "Ajouter une photo";
    });

    function drawScene() {
      EvadScene.render($("#nr-scene"), myScene({ justVerified: justVerified }));
      var ver = state.placed.filter(function (p) { return p.status === "verifie"; }).length;
      $("#scene-state").textContent = !state.placed.length ? "Aucun élément posé." : ver === 0 ? "Rien n'est encore vérifié : le lieu attend ses premières preuves." : ver === state.placed.length ? "Tout le lieu est vérifié." : "Le lieu commence à verdir.";
    }
    function drawJournal() {
      var ul = $("#journal");
      if (!state.proofs.length) { ul.innerHTML = '<li class="empty">Le journal est vide. Ta première preuve apparaîtra ici.</li>'; return; }
      ul.innerHTML = state.proofs.map(function (pr) {
        return '<li class="proof-item"><div class="proof-thumb' + (pr.photo ? " has-photo" : "") + '" aria-hidden="true">' + (pr.photo ? leafSvg("on-green") : ICON.photo) + '</div><div><p class="proof-head"><strong>' + esc(SOL[pr.solId].nom) + '</strong><span class="badge st-prouve">vérifié</span></p><p>' + esc(pr.mesure) + '</p><p class="muted small">' + frDate(pr.date) + " · " + esc(ICI[pr.ici].nom) + (pr.photo ? " · photo jointe" : "") + "</p></div></li>";
      }).join("");
    }
    function drawBars() {
      var all = familySums(), ver = familySums(function (p) { return p.status === "verifie"; });
      var MAX = 9;
      $("#vad-vs").innerHTML = D.iciFamilles.map(function (f) {
        var a = Math.min(100, all[f.id] / MAX * 100), v = Math.min(100, ver[f.id] / MAX * 100);
        var word = !all[f.id] ? "rien de prévu" : !ver[f.id] ? "prévu, pas encore vérifié" : ver[f.id] >= all[f.id] ? "tout le prévu est vérifié" : "en partie vérifié";
        return '<div class="vv-row"><span class="vv-lbl">' + f.label + '</span><div class="vv-bar" role="img" aria-label="' + f.label + " : " + word + '"><span class="vv-planned" style="width:' + a + '%"></span><span class="vv-verified" style="width:' + v + '%"></span></div><span class="vv-word">' + word + "</span></div>";
      }).join("");
    }
    function drawLoop() {
      var green = fricheStatut() === "prouve";
      $("#loop").classList.toggle("is-green", green);
      $("#loop-state").textContent = green ? "Ton projet est passé au vert sur la carte : il peut inspirer d'autres collectifs." : "Encore quelques preuves et le projet passera au vert sur la carte.";
    }
    function drawAll() { drawScene(); drawJournal(); drawBars(); drawLoop(); refreshChrome(); }

    $("#proof-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var p = current(); if (!p) return;
      if (!mesure.value.trim()) { mesure.setAttribute("aria-invalid", "true"); $("#pr-err").hidden = false; mesure.focus(); return; }
      var before = verifiedCount();
      state.proofs.unshift({ id: uid("pv"), uid: p.uid, solId: p.solId, mesure: mesure.value.trim(), date: date.value || today(), ici: iciSel.value, photo: photo });
      p.status = "verifie"; save();
      justVerified = p.uid;
      mesure.value = ""; photo = false; $("#pr-photo").classList.remove("has-photo"); $("#pr-photo").setAttribute("aria-pressed", "false"); $("#pr-photo-txt").textContent = "Ajouter une photo";
      drawSelect(); drawAll();
      Deva.react(before < 3 && verifiedCount() >= 3 ? "proof3" : "proof");
      toast("Preuve reçue : " + SOL[p.solId].nom + " passe au vert.");
      if (window.matchMedia("(max-width: 900px)").matches) $("#nr-scene-card").scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(function () { justVerified = null; }, 100);
    });

    // exports
    $all("[data-export]").forEach(function (b) { b.addEventListener("click", function () { b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true")); }); });
    $("#do-export").addEventListener("click", function () {
      var on = $all("[data-export]").filter(function (b) { return b.getAttribute("aria-pressed") === "true"; }).map(function (b) { return b.dataset.export; });
      if (!on.length) { toast("Choisis au moins un cadre de rapport."); return; }
      var proofs = state.proofs;
      var body = '<div class="report"><p class="report-meta">' + esc(projectName()) + (state.project.lieu.trim() ? " · " + esc(state.project.lieu.trim()) : "") + " · aperçu du " + frDate(today()) + "</p>";
      on.forEach(function (k) {
        var fw = D.exports[k];
        body += '<section class="report-sec"><h3>' + fw.titre + '</h3><p class="muted small">' + fw.intro + "</p>";
        if (!proofs.length) body += '<p class="empty">Aucune preuve vérifiée pour l\'instant : cette section se remplira avec tes preuves.</p>';
        else body += "<ul>" + proofs.map(function (pr) { var s = SOL[pr.solId]; return "<li><strong>" + esc(fw.parFamille[s.famille]) + "</strong> : " + esc(s.nom) + ", " + esc(pr.mesure.charAt(0).toLowerCase() + pr.mesure.slice(1)) + " <span class='muted'>(" + frDate(pr.date) + ")</span></li>"; }).join("") + "</ul>";
        body += "</section>";
      });
      body += '<p class="muted small">Construit uniquement à partir des preuves vérifiées du projet. Aperçu de démonstration, aucun fichier n\'est créé.</p></div>';
      openModal("Aperçu des rapports", body, '<button type="button" class="btn btn-primary" data-close>Fermer l\'aperçu</button>');
      Deva.react("export");
    });

    $("#quote").innerHTML = "<p>« " + esc(D.temoignage.texte) + " »</p><footer>" + esc(D.temoignage.auteur) + "</footer>";
    drawSelect(param("pour"));
    drawAll();
  }

  /* ================= Démarrage ================= */
  var PAGES = { index: pageIndex, commun: pageCommun, rever: pageRever, explorer: pageExplorer, generer: pageGenerer, entreprendre: pageEntreprendre, nourrir: pageNourrir };
  // Charge le compte, son projet (en ligne, ou le cache local s'il est plus récent) et les lieux publics.
  function boot(page) {
    var hasMap = page === "index" || page === "rever";
    var db = window.EvadDB && EvadDB.ready() ? EvadDB : null;
    var places = (db && hasMap) ? db.loadPublicPlaces().catch(function () { return []; }) : Promise.resolve([]);
    if (!db) return places.then(function (pl) { publicPlaces = pl; });
    return db.getUser().then(function (u) {
      user = u;
      // Sans compte : le projet vit sur l'appareil (localStorage).
      if (!user) { var local = loadCache(); if (local) state = local; return; }
      var cache = loadCache();
      return db.loadMyProject(user.id).then(function (row) {
        var remote = row ? fromRow(row) : null;
        if (cache && (!remote || cache.localUpdatedAt > remote.localUpdatedAt + 1000)) {
          state = cache; if (remote && !state.projectId) state.projectId = remote.projectId;
          if (cache.localUpdatedAt) scheduleSync(); // des changements locaux n'avaient pas été envoyés
        } else if (remote) { state = remote; state.proposals = (cache && cache.proposals) || []; writeCache(); }
        else if (cache) state = cache;
      }).catch(function (e) {
        console.warn("[EVAD] projet en ligne indisponible :", e.message);
        if (cache) state = cache;
        setSync("error");
      });
    }).then(function () { return places; }).then(function (pl) { publicPlaces = pl || []; });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var page = document.body.dataset.page;
    document.body.classList.add("is-booting");
    boot(page).then(function () {
      document.body.classList.remove("is-booting");
      renderTopbar(page);
      renderFooter();
      var step = D.steps.find(function (s) { return s.id === page; });
      // Parcours ouvert à tous : pas de compte requis, les données restent sur l'appareil.
      if (window.Deva) {
        if (page === "index") { Deva.init("accueil"); renderHomeVision(); }
        else if (page === "commun") { Deva.init("commun"); }
        else if (step) { Deva.init(step.deva); renderSidebarNav(page); }
      }
      if (PAGES[page]) PAGES[page]();
    });
    // Avant de quitter la page, on tente d'envoyer une sauvegarde en attente.
    window.addEventListener("pagehide", function () { if (syncTimer) { clearTimeout(syncTimer); syncNow(); } });
  });
})();
