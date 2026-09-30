# EVAD, démo cliquable

Parcours complet en 3 minutes, du rêve à la preuve : carte vivante, le Commun, puis les 5 étapes REGEN (Rêver, Explorer, Générer, Entreprendre, Nourrir).
Front uniquement : HTML, CSS et JavaScript sans framework ni build, sans backend, sans compte, sans API.

## Lancer en local

Ouvrir `index.html` dans le navigateur, directement.

Ou avec un petit serveur statique :

```bash
python3 -m http.server 8790
```

puis http://localhost:8790

## Déployer sur Vercel

Importer le dossier tel quel (preset « Other », aucune commande de build, dossier de sortie : la racine). Aucune configuration nécessaire.
En ligne de commande : `npx vercel` depuis ce dossier.

## Où modifier quoi

| Fichier | Contenu |
|---|---|
| `assets/data.js` | **Toutes les données de démo** : projet fil rouge, 8 projets voisins, 12 solutions du Commun, 6 ICI, 10 quêtes, maquette 2.5D, répliques de Deva, cadres d'export |
| `assets/app.js` | État de la démo (localStorage), barre du haut, carte, logique de chaque écran |
| `assets/scene.js` | Scène 2.5D isométrique en SVG (bâtiments, solutions posées en gris, ambre ou vert) |
| `assets/deva.js` | Panneau Deva, réponses scriptées |
| `assets/styles.css` | Charte graphique (couleurs en variables en haut du fichier) |

## Bon à savoir

- L'état (nom du projet, solutions choisies et posées, quêtes, preuves) vit dans le `localStorage` du navigateur. Le bouton « Réinitialiser la démo » en pied de page remet tout à zéro.
- Deva ne produit jamais de chiffre d'impact : les jauges et les barres ne bougent que par les actions du visiteur.
- Le projet passe au vert sur la carte à partir de 3 preuves saisies à l'étape Nourrir.
- Parcours type : accueil → « Créer mon projet régénératif » → « Utiliser l'exemple » → ajouter 3 ou 4 solutions → les poser sur la maquette → « C'est parti » → saisir 3 preuves → « Voir la carte ».
