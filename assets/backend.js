/* EVAD bêta : accès aux données (Supabase).
   Une seule ligne à changer pour passer de la base de test à la base réelle : ENV. */
(function () {
  "use strict";
  var ENV = "staging"; // "staging" = evad-dev (tests) ; "prod" = base réelle d'app.evad.org
  var CONFIG = {
    prod: { url: "https://lmhhrccmgebztioesmik.supabase.co", key: "sb_publishable_M_1-SinRmo1T8exi8_gkvw_RTiHznag" },
    staging: { url: "https://mpoyfsisbaggvpdpajfo.supabase.co", key: "sb_publishable_dFNImcmV00s3o43crCNfvw_5TdFtzfT" }
  };
  var cfg = CONFIG[ENV];
  var client = (window.supabase && window.supabase.createClient)
    ? window.supabase.createClient(cfg.url, cfg.key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
    : null;
  var TABLE = "regen_projets";
  var COLS = ["nom", "promesse", "reve", "collectif", "lieu", "lat", "lng", "public", "statut", "data"];

  function ready() { return !!client; }
  function err(e) { return (e && (e.message || e.error_description)) || "Erreur réseau"; }
  function pageUrl() { return location.origin + location.pathname; }

  async function getUser() {
    if (!client) return null;
    try { var r = await client.auth.getSession(); return (r.data && r.data.session && r.data.session.user) || null; }
    catch (e) { return null; }
  }
  async function signIn(email, password) {
    var r = await client.auth.signInWithPassword({ email: email, password: password });
    if (r.error) throw new Error(traduire(r.error));
    return r.data.user;
  }
  async function signUp(email, password, prenom) {
    var r = await client.auth.signUp({ email: email, password: password, options: { data: { prenom: prenom }, emailRedirectTo: pageUrl() } });
    if (r.error) throw new Error(traduire(r.error));
    return { user: r.data.user, needsConfirm: !r.data.session };
  }
  async function resetPassword(email) {
    var r = await client.auth.resetPasswordForEmail(email, { redirectTo: pageUrl() });
    if (r.error) throw new Error(traduire(r.error));
  }
  async function updatePassword(pw) {
    var r = await client.auth.updateUser({ password: pw });
    if (r.error) throw new Error(traduire(r.error));
  }
  async function signOut() { if (client) await client.auth.signOut(); }
  function onRecovery(cb) {
    if (!client) return;
    client.auth.onAuthStateChange(function (event) { if (event === "PASSWORD_RECOVERY") cb(); });
  }

  // Projet du compte connecté (un seul pour cette version).
  async function loadMyProject(userId) {
    var r = await client.from(TABLE).select("*").eq("owner", userId).order("updated_at", { ascending: false }).limit(1);
    if (r.error) throw new Error(err(r.error));
    return (r.data && r.data[0]) || null;
  }
  async function saveProject(id, row) {
    var payload = {}; COLS.forEach(function (c) { if (row[c] !== undefined) payload[c] = row[c]; });
    var r = id
      ? await client.from(TABLE).update(payload).eq("id", id).select("id").single()
      : await client.from(TABLE).insert(payload).select("id").single();
    if (r.error) throw new Error(err(r.error));
    return r.data.id;
  }
  async function loadPublicPlaces() {
    if (!client) return [];
    var r = await client.from("regen_carte").select("*").limit(500);
    if (r.error) { console.warn("[EVAD] carte publique indisponible :", err(r.error)); return []; }
    return r.data || [];
  }

  // Propositions pour le Commun (table regen_propositions, une ligne par proposition).
  async function saveProposal(p) {
    var r = await client.from("regen_propositions")
      .insert({ nom: p.nom, famille: p.famille || "", change: p.change || "", ici: p.ici || [], ou: p.ou || "" })
      .select("id").single();
    if (r.error) throw new Error(err(r.error));
    return r.data.id;
  }
  async function loadMyProposals() {
    var r = await client.from("regen_propositions").select("id, nom, famille, statut, created_at").order("created_at", { ascending: false });
    if (r.error) throw new Error(err(r.error));
    return r.data || [];
  }

  function traduire(e) {
    var m = (e && e.message) || "";
    if (/Invalid login credentials/i.test(m)) return "Email ou mot de passe incorrect.";
    if (/Email not confirmed/i.test(m)) return "Confirme d'abord ton adresse : un lien t'a été envoyé par email.";
    if (/already registered|already exists/i.test(m)) return "Un accès existe déjà avec cet email. Utilise « J'ai déjà un accès ».";
    if (/Password should be at least/i.test(m)) return "Le mot de passe doit faire au moins 6 caractères.";
    if (/rate limit|too many/i.test(m)) return "Trop de tentatives, réessaie dans quelques minutes.";
    if (/valid email|invalid format/i.test(m)) return "Adresse email invalide.";
    return m || "Une erreur est survenue.";
  }

  window.EvadDB = {
    env: ENV, ready: ready, getUser: getUser, signIn: signIn, signUp: signUp, signOut: signOut,
    resetPassword: resetPassword, updatePassword: updatePassword, onRecovery: onRecovery,
    loadMyProject: loadMyProject, saveProject: saveProject, loadPublicPlaces: loadPublicPlaces,
    saveProposal: saveProposal, loadMyProposals: loadMyProposals
  };
})();
