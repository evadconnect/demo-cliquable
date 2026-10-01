/* EVAD, scène 2.5D isométrique du lieu (SVG pur, sans dépendance).
   EvadScene.render(conteneur, options) dessine le terrain, les bâtiments existants
   et les solutions posées avec leur état : prévu (gris), en cours (ambre), vérifié (vert). */
(function () {
  var NS = "http://www.w3.org/2000/svg";
  var TW = 32; // demi-largeur d'une case
  var TH = 16; // demi-hauteur d'une case
  var SLAB = 22; // épaisseur du socle de terre

  function P(x, y, z) { return [(x - y) * TW, (x + y) * TH - (z || 0)]; }
  function pts(list) { return list.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" "); }
  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function poly(parent, list, fill, extra) {
    var a = { points: pts(list), fill: fill };
    if (extra) for (var k in extra) a[k] = extra[k];
    return el("polygon", a, parent);
  }
  function mix(a, b, t) {
    var pa = [1, 3, 5].map(function (i) { return parseInt(a.substr(i, 2), 16); });
    var pb = [1, 3, 5].map(function (i) { return parseInt(b.substr(i, 2), 16); });
    return "#" + pa.map(function (v, i) { var c = Math.round(v + (pb[i] - v) * t); return (c < 16 ? "0" : "") + c.toString(16); }).join("");
  }
  function hash(i, j) { var h = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453; return h - Math.floor(h); }
  // interpolation bilinéaire dans un quadrilatère (pour fenêtres et panneaux)
  function sub(q, u0, v0, u1, v1) {
    function at(u, v) {
      var top = [q[0][0] + (q[1][0] - q[0][0]) * u, q[0][1] + (q[1][1] - q[0][1]) * u];
      var bot = [q[3][0] + (q[2][0] - q[3][0]) * u, q[3][1] + (q[2][1] - q[3][1]) * u];
      return [top[0] + (bot[0] - top[0]) * v, top[1] + (bot[1] - top[1]) * v];
    }
    return [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)];
  }

  // boîte isométrique : renvoie les 3 faces visibles
  function box(g, x, y, w, d, h, c, z0, extra) {
    z0 = z0 || 0;
    var top = [P(x, y, z0 + h), P(x + w, y, z0 + h), P(x + w, y + d, z0 + h), P(x, y + d, z0 + h)];
    var left = [P(x, y + d, z0 + h), P(x + w, y + d, z0 + h), P(x + w, y + d, z0), P(x, y + d, z0)];
    var right = [P(x + w, y, z0 + h), P(x + w, y + d, z0 + h), P(x + w, y + d, z0), P(x + w, y, z0)];
    poly(g, left, c.left, extra);
    poly(g, right, c.right, extra);
    poly(g, top, c.top, extra);
    return { top: top, left: left, right: right };
  }
  // toit à deux pans, faîtage parallèle à l'axe x
  function roof(g, x, y, w, d, h, rh, c, over) {
    over = over || 0.08;
    var x0 = x - over, x1 = x + w + over, y0 = y - over, y1 = y + d + over, ym = y + d / 2;
    var back = [P(x0, y0, h), P(x1, y0, h), P(x1, ym, h + rh), P(x0, ym, h + rh)];
    var front = [P(x0, ym, h + rh), P(x1, ym, h + rh), P(x1, y1, h), P(x0, y1, h)];
    var gable = [P(x + w, y, h), P(x + w, y + d, h), P(x + w, ym, h + rh)];
    poly(g, back, c.back);
    poly(g, gable, c.gable);
    poly(g, front, c.front);
    return { front: front, back: back };
  }
  function shadow(g, cx, cy, rx) { el("ellipse", { cx: cx, cy: cy, rx: rx, ry: rx / 2, fill: "rgba(34,48,31,.16)" }, g); }
  function tree(g, x, y, s, c) {
    var b = P(x, y, 0);
    shadow(g, b[0] + 4, b[1] + 1, 13 * s);
    el("rect", { x: b[0] - 2, y: b[1] - 16 * s, width: 4, height: 16 * s, rx: 1.5, fill: c.trunk }, g);
    el("circle", { cx: b[0], cy: b[1] - 24 * s, r: 13 * s, fill: c.leaf }, g);
    el("circle", { cx: b[0] - 4 * s, cy: b[1] - 28 * s, r: 7 * s, fill: c.light }, g);
    if (c.fruit) {
      [[5, -20], [-6, -18], [2, -31], [8, -27]].forEach(function (f) {
        el("circle", { cx: b[0] + f[0] * s, cy: b[1] + f[1] * s, r: 1.8, fill: c.fruit }, g);
      });
    }
  }
  function person(g, x, y, color) {
    var b = P(x, y, 0);
    el("ellipse", { cx: b[0], cy: b[1], rx: 5, ry: 2.5, fill: "rgba(34,48,31,.2)" }, g);
    el("rect", { x: b[0] - 3.5, y: b[1] - 15, width: 7, height: 12, rx: 3.5, fill: color }, g);
    el("circle", { cx: b[0], cy: b[1] - 18.5, r: 3.4, fill: "#E9C9A6" }, g);
  }

  /* ---------- palettes ---------- */
  var BASE = {
    wallL: "#F4EBD8", wallR: "#DCCDB0", wallT: "#EFE4CC",
    roofF: "#B8674A", roofB: "#9E553C", gable: "#E6D8BC",
    green: { front: "#6FA083", back: "#588A6C", gable: "#E6D8BC" },
    solar: "#34465A", solarLine: "#8FA6B8",
    bed: { top: "#6E4E37", left: "#8A6448", right: "#765439" },
    plant: "#4E8C6C", plantLight: "#9BC7AC",
    water: "#9CC3C4", waterDeep: "#7FB0B3", rim: "#86AE94",
    trunk: "#7A5A40"
  };
  var STATUS = {
    prevu: { a: "#C9C3B0", b: "#B3AD98", c: "#DEDACB", d: "#A29C87", stroke: "#8C8672", dash: "4 3", tile: "rgba(203,198,180,.55)" },
    encours: { a: "#D59154", b: "#B06E2E", c: "#EAC197", d: "#9A5F28", stroke: "#8A5422", dash: null, tile: "rgba(213,145,84,.35)" },
    verifie: { a: "#4E8C6C", b: "#0B6049", c: "#9BC7AC", d: "#2F6B52", stroke: "#0B6049", dash: null, tile: "rgba(78,140,108,.35)" }
  };

  /* ---------- bâtiments existants ---------- */
  var DRAW = {
    atelier: function (g, s) {
      var f = box(g, s.i + 0.1, s.j + 0.1, s.w - 0.2, s.d - 0.2, 40, { top: BASE.wallT, left: BASE.wallL, right: BASE.wallR });
      // grandes portes et fenêtres
      poly(g, sub(f.left, 0.1, 0.45, 0.32, 1), "#8A6448");
      [0.45, 0.62, 0.79].forEach(function (u) { poly(g, sub(f.left, u, 0.3, u + 0.11, 0.62), "#9FB8B8"); });
      poly(g, sub(f.right, 0.3, 0.3, 0.7, 0.62), "#9FB8B8");
      var r = roof(g, s.i + 0.1, s.j + 0.1, s.w - 0.2, s.d - 0.2, 40, 20, { front: BASE.roofF, back: BASE.roofB, gable: BASE.gable });
      // toit solaire
      for (var k = 0; k < 4; k++) {
        var u = 0.06 + k * 0.235;
        poly(g, sub(r.front, u, 0.12, u + 0.2, 0.88), BASE.solar, { stroke: BASE.solarLine, "stroke-width": 0.6 });
      }
    },
    serre: function (g, s) {
      var x = s.i + 0.1, y = s.j + 0.12, w = s.w - 0.2, d = s.d - 0.24;
      poly(g, [P(x, y, 0), P(x + w, y, 0), P(x + w, y + d, 0), P(x, y + d, 0)], "#6E8F58");
      for (var k = 0; k < 7; k++) {
        var p = P(x + 0.2 + k * (w - 0.4) / 6, y + d / 2, 0);
        el("circle", { cx: p[0], cy: p[1] - 5, r: 4.5, fill: k % 2 ? BASE.plant : BASE.plantLight }, g);
      }
      var f = box(g, x, y, w, d, 24, { top: "rgba(255,255,255,.35)", left: "rgba(255,255,255,.55)", right: "rgba(245,248,242,.7)" }, 0, { stroke: "#C9D6C6", "stroke-width": 0.8 });
      for (var u = 1; u < 6; u++) {
        var a = sub(f.left, u / 6, 0, u / 6, 1);
        el("line", { x1: a[0][0], y1: a[0][1], x2: a[3][0], y2: a[3][1], stroke: "#C9D6C6", "stroke-width": 0.8 }, g);
      }
      roof(g, x, y, w, d, 24, 12, { front: "rgba(255,255,255,.72)", back: "rgba(255,255,255,.5)", gable: "rgba(255,255,255,.6)" }, 0.02);
    },
    preau: function (g, s) {
      var x = s.i + 0.15, y = s.j + 0.15, w = s.w - 0.3, d = s.d - 0.3, h = 30;
      // bancs
      box(g, x + 0.4, y + 0.6, w - 0.8, 0.25, 6, { top: "#B98E62", left: "#A07650", right: "#8A6448" });
      [[x, y], [x + w, y], [x + w, y + d], [x, y + d]].forEach(function (c) {
        var a = P(c[0], c[1], 0), b = P(c[0], c[1], h);
        el("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: "#7A5A40", "stroke-width": 3, "stroke-linecap": "round" }, g);
      });
      var top = [P(x - 0.1, y - 0.1, h + 8), P(x + w + 0.1, y - 0.1, h + 8), P(x + w + 0.1, y + d + 0.1, h), P(x - 0.1, y + d + 0.1, h)];
      poly(g, [top[3], top[2], P(x + w + 0.1, y + d + 0.1, h - 3), P(x - 0.1, y + d + 0.1, h - 3)], "#8A6448");
      poly(g, top, "#A07650");
      for (var k = 0; k < 3; k++) poly(g, sub(top, 0.05 + k * 0.315, 0.1, 0.32 + k * 0.315, 0.9), BASE.solar, { stroke: BASE.solarLine, "stroke-width": 0.6 });
    },
    maison: function (g, s) {
      var f = box(g, s.i + 0.18, s.j + 0.18, 0.64, 0.64, 22, { top: BASE.wallT, left: BASE.wallL, right: BASE.wallR });
      poly(g, sub(f.left, 0.4, 0.4, 0.62, 1), "#8A6448");
      poly(g, sub(f.right, 0.35, 0.3, 0.65, 0.6), "#9FB8B8");
      var r = roof(g, s.i + 0.18, s.j + 0.18, 0.64, 0.64, 22, 13, BASE.green, 0.1);
      [0.2, 0.5, 0.8].forEach(function (u) { var p = sub(r.front, u, 0.5, u, 0.5)[0]; el("circle", { cx: p[0], cy: p[1], r: 2.2, fill: "#A9C48A" }, g); });
    },
    planches: function (g, s) {
      [0.12, 0.55].forEach(function (o) {
        box(g, s.i + 0.1, s.j + o, 0.8, 0.32, 6, BASE.bed);
        for (var k = 0; k < 4; k++) {
          var p = P(s.i + 0.2 + k * 0.2, s.j + o + 0.16, 6);
          el("circle", { cx: p[0], cy: p[1] - 2, r: 3.2, fill: k % 2 ? BASE.plant : BASE.plantLight }, g);
        }
      });
    },
    mare: function (g, s) {
      var c = P(s.i + s.w / 2, s.j + s.d / 2, 0);
      el("ellipse", { cx: c[0], cy: c[1], rx: 26 * s.w * 0.9, ry: 13 * s.d * 0.9, fill: BASE.rim }, g);
      el("ellipse", { cx: c[0], cy: c[1] + 1, rx: 22 * s.w * 0.9, ry: 11 * s.d * 0.9, fill: BASE.water }, g);
      el("ellipse", { cx: c[0] - 8, cy: c[1] - 2, rx: 10, ry: 3, fill: "#BFDADA" }, g);
      [[-30, 2], [-26, 6], [28, -2], [24, 4]].forEach(function (r) {
        el("line", { x1: c[0] + r[0], y1: c[1] + r[1], x2: c[0] + r[0] + 1, y2: c[1] + r[1] - 12, stroke: "#5F7F52", "stroke-width": 1.6, "stroke-linecap": "round" }, g);
      });
    },
    arbre: function (g, s) { tree(g, s.i + 0.5, s.j + 0.5, 1.25, { trunk: BASE.trunk, leaf: "#4E8C6C", light: "#79A98C" }); },
    fruitier: function (g, s) { tree(g, s.i + 0.5, s.j + 0.5, 0.95, { trunk: BASE.trunk, leaf: "#5E9B79", light: "#9BC7AC", fruit: "#C06848" }); }
  };

  /* ---------- solutions posées (dessinées selon leur état) ---------- */
  var SOL = {
    citerne: function (g, i, j, c) {
      [[0.35, 0.4], [0.65, 0.62]].forEach(function (o) {
        var b = P(i + o[0], j + o[1], 0), r = 9, h = 20;
        shadow(g, b[0] + 3, b[1] + 1, 11);
        el("path", { d: "M" + (b[0] - r) + " " + (b[1] - h) + " L" + (b[0] - r) + " " + b[1] + " A" + r + " " + r / 2 + " 0 0 0 " + (b[0] + r) + " " + b[1] + " L" + (b[0] + r) + " " + (b[1] - h) + " Z", fill: c.b, stroke: c.stroke, "stroke-width": 1, "stroke-dasharray": c.dash }, g);
        el("ellipse", { cx: b[0], cy: b[1] - h, rx: r, ry: r / 2, fill: c.c, stroke: c.stroke, "stroke-width": 1, "stroke-dasharray": c.dash }, g);
      });
    },
    mare: function (g, i, j, c) {
      var b = P(i + 0.5, j + 0.5, 0);
      el("ellipse", { cx: b[0], cy: b[1], rx: 24, ry: 12, fill: c.a, stroke: c.stroke, "stroke-width": 1, "stroke-dasharray": c.dash }, g);
      el("ellipse", { cx: b[0], cy: b[1] + 1, rx: 19, ry: 9, fill: c.c }, g);
      [[-20, 2], [18, -1]].forEach(function (r) { el("line", { x1: b[0] + r[0], y1: b[1] + r[1], x2: b[0] + r[0], y2: b[1] + r[1] - 11, stroke: c.b, "stroke-width": 1.6, "stroke-linecap": "round" }, g); });
    },
    haie: function (g, i, j, c) {
      for (var k = 0; k < 4; k++) {
        var b = P(i + 0.15 + k * 0.23, j + 0.5, 0);
        el("circle", { cx: b[0], cy: b[1] - 8, r: 8, fill: c.a, stroke: c.stroke, "stroke-width": 1, "stroke-dasharray": c.dash }, g);
        el("circle", { cx: b[0] - 2, cy: b[1] - 11, r: 3.5, fill: c.c }, g);
        if (c.fruit) el("circle", { cx: b[0] + 3, cy: b[1] - 6, r: 1.8, fill: c.fruit }, g);
      }
    },
    compost: function (g, i, j, c) {
      var f = box(g, i + 0.2, j + 0.25, 0.6, 0.5, 14, { top: c.d, left: c.a, right: c.b }, 0, { stroke: c.stroke, "stroke-width": 0.8, "stroke-dasharray": c.dash });
      [0.33, 0.66].forEach(function (v) { var a = sub(f.left, 0, v, 1, v); el("line", { x1: a[0][0], y1: a[0][1], x2: a[1][0], y2: a[1][1], stroke: c.stroke, "stroke-width": 0.8 }, g); });
    },
    solaire: function (g, i, j, c) {
      [[i + 0.3, j + 0.25], [i + 0.3, j + 0.75]].forEach(function (lg) { var a = P(lg[0], lg[1], 0), b = P(lg[0], lg[1], 12); el("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: c.stroke, "stroke-width": 2 }, g); });
      var q = [P(i + 0.12, j + 0.12, 18), P(i + 0.88, j + 0.12, 7), P(i + 0.88, j + 0.88, 7), P(i + 0.12, j + 0.88, 18)];
      poly(g, q, c.b, { stroke: c.stroke, "stroke-width": 1, "stroke-dasharray": c.dash });
      [0.33, 0.66].forEach(function (u) { var a = sub(q, u, 0, u, 1); el("line", { x1: a[0][0], y1: a[0][1], x2: a[3][0], y2: a[3][1], stroke: c.c, "stroke-width": 0.8 }, g); });
      var m = sub(q, 0, 0.5, 1, 0.5); el("line", { x1: m[0][0], y1: m[0][1], x2: m[1][0], y2: m[1][1], stroke: c.c, "stroke-width": 0.8 }, g);
    },
    four: function (g, i, j, c) {
      box(g, i + 0.2, j + 0.2, 0.6, 0.6, 7, { top: c.d, left: c.b, right: c.d }, 0, { stroke: c.stroke, "stroke-width": 0.8, "stroke-dasharray": c.dash });
      var b = P(i + 0.5, j + 0.5, 7);
      el("path", { d: "M" + (b[0] - 17) + " " + b[1] + " A17 16 0 0 1 " + (b[0] + 17) + " " + b[1] + " Z", fill: c.a, stroke: c.stroke, "stroke-width": 1, "stroke-dasharray": c.dash }, g);
      el("path", { d: "M" + (b[0] - 5) + " " + (b[1] + 4) + " A5 6 0 0 1 " + (b[0] + 5) + " " + (b[1] + 4) + " Z", fill: "#22301F", opacity: 0.7 }, g);
      el("rect", { x: b[0] + 6, y: b[1] - 22, width: 4, height: 9, fill: c.b }, g);
    },
    ressourcerie: function (g, i, j, c) {
      var f = box(g, i + 0.15, j + 0.15, 0.7, 0.7, 20, { top: c.c, left: c.a, right: c.b }, 0, { stroke: c.stroke, "stroke-width": 0.8, "stroke-dasharray": c.dash });
      poly(g, sub(f.left, 0.3, 0.35, 0.7, 1), c.d);
      roof(g, i + 0.15, j + 0.15, 0.7, 0.7, 20, 10, { front: c.b, back: c.d, gable: c.c }, 0.06);
    },
    repair: function (g, i, j, c) {
      box(g, i + 0.25, j + 0.35, 0.5, 0.3, 9, { top: c.c, left: c.a, right: c.b }, 0, { stroke: c.stroke, "stroke-width": 0.8, "stroke-dasharray": c.dash });
      var b = P(i + 0.5, j + 0.5, 9), t = P(i + 0.5, j + 0.5, 34);
      el("line", { x1: b[0], y1: b[1], x2: t[0], y2: t[1], stroke: c.stroke, "stroke-width": 1.5 }, g);
      el("path", { d: "M" + (t[0] - 20) + " " + (t[1] + 7) + " Q" + t[0] + " " + (t[1] - 10) + " " + (t[0] + 20) + " " + (t[1] + 7) + " Z", fill: c.a, stroke: c.stroke, "stroke-width": 1, "stroke-dasharray": c.dash }, g);
    },
    planches: function (g, i, j, c) {
      [0.12, 0.55].forEach(function (o) {
        box(g, i + 0.1, j + o, 0.8, 0.32, 6, { top: c.d, left: c.b, right: c.b }, 0, { stroke: c.stroke, "stroke-width": 0.8, "stroke-dasharray": c.dash });
        for (var k = 0; k < 4; k++) { var p = P(i + 0.2 + k * 0.2, j + o + 0.16, 6); el("circle", { cx: p[0], cy: p[1] - 2, r: 3, fill: k % 2 ? c.a : c.c }, g); }
      });
    },
    poulailler: function (g, i, j, c) {
      [[0.3, 0.3], [0.7, 0.3], [0.7, 0.7], [0.3, 0.7]].forEach(function (o) { var a = P(i + o[0], j + o[1], 0), b = P(i + o[0], j + o[1], 8); el("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: c.stroke, "stroke-width": 1.5 }, g); });
      box(g, i + 0.25, j + 0.25, 0.5, 0.5, 12, { top: c.c, left: c.a, right: c.b }, 8, { stroke: c.stroke, "stroke-width": 0.8, "stroke-dasharray": c.dash });
      roof(g, i + 0.25, j + 0.25, 0.5, 0.5, 20, 8, { front: c.b, back: c.d, gable: c.c }, 0.05);
      [[0.15, 0.85], [0.85, 0.8]].forEach(function (o) { var p = P(i + o[0], j + o[1], 0); el("ellipse", { cx: p[0], cy: p[1] - 3, rx: 4, ry: 3, fill: "#FFFDF7", stroke: c.stroke, "stroke-width": 0.6 }, g); });
    },
    agora: function (g, i, j, c) {
      for (var k = 0; k < 6; k++) {
        var a = k / 6 * Math.PI * 2, x = i + 0.5 + Math.cos(a) * 0.32, y = j + 0.5 + Math.sin(a) * 0.32;
        box(g, x - 0.07, y - 0.07, 0.14, 0.14, 5, { top: c.c, left: c.a, right: c.b }, 0, { stroke: c.stroke, "stroke-width": 0.6, "stroke-dasharray": c.dash });
      }
      var p = P(i + 0.5, j + 0.5, 0); el("circle", { cx: p[0], cy: p[1], r: 3, fill: c.b }, g);
    },
    panneau: function (g, i, j, c) {
      [0.3, 0.7].forEach(function (u) { var a = P(i + u, j + 0.5, 0), b = P(i + u, j + 0.5, 26); el("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: c.stroke, "stroke-width": 2 }, g); });
      var q = [P(i + 0.2, j + 0.5, 32), P(i + 0.8, j + 0.5, 32), P(i + 0.8, j + 0.5, 14), P(i + 0.2, j + 0.5, 14)];
      poly(g, q, c.a, { stroke: c.stroke, "stroke-width": 1, "stroke-dasharray": c.dash });
      [0.3, 0.55].forEach(function (v) { var a = sub(q, 0.15, v, 0.85, v); el("line", { x1: a[0][0], y1: a[0][1], x2: a[1][0], y2: a[1][1], stroke: c.c, "stroke-width": 1.2 }, g); });
    }
  };

  function statusPalette(status) {
    var s = STATUS[status] || STATUS.prevu;
    var c = {}; for (var k in s) c[k] = s[k];
    if (status === "verifie") c.fruit = "#C06848";
    return c;
  }

  /* ---------- rendu ---------- */
  function render(container, opt) {
    opt = opt || {};
    var N = opt.grille || 9;
    var pathLine = opt.chemin === undefined ? 4 : opt.chemin;
    var vitality = Math.max(0, Math.min(1, opt.vitalite || 0));
    var structures = opt.structures || [];
    var placed = opt.placed || [];
    var solutions = opt.solutions || {};

    container.innerHTML = "";
    var minX = -N * TW - 12, width = N * TW * 2 + 24;
    var minY = -96, height = N * TH * 2 + SLAB + 110;
    var svg = el("svg", { viewBox: minX + " " + minY + " " + width + " " + height, class: "iso-svg", role: "img", "aria-label": opt.label || "Maquette 2.5D du lieu" }, container);

    // occupation des cases
    var occ = {};
    structures.forEach(function (s) {
      for (var a = 0; a < (s.w || 1); a++) for (var b = 0; b < (s.d || 1); b++) occ[(s.i + a) + "," + (s.j + b)] = "structure";
    });
    placed.forEach(function (p) { occ[p.i + "," + p.j] = p.uid; });
    function isPath(i, j) { return pathLine !== null && pathLine !== false && (i === pathLine || j === pathLine); }

    // socle de terre
    var ground = el("g", {}, svg);
    poly(ground, [P(0, N, 0), P(N, N, 0), P(N, N, -SLAB), P(0, N, -SLAB)], "#9C6B4A");
    poly(ground, [P(N, 0, 0), P(N, N, 0), P(N, N, -SLAB), P(N, 0, -SLAB)], "#80573C");
    poly(ground, [P(0, N, 0), P(N, N, 0), P(N, N, -5), P(0, N, -5)], mix("#789A74", "#50895F", vitality));
    poly(ground, [P(N, 0, 0), P(N, N, 0), P(N, N, -5), P(N, 0, -5)], mix("#688A66", "#447A52", vitality));
    // petits cailloux dans la terre
    for (var s2 = 0; s2 < 10; s2++) {
      var u = hash(s2, 3), v = 0.35 + hash(3, s2) * 0.5;
      var q = s2 % 2 ? [P(u * N, N, -SLAB * v)] : [P(N, u * N, -SLAB * v)];
      el("ellipse", { cx: q[0][0], cy: q[0][1], rx: 2.4, ry: 1.3, fill: "rgba(255,253,247,.25)" }, ground);
    }

    // cases
    var grassA = mix("#C4CBA0", "#90BE94", vitality), grassB = mix("#BBC395", "#85B588", vitality);
    var tiles = el("g", { class: "iso-tiles" }, svg);
    for (var i = 0; i < N; i++) for (var j = 0; j < N; j++) {
      var tp = [P(i, j, 0), P(i + 1, j, 0), P(i + 1, j + 1, 0), P(i, j + 1, 0)];
      var fill = isPath(i, j) ? (hash(i, j) > 0.5 ? "#EADFC2" : "#E4D7B6") : (hash(i, j) > 0.5 ? grassA : grassB);
      poly(tiles, tp, fill, { stroke: "rgba(255,253,247,.18)", "stroke-width": 0.6 });
      if (!isPath(i, j) && !occ[i + "," + j] && hash(j, i) > 0.72) {
        var t = P(i + 0.3 + hash(i, j) * 0.4, j + 0.5, 0);
        el("path", { d: "M" + t[0] + " " + t[1] + " l-2 -4 M" + t[0] + " " + t[1] + " l2 -5 M" + t[0] + " " + t[1] + " l0 -5", stroke: mix("#8CA786", "#447A52", vitality), "stroke-width": 1, fill: "none" }, tiles);
      }
    }

    // marquage d'état sous les solutions posées
    placed.forEach(function (p) {
      var c = STATUS[p.status] || STATUS.prevu;
      poly(tiles, [P(p.i + 0.04, p.j + 0.04, 0), P(p.i + 0.96, p.j + 0.04, 0), P(p.i + 0.96, p.j + 0.96, 0), P(p.i + 0.04, p.j + 0.96, 0)], c.tile, { stroke: c.stroke, "stroke-width": 1.4, "stroke-dasharray": p.status === "prevu" ? "5 4" : null, class: "iso-mark" });
    });

    var hover = poly(svg, [P(0, 0, 0), P(1, 0, 0), P(1, 1, 0), P(0, 1, 0)], "rgba(217,160,63,.35)", { stroke: "#D9A03F", "stroke-width": 2, class: "iso-hover", visibility: "hidden" });

    // objets triés par profondeur
    var items = [];
    structures.forEach(function (s) { items.push({ k: s.i + (s.w || 1) + s.j + (s.d || 1), kind: "s", s: s }); });
    placed.forEach(function (p) { items.push({ k: p.i + p.j + 2, kind: "p", p: p }); });
    (opt.personnages || []).forEach(function (h) { items.push({ k: h.i + h.j + 1.2, kind: "h", h: h }); });
    items.sort(function (a, b) { return a.k - b.k; });

    var objects = el("g", { class: "iso-objects" }, svg);
    items.forEach(function (it) {
      if (it.kind === "s") {
        var s = { i: it.s.i, j: it.s.j, w: it.s.w || 1, d: it.s.d || 1 };
        var g = el("g", { class: "iso-structure" }, objects);
        if (DRAW[it.s.type]) DRAW[it.s.type](g, s);
      } else if (it.kind === "h") {
        person(el("g", {}, objects), it.h.i + 0.5, it.h.j + 0.5, it.h.c);
      } else {
        var p = it.p, sol = solutions[p.solId] || {};
        var g2 = el("g", { class: "iso-item is-" + p.status + (opt.justVerified === p.uid ? " just-verified" : ""), "data-uid": p.uid }, objects);
        if (opt.interactive) {
          g2.setAttribute("role", "button");
          g2.setAttribute("tabindex", "0");
          g2.setAttribute("aria-label", (sol.nom || "Solution") + ", " + ({ prevu: "prévu", encours: "en cours", verifie: "vérifié" })[p.status]);
        }
        el("title", {}, g2).textContent = (sol.nom || "") + " (" + ({ prevu: "prévu", encours: "en cours", verifie: "vérifié" })[p.status] + ")";
        var draw = SOL[sol.scene] || SOL.compost;
        draw(g2, p.i, p.j, statusPalette(p.status));
        if (opt.justVerified === p.uid) {
          var c0 = P(p.i + 0.5, p.j + 0.5, 0);
          el("ellipse", { cx: c0[0], cy: c0[1], rx: 30, ry: 15, class: "verify-ring" }, g2);
          [[-18, -30], [16, -38], [0, -48]].forEach(function (o, n) {
            el("path", { d: "M0 0 C4 -4 10 -4 12 0 C10 4 4 4 0 0 Z", transform: "translate(" + (c0[0] + o[0]) + " " + (c0[1] + o[1]) + ")", class: "verify-leaf verify-leaf-" + n }, g2);
          });
        }
      }
    });

    function cellFromPoint(clientX, clientY) {
      var pt = svg.createSVGPoint(); pt.x = clientX; pt.y = clientY;
      var m = svg.getScreenCTM(); if (!m) return null;
      var sp = pt.matrixTransform(m.inverse());
      var a = sp.x / TW, b = sp.y / TH;
      var ci = Math.floor((a + b) / 2), cj = Math.floor((b - a) / 2);
      if (ci < 0 || cj < 0 || ci >= N || cj >= N) return null;
      return { i: ci, j: cj, free: !occ[ci + "," + cj] && !isPath(ci, cj) };
    }
    function showHover(cell) {
      if (!cell) { hover.setAttribute("visibility", "hidden"); return; }
      hover.setAttribute("points", pts([P(cell.i, cell.j, 0), P(cell.i + 1, cell.j, 0), P(cell.i + 1, cell.j + 1, 0), P(cell.i, cell.j + 1, 0)]));
      hover.setAttribute("fill", cell.free ? "rgba(217,160,63,.35)" : "rgba(192,104,72,.25)");
      hover.setAttribute("stroke", cell.free ? "#D9A03F" : "#C06848");
      hover.setAttribute("visibility", "visible");
    }
    function firstFree(prefer) {
      var order = [];
      for (var a = 0; a < N; a++) for (var b = 0; b < N; b++) order.push({ i: a, j: b });
      if (prefer) order.sort(function (x, y) { return prefer(x) - prefer(y); });
      for (var k = 0; k < order.length; k++) { var c = order[k]; if (!occ[c.i + "," + c.j] && !isPath(c.i, c.j)) return c; }
      return null;
    }
    return { svg: svg, cellFromPoint: cellFromPoint, showHover: showHover, firstFree: firstFree, isFree: function (i, j) { return !occ[i + "," + j] && !isPath(i, j); } };
  }

  window.EvadScene = { render: render };
})();
