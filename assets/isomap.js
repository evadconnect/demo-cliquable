/* EVAD : carte illustrée isométrique du Sud-Ouest (SVG, sans image ni tuile).
   Un territoire dessiné à la main par règles géographiques simples : océan, estuaire, rivières,
   forêt des Landes, vignes, collines du Limousin, Pyrénées, grandes villes. Les lieux réels sont
   posés dessus par projection de leur latitude et longitude. C'est une illustration :
   les positions sont approximatives, la vue carte (OpenStreetMap) reste là pour la précision. */
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var COLS = 28, ROWS = 20, TW = 24, TH = 12, SLAB = 18;
  var LAT0 = 42.6, LAT1 = 47.3, LNG0 = -2.0, LNG1 = 2.7; // cadre : Nouvelle-Aquitaine et ses marges

  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function P(u, v, z) { return [(u - v) * TW, (u + v) * TH - (z || 0)]; }
  function pts(l) { return l.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" "); }
  function poly(g, l, fill, extra) { var a = { points: pts(l), fill: fill }; for (var k in extra || {}) a[k] = extra[k]; return el("polygon", a, g); }
  function hash(i, j) { var h = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453; return h - Math.floor(h); }
  function mix(a, b, t) {
    function c(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
    var x = c(a), y = c(b), o = x.map(function (v, k) { return Math.round(v + (y[k] - v) * t); });
    return "#" + o.map(function (v) { return ("0" + v.toString(16)).slice(-2); }).join("");
  }

  /* ---------- géographie ---------- */
  function toUV(lat, lng) { return { u: (lng - LNG0) / (LNG1 - LNG0) * COLS, v: (LAT1 - lat) / (LAT1 - LAT0) * ROWS }; }
  function toLL(u, v) { return { lng: LNG0 + u / COLS * (LNG1 - LNG0), lat: LAT1 - v / ROWS * (LAT1 - LAT0) }; }
  function coast(lat) {
    if (lat >= 46.16) return -1.15 - (lat - 46.16) * 0.9;
    if (lat >= 45.6) return -1.2;
    if (lat >= 44.0) return -1.25 - (45.5 - lat) * 0.1;
    return -1.4 - (44 - lat) * 0.4;
  }
  // type de terrain au point géographique
  function terrain(lat, lng) {
    if (lng < coast(lat)) return "sea";
    if (lat < 43.15) return "mont";
    if (lat < 43.4) return "hill";
    var landes = lat > 43.6 && lat < 45.2 && lng < -0.35 - (lat - 44.4) * 0.6;
    if (landes) return "forest";
    if (lng > 1.6 && lat > 45.4 && lat < 46.0) return "high";
    if (lng > 0.6 && lat > 44.8 && lat < 46.4) return "hill";
    if (lng > 1.3 && lat <= 44.8) return "hill";
    var vignes = (lat > 44.6 && lat < 45.4 && lng > -0.9 && lng < -0.1) || (lat > 45.5 && lat < 45.8 && lng > -0.6 && lng < 0.0) || (lat > 44.78 && lat < 44.95 && lng > 0.3 && lng < 0.6);
    if (vignes) return "vine";
    if (lat > 46.2 && lat < 46.45 && lng > -1.1 && lng < -0.6) return "marsh";
    return "plain";
  }
  var RIVERS = [
    { nom: "Garonne", w: 2.6, pts: [[44.84, -0.58], [44.55, -0.25], [44.5, 0.17], [44.2, 0.62], [44.02, 1.1]] },
    { nom: "Dordogne", w: 2.2, pts: [[45.03, -0.6], [44.92, -0.24], [44.85, 0.48], [44.87, 1.1], [45.05, 1.7]] },
    { nom: "Charente", w: 1.6, pts: [[45.94, -0.96], [45.75, -0.63], [45.7, -0.33], [45.65, 0.16]] },
    { nom: "Adour", w: 1.6, pts: [[43.49, -1.47], [43.7, -1.05], [43.89, -0.5], [43.5, 0.05]] },
    { nom: "Vienne", w: 1.6, pts: [[45.83, 1.26], [46.0, 0.67], [46.58, 0.34], [46.85, 0.55]] },
    { nom: "Lot", w: 1.4, pts: [[44.3, 0.33], [44.4, 0.7], [44.45, 1.4], [44.5, 2.2]] }
  ];
  var ESTUAIRE = [[44.95, -0.55], [45.3, -0.75], [45.57, -1.03], [45.7, -1.15]];
  var VILLES = [
    { nom: "Bordeaux", lat: 44.84, lng: -0.58, g: 3 }, { nom: "La Rochelle", lat: 46.16, lng: -1.15, g: 2 },
    { nom: "Poitiers", lat: 46.58, lng: 0.34, g: 2 }, { nom: "Limoges", lat: 45.83, lng: 1.26, g: 2 },
    { nom: "Périgueux", lat: 45.18, lng: 0.72, g: 1 }, { nom: "Angoulême", lat: 45.65, lng: 0.16, g: 1 },
    { nom: "Agen", lat: 44.2, lng: 0.62, g: 1 }, { nom: "Pau", lat: 43.3, lng: -0.37, g: 2 },
    { nom: "Bayonne", lat: 43.49, lng: -1.47, g: 2 }, { nom: "Mont-de-Marsan", lat: 43.89, lng: -0.5, g: 1 },
    { nom: "Niort", lat: 46.32, lng: -0.46, g: 1 }, { nom: "Brive", lat: 45.16, lng: 1.53, g: 1 }, { nom: "Bergerac", lat: 44.85, lng: 0.48, g: 1 }
  ];
  var COL = {
    sea: ["#A9CBCF", "#9FC3C8"], plain: ["#CFD9A8", "#C6D19D"], vine: ["#C8CF95", "#BFC78A"], forest: ["#8FB58C", "#86AD83"],
    marsh: ["#B9CFB4", "#B0C8AC"], hill: ["#B9C98E", "#AFC085"], high: ["#A8B983", "#9EB07A"], mont: ["#A7A99A", "#9C9E90"]
  };
  function height(type, i, j) {
    if (type === "hill") return 6 + hash(i, j) * 4;
    if (type === "high") return 12 + hash(i, j) * 5;
    if (type === "mont") return 10 + hash(i, j) * 6;
    if (type === "sea") return -3;
    return 0;
  }

  /* ---------- rendu ---------- */
  function render(host, opt) {
    opt = opt || {};
    host.innerHTML = "";
    var minX = -ROWS * TW - 24, width = (COLS + ROWS) * TW + 48, minY = -60, height_ = (COLS + ROWS) * TH + SLAB + 110;
    var svg = el("svg", { viewBox: minX + " " + minY + " " + width + " " + height_, class: "imap-svg", role: "img", preserveAspectRatio: "xMidYMid meet",
      "aria-label": "Carte illustrée du Sud-Ouest avec les lieux EVAD. Positions approximatives." }, host);

    // socle
    var g0 = el("g", {}, svg);
    poly(g0, [P(0, ROWS, 0), P(COLS, ROWS, 0), P(COLS, ROWS, -SLAB), P(0, ROWS, -SLAB)], "#9C6B4A");
    poly(g0, [P(COLS, 0, 0), P(COLS, ROWS, 0), P(COLS, ROWS, -SLAB), P(COLS, 0, -SLAB)], "#80573C");

    // tuiles de terrain, triées par profondeur
    var tiles = [], types = {}, zs = {};
    for (var i = 0; i < COLS; i++) for (var j = 0; j < ROWS; j++) {
      var ll = toLL(i + 0.5, j + 0.5), t = terrain(ll.lat, ll.lng), z = height(t, i, j);
      types[i + "," + j] = t; zs[i + "," + j] = z; tiles.push({ i: i, j: j, t: t, z: z });
    }
    tiles.sort(function (a, b) { return (a.i + a.j) - (b.i + b.j) || a.i - b.i; });
    var gt = el("g", { class: "imap-tiles" }, svg);
    tiles.forEach(function (c) {
      var i = c.i, j = c.j, z = c.z, base = COL[c.t][hash(j, i) > 0.5 ? 1 : 0];
      if (z > 0) {
        poly(gt, [P(i, j + 1, z), P(i + 1, j + 1, z), P(i + 1, j + 1, 0), P(i, j + 1, 0)], mix(base, "#1C2E26", 0.25));
        poly(gt, [P(i + 1, j, z), P(i + 1, j + 1, z), P(i + 1, j + 1, 0), P(i + 1, j, 0)], mix(base, "#1C2E26", 0.38));
      }
      var top = base;
      poly(gt, [P(i, j, z), P(i + 1, j, z), P(i + 1, j + 1, z), P(i, j + 1, z)], top, { stroke: c.t === "sea" ? "none" : "rgba(255,253,247,.16)", "stroke-width": 0.5 });
      // détails
      if (c.t === "sea" && hash(i * 2, j) > 0.6) {
        var w = P(i + 0.2 + hash(i, j) * 0.5, j + 0.5, z);
        el("path", { d: "M" + w[0] + " " + w[1] + " q4 -2 8 0 q4 2 8 0", stroke: "rgba(255,253,247,.7)", "stroke-width": 1, fill: "none" }, gt);
      } else if (c.t === "forest") {
        [[0.3, 0.35], [0.7, 0.65], [0.35, 0.75]].forEach(function (o, k) {
          if (hash(i + k, j) < 0.25) return;
          var p = P(i + o[0], j + o[1], z);
          el("path", { d: "M" + p[0] + " " + p[1] + " l-3 0 l3 -7 l3 7 z", fill: k % 2 ? "#4E8C6C" : "#3F7A5C" }, gt);
        });
      } else if (c.t === "vine") {
        [0.3, 0.6].forEach(function (f) { var a = P(i + 0.1, j + f, z), b = P(i + 0.9, j + f, z); el("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: "#8E9A5A", "stroke-width": 0.9, opacity: 0.8 }, gt); });
      } else if (c.t === "mont") {
        // un pic par tuile, neige au sommet
        var pk = P(i + 0.5, j + 0.5, z), hpk = 10 + hash(i, j) * 8;
        el("path", { d: "M" + (pk[0] - 9) + " " + (pk[1] + 2) + " L" + pk[0] + " " + (pk[1] - hpk) + " L" + (pk[0] + 9) + " " + (pk[1] + 2) + " Z", fill: "#8E9084" }, gt);
        el("path", { d: "M" + (pk[0] - 3) + " " + (pk[1] - hpk + 4.5) + " L" + pk[0] + " " + (pk[1] - hpk) + " L" + (pk[0] + 3) + " " + (pk[1] - hpk + 4.5) + " Z", fill: "#F4F1E8" }, gt);
      } else if ((c.t === "hill" || c.t === "high") && hash(j, i * 3) > 0.7) {
        var q = P(i + 0.5, j + 0.5, z);
        el("path", { d: "M" + q[0] + " " + q[1] + " l-3 0 l3 -6 l3 6 z", fill: "#5F7F52" }, gt);
      } else if (c.t === "marsh" && hash(i, j * 2) > 0.5) {
        var m = P(i + 0.5, j + 0.5, z);
        el("path", { d: "M" + m[0] + " " + m[1] + " l-2 -4 M" + m[0] + " " + m[1] + " l2 -5 M" + m[0] + " " + m[1] + " l0 -5", stroke: "#6E9A7B", "stroke-width": 1, fill: "none" }, gt);
      } else if (c.t === "plain" && hash(i * 5, j) > 0.86) {
        var r = P(i + 0.3 + hash(i, j) * 0.4, j + 0.5, z);
        el("path", { d: "M" + r[0] + " " + r[1] + " l-2 -3 M" + r[0] + " " + r[1] + " l2 -4", stroke: "#A6B37A", "stroke-width": 1, fill: "none" }, gt);
      }
    });

    // cours d'eau et estuaire, par-dessus les tuiles
    function zAt(u, v) { var k = Math.floor(u) + "," + Math.floor(v); return Math.max(0, zs[k] || 0); }
    function path(points, w, color) {
      var d = points.map(function (ll, k) { var uv = toUV(ll[0], ll[1]); var p = P(uv.u, uv.v, zAt(uv.u, uv.v)); return (k ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" ");
      el("path", { d: d, stroke: color, "stroke-width": w, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
    }
    var gw = el("g", { class: "imap-water" }, svg);
    RIVERS.forEach(function (r) { path(r.pts, r.w, "#8FBFC4"); });
    path(ESTUAIRE, 7, "#A9CBCF"); path(ESTUAIRE, 4, "#9FC3C8");

    // villes : quelques toits et un nom
    var gv = el("g", { class: "imap-towns" }, svg);
    VILLES.forEach(function (vl) {
      var uv = toUV(vl.lat, vl.lng), z = zAt(uv.u, uv.v), g = el("g", { class: "imap-town" }, gv);
      for (var k = 0; k < vl.g + 1; k++) {
        var p = P(uv.u + (hash(k, vl.g) - 0.5) * 0.9, uv.v + (hash(vl.g, k) - 0.5) * 0.9, z);
        el("rect", { x: p[0] - 3, y: p[1] - 5, width: 6, height: 5, fill: "#E9DCC8", stroke: "#B98E62", "stroke-width": 0.6 }, g);
        el("path", { d: "M" + (p[0] - 3.5) + " " + (p[1] - 5) + " L" + p[0] + " " + (p[1] - 8.5) + " L" + (p[0] + 3.5) + " " + (p[1] - 5) + " Z", fill: "#B8674A" }, g);
      }
      var c = P(uv.u, uv.v, z);
      el("text", { x: c[0], y: c[1] + 11, class: "imap-town-lbl", "text-anchor": "middle" }, g).textContent = vl.nom;
    });

    // les lieux : mini-plateaux isométriques, triés par profondeur
    var projets = (opt.projects || []).map(function (p) { return { p: p, uv: toUV(p.loc.lat, p.loc.lng) }; })
      .filter(function (x) { return x.uv.u >= 0 && x.uv.u <= COLS && x.uv.v >= 0 && x.uv.v <= ROWS; })
      .sort(function (a, b) { return (a.uv.u + a.uv.v) - (b.uv.u + b.uv.v); });
    var gm = el("g", { class: "imap-marks" }, svg);
    projets.forEach(function (x) {
      var p = x.p, c = P(x.uv.u, x.uv.v, zAt(x.uv.u, x.uv.v)), s = p.isMine ? 1.05 : 0.9;
      var sel = opt.selected === p.id, hl = opt.highlight && opt.highlight(p);
      var g = el("g", { class: "imark st-" + p.statut + (p.isMine ? " is-mine" : "") + (p.isExample ? " is-example" : "") + (sel ? " is-selected" : "") + (hl ? " is-highlight" : ""),
        "data-id": p.id, role: "button", tabindex: "0", "aria-label": p.nom + ", " + ({ reve: "rêvé", encours: "en cours", prouve: "prouvé" })[p.statut] + (p.isExample ? ", exemple" : ""),
        transform: "translate(" + (c[0] - 24 * s) + " " + (c[1] - 40 * s) + ") scale(" + s + ")" }, gm);
      el("title", {}, g).textContent = p.nom;
      var body = el("g", { class: "imark-body" }, g);
      if (p.isMine) el("ellipse", { cx: 24, cy: 40, rx: 16, ry: 7, class: "imark-pulse" }, body);
      el("ellipse", { cx: 25, cy: 43, rx: 15, ry: 5, class: "mi-shadow" }, body);
      el("polygon", { points: "6,28 24,37 24,43 6,34", class: "mi-left" }, body);
      el("polygon", { points: "24,37 42,28 42,34 24,43", class: "mi-right" }, body);
      el("polygon", { points: "24,19 42,28 24,37 6,28", class: "mi-top" }, body);
      el("rect", { x: 23, y: 18, width: 2.4, height: 9, rx: 1, class: "mi-trunk" }, body);
      el("circle", { cx: 24.2, cy: 13, r: 7, class: "mi-leaf" }, body);
      el("circle", { cx: 21.5, cy: 10.5, r: 3.2, class: "mi-light" }, body);
      if (p.statut === "prouve") [[27.5, 15], [21, 16], [26, 9.5]].forEach(function (f) { el("circle", { cx: f[0], cy: f[1], r: 1.4, class: "mi-fruit" }, body); });
      if (p.statut === "reve") el("polygon", { points: "24,19 42,28 24,37 6,28", class: "mi-dash" }, body);
      var nom = p.nom.length > 26 ? p.nom.slice(0, 25) + "…" : p.nom;
      el("text", { x: 24, y: 55, class: "imark-lbl", "text-anchor": "middle" }, g).textContent = nom;
      if (opt.onSelect) {
        g.addEventListener("click", function () { opt.onSelect(p.id); });
        g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); opt.onSelect(p.id); } });
      }
    });

    // le visiteur, s'il s'est localisé et qu'il est dans le cadre
    if (opt.me) {
      var mu = toUV(opt.me.lat, opt.me.lng);
      if (mu.u >= 0 && mu.u <= COLS && mu.v >= 0 && mu.v <= ROWS) {
        var mc = P(mu.u, mu.v, zAt(mu.u, mu.v)), gme = el("g", { class: "imap-me" }, svg);
        el("ellipse", { cx: mc[0], cy: mc[1], rx: 9, ry: 4.5, class: "imap-me-ring" }, gme);
        el("circle", { cx: mc[0], cy: mc[1] - 1, r: 4, fill: "#9BC7AC", stroke: "#0B6049", "stroke-width": 1.6 }, gme);
        el("text", { x: mc[0], y: mc[1] - 9, class: "imap-me-lbl", "text-anchor": "middle" }, gme).textContent = "Toi";
      }
    }

    // repère et mention
    var rose = P(COLS - 1.2, 0.6, 0);
    var gr = el("g", { class: "imap-rose" }, svg);
    el("path", { d: "M" + rose[0] + " " + (rose[1] - 14) + " l4 10 l-4 -3 l-4 3 z", fill: "#2C5234" }, gr);
    el("text", { x: rose[0], y: rose[1] - 17, class: "imap-rose-lbl", "text-anchor": "middle" }, gr).textContent = "N";
    var cap = P(COLS, ROWS, -SLAB - 14);
    el("text", { x: cap[0], y: cap[1] + 30, class: "imap-caption", "text-anchor": "middle" }, svg).textContent = "Carte illustrée : positions approximatives. La vue carte donne le détail.";
    return svg;
  }

  window.renderIsoMap = render;
  window.EvadIsoMap = { render: render, toUV: toUV, bounds: { lat0: LAT0, lat1: LAT1, lng0: LNG0, lng1: LNG1 } };
})();
