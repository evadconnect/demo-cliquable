# EVAD, bêta du parcours REGEN

**En ligne : https://evadconnect.github.io/demo-cliquable/**

Du rêve à la preuve : carte vivante, le Commun, puis les 5 étapes REGEN (Rêver, Explorer, Générer, Entreprendre, Nourrir).
HTML, CSS et JavaScript sans framework ni build ; comptes et données sur Supabase, carte OpenStreetMap (Leaflet).

## Bêta : comptes et données (Supabase)

- Les comptes sont ceux de Supabase (email + mot de passe), les mêmes que le prototype EVAD.
- Chaque testeur crée **son propre lieu** (nom, commune géolocalisée, promesse, collectif) sur un terrain vierge. Le projet est enregistré en ligne (table `regen_projets`, protégée par compte) et mis en cache sur l'appareil.
- La carte publique montre les lieux des testeurs qui ont coché « Afficher mon lieu sur la carte » (case décochée par défaut : opt-in), plus des projets d'exemple marqués « Exemple ». La vue `regen_carte` ne publie que des colonnes limitées, la commune (pas la rue) et une position arrondie à environ 1 km.
- Les solutions proposées au Commun partent dans la table `regen_propositions` (une ligne par proposition, statut `en_relecture`, `acceptee` ou `refusee`). La relecture se fait depuis le tableau de bord Supabase. Sans compte, la proposition reste sur l'appareil et part à la prochaine connexion.
- Bibliothèques externes épinglées avec contrôle d'intégrité (SRI) : Supabase JS 2.117.2 et Leaflet 1.9.4, via jsDelivr. Pour monter de version, recalculer le hash `integrity` (par exemple `openssl dgst -sha384 -binary fichier.js | openssl base64 -A` sur le fichier du paquet npm).
- `mentions.html` : mentions légales et informations RGPD, liées depuis le pied de page.
- Base utilisée : constante `ENV` en haut de `assets/backend.js` (`"staging"` = evad-dev, `"prod"` = base réelle).

### Mise en service
1. Dans Supabase (staging d'abord) > SQL Editor : exécuter `supabase/regen-beta.sql`.
2. Authentication > URL Configuration : ajouter `https://evadconnect.github.io/demo-cliquable/` (et `http://localhost:8790/`) aux Redirect URLs, pour les liens de confirmation et de mot de passe oublié.
3. Quand c'est validé : relancer le SQL sur la base prod et passer `ENV` à `"prod"`.

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

- L'état du projet (nom, solutions choisies et posées, quêtes, preuves) est enregistré en ligne sur le compte (table `regen_projets`) et mis en cache dans le `localStorage` du navigateur ; la version la plus récente l'emporte au chargement.
- Deva ne produit jamais de chiffre d'impact : les jauges et les barres ne bougent que par les actions du visiteur.
- La carte de l'accueil (et de Rêver) est une vraie carte open source : Leaflet + tuiles OpenStreetMap. Chaque lieu a de vraies coordonnées (`lat`/`lng` dans `data.js`), et sur Rêver on situe son propre lieu en cliquant la carte ou en glissant son marqueur. Hors-ligne, la démo retombe automatiquement sur une carte stylisée en SVG.
- Le projet passe au vert sur la carte à partir de 3 preuves saisies à l'étape Nourrir.
- Deux niveaux d'accès : les pages publiques (accueil, Le Commun, mentions légales) sont ouvertes à tous, avec Deva et un bouton « Se connecter » ; l'espace de travail (les 5 étapes du parcours) demande un compte Supabase (email + mot de passe, voir plus haut). Entrer dans le parcours (ou cliquer « Créer mon projet ») ouvre l'écran d'accès « Créer un accès / J'ai déjà un accès », avec mot de passe oublié. « Déconnexion » ferme la session Supabase.
- Sur l'accueil (public), la sidebar de gauche est Deva en mode accueil : elle présente la Vision 2030 et propose les portes (créer un projet, visiter la carte, parcourir le Commun). La carte occupe la droite.
- Parcours type : accueil → « Créer mon projet » → « Utiliser l'exemple » → ajouter 3 ou 4 solutions → les poser sur la maquette → « C'est parti » → saisir 3 preuves → « Voir la carte ».
