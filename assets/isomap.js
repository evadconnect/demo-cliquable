/* EVAD : carte illustrée isométrique de la France (SVG, sans image ni tuile).
   Le territoire est dessiné par règles simples : un contour approché du pays et de la Corse,
   des régions de relief (Alpes, Pyrénées, Massif central, Jura, Vosges), de forêts, de vignes,
   les grands fleuves et une cinquantaine de villes repères. Les lieux réels sont posés dessus
   par projection de leur latitude et longitude. On zoome à la molette, au pincement ou avec
   les boutons, on se déplace en glissant. C'est une illustration : les positions sont
   approximatives, la vue carte (OpenStreetMap) reste là pour la précision. */
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var COLS = 100, ROWS = 80, TW = 24, TH = 12, SLAB = 22;
  // Cadre large (même finesse de case qu'avant : un quart de degré) : la mer qui entoure la France
  // permet de cadrer n'importe quelle vue sans jamais voir le bord du losange.
  var LAT0 = 38.2, LAT1 = 54.87, LNG0 = -10.3, LNG1 = 14.7;
  // losange de la carte : centre et demi-diagonales
  var GEO = { cx: (COLS - ROWS) * TW / 2, cy: (COLS + ROWS) * TH / 2, W: (COLS + ROWS) * TW / 2, H: (COLS + ROWS) * TH / 2 };

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
  // Contours approchés (latitude, longitude), dans le sens horaire.
  var FRANCE = [
    [51.05, 2.37], [50.95, 1.85], [50.73, 1.6], [50.5, 1.58], [50.2, 1.6], [49.92, 1.08], [49.5, 0.1], [49.35, -0.4], [49.65, -1.62], [49.72, -1.95],
    [48.84, -1.6], [48.64, -1.5], [48.65, -2.0], [48.68, -2.3], [48.52, -2.76], [48.78, -3.05], [48.72, -3.98], [48.4, -4.5], [48.03, -4.73], [47.8, -4.35],
    [47.74, -3.37], [47.48, -3.12], [47.6, -2.75], [47.27, -2.2], [47.1, -2.1], [46.98, -2.25], [46.5, -1.78], [46.16, -1.15], [45.62, -1.03], [45.0, -1.2],
    [44.66, -1.2], [44.2, -1.3], [43.48, -1.56], [43.37, -1.78], [43.05, -1.3], [42.9, -0.7], [42.8, 0.0], [42.7, 0.6], [42.6, 1.2], [42.5, 1.5],
    [42.45, 2.0], [42.45, 2.6], [42.44, 3.17], [42.7, 3.04], [43.15, 3.1], [43.4, 3.7], [43.5, 4.0], [43.4, 4.6], [43.3, 5.37], [43.1, 5.93],
    [43.05, 6.2], [43.27, 6.64], [43.55, 7.0], [43.7, 7.27], [43.78, 7.5], [44.1, 7.6], [44.4, 7.0], [45.1, 7.1], [45.8, 6.9], [46.2, 6.1],
    [46.45, 6.45], [46.8, 6.45], [47.0, 6.9], [47.58, 7.59], [48.58, 7.8], [48.97, 8.23], [49.2, 7.0], [49.5, 5.8], [49.55, 5.5], [49.7, 4.95],
    [50.13, 4.83], [50.3, 4.0], [50.75, 3.1]
  ];
  var CORSE = [[43.0, 9.43], [42.7, 9.45], [41.85, 9.4], [41.39, 9.16], [41.92, 8.74], [42.57, 8.76], [42.95, 9.3]];
  function inside(poly, lat, lng) {
    var c = false;
    for (var a = 0, b = poly.length - 1; a < poly.length; b = a++) {
      var yi = poly[a][0], xi = poly[a][1], yj = poly[b][0], xj = poly[b][1];
      if ((yi > lat) !== (yj > lat) && lng < (xj - xi) * (lat - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  function box(lat, lng, la0, la1, lo0, lo1) { return lat >= la0 && lat <= la1 && lng >= lo0 && lng <= lo1; }
  // type de terrain au point géographique
  function terrain(lat, lng) {
    var corse = inside(CORSE, lat, lng);
    if (!corse && !inside(FRANCE, lat, lng)) return "sea";
    if (corse) { var dc = Math.min(Math.abs(lng - 8.75), Math.abs(9.42 - lng)); return dc > 0.28 && lat < 42.75 && lat > 41.6 ? "mont" : "hill"; }
    // Pyrénées
    if (lat < 42.95 && lng > -1.6 && lng < 3.0) return "mont";
    if (lat < 43.3 && lng > -1.4 && lng < 2.8) return "hill";
    // Alpes
    if (lat > 43.9 && lat < 46.4 && lng > 5.6 + (lat - 44) * 0.45 && lng > 5.9) return lng > 6.3 + (lat - 44) * 0.3 ? "mont" : "high";
    if (box(lat, lng, 43.6, 44.6, 5.3, 6.3)) return "hill";
    // Jura, Vosges, Ardennes, Morvan
    if (box(lat, lng, 46.3, 47.45, 5.6, 6.95)) return "high";
    if (box(lat, lng, 47.75, 48.65, 6.7, 7.3)) return "forest";
    if (box(lat, lng, 49.65, 50.15, 4.4, 5.3)) return "forest";
    if (box(lat, lng, 46.95, 47.4, 3.75, 4.25)) return "forest";
    // Massif central
    if (box(lat, lng, 44.3, 45.9, 2.3, 4.2)) return lat > 44.9 && lat < 45.7 && lng > 2.6 && lng < 3.9 ? "high" : "hill";
    if (box(lat, lng, 44.0, 46.4, 0.6, 2.3) && lat > 44.0 + (lng - 0.6) * 0.0) { if (lng > 1.3 || lat > 45.2) return "hill"; }
    // forêts : Landes, Sologne, Fontainebleau, Orléans
    if (lat > 43.6 && lat < 45.2 && lng < -0.35 - (lat - 44.4) * 0.6 && lng > -1.6) return "forest";
    if (box(lat, lng, 47.35, 47.75, 1.6, 2.5)) return "forest";
    if (box(lat, lng, 48.3, 48.5, 2.5, 2.85)) return "forest";
    // vignes
    if (box(lat, lng, 44.6, 45.4, -0.9, -0.1) || box(lat, lng, 45.5, 45.8, -0.6, 0.0) || box(lat, lng, 44.78, 44.95, 0.3, 0.6)) return "vine";
    if (box(lat, lng, 48.85, 49.3, 3.8, 4.35) || box(lat, lng, 46.8, 47.5, 4.55, 5.05) || box(lat, lng, 47.9, 48.6, 7.2, 7.5)) return "vine";
    if (box(lat, lng, 47.15, 47.5, -0.6, 1.2) || box(lat, lng, 43.2, 43.65, 2.6, 4.0) || box(lat, lng, 44.0, 45.0, 4.6, 5.0) || box(lat, lng, 43.4, 43.8, 5.5, 6.5)) return "vine";
    // marais : Camargue, Poitevin, baie de Somme
    if (box(lat, lng, 43.4, 43.62, 4.3, 4.8) || box(lat, lng, 46.2, 46.45, -1.1, -0.6) || box(lat, lng, 50.15, 50.3, 1.55, 1.75)) return "marsh";
    return "plain";
  }
  var RIVERS = [
    { w: 2.6, pts: [[49.49, 0.1], [49.44, 1.1], [49.02, 1.45], [48.85, 2.35], [48.5, 3.0], [48.3, 4.08]] },                    // Seine
    { w: 2.8, pts: [[47.27, -2.2], [47.22, -1.55], [47.47, -0.55], [47.39, 0.69], [47.9, 1.9], [47.6, 2.7], [46.99, 3.16], [46.03, 4.07], [45.04, 3.88]] }, // Loire
    { w: 2.4, pts: [[45.57, -1.03], [45.3, -0.75], [44.84, -0.58], [44.55, -0.25], [44.2, 0.62], [43.6, 1.44], [43.1, 0.7]] }, // Gironde + Garonne
    { w: 2.0, pts: [[45.03, -0.6], [44.92, -0.24], [44.85, 0.48], [44.9, 1.47], [45.4, 2.5]] },                               // Dordogne
    { w: 2.8, pts: [[43.4, 4.6], [43.68, 4.63], [43.95, 4.81], [44.93, 4.89], [45.76, 4.84], [46.2, 5.0], [46.78, 4.85], [47.45, 5.6]] }, // Rhône + Saône
    { w: 1.8, pts: [[49.16, 5.38], [49.7, 4.95], [50.13, 4.83]] },                                                             // Meuse
    { w: 1.8, pts: [[48.17, 6.45], [48.69, 6.18], [49.12, 6.18], [49.36, 6.17]] },                                             // Moselle
    { w: 2.4, pts: [[47.58, 7.59], [48.58, 7.8], [48.97, 8.23]] },                                                             // Rhin
    { w: 1.6, pts: [[45.94, -0.96], [45.75, -0.63], [45.7, -0.33], [45.65, 0.16]] },                                           // Charente
    { w: 1.6, pts: [[43.49, -1.47], [43.7, -1.05], [43.89, -0.5], [43.5, 0.05]] },                                             // Adour
    { w: 1.6, pts: [[45.83, 1.26], [46.0, 0.67], [46.58, 0.34], [47.2, 0.1]] },                                                // Vienne
    { w: 1.8, pts: [[48.85, 2.4], [48.96, 4.36], [48.6, 5.0]] },                                                               // Marne
    { w: 1.6, pts: [[46.99, 3.16], [46.3, 3.3], [45.77, 3.1]] }                                                                // Allier
  ];
  var VILLES = [
    ["Paris", 48.85, 2.35, 4], ["Lyon", 45.76, 4.84, 3], ["Marseille", 43.3, 5.37, 3], ["Toulouse", 43.6, 1.44, 3], ["Bordeaux", 44.84, -0.58, 3],
    ["Lille", 50.63, 3.06, 2], ["Nantes", 47.22, -1.55, 2], ["Strasbourg", 48.58, 7.75, 2], ["Nice", 43.7, 7.27, 2], ["Rennes", 48.11, -1.68, 2],
    ["Montpellier", 43.61, 3.88, 2], ["Grenoble", 45.19, 5.72, 1], ["Dijon", 47.32, 5.04, 1], ["Clermont-Ferrand", 45.78, 3.08, 1], ["Limoges", 45.83, 1.26, 1],
    ["Tours", 47.39, 0.69, 1], ["Orléans", 47.9, 1.9, 1], ["Rouen", 49.44, 1.1, 1], ["Le Havre", 49.49, 0.1, 1], ["Caen", 49.18, -0.37, 1],
    ["Brest", 48.39, -4.49, 1], ["Poitiers", 46.58, 0.34, 1], ["La Rochelle", 46.16, -1.15, 1], ["Pau", 43.3, -0.37, 1], ["Bayonne", 43.49, -1.47, 1],
    ["Perpignan", 42.7, 2.9, 1], ["Nancy", 48.69, 6.18, 1], ["Metz", 49.12, 6.18, 1], ["Reims", 49.26, 4.03, 1], ["Amiens", 49.89, 2.3, 1],
    ["Besançon", 47.24, 6.02, 1], ["Ajaccio", 41.92, 8.74, 1], ["Bastia", 42.7, 9.45, 1], ["Angers", 47.47, -0.55, 1], ["Le Mans", 48.0, 0.2, 1],
    ["Nîmes", 43.84, 4.36, 1], ["Avignon", 43.95, 4.81, 1], ["Toulon", 43.12, 5.93, 1], ["Saint-Étienne", 45.44, 4.39, 1], ["Périgueux", 45.18, 0.72, 1],
    ["Angoulême", 45.65, 0.16, 1], ["Agen", 44.2, 0.62, 1], ["Mont-de-Marsan", 43.89, -0.5, 1], ["Niort", 46.32, -0.46, 1], ["Brive", 45.16, 1.53, 1],
    ["Bergerac", 44.85, 0.48, 1], ["Mulhouse", 47.75, 7.34, 1], ["Troyes", 48.3, 4.08, 1], ["Quimper", 48.0, -4.1, 1], ["Valence", 44.93, 4.89, 1]
  ];
  // Palette inspirée des jeux de restauration de paysages (Terra Nil) : eau turquoise qui s'éclaircit
  // vers les côtes, prairies fraîches et fleuries, forêts de canopées rondes, montagnes gris-violet enneigées.
  var COL = {
    sea: ["#5DA2A7", "#5DA2A7"], plain: ["#A8CC78", "#92BE68"], vine: ["#BFC97A", "#AEBB6C"], forest: ["#6FA66A", "#5F9960"],
    marsh: ["#8FC4A0", "#7FB893"], hill: ["#9CC56E", "#88B562"], high: ["#80AA62", "#6F9A58"], mont: ["#A3A5A8", "#8F929B"]
  };
  var DEEP = "#5DA2A7", SHALLOW = ["", "#A3DCD2", "#86C9C4", "#70B6B6"], SAND = ["#E6D7AA", "#D6C597"];
  var FLOWERS = ["#F6D96E", "#FFF8E8", "#F6D96E", "#FFF8E8", "#EFA9B6"], CANOPY = ["#2F7A52", "#246744", "#3F8F5F"], SHADE = "rgba(28,46,38,.2)";
  function height(type, i, j) {
    if (type === "hill") return 6 + hash(i, j) * 4;
    if (type === "high") return 12 + hash(i, j) * 5;
    if (type === "mont") return 14 + hash(i, j) * 6;
    if (type === "sea") return -3;
    return 0;
  }

  /* ---------- villes modélisées (visibles au niveau ville) ---------- */
  // Un petit volume isométrique : deux faces visibles (gauche et droite) et un toit.
  function isoBox(g, u, v, w, d, h, wall, roof, z) {
    var z0 = z || 0, c = P(u + w, v + d, z0), dd = P(u, v + d, z0), b = P(u + w, v, z0);
    var at = P(u, v, z0 + h), bt = P(u + w, v, z0 + h), ct = P(u + w, v + d, z0 + h), dt = P(u, v + d, z0 + h);
    poly(g, [dd, c, ct, dt], mix(wall, "#2C4A3A", 0.2));
    poly(g, [b, c, ct, bt], mix(wall, "#2C4A3A", 0.34));
    poly(g, [at, bt, ct, dt], roof, { stroke: mix(roof, "#FFFDF7", 0.35), "stroke-width": 0.4 });
  }
  // Bordeaux : le port de la Lune (croissant de Garonne), les quais et la place de la Bourse avec son miroir d'eau,
  // le pont de pierre, la flèche Pey-Berland, la Grosse Cloche, le Jardin public, la Cité du Vin, la Bastide en face.
  var VILLES_MODELES = {
    Bordeaux: function (g, u0, v0, z) {
      var S = 1.35, items = [];
      function U(du) { return u0 + du * S; }
      function V(dv) { return v0 + dv * S; }
      function PP(d) { return P(U(d[0]), V(d[1]), z); }
      function add(key, fn) { items.push({ key: key, fn: fn }); }
      var STONE = "#EEE3CB", TILE = "#C98B6A", SLATE = "#7E8A95";
      // la Garonne : une courbe en croissant, du sud-est vers le nord (la Gironde) ; la ville s'est lovée dans la courbe
      var A = [1.25, 1.55], B = [1.85, -0.75], C = [-0.6, -2.3];
      function Q(t) { var a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t; return [a * A[0] + b * B[0] + c * C[0], a * A[1] + b * B[1] + c * C[1]]; }
      function side(t, d) { // point décalé de d par rapport au fleuve : d > 0 vers la rive gauche (ouest), d < 0 vers la rive droite
        var q = Q(t), dv = [2 * (1 - t) * (B[0] - A[0]) + 2 * t * (C[0] - B[0]), 2 * (1 - t) * (B[1] - A[1]) + 2 * t * (C[1] - B[1])];
        var n = [-dv[1], dv[0]], L = Math.hypot(n[0], n[1]) || 1; n = [n[0] / L, n[1] / L]; if (n[0] > 0) n = [-n[0], -n[1]];
        return [q[0] + n[0] * d, q[1] + n[1] * d];
      }
      function pip(poly, pt) { var c = false; for (var a = 0, b = poly.length - 1; a < poly.length; b = a++) { var yi = poly[a][1], xi = poly[a][0], yj = poly[b][1], xj = poly[b][0]; if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) c = !c; } return c; }
      var k, gauche = [], droite = [];
      // la rive gauche est un croissant parallèle au fleuve : le port de la Lune
      for (k = 0; k <= 14; k++) gauche.push(side(k / 14, 0.42));
      for (k = 14; k >= 0; k--) gauche.push(side(k / 14, 1.0 + 1.15 * Math.sin(Math.PI * k / 14)));
      for (k = 0; k <= 8; k++) droite.push(side(0.18 + k / 8 * 0.52, -0.42));
      for (k = 8; k >= 0; k--) droite.push(side(0.18 + k / 8 * 0.52, -0.95 - 0.25 * Math.sin(Math.PI * k / 8)));
      // sol urbain : pierre blonde, en demi-lune sur la rive gauche, une bande sur la rive droite (la Bastide)
      var sol = el("g", {}, g);
      poly(sol, gauche.map(PP), "#E7DDC6", { stroke: "#D8CBAE", "stroke-width": 0.6, "stroke-linejoin": "round" });
      poly(sol, droite.map(PP), "#E4DAC3", { stroke: "#D8CBAE", "stroke-width": 0.6, "stroke-linejoin": "round" });
      // le fleuve et ses quais
      var r0 = PP(A), r1 = PP(B), r2 = PP(C), dRiv = "M" + r0[0] + " " + r0[1] + " Q" + r1[0] + " " + r1[1] + " " + r2[0] + " " + r2[1];
      el("path", { d: dRiv, stroke: "#ECE2CA", "stroke-width": 12, fill: "none", "stroke-linecap": "round" }, sol);
      el("path", { d: dRiv, stroke: "#7FC6C6", "stroke-width": 7.5, fill: "none", "stroke-linecap": "round" }, sol);
      // miroir d'eau, sur le quai devant la place de la Bourse
      var mi = side(0.47, 0.5);
      poly(sol, [PP([mi[0] - 0.22, mi[1] - 0.12]), PP([mi[0] + 0.22, mi[1] - 0.12]), PP([mi[0] + 0.22, mi[1] + 0.12]), PP([mi[0] - 0.22, mi[1] + 0.12])], "#CFE8E6", { opacity: .9 });
      // Jardin public
      var jardin = side(0.8, 1.0), jp = PP(jardin);
      el("ellipse", { cx: jp[0], cy: jp[1], rx: 9, ry: 4.5, fill: "#9CC46E" }, sol);
      [[-3, -1], [2, 0.5], [-0.5, 1.5]].forEach(function (o) { el("circle", { cx: jp[0] + o[0], cy: jp[1] + o[1] - 2.2, r: 1.9, fill: "#3F8F5F" }, sol); });
      // repères à ne pas recouvrir d'îlots : [u, v, rayon]
      var bourse = side(0.47, 0.82), cath = side(0.58, 1.45), cloche = side(0.3, 1.0), cite = side(0.93, 0.55), pont = 0.2;
      var libres = [[bourse[0], bourse[1], 0.38], [cath[0] + 0.25, cath[1], 0.34], [cloche[0], cloche[1], 0.18], [jardin[0], jardin[1], 0.32], [cite[0], cite[1], 0.26], [mi[0], mi[1], 0.2]];
      // îlots d'immeubles : un semis régulier dans la demi-lune, hauteurs homogènes (la ville de pierre du XVIIIe)
      var n = 0;
      for (var du = -2.4; du < 2.4; du += 0.34) for (var dv = -2.7; dv < 2.7; dv += 0.3) {
        var cu = du + (hash(n, 1) - 0.5) * 0.08, cv = dv + (hash(n, 2) - 0.5) * 0.08, c = [cu + 0.15, cv + 0.13]; n++;
        if (!pip(gauche, c) && !pip(droite, c)) continue;
        if (hash(n, 7) > 0.88) continue; // une place, une cour : la ville respire
        if (libres.some(function (l) { return Math.hypot(c[0] - l[0], c[1] - l[1]) < l[2]; })) continue;
        if (Math.abs(side(pont, 0.1)[1] - c[1]) < 0.16 && c[0] > side(pont, 0.5)[0] - 0.2) continue; // l'axe du pont reste dégagé
        (function (cu, cv, k) {
          add(cu + cv, function () { isoBox(g, U(cu), V(cv), 0.26 * S, 0.23 * S, 3.6 + hash(k, 3) * 2.2, STONE, hash(k, 5) > 0.3 ? TILE : SLATE, z); });
        })(cu, cv, n);
      }
      // place de la Bourse : longue façade en arc face au fleuve, pavillon central
      add(bourse[0] + bourse[1], function () {
        isoBox(g, U(bourse[0] - 0.45), V(bourse[1] - 0.12), 0.9 * S, 0.22 * S, 6, STONE, SLATE, z);
        isoBox(g, U(bourse[0] - 0.12), V(bourse[1] - 0.15), 0.24 * S, 0.27 * S, 8.5, STONE, SLATE, z);
      });
      // cathédrale Saint-André et la flèche de la tour Pey-Berland
      add(cath[0] + cath[1], function () {
        isoBox(g, U(cath[0]), V(cath[1]), 0.5 * S, 0.22 * S, 8, "#F1E7D2", SLATE, z);
        isoBox(g, U(cath[0] + 0.55), V(cath[1] + 0.03), 0.14 * S, 0.14 * S, 13, "#F1E7D2", SLATE, z);
        var t = P(U(cath[0] + 0.62), V(cath[1] + 0.1), z + 13);
        el("path", { d: "M" + (t[0] - 3) + " " + (t[1] + 1) + " L" + t[0] + " " + (t[1] - 11) + " L" + (t[0] + 3) + " " + (t[1] + 1) + " Z", fill: "#6F7B86" }, g);
        el("circle", { cx: t[0], cy: t[1] - 11.5, r: 0.9, fill: "#D9A03F" }, g);
      });
      // Grosse Cloche : une tour à dôme
      add(cloche[0] + cloche[1], function () {
        isoBox(g, U(cloche[0]), V(cloche[1]), 0.13 * S, 0.13 * S, 9, "#EADFC6", "#B5A98C", z);
        var c = P(U(cloche[0] + 0.09), V(cloche[1] + 0.09), z + 9);
        el("ellipse", { cx: c[0], cy: c[1] - 1.5, rx: 2.6, ry: 2.2, fill: "#6F7B86" }, g);
        el("circle", { cx: c[0], cy: c[1] - 3.6, r: .8, fill: "#D9A03F" }, g);
      });
      // Cité du Vin : une forme ronde et dorée, au nord des quais
      add(cite[0] + cite[1], function () {
        var c = PP(cite);
        el("ellipse", { cx: c[0], cy: c[1] + 0.5, rx: 5, ry: 2.2, fill: SHADE }, g);
        el("path", { d: "M" + (c[0] - 4) + " " + c[1] + " q-1 -8 4 -9 q5 -1 4.5 6 q-.5 4 -4.5 4 q-3.5 0 -4 -1 z", fill: "#D9A03F" }, g);
        el("path", { d: "M" + (c[0] - 2) + " " + (c[1] - 2) + " q1 -4 4 -4.5", stroke: "rgba(255,253,247,.6)", "stroke-width": 1, fill: "none", "stroke-linecap": "round" }, g);
      });
      // pont de pierre : dix-sept arches entre les deux rives
      var pa = side(pont, 0.5), pb = side(pont, -0.5);
      add(pa[0] + pa[1] + 0.3, function () {
        var a = PP(pa), b = PP(pb);
        el("line", { x1: a[0], y1: a[1] + 1.2, x2: b[0], y2: b[1] + 1.2, stroke: "rgba(28,46,38,.25)", "stroke-width": 2.6, "stroke-linecap": "round" }, g);
        el("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: "#E6D9BD", "stroke-width": 2.6, "stroke-linecap": "round" }, g);
        for (var q = 1; q < 7; q++) { var x = a[0] + (b[0] - a[0]) * q / 7, y = a[1] + (b[1] - a[1]) * q / 7; el("circle", { cx: x, cy: y + 1.4, r: .55, fill: "#7FC6C6" }, g); }
      });
      // du fond vers l'avant, pour que les volumes se recouvrent correctement
      items.sort(function (a, b) { return a.key - b.key; }).forEach(function (it) { it.fn(); });
      // le nom, au sud de la ville
      var lb = PP(side(0.12, 1.3));
      var lbl = el("text", { x: lb[0], y: lb[1] + 8, class: "imap-city-lbl", "text-anchor": "middle" }, g); lbl.textContent = "Bordeaux";
      return lbl;
    }
  };

  /* ---------- terrain (dessiné une seule fois par conteneur) ---------- */
  function buildTerrain(host) {
    host.innerHTML = "";
    var minX = -ROWS * TW - 24, width = (COLS + ROWS) * TW + 48, minY = -70, height_ = (COLS + ROWS) * TH + SLAB + 120;
    var full = { x: minX, y: minY, w: width, h: height_ };
    var svg = el("svg", { viewBox: full.x + " " + full.y + " " + full.w + " " + full.h, class: "imap-svg", role: "img", preserveAspectRatio: "xMidYMid slice",
      "aria-label": "Carte illustrée de la France avec les lieux EVAD. Positions approximatives. Molette ou boutons pour zoomer, glisser pour se déplacer." }, host);
    var g0 = el("g", {}, svg);
    poly(g0, [P(0, ROWS, 0), P(COLS, ROWS, 0), P(COLS, ROWS, -SLAB), P(0, ROWS, -SLAB)], "#A97B57");
    poly(g0, [P(COLS, 0, 0), P(COLS, ROWS, 0), P(COLS, ROWS, -SLAB), P(COLS, 0, -SLAB)], "#8C6345");
    // halos de régénération : dégradés radiaux, verts qui s'estompent
    var defs = el("defs", {}, svg);
    [["prouve", "#4F9F5A", 0.85], ["encours", "#84BF6E", 0.6]].forEach(function (d) {
      var rg = el("radialGradient", { id: "imap-halo-" + d[0], cx: "50%", cy: "50%", r: "50%" }, defs);
      el("stop", { offset: "0%", "stop-color": d[1], "stop-opacity": d[2] }, rg);
      el("stop", { offset: "55%", "stop-color": d[1], "stop-opacity": d[2] * 0.55 }, rg);
      el("stop", { offset: "100%", "stop-color": d[1], "stop-opacity": 0 }, rg);
    });

    // la mer : un losange d'eau profonde, des bas-fonds plus clairs près des côtes, de l'écume au rivage
    var sea = el("g", { class: "imap-sea" }, svg);
    poly(sea, [P(0, 0, -3), P(COLS, 0, -3), P(COLS, ROWS, -3), P(0, ROWS, -3)], DEEP);
    var tiles = [], zs = {}, land = {};
    for (var i = 0; i < COLS; i++) for (var j = 0; j < ROWS; j++) {
      var ll = toLL(i + 0.5, j + 0.5), t = terrain(ll.lat, ll.lng), z = height(t, i, j);
      zs[i + "," + j] = z;
      if (t !== "sea") { land[i + "," + j] = 1; tiles.push({ i: i, j: j, t: t, z: z }); }
    }
    // distance à la côte (en cases, jusqu'à 3) : l'eau s'éclaircit en approchant des terres
    function coastDist(i, j) {
      for (var d = 1; d <= 3; d++) for (var a = -d; a <= d; a++) for (var b = -d; b <= d; b++) {
        if (Math.max(Math.abs(a), Math.abs(b)) === d && land[(i + a) + "," + (j + b)]) return d;
      }
      return 4;
    }
    for (var si = 0; si < COLS; si++) for (var sj = 0; sj < ROWS; sj++) {
      if (land[si + "," + sj]) continue;
      var dc = coastDist(si, sj);
      if (dc <= 3) poly(sea, [P(si, sj, -3), P(si + 1, sj, -3), P(si + 1, sj + 1, -3), P(si, sj + 1, -3)], SHALLOW[dc], { opacity: hash(si, sj) > 0.5 ? 0.85 : 1 });
      if (dc === 1 && hash(si * 3, sj) > 0.5) {
        var f0 = P(si + 0.15 + hash(si, sj) * 0.4, sj + 0.35 + hash(sj, si) * 0.3, -3);
        el("path", { d: "M" + f0[0] + " " + f0[1] + " q5 -2.5 10 0", stroke: "rgba(255,253,247,.72)", "stroke-width": 1.1, fill: "none", "stroke-linecap": "round" }, sea);
      } else if (dc > 3 && hash(si * 2, sj) > 0.9) {
        var w0 = P(si + 0.2 + hash(si, sj) * 0.5, sj + 0.5, -3);
        el("path", { d: "M" + w0[0] + " " + w0[1] + " q4 -2 8 0 q4 2 8 0", stroke: "rgba(255,253,247,.4)", "stroke-width": 1, fill: "none" }, sea);
      }
    }
    tiles.sort(function (a, b) { return (a.i + a.j) - (b.i + b.j) || a.i - b.i; });
    var gt = el("g", { class: "imap-tiles" }, svg);
    tiles.forEach(function (c) {
      // chaque case a sa nuance (fondu entre deux teintes), avec par endroits une tache un peu plus sombre : un patchwork peint, sans grille
      var i = c.i, j = c.j, z = c.z, base = mix(COL[c.t][0], COL[c.t][1], hash(j, i));
      if (hash(i * 3, j * 7) > 0.78) base = mix(base, "#2C4A3A", 0.07);
      // bord de mer : une petite tranche sous la case, pour marquer la côte
      // bord de mer : une tranche de sable clair sous la case
      if (!c.z && (!zs[i + "," + (j + 1)] || zs[i + "," + (j + 1)] < 0)) poly(gt, [P(i, j + 1, 0), P(i + 1, j + 1, 0), P(i + 1, j + 1, -3), P(i, j + 1, -3)], SAND[0]);
      if (!c.z && (zs[(i + 1) + "," + j] === undefined || zs[(i + 1) + "," + j] < 0)) poly(gt, [P(i + 1, j, 0), P(i + 1, j + 1, 0), P(i + 1, j + 1, -3), P(i + 1, j, -3)], SAND[1]);
      if (z > 0) {
        poly(gt, [P(i, j + 1, z), P(i + 1, j + 1, z), P(i + 1, j + 1, 0), P(i, j + 1, 0)], mix(base, "#2C4A3A", 0.2));
        poly(gt, [P(i + 1, j, z), P(i + 1, j + 1, z), P(i + 1, j + 1, 0), P(i + 1, j, 0)], mix(base, "#2C4A3A", 0.32));
      }
      poly(gt, [P(i, j, z), P(i + 1, j, z), P(i + 1, j + 1, z), P(i, j + 1, z)], base, { stroke: base, "stroke-width": 0.4 });
      // un arbre à canopée ronde : ombre portée, boule de feuillage, reflet
      function tree(u, v, r, col) {
        var p = P(u, v, z);
        el("ellipse", { cx: p[0], cy: p[1] + 0.6, rx: r * 0.95, ry: r * 0.42, fill: SHADE }, gt);
        el("circle", { cx: p[0], cy: p[1] - r * 0.75, r: r, fill: col }, gt);
        el("circle", { cx: p[0] - r * 0.32, cy: p[1] - r * 1.05, r: r * 0.38, fill: "rgba(255,253,247,.2)" }, gt);
      }
      if (c.t === "forest") {
        [[0.3, 0.3], [0.72, 0.62], [0.32, 0.76], [0.7, 0.22]].forEach(function (o, k) {
          if (hash(i + k, j) < 0.25) return;
          tree(i + o[0], j + o[1], 2 + hash(i, j + k) * 1.5, CANOPY[(i + j + k) % 3]);
        });
      } else if (c.t === "vine") {
        [0.28, 0.52, 0.76].forEach(function (f) { var a = P(i + 0.1, j + f, z), b = P(i + 0.9, j + f, z); el("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: "#8FA05E", "stroke-width": 0.9, opacity: 0.85 }, gt); });
      } else if (c.t === "mont") {
        var pk = P(i + 0.5, j + 0.5, z), hpk = 10 + hash(i, j) * 8;
        el("path", { d: "M" + (pk[0] - 9) + " " + (pk[1] + 2) + " L" + pk[0] + " " + (pk[1] - hpk) + " L" + (pk[0] + 9) + " " + (pk[1] + 2) + " Z", fill: "#8C8F9C" }, gt);
        el("path", { d: "M" + pk[0] + " " + (pk[1] - hpk) + " L" + (pk[0] + 9) + " " + (pk[1] + 2) + " L" + pk[0] + " " + (pk[1] + 2) + " Z", fill: "rgba(28,46,38,.14)" }, gt);
        el("path", { d: "M" + (pk[0] - 3.2) + " " + (pk[1] - hpk + 4.8) + " L" + pk[0] + " " + (pk[1] - hpk) + " L" + (pk[0] + 3.2) + " " + (pk[1] - hpk + 4.8) + " Z", fill: "#F7F5EE" }, gt);
        if (hash(j, i) > 0.55) { var pk2 = P(i + 0.2, j + 0.7, z), h2 = 5 + hash(j, i) * 4; el("path", { d: "M" + (pk2[0] - 5) + " " + (pk2[1] + 1) + " L" + pk2[0] + " " + (pk2[1] - h2) + " L" + (pk2[0] + 5) + " " + (pk2[1] + 1) + " Z", fill: "#9B9EA8" }, gt); }
      } else if ((c.t === "hill" || c.t === "high") && hash(j, i * 3) > 0.6) {
        tree(i + 0.35 + hash(i, j) * 0.3, j + 0.4 + hash(j, i) * 0.3, 1.6 + hash(i * 2, j) * 0.8, c.t === "high" ? "#4E8A5E" : "#5F9A5E");
      } else if (c.t === "marsh") {
        var m = P(i + 0.5, j + 0.5, z);
        if (hash(i, j * 2) > 0.45) el("path", { d: "M" + m[0] + " " + m[1] + " l-2 -4 M" + m[0] + " " + m[1] + " l2 -5 M" + m[0] + " " + m[1] + " l0 -5", stroke: "#5E8F74", "stroke-width": 1, fill: "none", "stroke-linecap": "round" }, gt);
        else { var mw = P(i + 0.35 + hash(j, i) * 0.3, j + 0.6, z); el("ellipse", { cx: mw[0], cy: mw[1], rx: 4.5, ry: 2, fill: "#A9D8D1", opacity: .9 }, gt); }
      } else if (c.t === "plain" || c.t === "hill") {
        // prairies : des fleurs par touffes, quelques herbes hautes
        if (hash(i * 5, j) > 0.8) {
          for (var f = 0; f < 3; f++) {
            var fp = P(i + 0.25 + hash(i + f, j) * 0.5, j + 0.25 + hash(j, i + f) * 0.5, z);
            el("circle", { cx: fp[0], cy: fp[1], r: 0.7, fill: FLOWERS[(i + j + f) % 5], opacity: .9 }, gt);
          }
        } else if (hash(i * 7, j) > 0.86) {
          var r = P(i + 0.3 + hash(i, j) * 0.4, j + 0.5, z);
          el("path", { d: "M" + r[0] + " " + r[1] + " l-2 -3 M" + r[0] + " " + r[1] + " l2 -4", stroke: "#9DAE6E", "stroke-width": 1, fill: "none", "stroke-linecap": "round" }, gt);
        }
      }
    });
    // halos de régénération, posés sur le terrain et sous les fleuves (redessinés avec les lieux)
    var gh = el("g", { class: "imap-halos" }, svg);
    function zAt(u, v) { var k = Math.floor(u) + "," + Math.floor(v); return Math.max(0, zs[k] || 0); }
    // fleuves
    var gw = el("g", { class: "imap-water" }, svg);
    RIVERS.forEach(function (r) {
      var d = r.pts.map(function (ll, k) { var uv = toUV(ll[0], ll[1]); var p = P(uv.u, uv.v, zAt(uv.u, uv.v)); return (k ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" ");
      el("path", { d: d, stroke: "rgba(255,253,247,.45)", "stroke-width": r.w + 1.6, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, gw);
      el("path", { d: d, stroke: "#7FC6C6", "stroke-width": r.w, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, gw);
    });
    // villes modélisées : une maquette posée sur le terrain, visible au niveau ville
    var gc = el("g", { class: "imap-cities" }, svg), cities = [];
    VILLES.forEach(function (vl) {
      var mod = VILLES_MODELES[vl[0]]; if (!mod) return;
      var uv = toUV(vl[1], vl[2]), cz = zAt(uv.u, uv.v), cc = P(uv.u, uv.v, cz);
      var gg = el("g", { class: "imap-city", opacity: 0 }, gc);
      var lbl = mod(gg, uv.u, uv.v, cz);
      cities.push({ g: gg, lbl: lbl, nom: vl[0], x: cc[0], y: cc[1] });
    });
    // villes (mises à l'échelle inverse du zoom pour rester lisibles)
    var gv = el("g", { class: "imap-towns" }, svg), towns = [];
    VILLES.forEach(function (vl) {
      var uv = toUV(vl[1], vl[2]), z = zAt(uv.u, uv.v), c = P(uv.u, uv.v, z);
      var g = el("g", { class: "imap-town imap-town-" + vl[3] }, gv), inner = el("g", {}, g);
      for (var k = 0; k < vl[3] + 1; k++) {
        var dx = (hash(k, vl[3]) - 0.5) * 14, dy = (hash(vl[3], k) - 0.5) * 7;
        el("rect", { x: dx - 3, y: dy - 5, width: 6, height: 5, fill: "#E9DCC8", stroke: "#B98E62", "stroke-width": 0.6 }, inner);
        el("path", { d: "M" + (dx - 3.5) + " " + (dy - 5) + " L" + dx + " " + (dy - 8.5) + " L" + (dx + 3.5) + " " + (dy - 5) + " Z", fill: "#B8674A" }, inner);
      }
      el("text", { x: 0, y: 12, class: "imap-town-lbl", "text-anchor": "middle" }, inner).textContent = vl[0];
      towns.push({ g: inner, x: c[0], y: c[1], g0: vl[3], nom: vl[0] });
    });
    // rose des vents
    var ruv = toUV(51.6, 8.2), rose = P(ruv.u, ruv.v, 0), gr = el("g", { class: "imap-rose" }, svg);
    el("path", { d: "M" + rose[0] + " " + (rose[1] - 20) + " l6 14 l-6 -4 l-6 4 z", fill: "#2C5234" }, gr);
    el("text", { x: rose[0], y: rose[1] - 24, class: "imap-rose-lbl", "text-anchor": "middle" }, gr).textContent = "N";
    var gm = el("g", { class: "imap-marks" }, svg), gme = el("g", { class: "imap-me" }, svg);
    // vie ambiante : trois vols d'oiseaux qui traversent lentement (animation CSS, coupée si l'utilisateur préfère moins de mouvement)
    var gb = el("g", { class: "imap-birds", "aria-hidden": "true" }, svg), birds = [];
    [[46.4, -5.2], [44.6, -0.2], [48.9, 2.0]].forEach(function (b, k) {
      var uv = toUV(b[0], b[1]), c = P(uv.u, uv.v, 70), g = el("g", { class: "imap-bird imap-bird-" + k }, gb), inner = el("g", {}, g);
      [[0, 0, 1.2, 1], [-9, 3, 1, 0.8], [7, 4, 0.9, 0.7]].forEach(function (o) {
        el("path", { d: "M" + (o[0] - 4) + " " + o[1] + " q2 -2.6 4 0 q2 -2.6 4 0", stroke: "#2C4A3A", "stroke-width": o[2], fill: "none", "stroke-linecap": "round", opacity: o[3] }, inner);
      });
      birds.push({ g: inner, x: c[0], y: c[1] });
    });

    // légende et commandes, en HTML par-dessus
    var cap = document.createElement("p"); cap.className = "imap-caption"; cap.textContent = "Carte illustrée : positions approximatives. La vue carte donne le détail."; host.appendChild(cap);
    var zc = document.createElement("div"); zc.className = "imap-zoom"; zc.setAttribute("role", "group"); zc.setAttribute("aria-label", "Zoom de la carte illustrée. Au clavier : plus, moins, zéro pour tout voir, flèches pour se déplacer.");
    zc.innerHTML = '<button type="button" data-z="in" aria-label="Zoomer">+</button><button type="button" data-z="out" aria-label="Dézoomer">−</button><button type="button" data-z="fit" class="imap-fit">Tout voir</button>';
    host.appendChild(zc);
    // fil d'Ariane : France › ville › lieu, pour savoir où l'on est et remonter d'un niveau
    var crumbs = document.createElement("nav"); crumbs.className = "imap-crumbs"; crumbs.setAttribute("aria-label", "Niveau de la carte");
    host.appendChild(crumbs);

    var st = { svg: svg, full: full, vb: Object.assign({}, full), gm: gm, gme: gme, gh: gh, towns: towns, cities: cities, birds: birds, zAt: zAt, marks: [], zoom: 1, host: host, ratio: 2, crumbs: crumbs };
    setupNav(host, st, zc);
    crumbs.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-lvl]"); if (!b) return;
      stopAnim(st);
      if (st.onBack) st.onBack(b.dataset.lvl); // la page referme la fiche du lieu
      if (b.dataset.lvl === "france") fitAll(st, true);
      else if (st.ville) animateTo(st, cityTarget(st, st.ville, null), 900);
    });
    if (window.ResizeObserver) new ResizeObserver(function () { applyView(st); }).observe(host);
    else window.addEventListener("resize", function () { applyView(st); });
    host._imap = st;
    return st;
  }

  /* ---------- zoom et déplacement ---------- */
  // Plus grande fenêtre possible (largeur) pour un rapport largeur/hauteur donné, inscrite dans le losange.
  function maxWidth(ratio) { return 2 / (1 / GEO.W + 1 / (ratio * GEO.H)); }
  function applyView(st) {
    var vb = st.vb, r = st.host.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) st.ratio = r.width / r.height;
    var ratio = st.ratio, wMax = maxWidth(ratio), wMin = wMax / 10;
    // taille : entre le zoom maximal et la vue « tout voir » ; la hauteur suit l'écran
    var cxv = vb.x + vb.w / 2, cyv = vb.y + vb.h / 2;
    vb.w = Math.min(wMax, Math.max(wMin, vb.w)); vb.h = vb.w / ratio;
    // position : les quatre coins de la fenêtre restent dans le losange
    var dx = cxv - GEO.cx, dy = cyv - GEO.cy;
    for (var k = 0; k < 3; k++) {
      var maxDy = Math.max(0, GEO.H * (1 - (Math.abs(dx) + vb.w / 2) / GEO.W) - vb.h / 2); dy = Math.max(-maxDy, Math.min(maxDy, dy));
      var maxDx = Math.max(0, GEO.W * (1 - (Math.abs(dy) + vb.h / 2) / GEO.H) - vb.w / 2); dx = Math.max(-maxDx, Math.min(maxDx, dx));
    }
    vb.x = GEO.cx + dx - vb.w / 2; vb.y = GEO.cy + dy - vb.h / 2;
    st.zoom = wMax / vb.w;
    st.svg.setAttribute("viewBox", vb.x + " " + vb.y + " " + vb.w + " " + vb.h);
    // À l'échelle de la France, un plateau ou un nom de ville serait minuscule : on les grossit
    // en proportion inverse du zoom (en douceur), pour qu'ils restent lisibles de loin comme de près.
    var k = Math.max(0.2, 1 / Math.pow(st.zoom, 0.75));
    // Les villes suivent presque l'inverse du zoom (elles grossissent à peine à l'écran quand on s'approche),
    // sans plancher élevé : sinon un nom de ville devenait énorme au zoom maximal. Près de la maquette, elles s'effacent.
    var kt = Math.max(0.1, 1 / Math.pow(st.zoom, 0.85));
    // maquettes de villes : visibles dès qu'on quitte la vue France ; elles s'effacent sous la maquette d'un lieu tout proche
    var shown = {};
    (st.cities || []).forEach(function (c) {
      var near = st.lieu && st.zoom >= 5 && Math.hypot(c.x - st.lieu.x, (c.y - st.lieu.y) * 2) < 90;
      var on = st.zoom >= 1.9 && !near;
      c.g.setAttribute("opacity", on ? 1 : 0); c.g.style.pointerEvents = "none";
      if (c.lbl) c.lbl.style.opacity = (on && st.zoom < 5) ? 1 : 0;
      shown[c.nom] = on;
    });
    st.towns.forEach(function (t) {
      var s = Math.max(0.2, Math.min(2.6, kt * (t.g0 >= 2 ? 2.4 : 1.7)));
      t.g.setAttribute("transform", "translate(" + t.x + " " + t.y + ") scale(" + s + ")");
      var pres = st.lieu && st.zoom >= 5 && Math.hypot(t.x - st.lieu.x, (t.y - st.lieu.y) * 2) < 110; // une ville sous la maquette s'efface (au niveau lieu seulement)
      t.g.parentNode.style.opacity = ((st.zoom < 1.8 && t.g0 < 2) || st.zoom > 7 || pres || shown[t.nom]) ? "0" : "1";
    });
    st.marks.forEach(function (m) { var s = m.base * k; m.g.setAttribute("transform", "translate(" + (m.x - 24 * s) + " " + (m.y - 40 * s) + ") scale(" + s + ")"); });
    (st.birds || []).forEach(function (b) { b.g.setAttribute("transform", "translate(" + b.x + " " + b.y + ") scale(" + (1.1 * k) + ")"); });
    if (st.me) { var s2 = 1.6 * k; st.me.setAttribute("transform", "translate(" + st.mex + " " + st.mey + ") scale(" + s2 + ")"); }
    // maquette 2,5D du lieu sélectionné : posée sur la grille de la carte, à taille fixe (elle grandit avec le zoom
    // comme le terrain), elle se révèle entre les zooms 3 et 6 pendant que le plateau s'efface
    if (st.lieu) {
      var t = Math.max(0, Math.min(1, (st.zoom - 3) / 3));
      st.lieu.g.style.opacity = t;
      if (st.lieu.mark) st.lieu.mark.style.opacity = 1 - t;
    }
    if (st.zc) { st.zc.querySelector("[data-z=in]").disabled = st.zoom >= 9.9; st.zc.querySelector("[data-z=out]").disabled = st.zoom <= 1.01; }
    updateCrumbs(st);
    // la hauteur du cadre dépend de l'écran : on garde la largeur voulue comme référence
    st.vb = vb;
  }
  /* ---------- niveaux : France, ville, lieu ---------- */
  // La ville repère la plus proche d'un point de la carte (les grandes villes attirent un peu plus loin).
  function nearestTown(st, x, y) {
    var best = null, bd = 1e9;
    st.towns.forEach(function (t) { var d = Math.hypot(t.x - x, (t.y - y) * 2) / (1 + t.g0 * 0.5); if (d < bd) { bd = d; best = t; } });
    return best;
  }
  // Centre réellement visible de la fenêtre (entre le panneau de Deva et la fiche), en fraction de la largeur.
  function visibleFx(st) {
    var rr = st.host.getBoundingClientRect();
    return rr.width ? ((st.padLeft || 0) + (rr.width - (st.padLeft || 0) - (st.padRight || 0)) / 2) / rr.width : 0.5;
  }
  // Vue « ville » : la ville et ses environs ; si le lieu visé est un peu loin, on cadre entre les deux.
  function cityTarget(st, town, lieu) {
    var w = maxWidth(st.ratio) / 3.2, h = w / st.ratio, cx = town.x, cy = town.y;
    if (lieu && (Math.abs(lieu.x - town.x) > w * 0.28 || Math.abs(lieu.y - town.y) > h * 0.28)) { cx = (town.x + lieu.x) / 2; cy = (town.y + lieu.y) / 2; }
    return { x: cx - w * visibleFx(st), y: cy - h / 2, w: w, h: h };
  }
  function lieuTarget(st, lieu) {
    var w = maxWidth(st.ratio) / 10, h = w / st.ratio;
    return { x: lieu.x - w * visibleFx(st), y: lieu.y - h * 0.55, w: w, h: h };
  }
  function crumbEl(tag, text, attrs) {
    var n = document.createElement(tag); n.textContent = text;
    for (var k in attrs || {}) n.setAttribute(k, attrs[k]);
    return n;
  }
  // Niveau courant d'après le zoom : France (vue large), ville (zoom moyen), lieu (maquette visible).
  function updateCrumbs(st) {
    if (!st.crumbs) return;
    var lvl = st.zoom < 1.7 ? "france" : (st.sel && st.zoom >= 5.5 ? "lieu" : "ville");
    if (lvl !== "france") {
      var cx = st.sel ? st.sel.x : st.vb.x + st.vb.w * visibleFx(st), cy = st.sel ? st.sel.y : st.vb.y + st.vb.h / 2;
      st.ville = nearestTown(st, cx, cy);
    }
    st.svg.classList.toggle("is-ville", lvl === "ville");
    var key = lvl + "|" + (st.ville ? st.ville.nom : "") + "|" + (st.sel ? st.sel.nom : "");
    if (key === st.crumbKey) return;
    st.crumbKey = key; st.crumbs.innerHTML = "";
    var sep = function () { return crumbEl("span", "›", { class: "sep", "aria-hidden": "true" }); };
    if (lvl === "france") st.crumbs.appendChild(crumbEl("span", "France", { "aria-current": "location" }));
    else {
      st.crumbs.appendChild(crumbEl("button", "France", { type: "button", "data-lvl": "france", title: "Revoir toute la France" }));
      st.crumbs.appendChild(sep());
      if (lvl === "ville") st.crumbs.appendChild(crumbEl("span", st.ville.nom, { "aria-current": "location" }));
      else {
        st.crumbs.appendChild(crumbEl("button", st.ville.nom, { type: "button", "data-lvl": "ville", title: "Revenir autour de " + st.ville.nom }));
        st.crumbs.appendChild(sep());
        st.crumbs.appendChild(crumbEl("span", st.sel.nom, { "aria-current": "location" }));
      }
    }
  }

  // Glisse le cadre vers une cible (zoom et centre), en douceur ; toute action de l'utilisateur l'interrompt.
  function animateTo(st, target, ms, done) {
    stopAnim(st);
    var from = Object.assign({}, st.vb), t0 = performance.now();
    function step(now) {
      var t = Math.min(1, (now - t0) / ms), e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      st.vb = { x: from.x + (target.x - from.x) * e, y: from.y + (target.y - from.y) * e, w: from.w + (target.w - from.w) * e, h: from.h + (target.h - from.h) * e };
      applyView(st);
      st.anim = t < 1 ? requestAnimationFrame(step) : null;
      if (t >= 1 && done) done();
    }
    st.anim = requestAnimationFrame(step);
  }
  function stopAnim(st) {
    if (st.anim) { cancelAnimationFrame(st.anim); st.anim = null; }
    if (st.pause) { clearTimeout(st.pause); st.pause = null; }
  }
  // La France entière : plus grande fenêtre sans bord, centrée sur le pays (décalée si un panneau couvre la gauche).
  function fitAll(st, anime) {
    var c = toUV(46.6, 2.4), cc = P(c.u, c.v, 0), w = maxWidth(st.ratio), h = w / st.ratio;
    var r = st.host.getBoundingClientRect(), shift = r.width ? (st.padLeft || 0) / r.width * w / 2 : 0;
    var target = { x: cc[0] - w / 2 - shift, y: cc[1] - h / 2, w: w, h: h };
    if (anime) animateTo(st, target, 700); else { st.vb = target; applyView(st); }
  }
  function zoomAt(st, factor, cx, cy) {
    var vb = st.vb, nw = vb.w / factor;
    if (cx === undefined) { cx = vb.x + vb.w / 2; cy = vb.y + vb.h / 2; }
    vb.x = cx - (cx - vb.x) / factor; vb.y = cy - (cy - vb.y) / factor; vb.w = nw; vb.h = nw / st.ratio;
    applyView(st);
  }
  function svgPoint(st, clientX, clientY) {
    var pt = st.svg.createSVGPoint(); pt.x = clientX; pt.y = clientY;
    var m = st.svg.getScreenCTM(); if (!m) return null;
    var p = pt.matrixTransform(m.inverse()); return { x: p.x, y: p.y };
  }
  function setupNav(host, st, zc) {
    st.zc = zc;
    zc.addEventListener("click", function (e) {
      var b = e.target.closest("[data-z]"); if (!b) return; stopAnim(st);
      if (b.dataset.z === "in") zoomAt(st, 1.6); else if (b.dataset.z === "out") zoomAt(st, 1 / 1.6); else fitAll(st, true);
    });
    st.svg.addEventListener("wheel", function (e) {
      e.preventDefault(); stopAnim(st);
      var p = svgPoint(st, e.clientX, e.clientY); if (!p) return;
      zoomAt(st, Math.pow(1.0015, -e.deltaY), p.x, p.y);
    }, { passive: false });
    st.svg.addEventListener("dblclick", function (e) { var p = svgPoint(st, e.clientX, e.clientY); if (p) zoomAt(st, 1.8, p.x, p.y); });
    // glisser pour se déplacer, pincer pour zoomer ; un clic sans mouvement reste un clic (sur un lieu)
    var ptrs = {}, drag = null, pinch = null;
    st.svg.addEventListener("pointerdown", function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      stopAnim(st);
      ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(ptrs);
      if (ids.length === 1) { drag = { x: e.clientX, y: e.clientY, vx: st.vb.x, vy: st.vb.y, moved: false }; }
      else if (ids.length === 2) { var a = ptrs[ids[0]], b = ptrs[ids[1]]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), w: st.vb.w }; drag = null; }
      window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", up);
    });
    function move(e) {
      if (!ptrs[e.pointerId]) return;
      ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(ptrs);
      if (pinch && ids.length === 2) {
        var a = ptrs[ids[0]], b = ptrs[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y);
        var cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2, p = svgPoint(st, cx, cy);
        var nw = pinch.w * pinch.d / Math.max(10, d), f = st.vb.w / nw;
        if (p) zoomAt(st, f, p.x, p.y);
        return;
      }
      if (!drag) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
      if (!drag.moved) return;
      var r = st.svg.getBoundingClientRect(), k = st.vb.w / r.width;
      st.vb.x = drag.vx - dx * k; st.vb.y = drag.vy - dy * k; applyView(st);
      st.svg.classList.add("is-panning");
    }
    function up(e) {
      delete ptrs[e.pointerId];
      if (drag && drag.moved) { st.svg.classList.remove("is-panning"); st.svg._justDragged = true; setTimeout(function () { st.svg._justDragged = false; }, 80); }
      drag = null; if (Object.keys(ptrs).length < 2) pinch = null;
      if (!Object.keys(ptrs).length) { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up); }
    }
    zc.addEventListener("keydown", function (e) {
      if (e.key === "+" || e.key === "=") { zoomAt(st, 1.6); e.preventDefault(); }
      else if (e.key === "-") { zoomAt(st, 1 / 1.6); e.preventDefault(); }
      else if (e.key === "0") fitAll(st, true);
      else if (/^Arrow/.test(e.key)) { var step = st.vb.w * 0.08; if (e.key === "ArrowLeft") st.vb.x -= step; if (e.key === "ArrowRight") st.vb.x += step; if (e.key === "ArrowUp") st.vb.y -= step; if (e.key === "ArrowDown") st.vb.y += step; applyView(st); e.preventDefault(); }
    });
  }

  /* ---------- lieux (redessinés à chaque appel, le terrain reste) ---------- */
  function render(host, opt) {
    opt = opt || {};
    var st = host._imap && host.contains(host._imap.svg) ? host._imap : buildTerrain(host);
    var first = !st.ready; st.ready = true;
    st.padLeft = opt.padLeft || 0; st.padRight = opt.padRight || 0;
    st.gm.innerHTML = ""; st.gme.innerHTML = ""; st.gh.innerHTML = ""; st.marks = []; st.me = null; st.lieu = null;
    var selMark = null, selUV = null;
    var projets = (opt.projects || []).map(function (p) { return { p: p, uv: toUV(p.loc.lat, p.loc.lng) }; })
      .filter(function (x) { return x.uv.u >= 0 && x.uv.u <= COLS && x.uv.v >= 0 && x.uv.v <= ROWS; })
      .sort(function (a, b) { return (a.uv.u + a.uv.v) - (b.uv.u + b.uv.v); });
    // La régénération se voit sur le paysage : un lieu prouvé fait reverdir et fleurir autour de lui,
    // un lieu en cours commence à verdir, un lieu rêvé n'est encore qu'un contour en pointillé.
    projets.forEach(function (x) {
      var p = x.p, hc = P(x.uv.u, x.uv.v, st.zAt(x.uv.u, x.uv.v));
      if (p.statut === "prouve" || p.statut === "encours") {
        var R = (p.statut === "prouve" ? 2.4 : 1.5) * TW;
        el("ellipse", { cx: hc[0], cy: hc[1], rx: R, ry: R / 2, fill: "url(#imap-halo-" + p.statut + ")", class: "imap-halo st-" + p.statut }, st.gh);
        var n = p.statut === "prouve" ? 12 : 4;
        for (var f = 0; f < n; f++) {
          var ang = hash(f, n) * 6.283, rad = (0.3 + hash(f, 3) * 0.6) * R;
          el("circle", { cx: hc[0] + Math.cos(ang) * rad, cy: hc[1] + Math.sin(ang) * rad / 2, r: 1, fill: FLOWERS[f % 5], opacity: .95, class: "imap-halo-flower" }, st.gh);
        }
      } else {
        el("ellipse", { cx: hc[0], cy: hc[1], rx: 1.1 * TW, ry: 0.55 * TW, fill: "none", stroke: "rgba(255,253,247,.75)", "stroke-width": 0.9, "stroke-dasharray": "3 3", class: "imap-halo st-reve" }, st.gh);
      }
    });
    projets.forEach(function (x) {
      var p = x.p, c = P(x.uv.u, x.uv.v, st.zAt(x.uv.u, x.uv.v)), base = p.isMine ? 1.9 : 1.6;
      var sel = opt.selected === p.id, hl = opt.highlight && opt.highlight(p);
      var g = el("g", { class: "imark st-" + p.statut + (p.isMine ? " is-mine" : "") + (p.isExample ? " is-example" : "") + (sel ? " is-selected" : "") + (hl ? " is-highlight" : ""),
        "data-id": p.id, role: "button", tabindex: "0", "aria-label": p.nom + ", " + ({ reve: "rêvé", encours: "en cours", prouve: "prouvé" })[p.statut] + (p.isExample ? ", exemple" : "") }, st.gm);
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
        g.addEventListener("click", function (e) { if (st.svg._justDragged) return; e.stopPropagation(); opt.onSelect(p.id); });
        g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); opt.onSelect(p.id); } });
      }
      st.marks.push({ g: g, x: c[0], y: c[1], base: base });
      if (sel) { selMark = { g: g, x: c[0], y: c[1], p: p }; selUV = x.uv; }
    });
    // Un lieu sélectionné : on s'en approche jusqu'à voir sa maquette 2,5D posée sur la carte.
    if (selMark && opt.lieu && window.renderScene) {
      var tmp = document.createElement("div");
      window.renderScene(tmp, opt.lieu, { life: false, socle: false, label: "Maquette de " + selMark.p.nom });
      var sc = tmp.querySelector("svg");
      if (sc) {
        // la maquette se cale au centre de la case de la carte qui porte le lieu, à la hauteur du terrain
        var ci = Math.floor(selUV.u), cj = Math.floor(selUV.v), cc = P(ci + 0.5, cj + 0.5, st.zAt(ci + 0.5, cj + 0.5));
        var vbv = (sc.getAttribute("viewBox") || "0 0 600 420").split(/\s+/).map(Number);
        var w = 2.4 * 2 * TW, h = w * vbv[3] / vbv[2];           // un peu plus de deux cases de large
        var cyFrac = (144 - vbv[1]) / vbv[3];                      // position du centre de la grille dans la vue de la maquette
        var gl = el("g", { class: "imap-lieu" }, st.gm);
        // tapis d'herbe fondu sous la maquette, pour l'asseoir dans le paysage
        var rx = w * 0.56, ry = rx * 0.5;
        poly(gl, [[cc[0], cc[1] - ry], [cc[0] + rx, cc[1]], [cc[0], cc[1] + ry], [cc[0] - rx, cc[1]]], "#9CC46E", { class: "imap-lieu-ground" });
        el("ellipse", { cx: cc[0], cy: cc[1] + ry * 0.9, rx: rx * 0.9, ry: ry * 0.35, fill: "rgba(28,46,38,.18)", class: "imap-lieu-shadow" }, gl);
        sc.setAttribute("class", "imap-lieu-svg"); sc.setAttribute("preserveAspectRatio", "xMidYMid meet"); sc.style.pointerEvents = "none";
        sc.setAttribute("width", w); sc.setAttribute("height", h); sc.setAttribute("x", cc[0] - w / 2); sc.setAttribute("y", cc[1] - h * cyFrac);
        gl.appendChild(sc);
        st.lieu = { g: gl, x: cc[0], y: cc[1], mark: selMark.g };
      }
    }
    st.sel = selMark ? { x: selMark.x, y: selMark.y, nom: selMark.p.nom } : null;
    st.onBack = opt.onBack || null;
    if (selMark && opt.selected !== st.lastSel) {
      // Depuis la France entière, on passe d'abord par la ville la plus proche (une courte pause), puis on descend
      // jusqu'au lieu, où la maquette apparaît. Depuis une vue déjà rapprochée, on va droit au lieu.
      var town = nearestTown(st, selMark.x, selMark.y), fin = lieuTarget(st, selMark);
      if (st.zoom < 2.2 && town) {
        animateTo(st, cityTarget(st, town, selMark), 900, function () { st.pause = setTimeout(function () { st.pause = null; animateTo(st, fin, 1100); }, 450); });
      } else animateTo(st, fin, 1100);
    }
    st.lastSel = opt.selected || null;
    if (opt.me) {
      var mu = toUV(opt.me.lat, opt.me.lng);
      if (mu.u >= 0 && mu.u <= COLS && mu.v >= 0 && mu.v <= ROWS) {
        var mc = P(mu.u, mu.v, st.zAt(mu.u, mu.v)), g2 = el("g", {}, st.gme);
        el("ellipse", { cx: 0, cy: 0, rx: 9, ry: 4.5, class: "imap-me-ring" }, g2);
        el("circle", { cx: 0, cy: -1, r: 4, fill: "#9BC7AC", stroke: "#0B6049", "stroke-width": 1.6 }, g2);
        el("text", { x: 0, y: -9, class: "imap-me-lbl", "text-anchor": "middle" }, g2).textContent = opt.me.label || "Toi";
        st.me = g2; st.mex = mc[0]; st.mey = mc[1];
      }
    }
    // premier affichage : on cadre les lieux (avec de l'air), jamais plus serré que la moitié de la France
    if (first) {
      applyView(st); // mesure l'écran
      if (st.marks.length) {
        var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        st.marks.forEach(function (m) { x0 = Math.min(x0, m.x); y0 = Math.min(y0, m.y); x1 = Math.max(x1, m.x); y1 = Math.max(y1, m.y); });
        var rr0 = st.host.getBoundingClientRect(), visible = rr0.width ? (rr0.width - st.padLeft) / rr0.width : 1;
        var w0 = Math.max((x1 - x0) * 1.9, maxWidth(st.ratio) / 2.2) / visible, h0 = w0 / st.ratio;
        var fx0 = rr0.width ? (st.padLeft + (rr0.width - st.padLeft) / 2) / rr0.width : 0.5;
        st.vb = { x: (x0 + x1) / 2 - w0 * fx0, y: (y0 + y1) / 2 - 20 - h0 / 2, w: w0, h: h0 };
      } else fitAll(st, false);
    }
    applyView(st);
    return st.svg;
  }

  window.renderIsoMap = render;
  window.EvadIsoMap = { render: render, toUV: toUV, bounds: { lat0: LAT0, lat1: LAT1, lng0: LNG0, lng1: LNG1 } };
})();
