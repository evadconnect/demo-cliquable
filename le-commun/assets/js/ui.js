/* Le Commun d'EVAD : briques d'interface partagées par les trois écrans. */
(function () {
  "use strict";
  // L'application EVAD pose ce drapeau quand elle anime une arrivée : ici il n'a pas d'usage, on le retire.
  try { sessionStorage.removeItem("evad-arrive"); } catch (e) { /* ignore */ }

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var NIVEAUX = ["", "léger", "moyen", "fort"]; // jamais de score chiffré
  var AXES = [
    { cle: "impact_ecologie", nom: "Écologie", picto: "feuille" },
    { cle: "impact_social", nom: "Social", picto: "liens" },
    { cle: "impact_economie_locale", nom: "Économie locale", picto: "piece" }
  ];
  // Trois barres : une, deux ou trois pleines. Le mot (léger, moyen, fort) est toujours écrit à côté.
  function jauge(n) {
    var h = '<span class="jauge" aria-hidden="true">';
    for (var k = 1; k <= 3; k++) h += '<i class="' + (k <= n ? "on" : "") + '"></i>';
    return h + "</span>";
  }
  // L'axe le plus fort d'une solution (à égalité : écologie, puis social, puis économie locale).
  function impactPrincipal(s) {
    var meilleur = AXES[0];
    AXES.forEach(function (a) { if ((s[a.cle] || 0) > (s[meilleur.cle] || 0)) meilleur = a; });
    return { axe: meilleur, niveau: s[meilleur.cle] || 0 };
  }
  // Illustration de repli quand une fiche n'a pas de photo : aplat de la couleur de la catégorie et son pictogramme.
  function illustration(cat) {
    var c = (cat && cat.couleur) || "#4E8C6C";
    return '<span class="illu" style="--cat:' + esc(c) + '">' + window.picto((cat && cat.picto) || "feuille", "illu-picto") + "</span>";
  }
  function visuel(s, grand) {
    if (s.photo_url) {
      return '<img class="visuel-img" src="' + esc(s.photo_url) + '" alt="' + esc(s.photo_alt || "") + '"' + (grand ? ' fetchpriority="high"' : ' loading="lazy"') + ' decoding="async" width="800" height="500">';
    }
    return illustration(s.categorie);
  }
  function etiquetteCategorie(cat) {
    return '<span class="cat" style="--cat:' + esc(cat.couleur) + '"><span class="cat-pastille" aria-hidden="true"></span>' + esc(cat.nom) + "</span>";
  }
  // Carte d'une solution : toute la carte est un lien vers la fiche.
  function carte(s, niveauTitre) {
    var ip = impactPrincipal(s), h = niveauTitre || "h3";
    return '<a class="carte" href="solution.html?slug=' + encodeURIComponent(s.slug) + '">' +
      '<span class="carte-visuel">' + visuel(s) + "</span>" +
      '<span class="carte-corps">' + etiquetteCategorie(s.categorie) +
      "<" + h + ' class="carte-titre">' + esc(s.titre) + "</" + h + ">" +
      '<span class="carte-desc">' + esc(s.description_courte) + "</span>" +
      '<span class="carte-pied">' +
      '<span class="repere">' + window.picto(ip.axe.picto) + "<span>" + ip.axe.nom + " : " + NIVEAUX[ip.niveau] + "</span></span>" +
      '<span class="repere">' + window.picto("horloge") + "<span>" + esc(s.mise_en_place || "À préciser") + "</span></span>" +
      "</span></span></a>";
  }
  function petiteCarte(s) {
    return '<a class="petite-carte" href="solution.html?slug=' + encodeURIComponent(s.slug) + '" style="--cat:' + esc(s.categorie.couleur) + '">' +
      '<span class="petite-carte-picto">' + window.picto(s.categorie.picto) + "</span>" +
      '<span><strong>' + esc(s.titre) + '</strong><span class="petite-carte-desc">' + esc(s.description_courte) + "</span></span></a>";
  }
  // Bandeau d'honnêteté quand le site tourne sur le jeu d'exemple.
  function bandeauMode(mode) {
    var b = document.getElementById("bandeau-mode"); if (!b) return;
    if (mode === "exemple") {
      b.hidden = false;
      b.innerHTML = window.picto("alerte") + "<span><strong>Le Commun en mode exemple.</strong> La base n'est pas encore branchée : tu vois un jeu de démonstration, et les propositions ne sont pas ouvertes.</span>";
    } else b.hidden = true;
  }
  function accentsOtes(t) { return String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }

  window.UI = { esc: esc, NIVEAUX: NIVEAUX, AXES: AXES, jauge: jauge, impactPrincipal: impactPrincipal, illustration: illustration, visuel: visuel,
    etiquetteCategorie: etiquetteCategorie, carte: carte, petiteCarte: petiteCarte, bandeauMode: bandeauMode, accentsOtes: accentsOtes };
})();
