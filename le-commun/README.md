# Le Commun d'EVAD

Une bibliothèque de solutions régénératives pour les projets de lieux durables : jardins partagés, tiers-lieux, éco-lieux, fablabs.
Son organisation s'inspire de la bibliothèque de fiches solutions de [Plus fraîche ma ville](https://plusfraichemaville.fr/fiche-solution) (ADEME), sans en reprendre l'identité visuelle.

Site statique : HTML, CSS et JavaScript sans framework, sans étape de build, sans serveur. Les données vivent dans Supabase et sont lues directement par le navigateur.

## Les trois écrans

| Page | Rôle |
|---|---|
| `index.html` | La liste : recherche floue, filtres Catégorie, Type de projet et Niveau technologique, combinés et inscrits dans l'adresse |
| `solution.html?slug=...` | La fiche : en-tête avec quatre repères, cinq onglets (Synthèse, Ressources et coûts, Mise en œuvre, Financements, Oups) |
| `proposer.html` | Proposer une solution : connexion puis formulaire, enregistrement au statut `proposee` |

## Arborescence

```
le-commun/
├── index.html, solution.html, proposer.html
├── assets/
│   ├── css/styles.css
│   ├── js/config.js       adresse et clé publique Supabase
│   ├── js/api.js          lecture par fetch, repli sur le jeu d'exemple
│   ├── js/picto.js        pictogrammes au trait (SVG en ligne)
│   ├── js/ui.js           cartes, jauges d'impact, illustrations de repli
│   ├── js/liste.js, fiche.js, proposer.js
│   ├── vendor/fuse.min.js Fuse.js 7.1.0, version « basic », copie locale
│   └── img/logo-evad.svg
├── data/demo.json         le jeu de démonstration (source unique)
├── tools/build-seed.mjs   fabrique supabase/seed/demo.sql depuis demo.json
└── supabase/
    ├── migrations/001_schema.sql, 002_rls.sql, 003_vues.sql
    ├── seed/demo.sql
    └── tests/             imitation de Supabase et vérification des règles RLS
```

## Lancer en local

```bash
python3 -m http.server 8790
```

puis ouvrir http://localhost:8790/le-commun/ depuis la racine du dépôt. Tant que la base n'est pas installée, le site tourne sur le jeu d'exemple et l'annonce par un bandeau.

## Installer la base Supabase

Il n'y a pas de variables d'environnement : un site statique ne peut pas en lire. Les deux réglages sont dans `assets/js/config.js`.

| Réglage | Valeur |
|---|---|
| `supabaseUrl` | l'adresse du projet, `https://<ref>.supabase.co` |
| `supabaseKey` | la clé **publique** du projet (« publishable » ou « anon »), jamais la clé `service_role` |

Cette clé peut vivre dans le navigateur : la sécurité repose sur les règles RLS.

Dans Supabase, SQL Editor, exécuter dans cet ordre :

1. `supabase/migrations/001_schema.sql` : schéma `referentiel`, tables, déclencheurs.
2. `supabase/migrations/002_rls.sql` : droits et règles RLS.
3. `supabase/migrations/003_vues.sql` : vues de lecture.
4. `supabase/seed/demo.sql` : le jeu de démonstration.

Les quatre fichiers sont rejouables sans risque.

Puis, hors SQL :

5. **Project Settings > Data API > Exposed schemas** : ajouter `referentiel`. Sans cela l'API refuse le schéma et le site reste en mode exemple.
6. **Authentication > URL Configuration > Redirect URLs** : ajouter `https://evadconnect.github.io/demo-cliquable/**` et `http://localhost:8790/**`, pour les liens de confirmation d'email.
7. Nommer le conseil régénératif, par exemple :
   ```sql
   insert into referentiel.conseil_membre (user_id)
   select id from auth.users where email = 'prenom@exemple.org';
   ```

## Qui peut faire quoi

| Qui | Lire | Écrire |
|---|---|---|
| Tout le monde | les solutions publiées, les catégories, les types de projet | rien |
| Personne connectée | en plus, ses propres propositions | proposer une solution, toujours au statut `proposee`, cinq par jour au plus |
| Conseil régénératif | tout | tout, et lui seul publie |

