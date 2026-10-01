/* EVAD, Deva simulée : un seul visage, cinq modes, réponses scriptées.
   Règle absolue : Deva ne produit jamais de chiffre d'impact. Elle propose, l'humain valide. */
(function () {
  var D = window.EVAD_DATA.deva;
  var UI_KEY = "evad-demo-ui";
  var mode = null, log = null, sugBox = null, root = null, rot = 0;

  function uiGet() { try { return JSON.parse(localStorage.getItem(UI_KEY)) || {}; } catch (e) { return {}; } }
  function uiSet(v) { try { localStorage.setItem(UI_KEY, JSON.stringify(v)); } catch (e) { /* stockage indisponible */ } }

  var LEAF = '<img class="deva-face" src="assets/deva-flat.svg" alt="" aria-hidden="true">';

  function init(modeId) {
    root = document.getElementById("deva");
    if (!root) return;
    mode = D.modes[modeId];
    var ui = uiGet();
    var narrow = window.matchMedia("(max-width: 900px)").matches;
    var open = narrow ? false : ui.devaOpen !== false;

    root.innerHTML =
      '<div class="deva-inner">' +
      '<div class="deva-head">' +
      '<div class="deva-id"><strong>Deva</strong><span class="deva-mode">' + mode.label + '</span></div>' +
      '<button type="button" class="icon-btn deva-toggle" aria-controls="deva-body" aria-label="Replier le panneau de Deva"></button>' +
      '</div>' +
      '<div class="deva-body" id="deva-body">' +
      '<div class="deva-log" role="log" aria-live="polite" aria-label="Conversation avec Deva"></div>' +
      '<div class="deva-sugs" aria-label="Questions suggérées"></div>' +
      '<form class="deva-form"><label for="deva-input" class="sr-only">Écrire à Deva</label>' +
      '<input id="deva-input" type="text" autocomplete="off" placeholder="Écrire à Deva…">' +
      '<button type="submit" class="icon-btn deva-send" aria-label="Envoyer à Deva"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 10h12M11 5l5 5-5 5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '</form>' +
      '<div class="deva-foot"><span class="deva-avatar">' + LEAF + '</span><p class="deva-rule">Deva propose, tu décides. Elle ne calcule jamais d\'impact à ta place.</p></div>' +
      '</div></div>' +
      '<button type="button" class="deva-fab" aria-label="Ouvrir le panneau de Deva">' + LEAF + '<span>Deva</span></button>';

    log = root.querySelector(".deva-log");
    sugBox = root.querySelector(".deva-sugs");
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
      var sug = mode.suggestions[rot % mode.suggestions.length]; rot++;
      var gen = D.generiques[Math.floor(Math.random() * D.generiques.length)];
      say(gen + " Une piste : " + sug.a.charAt(0).toLowerCase() + sug.a.slice(1));
    });

    renderSugs();
    say(mode.intro, { instant: true });
  }

  function setOpen(open, silent) {
    root.classList.toggle("is-open", open);
    root.classList.toggle("is-closed", !open);
    document.body.classList.toggle("deva-closed", !open);
    root.querySelector(".deva-toggle").setAttribute("aria-expanded", String(open));
    root.querySelector(".deva-fab").setAttribute("aria-expanded", String(open));
    root.querySelector(".deva-toggle").innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 5l5 5-5 5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
    if (!window.matchMedia("(max-width: 900px)").matches) { var ui = uiGet(); ui.devaOpen = open; uiSet(ui); }
    if (!silent) {
      if (open) root.querySelector("#deva-input").focus({ preventScroll: true });
      else root.querySelector(".deva-fab").focus({ preventScroll: true });
    }
  }

  function renderSugs() {
    sugBox.innerHTML = "";
    mode.suggestions.forEach(function (s) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "chip chip-sug"; b.textContent = s.q;
      b.addEventListener("click", function () { user(s.q); say(s.a); });
      sugBox.appendChild(b);
    });
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
