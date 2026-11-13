/* Le Commun d'EVAD, écran 2 : la fiche solution. Cinq onglets, une adresse par fiche (solution.html?slug=...). */
(function () {
  "use strict";
  var E = UI.esc, $fiche = document.getElementById("fiche");
  var slug = (new URLSearchParams(location.search).get("slug") || "").trim();
  var ONGLETS = [
    { id: "synthese", nom: "Synthèse", picto: "feuille" },
    { id: "ressources", nom: "Ressources et coûts", picto: "piece" },
    { id: "mise-en-oeuvre", nom: "Mise en œuvre", picto: "outils" },
    { id: "financements", nom: "Financements", picto: "ampoule" },
    { id: "oups", nom: "Oups", picto: "alerte" }
  ];
  var STATUTS = { reve: "Rêvé", encours: "En cours", prouve: "Prouvé" };

  function nb(n) { return Number(n).toLocaleString("fr-FR"); }
  // Une fourchette lisible, ou null si rien n'est documenté (jamais de valeur inventée).
  function fourchette(min, max, unite, suffixe) {
    if (min == null && max == null) return null;
    var t = (min != null && max != null) ? (Number(min) === Number(max) ? nb(min) : nb(min) + " à " + nb(max))
      : (min != null ? "à partir de " + nb(min) : "jusqu'à " + nb(max));
    return t + (unite ? " " + unite : "") + (suffixe || "");
  }

  function introuvable() {
    document.title = "Solution introuvable, le Commun d'EVAD";
    $fiche.innerHTML = '<p class="fil"><a href="index.html">Le Commun</a></p>' +
      '<div class="vide"><h1 style="font-size:1.6rem">Cette solution est introuvable</h1><p>Elle n\'existe pas, ou elle n\'est pas encore publiée par le conseil régénératif.</p>' +
      '<p><a class="btn btn-primaire" href="index.html">' + window.picto("retour") + "Retour au Commun</a></p></div>";
  }

  function synthese(s) {
    return "<h2>Pourquoi cette solution</h2><p>" + E(s.pourquoi) + "</p>" +
      "<h2>Pour quels projets</h2>" +
      (s.types.length ? '<ul class="liste-types">' + s.types.map(function (t) { return "<li>" + window.picto(t.picto) + E(t.nom) + "</li>"; }).join("") + "</ul>"
        : "<p>Les types de projet adaptés ne sont pas encore précisés.</p>") +
      "<h2>Les projets qui l'ont choisie</h2>" + '<div id="projets"><p class="note">Recherche des lieux qui l\'ont posée…</p></div>' +
      "<h2>Solutions complémentaires</h2>" +
      (s.complementaires.length ? '<div class="complementaires">' + s.complementaires.map(UI.petiteCarte).join("") + "</div>"
        : "<p>Aucune solution complémentaire n'est encore reliée à cette fiche.</p>");
  }
  function ressources(s) {
    if (!s.ressources.length) return "<h2>Ressources et coûts</h2><p>Les ressources nécessaires ne sont pas encore documentées. Tu l'as mise en place ? <a href=\"proposer.html\">Partage ton retour</a>.</p>";
    var chiffre = s.ressources.some(function (r) { return r.cout_installation_min != null || r.cout_installation_max != null || r.cout_entretien_min != null || r.cout_entretien_max != null; });
    if (!chiffre) {
      return "<h2>Ce qu'il faut réunir</h2><ul>" + s.ressources.map(function (r) { return "<li>" + E(r.nom) + "</li>"; }).join("") + "</ul>" +
        '<p class="note">Les coûts ne sont pas documentés pour cette solution. Le Commun n\'affiche jamais de montant estimé : seulement des coûts sourcés.</p>';
    }
    return "<h2>Ressources et coûts</h2>" +
      '<div class="tableau-defile"><table><caption>Les montants viennent de la source citée en bas de fiche. Une case vide veut dire « non documenté », pas « gratuit ».</caption>' +
      '<thead><tr><th scope="col">Ressource</th><th scope="col">Installation</th><th scope="col">Entretien</th></tr></thead><tbody>' +
      s.ressources.map(function (r) {
        var i = fourchette(r.cout_installation_min, r.cout_installation_max, r.unite), e = fourchette(r.cout_entretien_min, r.cout_entretien_max, r.unite, " par an");
        return '<tr><th scope="row">' + E(r.nom) + "</th>" + (i ? "<td>" + E(i) + "</td>" : '<td class="absent">Non documenté</td>') + (e ? "<td>" + E(e) + "</td>" : '<td class="absent">Non documenté</td>') + "</tr>";
      }).join("") + "</tbody></table></div>";
  }
  function miseEnOeuvre(s) {
    return "<h2>Les étapes</h2>" +
      (s.etapes.length ? '<ol class="etapes">' + s.etapes.map(function (e) { return "<li><p>" + E(e.texte) + "</p></li>"; }).join("") + "</ol>"
        : "<p>Les étapes ne sont pas encore documentées par un lieu du Commun. Tu l'as mise en œuvre ? <a href=\"proposer.html\">Raconte comment</a>.</p>") +
      (s.point_vigilance ? '<div class="vigilance">' + window.picto("alerte") + "<div><h2>Point de vigilance</h2><p>" + E(s.point_vigilance) + "</p></div></div>" : "");
  }
  function financements() {
    return "<h2>Financements</h2><p>Les pistes de financement arriveront dans une prochaine version du Commun. Aucune aide n'est affichée tant qu'elle n'est pas vérifiée.</p>";
  }
  function oups(s) {
    return "<h2>Oups : ce qui arrive souvent, et comment le rattraper</h2>" +
      (s.oups.length ? '<dl class="oups">' + s.oups.map(function (o) { return "<div><dt>" + E(o.probleme) + "</dt><dd>" + E(o.rattrapage) + "</dd></div>"; }).join("") + "</dl>"
        : "<p>Aucun raté n'est encore documenté pour cette solution. Tu en as vécu un ? <a href=\"proposer.html\">Partage-le</a>, il évitera le même à d'autres.</p>");
  }

  function activer(id, focus) {
    ONGLETS.forEach(function (o) {
      var b = document.getElementById("onglet-" + o.id), p = document.getElementById("panneau-" + o.id), on = o.id === id;
      b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1; p.hidden = !on;
      if (on && focus) b.focus();
    });
    try { history.replaceState(null, "", location.pathname + location.search + "#" + id); } catch (e) { /* ignore */ }
  }

  function afficher(s) {
    document.title = s.titre + ", le Commun d'EVAD";
    var md = document.querySelector('meta[name="description"]'); if (md) md.setAttribute("content", s.description_courte || "");
    UI.bandeauMode(s.mode);
    var reperes = UI.AXES.map(function (a) {
      var n = s[a.cle] || 0;
      return "<li>" + window.picto(a.picto) + '<span><span class="repere-nom">' + a.nom + '</span><span class="repere-val">' + UI.jauge(n) + (UI.NIVEAUX[n] || "à préciser") + "</span></span></li>";
    }).join("") + "<li>" + window.picto("horloge") + '<span><span class="repere-nom">Mise en place</span><span class="repere-val">' + E(s.mise_en_place || "À préciser") + "</span></span></li>";
    var contenus = { synthese: synthese(s), ressources: ressources(s), "mise-en-oeuvre": miseEnOeuvre(s), financements: financements(), oups: oups(s) };

    $fiche.innerHTML =
      '<p class="fil"><a href="index.html">Le Commun</a><span aria-hidden="true">›</span><span>' + E(s.titre) + "</span></p>" +
      '<div class="fiche-tete"><div class="fiche-visuel">' + UI.visuel(s, true) + "</div><div>" +
      '<p class="fiche-etiquettes">' + UI.etiquetteCategorie(s.categorie) +
      (s.niveau_techno ? '<span class="badge">' + window.picto(s.niveau_techno === "low" ? "outils" : "eclair") + (s.niveau_techno === "low" ? "Low tech" : "High tech") + "</span>" : "") +
      (s.biomimetique ? '<span class="badge">' + window.picto("spirale") + "Biomimétique</span>" : "") + "</p>" +
      "<h1>" + E(s.titre) + '</h1><p class="fiche-desc">' + E(s.description_courte) + "</p>" +
      '<ul class="reperes" aria-label="Repères">' + reperes + "</ul>" +
      '<div class="fiche-actions"><a class="btn btn-primaire" href="' + E(window.COMMUN.app) + 'rever.html">' + window.picto("plus") + 'Ajouter à mon projet</a><p class="note">Tu crées ton projet, puis tu choisis tes solutions à l\'étape Explorer.</p></div>' +
      "</div></div>" +
      '<div class="onglets" role="tablist" aria-label="Contenu de la fiche">' + ONGLETS.map(function (o) {
        return '<button type="button" role="tab" id="onglet-' + o.id + '" aria-controls="panneau-' + o.id + '" aria-selected="false" tabindex="-1">' + window.picto(o.picto) + o.nom + "</button>";
      }).join("") + "</div>" +
      ONGLETS.map(function (o) { return '<section class="panneau" role="tabpanel" id="panneau-' + o.id + '" aria-labelledby="onglet-' + o.id + '" tabindex="0" hidden>' + contenus[o.id] + "</section>"; }).join("") +
      ((s.credits || s.source) ? '<aside class="mentions" aria-label="Source et mentions"><h2>Source et mentions</h2>' + (s.credits ? "<p>" + E(s.credits) + "</p>" : "") +
        (s.source ? '<p><a href="' + E(s.source) + '" rel="noopener external">Voir la source' + window.picto("externe") + "</a></p>" : "") + "</aside>" : "");

    var liste = $fiche.querySelector('[role="tablist"]');
    liste.addEventListener("click", function (e) { var b = e.target.closest('[role="tab"]'); if (b) activer(b.id.replace("onglet-", ""), false); });
    liste.addEventListener("keydown", function (e) {
      var ids = ONGLETS.map(function (o) { return o.id; }), cur = ids.indexOf((document.activeElement.id || "").replace("onglet-", ""));
      if (cur < 0) return;
      var cible = e.key === "ArrowRight" ? (cur + 1) % ids.length : e.key === "ArrowLeft" ? (cur + ids.length - 1) % ids.length : e.key === "Home" ? 0 : e.key === "End" ? ids.length - 1 : -1;
      if (cible >= 0) { e.preventDefault(); activer(ids[cible], true); }
    });
    var depart = location.hash.replace("#", "");
    activer(ONGLETS.some(function (o) { return o.id === depart; }) ? depart : "synthese", false);

    // Les lieux publics de la carte EVAD qui ont posé cette solution.
    Commun.projets(s.slug).then(function (lieux) {
      var z = document.getElementById("projets"); if (!z) return;
      z.innerHTML = lieux.length
        ? '<ul class="liste-lieux">' + lieux.map(function (l) {
            return '<li><a href="' + E(window.COMMUN.app) + "index.html?focus=" + encodeURIComponent("p:" + l.id) + '"><span><strong>' + E(l.nom) + "</strong>" + (l.lieu ? "<br><small>" + E(l.lieu) + "</small>" : "") + '</span><span class="statut">' + (STATUTS[l.statut] || "Rêvé") + "</span></a></li>";
          }).join("") + "</ul>"
        : "<p>Aucun lieu public de la carte ne l'a encore posée. Le tien sera peut-être le premier.</p>";
    });
  }

  if (!slug) { introuvable(); return; }
  Commun.fiche(slug).then(function (s) { if (s) afficher(s); else introuvable(); })
    .catch(function (e) {
      $fiche.innerHTML = '<p class="fil"><a href="index.html">Le Commun</a></p><div class="vide"><p><strong>Impossible de charger cette fiche.</strong></p><p>Vérifie ta connexion puis recharge la page.</p></div>';
      if (window.console) console.error(e);
    });
})();
