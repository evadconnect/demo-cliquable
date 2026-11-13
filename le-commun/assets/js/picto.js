/* Pictogrammes au trait (SVG en ligne, couleur du texte courant). Aucun fichier image. */
(function () {
  "use strict";
  var P = {
    // catégories
    panier: '<path d="M4 10h16l-1.5 9h-13z"/><path d="M8.5 10l3-6M15.5 10l-3-6"/>',
    eclair: '<path d="M13 3L5 13h6l-1 8 8-10h-6z"/>',
    goutte: '<path d="M12 3c3.5 4.5 6 7.6 6 11a6 6 0 0 1-12 0c0-3.4 2.5-6.5 6-11z"/>',
    maison: '<path d="M4 11l8-7 8 7"/><path d="M6 10v9h12v-9"/><path d="M10 19v-5h4v5"/>',
    cercle: '<circle cx="12" cy="6" r="2"/><circle cx="5.5" cy="16.5" r="2"/><circle cx="18.5" cy="16.5" r="2"/><path d="M10.6 7.6L6.8 14.6M13.4 7.6l3.8 7M8 17h8"/>',
    boucle: '<path d="M4 12a8 8 0 0 1 13.7-5.6L20 8"/><path d="M20 4v4h-4"/><path d="M20 12a8 8 0 0 1-13.7 5.6L4 16"/><path d="M4 20v-4h4"/>',
    pousse: '<path d="M12 21v-9"/><path d="M12 12c0-4 3-6 7-6 0 4-3 6-7 6z"/><path d="M12 15c0-3-2.5-4.5-6-4.5 0 3 2.5 4.5 6 4.5z"/>',
    // types de projet
    arrosoir: '<path d="M5 10h9v9H5z"/><path d="M14 12.5l6-4.5M19 6.5l2 3"/><path d="M5 12c-2.6 0-2.6 5 0 5"/>',
    porte: '<path d="M4 20V7l8-3 8 3v13"/><path d="M3 20h18"/><path d="M10 20v-6h4v6"/><path d="M8 10h2M14 10h2"/>',
    hameau: '<path d="M3 13l5-4 5 4"/><path d="M4.5 12v7h7v-7"/><path d="M18 19v-5"/><circle cx="18" cy="10.5" r="3.5"/><path d="M2 19h20"/>',
    engrenage: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
    // interface
    loupe: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
    horloge: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    feuille: '<path d="M5 19C5 10.5 10.5 5 19 5c0 8.5-5.5 14-14 14z"/><path d="M6.5 17.5C9.5 14 12.5 11 16 8.5"/>',
    liens: '<circle cx="8" cy="9" r="2.5"/><circle cx="16" cy="9" r="2.5"/><path d="M3.5 19c.5-3 2.2-4.5 4.5-4.5s4 1.5 4.5 4.5M11.5 19c.5-3 2.2-4.5 4.5-4.5s4 1.5 4.5 4.5"/>',
    piece: '<circle cx="12" cy="12" r="8.5"/><path d="M14.8 9.2c-.6-.9-1.6-1.4-2.8-1.4-1.7 0-3 .9-3 2.2 0 3 6 1.4 6 4.2 0 1.3-1.3 2.2-3 2.2-1.3 0-2.4-.6-3-1.5M12 6v1.8M12 16.4V18"/>',
    fleche: '<path d="M5 12h13M13 7l5 5-5 5"/>',
    retour: '<path d="M19 12H6M11 7l-5 5 5 5"/>',
    croix: '<path d="M6 6l12 12M18 6L6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    externe: '<path d="M14 5h5v5M19 5l-8 8"/><path d="M18 14v5H5V6h5"/>',
    alerte: '<path d="M12 4l9 16H3z"/><path d="M12 10v4.5M12 17.2v.3"/>',
    outils: '<path d="M14.5 6.5a3.5 3.5 0 0 0 4.8 4.2L21 12.4l-8.6 8.6-2.4-2.4 8.6-8.6"/><path d="M4 4l5 5M3 7l3 3 2-2-3-3z"/>',
    coche: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    carte: '<path d="M3 6.5l6-2.5 6 2.5 6-2.5v13.5l-6 2.5-6-2.5-6 2.5zM9 4v13.5M15 6.5V20"/>',
    livre: '<path d="M12 7c-1.7-2-4.3-2.4-8-2.4V18c3.7 0 6.3.4 8 2.4 1.7-2 4.3-2.4 8-2.4V4.6c-3.7 0-6.3.4-8 2.4zM12 7v13.4"/>',
    ampoule: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
    spirale: '<path d="M12 12c0-1.7 2.5-1.7 2.5.3 0 2.8-5.5 2.8-5.5-.6C9 8 16.5 8 16.5 12.5c0 5-9.5 5-9.5-1C7 5.5 18.5 5.5 18.5 12"/>'
  };
  window.picto = function (nom, classe) {
    return '<svg class="picto' + (classe ? " " + classe : "") + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (P[nom] || P.feuille) + "</svg>";
  };
})();
