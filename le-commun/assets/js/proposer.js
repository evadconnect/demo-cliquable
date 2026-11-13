/* Le Commun d'EVAD, écran 3 : proposer une solution.
   La personne se connecte (comptes Supabase, les mêmes que l'application EVAD), remplit quatre champs,
   et la proposition est enregistrée avec le statut « proposee ». Elle n'apparaît dans la liste
   qu'après validation par le conseil régénératif (règles RLS côté base). */
(function () {
  "use strict";
  var E = UI.esc, C = window.COMMUN, $zone = document.getElementById("zone");
  var client = null, D = null, utilisateur = null, modeAcces = "connexion";
  var LIBELLES = { proposee: "En attente du conseil régénératif", brouillon: "Brouillon", publiee: "Publiée dans le Commun" };

  function traduire(e) {
    var m = (e && (e.message || e.error_description)) || "";
    if (/Invalid login credentials/i.test(m)) return "Email ou mot de passe incorrect.";
    if (/Email not confirmed/i.test(m)) return "Confirme d'abord ton adresse : un lien t'a été envoyé par email.";
    if (/already registered|already exists/i.test(m)) return "Un accès existe déjà avec cet email. Choisis « J'ai déjà un accès ».";
    if (/Password should be at least/i.test(m)) return "Le mot de passe doit faire au moins 6 caractères.";
    if (/rate limit|too many/i.test(m)) return "Trop de tentatives, réessaie dans quelques minutes.";
    if (/Cinq propositions/i.test(m)) return "Cinq propositions par jour au plus. Reviens demain.";
    if (/row-level security|permission denied/i.test(m)) return "Cette action n'est pas autorisée avec ton accès.";
    return m || "Une erreur est survenue. Réessaie dans un instant.";
  }

  function indisponible() {
    $zone.innerHTML = '<div class="bloc"><h2>Les propositions ne sont pas encore ouvertes</h2>' +
      "<p>La base du Commun n'est pas encore branchée : le site montre un jeu d'exemple et ne peut rien enregistrer. Reviens bientôt.</p>" +
      '<p><a class="btn btn-secondaire" href="index.html">' + window.picto("retour") + "Retour au Commun</a></p></div>";
  }

  function ecranAcces(message) {
    var creation = modeAcces === "creation";
    $zone.innerHTML = '<div class="bloc"><h2>Connecte-toi pour proposer</h2>' +
      "<p>Les propositions sont réservées aux personnes connectées. C'est le même accès que pour l'application EVAD.</p>" +
      '<div class="bascule" role="group" aria-label="Type d\'accès">' +
      '<button type="button" data-mode="connexion" aria-pressed="' + (!creation) + '">J\'ai déjà un accès</button>' +
      '<button type="button" data-mode="creation" aria-pressed="' + creation + '">Créer un accès</button></div>' +
      (message ? '<p class="' + (message.ok ? "succes" : "erreur") + '" role="' + (message.ok ? "status" : "alert") + '">' + E(message.texte) + "</p>" : "") +
      '<form id="form-acces" novalidate>' +
      '<div class="champ"><label for="a-email">Email</label><input id="a-email" type="email" autocomplete="email" required></div>' +
      '<div class="champ"><label for="a-mdp">Mot de passe</label><input id="a-mdp" type="password" autocomplete="' + (creation ? "new-password" : "current-password") + '" required minlength="6">' +
      (creation ? '<p class="aide">Six caractères au moins. Un email de confirmation te sera envoyé.</p>' : "") + "</div>" +
      '<button type="submit" class="btn btn-primaire">' + (creation ? "Créer mon accès" : "Me connecter") + "</button></form></div>";
    $zone.querySelectorAll("[data-mode]").forEach(function (b) { b.addEventListener("click", function () { modeAcces = b.getAttribute("data-mode"); ecranAcces(); }); });
    document.getElementById("form-acces").addEventListener("submit", function (e) {
      e.preventDefault();
      var email = document.getElementById("a-email").value.trim(), mdp = document.getElementById("a-mdp").value, bouton = this.querySelector("button[type=submit]");
      if (!email || mdp.length < 6) { ecranAcces({ texte: "Renseigne ton email et un mot de passe d'au moins 6 caractères." }); return; }
      bouton.disabled = true;
      var p = creation
        ? client.auth.signUp({ email: email, password: mdp, options: { emailRedirectTo: location.origin + location.pathname } })
        : client.auth.signInWithPassword({ email: email, password: mdp });
      p.then(function (r) {
        if (r.error) { ecranAcces({ texte: traduire(r.error) }); return; }
        if (creation && !r.data.session) { modeAcces = "connexion"; ecranAcces({ ok: true, texte: "Accès créé. Ouvre le lien reçu par email pour le confirmer, puis connecte-toi ici." }); return; }
        utilisateur = (r.data.session && r.data.session.user) || r.data.user; ecranFormulaire();
      }).catch(function (err) { ecranAcces({ texte: traduire(err) }); });
    });
  }

  function mesPropositions() {
    return client.schema(C.schema).from("solution").select("slug,titre,statut,created_at").eq("propose_par", utilisateur.id).order("created_at", { ascending: false }).limit(20)
      .then(function (r) { return r.error ? [] : (r.data || []); });
  }

  function ecranFormulaire(etat) {
    etat = etat || {};
    mesPropositions().then(function (liste) {
      $zone.innerHTML =
        '<p class="compte"><span>Connecté : ' + E(utilisateur.email || "") + '</span><button type="button" class="lien-bouton" id="deconnexion">Se déconnecter</button></p>' +
        (etat.envoyee ? '<div class="succes" role="status" tabindex="-1" id="merci"><strong>Merci, ta proposition est enregistrée.</strong> Elle apparaîtra dans le Commun après validation par le conseil régénératif.</div>' : "") +
        '<form class="bloc" id="form-proposition" novalidate><h2>Ta proposition</h2>' +
        (etat.erreur ? '<p class="erreur" role="alert">' + E(etat.erreur) + "</p>" : "") +
        '<div class="champ"><label for="p-nom">Nom de la solution</label><input id="p-nom" type="text" required minlength="3" maxlength="120" placeholder="Ex. Bancs en palettes de réemploi"></div>' +
        '<div class="champ"><label for="p-cat">Catégorie</label><select id="p-cat" required><option value="">Choisir une catégorie</option>' +
        D.categories.map(function (c) { return '<option value="' + c.id + '">' + E(c.nom) + "</option>"; }).join("") + "</select></div>" +
        '<fieldset class="champ"><legend>Types de projet concernés</legend><div class="cases">' +
        D.types.map(function (t) { return '<label class="case"><input type="checkbox" name="types" value="' + t.id + '">' + window.picto(t.picto) + E(t.nom) + "</label>"; }).join("") + "</div></fieldset>" +
        '<div class="champ"><label for="p-desc">Description</label><textarea id="p-desc" required maxlength="600" aria-describedby="p-desc-aide" placeholder="Ce que c\'est, ce que ça change concrètement, où tu l\'as éprouvée."></textarea>' +
        '<p class="aide" id="p-desc-aide">600 caractères au plus. Pas de chiffre d\'impact : raconte ce que tu as observé.</p></div>' +
        '<button type="submit" class="btn btn-primaire">Envoyer au conseil régénératif</button></form>' +
        (liste.length ? '<div class="bloc"><h2>Mes propositions</h2><ul class="mes-propositions">' + liste.map(function (p) {
          return "<li><strong>" + (p.statut === "publiee" ? '<a href="solution.html?slug=' + encodeURIComponent(p.slug) + '">' + E(p.titre) + "</a>" : E(p.titre)) + '</strong><span class="statut">' + (LIBELLES[p.statut] || p.statut) + "</span></li>";
        }).join("") + "</ul></div>" : "");
      if (etat.envoyee) { var m = document.getElementById("merci"); if (m) m.focus(); }
      document.getElementById("deconnexion").addEventListener("click", function () { client.auth.signOut().then(function () { utilisateur = null; ecranAcces(); }); });
      document.getElementById("form-proposition").addEventListener("submit", envoyer);
    });
  }

  function envoyer(e) {
    e.preventDefault();
    var nom = document.getElementById("p-nom"), cat = document.getElementById("p-cat"), desc = document.getElementById("p-desc"), bouton = this.querySelector("button[type=submit]");
    var types = Array.prototype.slice.call(this.querySelectorAll("input[name=types]:checked")).map(function (c) { return Number(c.value); });
    var fautif = null;
    [[nom, nom.value.trim().length >= 3], [cat, !!cat.value], [desc, desc.value.trim().length >= 10]].forEach(function (x) {
      x[0].setAttribute("aria-invalid", String(!x[1])); if (!x[1] && !fautif) fautif = x[0];
    });
    if (fautif) { fautif.focus(); return; }
    bouton.disabled = true;
    var ref = client.schema(C.schema);
    ref.from("solution").insert({ titre: nom.value.trim(), categorie_id: Number(cat.value), description_courte: desc.value.trim(), statut: "proposee" }).select("id").single()
      .then(function (r) {
        if (r.error) throw r.error;
        if (!types.length) return null;
        return ref.from("solution_type_projet").insert(types.map(function (t) { return { solution_id: r.data.id, type_projet_id: t }; })).then(function (r2) { if (r2.error) throw r2.error; });
      })
      .then(function () { ecranFormulaire({ envoyee: true }); })
      .catch(function (err) { ecranFormulaire({ erreur: traduire(err) }); });
  }

  Commun.viderCache(); // ici on veut l'état réel de la base, pas un cache
  Commun.charger().then(function (donnees) {
    D = donnees;
    UI.bandeauMode(D.mode);
    if (D.mode !== "base" || !window.supabase || !window.supabase.createClient) { indisponible(); return; }
    client = window.supabase.createClient(C.supabaseUrl, C.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    return client.auth.getSession().then(function (r) {
      utilisateur = (r.data && r.data.session && r.data.session.user) || null;
      if (utilisateur) ecranFormulaire(); else ecranAcces();
    });
  }).catch(function (e) { indisponible(); if (window.console) console.error(e); });
})();