Une proposition n'apparaît dans la liste qu'une fois passée à `publiee` par le conseil. Une contrainte empêche de publier une fiche incomplète (description, niveau technologique, mise en place, trois niveaux d'impact, pourquoi).

Valider une proposition, depuis le Table Editor ou en SQL :

```sql
update referentiel.solution
set niveau_techno = 'low', mise_en_place = 'Un week-end',
    impact_ecologie = 2, impact_social = 2, impact_economie_locale = 1,
    pourquoi = '...', statut = 'publiee'
where slug = 'le-slug-de-la-proposition';
```

## Règles de contenu

- **Impact** : trois niveaux par axe (1 léger, 2 moyen, 3 fort), affichés en mots et en barres. Jamais de score chiffré.
- **Coûts** : tous facultatifs. Le Commun n'affiche que des coûts sourcés, une case vide s'affiche « Non documenté ». Jamais de valeur inventée.
- **Reprise de contenu** : remplir `source` (l'adresse) et `credits` (la mention) de la fiche. Ils s'affichent en bas de fiche, sous « Source et mentions ».
- **Vocabulaire** : « projet régénératif », « le Commun », « porteur de projet », « conseil régénératif ». Pas de tiret cadratin.
- **Photos** : `photo_url` et `photo_alt`. Sans photo, la fiche montre une illustration à la couleur de sa catégorie. Images compressées, chargées en différé.

## Le jeu de démonstration

`data/demo.json` est la source unique : le site s'en sert en mode exemple, et `tools/build-seed.mjs` en tire le script SQL.

```bash
node le-commun/tools/build-seed.mjs
```

Vingt fiches :

- douze solutions de la démo EVAD, dont le slug est conservé pour retrouver les lieux qui les ont posées ;
- quatre fiches adaptées de Plus fraîche ma ville (désimperméabilisation, jardin de pluie, toiture végétalisée, ventilation naturelle), résumées avec nos mots, avec les coûts de la fiche d'origine ;
- quatre fiches résumées depuis des portraits publiés par Shamengo (pain rassis revalorisé, chauffage solaire thermique, dalle chaux et liège, rafraîchissement inspiré des termitières). Leurs étapes, ressources et « oups » sont volontairement vides : rien n'a été inventé.

Les niveaux d'impact du jeu de démonstration sont des estimations éditoriales, à revoir par le conseil régénératif.

## Vérifier les règles RLS

`supabase/tests/` contient une imitation minimale de Supabase (rôles `anon` et `authenticated`, `auth.uid()`) et 28 vérifications : lecture publique, proposition, refus de publier, cloisonnement entre comptes, validation par le conseil.

Sur un PostgreSQL local jetable, jamais sur Supabase :

```bash
psql -qAt -f supabase/tests/00_imitation_supabase.sql
psql -qAt -f supabase/migrations/001_schema.sql -f supabase/migrations/002_rls.sql -f supabase/migrations/003_vues.sql -f supabase/seed/demo.sql
psql -qAt -f supabase/tests/90_verifier_rls.sql
```

Chaque ligne commence par `ok` ou `ECHEC`.

## Déployer

- **GitHub Pages** : rien à faire, le dossier est servi tel quel. `404.html`, à la racine du dépôt, redirige l'adresse courte `/le-commun/solution/<slug>` vers la fiche.
- **Vercel** : importer le dépôt, preset « Other », aucune commande de build. `vercel.json` porte la même redirection.

L'adresse de référence d'une fiche est `solution.html?slug=<slug>` : elle marche partout.

## Limites connues

- Les aperçus de partage n'ont pas de titre propre à chaque fiche : le contenu est chargé par le navigateur.
- L'onglet Financements est en attente : aucune aide n'est affichée tant qu'elle n'est pas vérifiée.
- L'étape Explorer de l'application lit encore ses douze solutions locales, pas la base.
- Le bouton « Ajouter à mon projet » mène à la création de projet, sans préremplir la solution.

## Licences et sources

- Code : celui du dépôt.
- Fuse.js : Apache 2.0.
- Plus fraîche ma ville : code MIT, contenus sous licence ouverte Etalab 2.0. Les fiches reprises citent leur source.
- Shamengo : les fiches concernées sont des résumés originaux qui renvoient vers la page d'origine. Aucun texte ni image n'est repris.
