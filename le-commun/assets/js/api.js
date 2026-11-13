/* Le Commun d'EVAD : lecture des données.
   Lecture directe de Supabase (API REST, schéma « referentiel ») par simple fetch, sans bibliothèque.
   Si la base n'est pas joignable ou pas encore installée, le site se replie sur le jeu d'exemple
   (data/demo.json) et l'annonce : il ne casse jamais. */
(function () {
  "use strict";
  var C = window.COMMUN, CLE_CACHE = "commun-liste-v1", DUREE_CACHE = 5 * 60 * 1000;

  function rest(chemin, profil) {
    var ctrl = window.AbortController ? new AbortController() : null;
    var minuteur = setTimeout(function () { if (ctrl) ctrl.abort(); }, 7000);
    var entetes = { apikey: C.supabaseKey };
    if (profil !== "public") entetes["Accept-Profile"] = profil || C.schema;
    return fetch(C.supabaseUrl + "/rest/v1/" + chemin, { headers: entetes, signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { clearTimeout(minuteur); if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); },
            function (e) { clearTimeout(minuteur); throw e; });
  }

  var exempleP = null;
  function exemple() {
    if (!exempleP) exempleP = fetch("data/demo.json").then(function (r) { if (!r.ok) throw new Error("exemple introuvable"); return r.json(); });
    return exempleP;
  }

  // Forme commune d'une solution dans la liste, quelle que soit la source.
  function depuisVue(l) {
    return {
      id: l.id, slug: l.slug, titre: l.titre, description_courte: l.description_courte, photo_url: l.photo_url, photo_alt: l.photo_alt,
      niveau_techno: l.niveau_techno, biomimetique: !!l.biomimetique, mise_en_place: l.mise_en_place,
      impact_ecologie: l.impact_ecologie, impact_social: l.impact_social, impact_economie_locale: l.impact_economie_locale, pourquoi: l.pourquoi,
      categorie: { slug: l.categorie_slug, nom: l.categorie_nom, couleur: l.categorie_couleur, picto: l.categorie_picto, ordre: l.categorie_ordre },
      types: l.types || []
    };
  }
  function depuisExemple(D) {
    var cats = {}; D.categories.forEach(function (c) { cats[c.slug] = c; });
    var solutions = D.solutions.map(function (s) {
      return {
        id: s.slug, slug: s.slug, titre: s.titre, description_courte: s.description_courte, photo_url: s.photo_url || null, photo_alt: s.photo_alt || null,
        niveau_techno: s.niveau_techno, biomimetique: !!s.biomimetique, mise_en_place: s.mise_en_place,
        impact_ecologie: s.impact_ecologie, impact_social: s.impact_social, impact_economie_locale: s.impact_economie_locale, pourquoi: s.pourquoi,
        categorie: cats[s.categorie], types: s.types
      };
    });
    solutions.sort(function (a, b) { return a.categorie.ordre - b.categorie.ordre || a.titre.localeCompare(b.titre, "fr"); });
    return { mode: "exemple", categories: D.categories, types: D.types_projet, solutions: solutions };
  }

  var listeP = null;
  // La liste complète : { mode: "base" | "exemple", categories, types, solutions }.
  function charger() {
    if (listeP) return listeP;
    try {
      var c = JSON.parse(sessionStorage.getItem(CLE_CACHE));
      if (c && Date.now() - c.t < DUREE_CACHE) { listeP = Promise.resolve(c.d); return listeP; }
    } catch (e) { /* pas de cache */ }
    listeP = Promise.all([
      rest("solution_carte?select=*&order=categorie_ordre,titre"),
      rest("categorie?select=id,slug,nom,couleur,picto,ordre&order=ordre"),
      rest("type_projet?select=id,slug,nom,picto,ordre&order=ordre")
    ]).then(function (r) {
      if (!r[0].length) throw new Error("aucune solution publiée");
      var d = { mode: "base", categories: r[1], types: r[2], solutions: r[0].map(depuisVue) };
      try { sessionStorage.setItem(CLE_CACHE, JSON.stringify({ t: Date.now(), d: d })); } catch (e) { /* ignore */ }
      return d;
    }).catch(function (e) {
      if (window.console) console.warn("[Commun] base indisponible, jeu d'exemple :", e && e.message);
      return exemple().then(depuisExemple);
    });
    return listeP;
  }

  var CHAMPS_FICHE = "id,slug,titre,description_courte,photo_url,photo_alt,niveau_techno,biomimetique,mise_en_place," +
    "impact_ecologie,impact_social,impact_economie_locale,pourquoi,point_vigilance,credits,source,updated_at," +
    "categorie(slug,nom,couleur,picto),solution_type_projet(type_projet(slug,nom,picto,ordre))," +
    "solution_etape(ordre,texte),solution_ressource(nom,cout_installation_min,cout_installation_max,cout_entretien_min,cout_entretien_max,unite)," +
    "solution_oups(ordre,probleme,rattrapage)";
  function parOrdre(a, b) { return (a.ordre || 0) - (b.ordre || 0); }

  // Une fiche complète, ou null si elle n'existe pas (ou n'est pas publiée).
  function fiche(slug) {
    return charger().then(function (L) {
      if (L.mode === "base") {
        return rest("solution?slug=eq." + encodeURIComponent(slug) + "&statut=eq.publiee&select=" + CHAMPS_FICHE).then(function (lignes) {
          var s = lignes[0]; if (!s) return null;
          return rest("solution_complementaire_v?solution_id=eq." + s.id + "&select=slug,titre,description_courte,categorie_slug,categorie_nom,categorie_couleur,categorie_picto&order=titre")
            .catch(function () { return []; })
            .then(function (comp) {
              return {
                mode: "base", slug: s.slug, titre: s.titre, description_courte: s.description_courte, photo_url: s.photo_url, photo_alt: s.photo_alt,
                niveau_techno: s.niveau_techno, biomimetique: !!s.biomimetique, mise_en_place: s.mise_en_place,
                impact_ecologie: s.impact_ecologie, impact_social: s.impact_social, impact_economie_locale: s.impact_economie_locale,
                pourquoi: s.pourquoi, point_vigilance: s.point_vigilance, credits: s.credits, source: s.source, categorie: s.categorie,
                types: (s.solution_type_projet || []).map(function (x) { return x.type_projet; }).filter(Boolean).sort(parOrdre),
                etapes: (s.solution_etape || []).sort(parOrdre), ressources: s.solution_ressource || [], oups: (s.solution_oups || []).sort(parOrdre),
                complementaires: comp.map(function (c) { return { slug: c.slug, titre: c.titre, description_courte: c.description_courte, categorie: { slug: c.categorie_slug, nom: c.categorie_nom, couleur: c.categorie_couleur, picto: c.categorie_picto } }; })
              };
            });
        });
      }
      return exemple().then(function (D) {
        var s = D.solutions.filter(function (x) { return x.slug === slug; })[0]; if (!s) return null;
        var cats = {}; D.categories.forEach(function (c) { cats[c.slug] = c; });
        var typ = {}; D.types_projet.forEach(function (t) { typ[t.slug] = t; });
        // les liens complémentaires se lisent dans les deux sens
        var liees = s.complementaires.slice();
        D.solutions.forEach(function (x) { if (x.complementaires.indexOf(slug) >= 0 && liees.indexOf(x.slug) < 0) liees.push(x.slug); });
        return {
          mode: "exemple", slug: s.slug, titre: s.titre, description_courte: s.description_courte, photo_url: s.photo_url || null, photo_alt: s.photo_alt || null,
          niveau_techno: s.niveau_techno, biomimetique: !!s.biomimetique, mise_en_place: s.mise_en_place,
          impact_ecologie: s.impact_ecologie, impact_social: s.impact_social, impact_economie_locale: s.impact_economie_locale,
          pourquoi: s.pourquoi, point_vigilance: s.point_vigilance, credits: s.credits, source: s.source, categorie: cats[s.categorie],
          types: s.types.map(function (t) { return typ[t]; }).filter(Boolean).sort(parOrdre),
          etapes: s.etapes.map(function (t, n) { return { ordre: n + 1, texte: t }; }), ressources: s.ressources, oups: s.oups,
          complementaires: liees.map(function (sl) { var x = D.solutions.filter(function (y) { return y.slug === sl; })[0]; return x ? { slug: x.slug, titre: x.titre, description_courte: x.description_courte, categorie: cats[x.categorie] } : null; })
            .filter(Boolean).sort(function (a, b) { return a.titre.localeCompare(b.titre, "fr"); })
        };
      });
    });
  }

  // Les lieux publics de la carte EVAD qui ont posé cette solution (vue publique existante regen_carte).
  function projets(slug) {
    return rest("regen_carte?select=id,nom,lieu,statut,placed", "public").then(function (lignes) {
      return lignes.filter(function (l) { return (l.placed || []).some(function (p) { return p && p.solId === slug; }); })
        .map(function (l) { return { id: l.id, nom: l.nom, lieu: l.lieu, statut: l.statut }; });
    }).catch(function () { return []; });
  }

  window.Commun = { charger: charger, fiche: fiche, projets: projets, viderCache: function () { try { sessionStorage.removeItem(CLE_CACHE); } catch (e) { /* ignore */ } listeP = null; } };
})();
