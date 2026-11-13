/* Le Commun d'EVAD, écran 1 : la liste. Recherche floue (Fuse.js), trois filtres combinés, état dans l'URL. */
(function () {
  "use strict";
  var E = UI.esc, N = UI.accentsOtes;
  var CLES = ["q", "categorie", "type", "niveau"];
  var TECH = [{ v: "", l: "Tous" }, { v: "low", l: "Low tech" }, { v: "high", l: "High tech" }, { v: "bio", l: "Biomimétique" }];
  var etat = lireURL(), D = null, fuse = null;
  var $q = document.getElementById("q"), $cat = document.getElementById("f-categorie"), $type = document.getElementById("f-type"), $niv = document.getElementById("f-niveau");
  var $grille = document.getElementById("grille"), $compteur = document.getElementById("compteur"), $vide = document.getElementById("vide");
  var $reinit = document.getElementById("reinit"), $reinit2 = document.getElementById("reinit-2");

  function lireURL() {
    var p = new URLSearchParams(location.search), e = {};
    CLES.forEach(function (k) { e[k] = (p.get(k) || "").trim(); });
    return e;
  }
  function ecrireURL() {
    var p = new URLSearchParams();
    CLES.forEach(function (k) { if (etat[k]) p.set(k, etat[k]); });
    var s = p.toString();
    try { history.replaceState(null, "", location.pathname + (s ? "?" + s : "")); } catch (e) { /* ignore */ }
  }
  function actif() { return CLES.some(function (k) { return !!etat[k]; }); }

  function dessinerFiltres() {
    $cat.innerHTML = '<button type="button" class="pastille" data-v="" aria-pressed="' + (!etat.categorie) + '">Toutes</button>' +
      D.categories.map(function (c) {
        return '<button type="button" class="pastille" data-v="' + E(c.slug) + '" aria-pressed="' + (etat.categorie === c.slug) + '" style="--cat:' + E(c.couleur) + '"><span class="point" aria-hidden="true"></span>' + E(c.nom) + "</button>";
      }).join("");
    $type.innerHTML = '<button type="button" class="tuile" data-v="" aria-pressed="' + (!etat.type) + '">' + window.picto("spirale") + "Tous les projets</button>" +
      D.types.map(function (t) {
        return '<button type="button" class="tuile" data-v="' + E(t.slug) + '" aria-pressed="' + (etat.type === t.slug) + '">' + window.picto(t.picto) + E(t.nom) + "</button>";
      }).join("");
    $niv.innerHTML = TECH.map(function (t) {
      return '<button type="button" data-v="' + t.v + '" aria-pressed="' + (etat.niveau === t.v) + '">' + t.l + "</button>";
    }).join("");
  }

  function filtrer() {
    var liste = D.solutions;
    if (etat.q) liste = fuse.search(N(etat.q)).map(function (r) { return r.item; });
    return liste.filter(function (s) {
      if (etat.categorie && s.categorie.slug !== etat.categorie) return false;
      if (etat.type && s.types.indexOf(etat.type) < 0) return false;
      if (etat.niveau === "bio") return s.biomimetique;
      if (etat.niveau && s.niveau_techno !== etat.niveau) return false;
      return true;
    });
  }

  function dessiner() {
    var liste = filtrer(), n = liste.length, total = D.solutions.length;
    $compteur.textContent = n === 0 ? "Aucune solution" : (n === 1 ? "1 solution" : n + " solutions") + (actif() && n !== total ? " sur " + total : "");
    $reinit.hidden = !actif();
    $vide.hidden = n !== 0;
    $grille.hidden = n === 0;
    $grille.innerHTML = liste.map(function (s) { return "<li>" + UI.carte(s, "h3") + "</li>"; }).join("");
  }
  function maj() { ecrireURL(); dessinerFiltres(); dessiner(); }

  function brancher(zone, cle) {
    zone.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-v]"); if (!b) return;
      var v = b.getAttribute("data-v");
      etat[cle] = etat[cle] === v ? "" : v; // recliquer un filtre actif le retire
      maj();
      var encore = zone.querySelector('button[data-v="' + (etat[cle] || "") + '"]'); if (encore) encore.focus();
    });
  }
  function reinitialiser(e) {
    e.preventDefault();
    CLES.forEach(function (k) { etat[k] = ""; });
    $q.value = ""; maj(); $q.focus();
  }

  Commun.charger().then(function (donnees) {
    D = donnees;
    UI.bandeauMode(D.mode);
    // les valeurs de l'URL inconnues sont ignorées
    if (!D.categories.some(function (c) { return c.slug === etat.categorie; })) etat.categorie = "";
    if (!D.types.some(function (t) { return t.slug === etat.type; })) etat.type = "";
    if (!TECH.some(function (t) { return t.v === etat.niveau; })) etat.niveau = "";
    var nomsTypes = {}; D.types.forEach(function (t) { nomsTypes[t.slug] = t.nom; });
    // index de recherche sans accents : « energie » trouve « Énergie »
    D.solutions.forEach(function (s) {
      s._t = N(s.titre); s._d = N(s.description_courte); s._p = N(s.pourquoi); s._c = N(s.categorie.nom);
      s._y = N(s.types.map(function (t) { return nomsTypes[t] || t; }).join(" "));
    });
    fuse = new Fuse(D.solutions, { keys: [{ name: "_t", weight: 3 }, { name: "_d", weight: 2 }, { name: "_c", weight: 1.5 }, { name: "_y", weight: 1 }, { name: "_p", weight: 1 }], threshold: 0.25, ignoreLocation: true, minMatchCharLength: 2 });
    $q.value = etat.q;
    brancher($cat, "categorie"); brancher($type, "type"); brancher($niv, "niveau");
    var attente = null;
    $q.addEventListener("input", function () { clearTimeout(attente); attente = setTimeout(function () { etat.q = $q.value.trim(); ecrireURL(); dessiner(); }, 140); });
    document.getElementById("form-recherche").addEventListener("submit", function (e) { e.preventDefault(); etat.q = $q.value.trim(); ecrireURL(); dessiner(); });
    $reinit.addEventListener("click", reinitialiser); $reinit2.addEventListener("click", reinitialiser);
    maj();
  }).catch(function (e) {
    $compteur.textContent = "Le Commun n'a pas pu se charger";
    $grille.innerHTML = ""; $vide.hidden = false;
    $vide.innerHTML = "<p><strong>Impossible de charger les solutions.</strong></p><p>Vérifie ta connexion puis recharge la page.</p>";
    if (window.console) console.error(e);
  });
})();
