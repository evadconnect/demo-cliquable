/* EVAD, Deva simulée : un seul visage, cinq modes, réponses scriptées.
   Règle absolue : Deva ne produit jamais de chiffre d'impact. Elle propose, l'humain valide. */
(function () {
  var D = window.EVAD_DATA.deva;
  var UI_KEY = "evad-demo-ui";
  var mode = null, log = null, root = null, rot = 0;

  function uiGet() { try { return JSON.parse(localStorage.getItem(UI_KEY)) || {}; } catch (e) { return {}; } }
  function uiSet(v) { try { localStorage.setItem(UI_KEY, JSON.stringify(v)); } catch (e) { /* stockage indisponible */ } }

  var LEAF = '<img class="deva-face" src="assets/deva-avatar.png" alt="" aria-hidden="true">';

  function init(modeId) {
    root = document.getElementById("deva");
    if (!root) return;
    mode = D.modes[modeId];
    var ui = uiGet();
    var narrow = window.matchMedia("(max-width: 900px)").matches;
    // Desktop : sidebar toujours ouverte (pas de rétraction). Mobile : tiroir ouvrable.
    var open = narrow ? false : true;

    root.innerHTML =
      '<div class="deva-inner">' +
      '<div class="deva-head">' +
      '<div class="deva-id"><strong>Deva</strong><span class="deva-mode">' + mode.label + '</span></div>' +
      '<button type="button" class="icon-btn deva-toggle" aria-controls="deva-body" aria-label="Replier le panneau de Deva"></button>' +
      '</div>' +
      '<div class="deva-body" id="deva-body">' +
      '<div class="deva-log" role="log" aria-live="polite" aria-label="Conversation avec Deva"></div>' +
      '<div class="deva-doors" aria-label="Que veux-tu faire"></div>' +
      '<form class="deva-form"><label for="deva-input" class="sr-only">Écrire à Deva</label>' +
      '<input id="deva-input" type="text" autocomplete="off" placeholder="Écrire à Deva…">' +
      '<button type="submit" class="icon-btn deva-send" aria-label="Envoyer à Deva"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 10h12M11 5l5 5-5 5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '</form>' +
      '<button type="button" class="deva-carbone" aria-label="Empreinte carbone estimée de tes échanges avec Deva"></button>' +
      '<div class="deva-foot"><span class="deva-avatar">' + LEAF + '</span><p class="deva-rule">Deva propose, tu décides. Elle ne calcule jamais d\'impact à ta place.</p></div>' +
      '</div></div>' +
      '<button type="button" class="deva-fab" aria-label="Ouvrir le panneau de Deva">' + LEAF + '<span>Deva</span></button>';

    log = root.querySelector(".deva-log");
    setOpen(open, true);

    root.querySelector(".deva-toggle").addEventListener("click", function () { setOpen(false); });
    root.querySelector(".deva-fab").addEventListener("click", function () { setOpen(true); });
    root.querySelector(".deva-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var input = root.querySelector("#deva-input");
      var txt = input.value.trim();
      if (!txt) return;
      input.value = "";
      user(txt);
      countQuestion();
      say(answer(txt));
    });
    root.querySelector(".deva-carbone").addEventListener("click", function () {
      var c = D.carbone || {};
      Deva.say("Empreinte de nos échanges : tu as posé " + carbonCount() + " question(s), soit environ " + fmtCarbon() + ". " + (c.note || ""), { instant: true });
      if (root.classList.contains("is-closed")) setOpen(true);
    });

    renderDoors();
    renderCarbone();
    say(mode.intro, { instant: true });
  }

  function renderDoors() {
    var box = root.querySelector(".deva-doors");
    if (!box) return;
    if (!mode.actions || !mode.actions.length) { box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = "";
    mode.actions.forEach(function (a) {
      var b = document.createElement(a.href && a.href.charAt(0) === "#" ? "button" : "a");
      b.className = "deva-door" + (a.primary ? " is-primary" : "");
      if (b.tagName === "A") b.href = a.href; else b.type = "button";
      b.textContent = a.label;
      b.addEventListener("click", function (e) {
        if (a.href === "#map") { e.preventDefault(); setOpen(false); }
      });
      box.appendChild(b);
    });
  }

  /* Calculateur d'empreinte carbone des questions posées à Deva (estimation, cf. D.carbone). */
  function carbonCount() { var ui = uiGet(); return ui.devaQuestions || 0; }
  function fmtCarbon() {
    var c = D.carbone || { parQuestion: 0, unite: "g CO₂e" };
    var total = carbonCount() * (c.parQuestion || 0);
    var s = (Math.round(total * 100) / 100).toString().replace(".", ",");
    return "~" + s + " " + (c.unite || "g CO₂e");
  }
  function countQuestion() { var ui = uiGet(); ui.devaQuestions = (ui.devaQuestions || 0) + 1; uiSet(ui); renderCarbone(); }
  function renderCarbone() {
    var el = root.querySelector(".deva-carbone");
    if (!el || !D.carbone) return;
    var n = carbonCount();
    el.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 14a3.5 3.5 0 0 1-.4-7A4.5 4.5 0 0 1 14 7.3 3.2 3.2 0 0 1 14.5 14H6z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>' +
      "<span>Empreinte : <strong>" + fmtCarbon() + "</strong>" + (n ? " · " + n + " question" + (n > 1 ? "s" : "") : " · échanges sobres") + "</span>";
    el.title = D.carbone.note || "";
  }

  /* Moteur conversationnel scripté : salutations, remerciements, puis reconnaissance de mots-clés. */
  function norm(s) { return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function pick(a) { return (a && a.length) ? a[Math.floor(Math.random() * a.length)] : ""; }
  function answer(txt) {
    var t = " " + norm(txt) + " ";
    if (/(^| )(bonjour|salut|coucou|bonsoir|hello|hey|yo|bonne journee)( |$)/.test(t)) return pick(D.salutations);
    if (/(^| )(merci|mercii|super|genial|parfait|nickel|top|cool|bravo|ok merci)( |$)/.test(t)) return pick(D.remerciements);
    if (/(^| )(au revoir|aurevoir|bye|a bientot|ciao|a plus)( |$)/.test(t)) return pick(D.adieux);
    var best = null, score = 0;
    (D.faq || []).forEach(function (e) {
      var s = 0; e.k.forEach(function (kw) { if (t.indexOf(norm(kw)) >= 0) s++; });
      if (s > score) { score = s; best = e; }
    });
    if (best && score > 0) return best.a;
    return pick(D.incompris);
  }

  function setOpen(open, silent) {
    // Desktop : jamais de rétraction, la sidebar reste ouverte.
    if (!window.matchMedia("(max-width: 900px)").matches) open = true;
    root.classList.toggle("is-open", open);
    root.classList.toggle("is-closed", !open);
    document.body.classList.toggle("deva-closed", !open);
    root.querySelector(".deva-toggle").setAttribute("aria-expanded", String(open));
    root.querySelector(".deva-fab").setAttribute("aria-expanded", String(open));
    root.querySelector(".deva-toggle").innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 5l5 5-5 5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
    if (!silent) {
      if (open) root.querySelector("#deva-input").focus({ preventScroll: true });
      else root.querySelector(".deva-fab").focus({ preventScroll: true });
    }
  }

  function bubble(cls, text) {
    var d = document.createElement("div");
    d.className = "deva-msg " + cls;
    d.textContent = text;
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
    return d;
  }
  function user(text) { bubble("from-user", text); }
  function say(text, opt) {
    if (!log) return;
    opt = opt || {};
    if (opt.instant) { bubble("from-deva", text); return; }
    var t = bubble("from-deva is-typing", "");
    t.setAttribute("aria-hidden", "true");
    t.innerHTML = "<span></span><span></span><span></span>";
    setTimeout(function () {
      t.remove();
      var m = bubble("from-deva", text);
      if (opt.nudge) { root.classList.add("nudge"); setTimeout(function () { root.classList.remove("nudge"); }, 900); }
      return m;
    }, 550);
  }
  function react(key, fallback) {
    var t = D.reactions[key] || (fallback && D.reactions[fallback]);
    if (t) say(t, { nudge: true });
  }

  window.Deva = { init: init, say: say, react: react };
})();
