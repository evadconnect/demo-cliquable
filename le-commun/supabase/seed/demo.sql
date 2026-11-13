-- Le Commun d'EVAD : jeu de données de démonstration.
-- Généré par le-commun/tools/build-seed.mjs depuis data/demo.json. Ne pas modifier à la main.
-- Rejouable : les solutions sont mises à jour par leur slug, leurs étapes, ressources et « oups » sont réécrits.
begin;

insert into referentiel.categorie (slug, nom, couleur, picto, ordre) values
  ('alimentation', 'Alimentation', '#4E8C6C', 'panier', 1),
  ('energie', 'Énergie', '#B9832B', 'eclair', 2),
  ('eau', 'Eau', '#5C8E95', 'goutte', 3),
  ('eco-construction', 'Éco-construction', '#9A7B4F', 'maison', 4),
  ('gouvernance', 'Gouvernance', '#A45A40', 'cercle', 5),
  ('reemploi', 'Réemploi', '#7B6A9A', 'boucle', 6),
  ('sol-vivant', 'Sol et vivant', '#8A6448', 'pousse', 7)
on conflict (slug) do update set nom = excluded.nom, couleur = excluded.couleur, picto = excluded.picto, ordre = excluded.ordre;

insert into referentiel.type_projet (slug, nom, picto, ordre) values
  ('jardin-partage', 'Jardin partagé', 'arrosoir', 1),
  ('tiers-lieu', 'Tiers-lieu', 'porte', 2),
  ('eco-lieu', 'Éco-lieu', 'hameau', 3),
  ('fablab', 'Fablab', 'engrenage', 4)
on conflict (slug) do update set nom = excluded.nom, picto = excluded.picto, ordre = excluded.ordre;

-- Récupération d'eau de pluie
insert into referentiel.solution (slug, titre, description_courte, niveau_techno, biomimetique, mise_en_place, impact_ecologie, impact_social, impact_economie_locale, pourquoi, point_vigilance, credits, source, categorie_id, statut, propose_par)
select 'recup-eau', 'Récupération d''eau de pluie', 'Les toits remplissent des cuves : on arrose le jardin sans puiser dans le réseau, même en été.', 'low'::referentiel.niveau_techno, false, 'Un week-end', 3, 1, 2, 'L''eau de pluie tombe sur les toits et repart à l''égout. La garder dans des cuves permet d''arroser en été sans tirer sur le réseau, et rend le lieu moins fragile pendant les restrictions.', 'Une cuve pleine pèse lourd : pose-la sur un sol stable et de niveau. Ferme-la pour éviter les moustiques, et réserve cette eau à l''arrosage, pas à la boisson.', 'Jeu de démonstration EVAD.', null, c.id, 'publiee', null
from referentiel.categorie c where c.slug = 'eau'
on conflict (slug) do update set titre = excluded.titre, description_courte = excluded.description_courte, niveau_techno = excluded.niveau_techno, biomimetique = excluded.biomimetique, mise_en_place = excluded.mise_en_place, impact_ecologie = excluded.impact_ecologie, impact_social = excluded.impact_social, impact_economie_locale = excluded.impact_economie_locale, pourquoi = excluded.pourquoi, point_vigilance = excluded.point_vigilance, credits = excluded.credits, source = excluded.source, categorie_id = excluded.categorie_id, statut = 'publiee';
delete from referentiel.solution_type_projet where solution_id = (select id from referentiel.solution where slug = 'recup-eau');
insert into referentiel.solution_type_projet (solution_id, type_projet_id) select (select id from referentiel.solution where slug = 'recup-eau'), t.id from referentiel.type_projet t where t.slug in ('jardin-partage', 'eco-lieu', 'tiers-lieu');
delete from referentiel.solution_etape where solution_id = (select id from referentiel.solution where slug = 'recup-eau');
insert into referentiel.solution_etape (solution_id, ordre, texte) values
  ((select id from referentiel.solution where slug = 'recup-eau'), 1, 'Repérer la descente de gouttière la plus proche du jardin.'),
  ((select id from referentiel.solution where slug = 'recup-eau'), 2, 'Poser la cuve sur un socle stable, légèrement surélevé pour glisser un arrosoir sous le robinet.'),
  ((select id from referentiel.solution where slug = 'recup-eau'), 3, 'Raccorder la gouttière avec un collecteur filtrant et prévoir un trop-plein vers le sol.'),
  ((select id from referentiel.solution where slug = 'recup-eau'), 4, 'Fermer la cuve et la protéger du soleil pour limiter les algues.'),
  ((select id from referentiel.solution where slug = 'recup-eau'), 5, 'Vidanger et rincer la cuve une fois par an, avant l''hiver.');
delete from referentiel.solution_ressource where solution_id = (select id from referentiel.solution where slug = 'recup-eau');
insert into referentiel.solution_ressource (solution_id, nom, cout_installation_min, cout_installation_max, cout_entretien_min, cout_entretien_max, unite) values
  ((select id from referentiel.solution where slug = 'recup-eau'), 'Cuve de récupération', null, null, null, null, null),
  ((select id from referentiel.solution where slug = 'recup-eau'), 'Collecteur filtrant de gouttière', null, null, null, null, null),
  ((select id from referentiel.solution where slug = 'recup-eau'), 'Socle ou parpaings', null, null, null, null, null);
delete from referentiel.solution_oups where solution_id = (select id from referentiel.solution where slug = 'recup-eau');
insert into referentiel.solution_oups (solution_id, ordre, probleme, rattrapage) values
  ((select id from referentiel.solution where slug = 'recup-eau'), 1, 'L''eau verdit et sent mauvais.', 'La cuve reçoit trop de lumière ou de feuilles : opacifie-la, nettoie le filtre et vidange.'),
  ((select id from referentiel.solution where slug = 'recup-eau'), 2, 'La cuve déborde au pied du mur.', 'Ajoute un trop-plein qui renvoie l''eau vers une noue ou un massif, loin des fondations.');

-- Mare pédagogique
insert into referentiel.solution (slug, titre, description_courte, niveau_techno, biomimetique, mise_en_place, impact_ecologie, impact_social, impact_economie_locale, pourquoi, point_vigilance, credits, source, categorie_id, statut, propose_par)
select 'mare', 'Mare pédagogique', 'Un coin d''eau qui attire grenouilles et libellules, et où les écoles viennent observer.', 'low'::referentiel.niveau_techno, false, 'Quelques semaines', 3, 2, 1, 'Un point d''eau, même petit, attire en quelques mois libellules, grenouilles et oiseaux. C''est aussi un support d''observation que les écoles et les familles adorent.', 'Sécurise les abords si des enfants fréquentent le lieu : pente douce, faible profondeur près du bord, barrière basse si besoin. Jamais de poissons, ils mangent les larves.', 'Jeu de démonstration EVAD.', null, c.id, 'publiee', null
from referentiel.categorie c where c.slug = 'eau'
on conflict (slug) do update set titre = excluded.titre, description_courte = excluded.description_courte, niveau_techno = excluded.niveau_techno, biomimetique = excluded.biomimetique, mise_en_place = excluded.mise_en_place, impact_ecologie = excluded.impact_ecologie, impact_social = excluded.impact_social, impact_economie_locale = excluded.impact_economie_locale, pourquoi = excluded.pourquoi, point_vigilance = excluded.point_vigilance, credits = excluded.credits, source = excluded.source, categorie_id = excluded.categorie_id, statut = 'publiee';
delete from referentiel.solution_type_projet where solution_id = (select id from referentiel.solution where slug = 'mare');
insert into referentiel.solution_type_projet (solution_id, type_projet_id) select (select id from referentiel.solution where slug = 'mare'), t.id from referentiel.type_projet t where t.slug in ('jardin-partage', 'eco-lieu');
delete from referentiel.solution_etape where solution_id = (select id from referentiel.solution where slug = 'mare');
insert into referentiel.solution_etape (solution_id, ordre, texte) values
  ((select id from referentiel.solution where slug = 'mare'), 1, 'Choisir un endroit à mi-ombre, loin des grands arbres.'),
  ((select id from referentiel.solution where slug = 'mare'), 2, 'Creuser en pente douce avec plusieurs paliers de profondeur.'),
  ((select id from referentiel.solution where slug = 'mare'), 3, 'Poser un feutre puis une bâche, ou tasser de l''argile si le sol s''y prête.'),
  ((select id from referentiel.solution where slug = 'mare'), 4, 'Remplir à l''eau de pluie et laisser les plantes locales s''installer.'),
  ((select id from referentiel.solution where slug = 'mare'), 5, 'Laisser faire : la vie arrive seule, sans rien introduire.');
delete from referentiel.solution_ressource where solution_id = (select id from referentiel.solution where slug = 'mare');
insert into referentiel.solution_ressource (solution_id, nom, cout_installation_min, cout_installation_max, cout_entretien_min, cout_entretien_max, unite) values
  ((select id from referentiel.solution where slug = 'mare'), 'Bâche ou argile', null, null, null, null, null),
  ((select id from referentiel.solution where slug = 'mare'), 'Feutre de protection', null, null, null, null, null),
  ((select id from referentiel.solution where slug = 'mare'), 'Plantes aquatiques locales', null, null, null, null, null);
delete from referentiel.solution_oups where solution_id = (select id from referentiel.solution where slug = 'mare');
insert into referentiel.solution_oups (solution_id, ordre, probleme, rattrapage) values
  ((select id from referentiel.solution where slug = 'mare'), 1, 'L''eau devient verte au printemps.', 'C''est souvent passager. Ajoute des plantes oxygénantes et un peu d''ombre, sans vider la mare.');

-- Haie fruitière
insert into referentiel.solution (slug, titre, description_courte, niveau_techno, biomimetique, mise_en_place, impact_ecologie, impact_social, impact_economie_locale, pourquoi, point_vigilance, credits, source, categorie_id, statut, propose_par)
select 'haie', 'Haie fruitière', 'Une haie de petits fruits qui coupe le vent, abrite les oiseaux et nourrit les passants.', 'low'::referentiel.niveau_techno, false, 'Une saison', 3, 1, 2, 'Une haie de petits fruits coupe le vent, abrite les oiseaux et les insectes utiles, et donne à cueillir aux passants. Elle dessine aussi les limites du lieu sans clôture.', 'Plante en saison de repos, de novembre à mars, et arrose les deux premiers étés. Renseigne-toi sur les distances à respecter avec les voisins.', 'Jeu de démonstration EVAD.', null, c.id, 'publiee', null
from referentiel.categorie c where c.slug = 'sol-vivant'
on conflict (slug) do update set titre = excluded.titre, description_courte = excluded.description_courte, niveau_techno = excluded.niveau_techno, biomimetique = excluded.biomimetique, mise_en_place = excluded.mise_en_place, impact_ecologie = excluded.impact_ecologie, impact_social = excluded.impact_social, impact_economie_locale = excluded.impact_economie_locale, pourquoi = excluded.pourquoi, point_vigilance = excluded.point_vigilance, credits = excluded.credits, source = excluded.source, categorie_id = excluded.categorie_id, statut = 'publiee';
delete from referentiel.solution_type_projet where solution_id = (select id from referentiel.solution where slug = 'haie');
insert into referentiel.solution_type_projet (solution_id, type_projet_id) select (select id from referentiel.solution where slug = 'haie'), t.id from referentiel.type_projet t where t.slug in ('jardin-partage', 'eco-lieu');
delete from referentiel.solution_etape where solution_id = (select id from referentiel.solution where slug = 'haie');
insert into referentiel.solution_etape (solution_id, ordre, texte) values
  ((select id from referentiel.solution where slug = 'haie'), 1, 'Tracer la ligne et ameublir le sol sur une bande d''un mètre.'),
  ((select id from referentiel.solution where slug = 'haie'), 2, 'Choisir des essences locales variées : groseillier, cassis, noisetier, sureau, prunellier.'),
  ((select id from referentiel.solution where slug = 'haie'), 3, 'Planter en quinconce, en mélangeant les espèces.'),
  ((select id from referentiel.solution where slug = 'haie'), 4, 'Pailler épais pour garder l''humidité.'),
  ((select id from referentiel.solution where slug = 'haie'), 5, 'Arroser les deux premiers étés, tailler légèrement ensuite.');
delete from referentiel.solution_ressource where solution_id = (select id from referentiel.solution where slug = 'haie');
insert into referentiel.solution_ressource (solution_id, nom, cout_installation_min, cout_installation_max, cout_entretien_min, cout_entretien_max, unite) values
  ((select id from referentiel.solution where slug = 'haie'), 'Jeunes plants en racines nues', null, null, null, null, null),
  ((select id from referentiel.solution where slug = 'haie'), 'Paillage : broyat ou paille', null, null, null, null, null),
  ((select id from referentiel.solution where slug = 'haie'), 'Tuteurs et protections', null, null, null, null, null);
delete from referentiel.solution_oups where solution_id = (select id from referentiel.solution where slug = 'haie');
insert into referentiel.solution_oups (solution_id, ordre, probleme, rattrapage) values
  ((select id from referentiel.solution where slug = 'haie'), 1, 'Plusieurs plants ne reprennent pas.', 'Remplace-les à l''automne suivant et renforce le paillage : le manque d''eau la première année est la cause la plus courante.');

-- Compost partagé
insert into referentiel.solution (slug, titre, description_courte, niveau_techno, biomimetique, mise_en_place, impact_ecologie, impact_social, impact_economie_locale, pourquoi, point_vigilance, credits, source, categorie_id, statut, propose_par)
select 'compost', 'Compost partagé', 'Les voisins déposent leurs épluchures, le jardin récupère un sol vivant.', 'low'::referentiel.niveau_techno, false, 'Un week-end', 2, 3, 1, 'Les épluchures du quartier deviennent un sol vivant pour le jardin au lieu de partir à la benne. Le bac à compost est aussi un endroit où l''on se croise chaque semaine.', 'Un compost partagé tient grâce à ses référents. Prévois au moins deux personnes formées et une réserve de matière sèche toujours pleine.', 'Jeu de démonstration EVAD.', null, c.id, 'publiee', null
from referentiel.categorie c where c.slug = 'sol-vivant'
on conflict (slug) do update set titre = excluded.titre, description_courte = excluded.description_courte, niveau_techno = excluded.niveau_techno, biomimetique = excluded.biomimetique, mise_en_place = excluded.mise_en_place, impact_ecologie = excluded.impact_ecologie, impact_social = excluded.impact_social, impact_economie_locale = excluded.impact_economie_locale, pourquoi = excluded.pourquoi, point_vigilance = excluded.point_vigilance, credits = excluded.credits, source = excluded.source, categorie_id = excluded.categorie_id, statut = 'publiee';
delete from referentiel.solution_type_projet where solution_id = (select id from referentiel.solution where slug = 'compost');
insert into referentiel.solution_type_projet (solution_id, type_projet_id) select (select id from referentiel.solution where slug = 'compost'), t.id from referentiel.type_projet t where t.slug in ('jardin-partage', 'tiers-lieu', 'eco-lieu');
delete from referentiel.solution_etape where solution_id = (select id from referentiel.solution where slug = 'compost');
insert into referentiel.solution_etape (solution_id, ordre, texte) values
  ((select id from referentiel.solution where slug = 'compost'), 1, 'Réunir quelques foyers volontaires et désigner deux référents.'),
  ((select id from referentiel.solution where slug = 'compost'), 2, 'Installer trois bacs : apports, maturation, matière sèche.'),
  ((select id from referentiel.solution where slug = 'compost'), 3, 'Afficher des consignes simples sur ce qui se composte ou non.'),
  ((select id from referentiel.solution where slug = 'compost'), 4, 'Brasser à chaque apport et couvrir de matière sèche.'),
  ((select id from referentiel.solution where slug = 'compost'), 5, 'Récolter et partager le compost mûr au bout de quelques mois.');
delete from referentiel.solution_ressource where solution_id = (select id from referentiel.solution where slug = 'compost');
insert into referentiel.solution_ressource (solution_id, nom, cout_installation_min, cout_installation_max, cout_entretien_min, cout_entretien_max, unite) values
  ((select id from referentiel.solution where slug = 'compost'), 'Trois bacs en bois', null, null, null, null, null),
  ((select id from referentiel.solution where slug = 'compost'), 'Broyat ou feuilles mortes', null, null, null, null, null),
  ((select id from referentiel.solution where slug = 'compost'), 'Fourche et brass-compost', null, null, null, null, null),
  ((select id from referentiel.solution where slug = 'compost'), 'Panneau de consignes', null, null, null, null, null);
delete from referentiel.solution_oups where solution_id = (select id from referentiel.solution where slug = 'compost');
insert into referentiel.solution_oups (solution_id, ordre, probleme, rattrapage) values
  ((select id from referentiel.solution where slug = 'compost'), 1, 'Le compost sent mauvais et attire les moucherons.', 'Il est trop humide : ajoute de la matière sèche, brasse, et rappelle la consigne de couvrir chaque apport.'),
  ((select id from referentiel.solution where slug = 'compost'), 2, 'Des déchets non compostables apparaissent.', 'Renforce l''affichage et propose un temps d''accueil pour les nouveaux participants.');

-- Panneaux solaires citoyens
insert into referentiel.solution (slug, titre, description_courte, niveau_techno, biomimetique, mise_en_place, impact_ecologie, impact_social, impact_economie_locale, pourquoi, point_vigilance, credits, source, categorie_id, statut, propose_par)
select 'solaire', 'Panneaux solaires citoyens', 'Les habitants financent ensemble une centrale sur le lieu et gardent l''énergie au pays.', 'high'::referentiel.niveau_techno, false, 'Plusieurs mois', 2, 2, 3, 'Quand les habitants financent ensemble une centrale sur le toit du lieu, l''énergie et ses revenus restent sur le territoire. Le projet crée un collectif durable autour d''un bien commun.', 'Fais vérifier la charpente et l''étanchéité avant tout. Le montage juridique et le raccordement prennent du temps : rapproche-toi d''un réseau d''énergie citoyenne.', 'Jeu de démonstration EVAD.', null, c.id, 'publiee', null
from referentiel.categorie c where c.slug = 'energie'
on conflict (slug) do update set titre = excluded.titre, description_courte = excluded.description_courte, niveau_techno = excluded.niveau_techno, biomimetique = excluded.biomimetique, mise_en_place = excluded.mise_en_place, impact_ecologie = excluded.impact_ecologie, impact_social = excluded.impact_social, impact_economie_locale = excluded.impact_economie_locale, pourquoi = excluded.pourquoi, point_vigilance = excluded.point_vigilance, credits = excluded.credits, source = excluded.source, categorie_id = excluded.categorie_id, statut = 'publiee';
delete from referentiel.solution_type_projet where solution_id = (select id from referentiel.solution where slug = 'solaire');
insert into referentiel.solution_type_projet (solution_id, type_projet_id) select (select id from referentiel.solution where slug = 'solaire'), t.id from referentiel.type_projet t where t.slug in ('tiers-lieu', 'eco-lieu', 'fablab');
delete from referentiel.solution_etape where solution_id = (select id from referentiel.solution where slug = 'solaire');
insert into referentiel.solution_etape (solution_id, ordre, texte) values
  ((select id from referentiel.solution where slug = 'solaire'), 1, 'Faire étudier le toit : orientation, ombrages, solidité.'),
  ((select id from referentiel.solution where slug = 'solaire'), 2, 'Constituer le collectif citoyen et choisir sa forme juridique.'),
  ((select id from referentiel.solution where slug = 'solaire'), 3, 'Réunir le financement auprès des habitants.'),
  ((select id from referentiel.solution where slug = 'solaire'), 4, 'Faire poser et raccorder par une entreprise qualifiée.'),
  ((select id from referentiel.solution where slug = 'solaire'), 5, 'Suivre la production et la partager avec les sociétaires.');
delete from referentiel.solution_ressource where solution_id = (select id from referentiel.solution where slug = 'solaire');
insert into referentiel.solution_ressource (solution_id, nom, cout_installation_min, cout_installation_max, cout_entretien_min, cout_entretien_max, unite) values
  ((select id from referentiel.solution where slug = 'solaire'), 'Étude de structure', null, null, null, null, null),
  ((select id from referentiel.solution where slug = 'solaire'), 'Panneaux et onduleurs', null, null, null, null, null),
  ((select id from referentiel.solution where slug = 'solaire'), 'Pose et raccordement par un professionnel', null, null, null, null, null);
delete from referentiel.solution_oups where solution_id = (select id from referentiel.solution where slug = 'solaire');
insert into referentiel.solution_oups (solution_id, ordre, probleme, rattrapage) values
  ((select id from referentiel.solution where slug = 'solaire'), 1, 'Le raccordement prend beaucoup plus de temps que prévu.', 'Dépose la demande dès que l''étude est faite, et garde le collectif informé à chaque étape.');

-- Four à pain au bois de taille
insert into referentiel.solution (slug, titre, description_courte, niveau_techno, biomimetique, mise_en_place, impact_ecologie, impact_social, impact_economie_locale, pourquoi, point_vigilance, credits, source, categorie_id, statut, propose_par)
select 'four', 'Four à pain au bois de taille', 'Le bois des tailles de haies chauffe un four où l''on cuit ensemble le pain du quartier.', 'low'::referentiel.niveau_techno, false, 'Quelques semaines', 1, 3, 2, 'Le bois des tailles de haies chauffe un four où l''on cuit ensemble le pain du quartier. La fournée devient un rendez-vous régulier qui fait venir des gens très différents.', 'Un four à bois se place loin des bâtiments et des arbres, sur un sol incombustible. Vérifie les règles locales et l''assurance du lieu.', 'Jeu de démonstration EVAD.', null, c.id, 'publiee', null
from referentiel.categorie c where c.slug = 'energie'
on conflict (slug) do update set titre = excluded.titre, description_courte = excluded.description_courte, niveau_techno = excluded.niveau_techno, biomimetique = excluded.biomimetique, mise_en_place = excluded.mise_en_place, impact_ecologie = excluded.impact_ecologie, impact_social = excluded.impact_social, impact_economie_locale = excluded.impact_economie_locale, pourquoi = excluded.pourquoi, point_vigilance = excluded.point_vigilance, credits = excluded.credits, source = excluded.source, categorie_id = excluded.categorie_id, statut = 'publiee';
delete from referentiel.solution_type_projet where solution_id = (select id from referentiel.solution where slug = 'four');
insert into referentiel.solution_type_projet (solution_id, type_projet_id) select (select id from referentiel.solution where slug = 'four'), t.id from referentiel.type_projet t where t.slug in ('tiers-lieu', 'eco-lieu', 'jardin-partage');
delete from referentiel.solution_etape where solution_id = (select id from referentiel.solution where slug = 'four');
insert into referentiel.solution_etape (solution_id, ordre, texte) values
  ((select id from referentiel.solution where slug = 'four'), 1, 'Choisir un emplacement dégagé et accessible.'),
  ((select id from referentiel.solution where slug = 'four'), 2, 'Monter le socle puis la voûte, en chantier participatif avec un artisan.'),
  ((select id from referentiel.solution where slug = 'four'), 3, 'Laisser sécher plusieurs semaines avant la première chauffe.'),
  ((select id from referentiel.solution where slug = 'four'), 4, 'Organiser les fournées : qui allume, qui pétrit, qui range.');
delete from referentiel.solution_ressource where solution_id = (select id from referentiel.solution where slug = 'four');
insert into referentiel.solution_ressource (solution_id, nom, cout_installation_min, cout_installation_max, cout_entretien_min, cout_entretien_max, unite) values
  ((select id from referentiel.solution where slug = 'four'), 'Briques réfractaires ou terre crue', null, null, null, null, null),
  ((select id from referentiel.solution where slug = 'four'), 'Socle maçonné', null, null, null, null, null),
  ((select id from referentiel.solution where slug = 'four'), 'Bois sec issu des tailles', null, null, null, null, null);
delete from referentiel.solution_oups where solution_id = (select id from referentiel.solution where slug = 'four');
insert into referentiel.solution_oups (solution_id, ordre, probleme, rattrapage) values
  ((select id from referentiel.solution where slug = 'four'), 1, 'La voûte se fissure aux premières chauffes.', 'Elle a séché trop vite : rebouche à la terre et remonte en température très progressivement.');

-- Ressourcerie de quartier
insert into referentiel.solution (slug, titre, description_courte, niveau_techno, biomimetique, mise_en_place, impact_ecologie, impact_social, impact_economie_locale, pourquoi, point_vigilance, credits, source, categorie_id, statut, propose_par)
select 'ressourcerie', 'Ressourcerie de quartier', 'Ce qui allait à la benne trouve une deuxième vie et un petit emploi local se crée.', 'low'::referentiel.niveau_techno, false, 'Plusieurs mois', 2, 2, 3, 'Ce qui partait à la benne retrouve une deuxième vie : meubles, vaisselle, outils. La ressourcerie crée de l''activité locale et donne accès à des objets à petit prix.', 'Le stock déborde vite. Fixe des règles de collecte claires et un espace limité, et prévois une filière pour ce qui ne se revend pas.', 'Jeu de démonstration EVAD.', null, c.id, 'publiee', null
from referentiel.categorie c where c.slug = 'reemploi'
on conflict (slug) do update set titre = excluded.titre, description_courte = excluded.description_courte, niveau_techno = excluded.niveau_techno, biomimetique = excluded.biomimetique, mise_en_place = excluded.mise_en_place, impact_ecologie = excluded.impact_ecologie, impact_social = excluded.impact_social, impact_economie_locale = excluded.impact_economie_locale, pourquoi = excluded.pourquoi, point_vigilance = excluded.point_vigilance, credits = excluded.credits, source = excluded.source, categorie_id = excluded.categorie_id, statut = 'publiee';
delete from referentiel.solution_type_projet where solution_id = (select id from referentiel.solution where slug = 'ressourcerie');
insert into referentiel.solution_type_projet (solution_id, type_projet_id) select (select id from referentiel.solution where slug = 'ressourcerie'), t.id from referentiel.type_projet t where t.slug in ('tiers-lieu', 'fablab');
delete from referentiel.solution_etape where solution_id = (select id from referentiel.solution where slug = 'ressourcerie');
insert into referentiel.solution_etape (solution_id, ordre, texte) values
  ((select id from referentiel.solution where slug = 'ressourcerie'), 1, 'Trouver un local accessible avec une zone de dépôt.'),
  ((select id from referentiel.solution where slug = 'ressourcerie'), 2, 'Définir ce qui est accepté et ce qui ne l''est pas.'),
  ((select id from referentiel.solution where slug = 'ressourcerie'), 3, 'Organiser le tri, le nettoyage et la remise en état.'),
  ((select id from referentiel.solution where slug = 'ressourcerie'), 4, 'Ouvrir une permanence régulière de collecte et de vente.'),
  ((select id from referentiel.solution where slug = 'ressourcerie'), 5, 'Nouer des liens avec la déchèterie et les associations voisines.');
delete from referentiel.solution_ressource where solution_id = (select id from referentiel.solution where slug = 'ressourcerie');
insert into referentiel.solution_ressource (solution_id, nom, cout_installation_min, cout_installation_max, cout_entretien_min, cout_entretien_max, unite) values
  ((select id from referentiel.solution where slug = 'ressourcerie'), 'Local avec rayonnages', null, null, null, null, null),
  ((select id from referentiel.solution where slug = 'ressourcerie'), 'Outillage de remise en état', null, null, null, null, null),
  ((select id from referentiel.solution where slug = 'ressourcerie'), 'Balance pour le suivi des objets', null, null, null, null, null);
delete from referentiel.solution_oups where solution_id = (select id from referentiel.solution where slug = 'ressourcerie');
insert into referentiel.solution_oups (solution_id, ordre, probleme, rattrapage) values
  ((select id from referentiel.solution where slug = 'ressourcerie'), 1, 'Le local est saturé en quelques semaines.', 'Suspends la collecte le temps d''écouler le stock, et organise une journée de dons.');

-- Repair café
insert into referentiel.solution (slug, titre, description_courte, niveau_techno, biomimetique, mise_en_place, impact_ecologie, impact_social, impact_economie_locale, pourquoi, point_vigilance, credits, source, categorie_id, statut, propose_par)
select 'repair', 'Repair café', 'Un samedi par mois, on apprend à réparer ensemble grille-pain, vélos et vêtements.', 'low'::referentiel.niveau_techno, false, 'Un week-end', 2, 3, 1, 'Un samedi par mois, des bénévoles aident chacun à réparer son grille-pain, son vélo ou son vêtement. On jette moins et on apprend ensemble.', 'Les bénévoles réparent avec les visiteurs, pas à leur place. Fais signer une décharge simple et écarte les appareils dangereux.', 'Jeu de démonstration EVAD.', null, c.id, 'publiee', null
from referentiel.categorie c where c.slug = 'reemploi'
on conflict (slug) do update set titre = excluded.titre, description_courte = excluded.description_courte, niveau_techno = excluded.niveau_techno, biomimetique = excluded.biomimetique, mise_en_place = excluded.mise_en_place, impact_ecologie = excluded.impact_ecologie, impact_social = excluded.impact_social, impact_economie_locale = excluded.impact_economie_locale, pourquoi = excluded.pourquoi, point_vigilance = excluded.point_vigilance, credits = excluded.credits, source = excluded.source, categorie_id = excluded.categorie_id, statut = 'publiee';
delete from referentiel.solution_type_projet where solution_id = (select id from referentiel.solution where slug = 'repair');
insert into referentiel.solution_type_projet (solution_id, type_projet_id) select (select id from referentiel.solution where slug = 'repair'), t.id from referentiel.type_projet t where t.slug in ('tiers-lieu', 'fablab');
delete from referentiel.solution_etape where solution_id = (select id from referentiel.solution where slug = 'repair');
insert into referentiel.solution_etape (solution_id, ordre, texte) values
  ((select id from referentiel.solution where slug = 'repair'), 1, 'Réunir trois ou quatre bénévoles bricoleurs.'),
  ((select id from referentiel.solution where slug = 'repair'), 2, 'Rassembler une caisse d''outils et quelques pièces courantes.'),
  ((select id from referentiel.solution where slug = 'repair'), 3, 'Fixer un rendez-vous régulier et l''annoncer dans le quartier.'),
  ((select id from referentiel.solution where slug = 'repair'), 4, 'Accueillir, diagnostiquer, réparer ensemble, noter ce qui a été sauvé.');
delete from referentiel.solution_ressource where solution_id = (select id from referentiel.solution where slug = 'repair');
insert into referentiel.solution_ressource (solution_id, nom, cout_installation_min, cout_installation_max, cout_entretien_min, cout_entretien_max, unite) values
  ((select id from referentiel.solution where slug = 'repair'), 'Caisse d''outils partagée', null, null, null, null, null),
  ((select id from referentiel.solution where slug = 'repair'), 'Multimètre et fer à souder', null, null, null, null, null),
  ((select id from referentiel.solution where slug = 'repair'), 'Machine à coudre', null, null, null, null, null);
delete from referentiel.solution_oups where solution_id = (select id from referentiel.solution where slug = 'repair');
insert into referentiel.solution_oups (solution_id, ordre, probleme, rattrapage) values
  ((select id from referentiel.solution where slug = 'repair'), 1, 'Trop de monde, pas assez de réparateurs.', 'Passe aux inscriptions par créneau et invite les visiteurs réguliers à devenir bénévoles.');

-- Planches de culture en lasagnes
insert into referentiel.solution (slug, titre, description_courte, niveau_techno, biomimetique, mise_en_place, impact_ecologie, impact_social, impact_economie_locale, pourquoi, point_vigilance, credits, source, categorie_id, statut, propose_par)
select 'planches', 'Planches de culture en lasagnes', 'On cultive sur une ancienne dalle en empilant carton, broyat et compost : pas besoin de bon sol au départ.', 'low'::referentiel.niveau_techno, false, 'Un week-end', 2, 1, 3, 'On peut cultiver sur une ancienne dalle ou un sol pauvre en empilant carton, broyat et compost. Pas besoin de bonne terre au départ : la planche fabrique son propre sol.', 'Utilise du carton brun sans encre ni adhésif. La planche s''affaisse la première année : recharge-la en matière chaque automne.', 'Jeu de démonstration EVAD.', null, c.id, 'publiee', null
from referentiel.categorie c where c.slug = 'alimentation'
on conflict (slug) do update set titre = excluded.titre, description_courte = excluded.description_courte, niveau_techno = excluded.niveau_techno, biomimetique = excluded.biomimetique, mise_en_place = excluded.mise_en_place, impact_ecologie = excluded.impact_ecologie, impact_social = excluded.impact_social, impact_economie_locale = excluded.impact_economie_locale, pourquoi = excluded.pourquoi, point_vigilance = excluded.point_vigilance, credits = excluded.credits, source = excluded.source, categorie_id = excluded.categorie_id, statut = 'publiee';
delete from referentiel.solution_type_projet where solution_id = (select id from referentiel.solution where slug = 'planches');
insert into referentiel.solution_type_projet (solution_id, type_projet_id) select (select id from referentiel.solution where slug = 'planches'), t.id from referentiel.type_projet t where t.slug in ('jardin-partage', 'eco-lieu');
delete from referentiel.solution_etape where solution_id = (select id from referentiel.solution where slug = 'planches');
insert into referentiel.solution_etape (solution_id, ordre, texte) values
  ((select id from referentiel.solution where slug = 'planches'), 1, 'Délimiter la planche, large d''un bras tendu de chaque côté.'),
  ((select id from referentiel.solution where slug = 'planches'), 2, 'Poser du carton mouillé à même le sol.'),
  ((select id from referentiel.solution where slug = 'planches'), 3, 'Alterner couches brunes, broyat et feuilles, et couches vertes, tontes et épluchures.'),
  ((select id from referentiel.solution where slug = 'planches'), 4, 'Finir par dix centimètres de compost mûr.'),
  ((select id from referentiel.solution where slug = 'planches'), 5, 'Planter aussitôt, pailler, arroser.');
delete from referentiel.solution_ressource where solution_id = (select id from referentiel.solution where slug = 'planches');
insert into referentiel.solution_ressource (solution_id, nom, cout_installation_min, cout_installation_max, cout_entretien_min, cout_entretien_max, unite) values
  ((select id from referentiel.solution where slug = 'planches'), 'Carton brun', null, null, null, null, null),
  ((select id from referentiel.solution where slug = 'planches'), 'Broyat et feuilles mortes', null, null, null, null, null),
  ((select id from referentiel.solution where slug = 'planches'), 'Compost mûr', null, null, null, null, null),
  ((select id from referentiel.solution where slug = 'planches'), 'Bordures en bois de récupération', null, null, null, null, null);
delete from referentiel.solution_oups where solution_id = (select id from referentiel.solution where slug = 'planches');
insert into referentiel.solution_oups (solution_id, ordre, probleme, rattrapage) values
  ((select id from referentiel.solution where slug = 'planches'), 1, 'Les limaces dévorent les jeunes plants.', 'Repique des plants plus développés, arrose le matin et laisse de la place aux auxiliaires.');

-- Poulailler partagé
insert into referentiel.solution (slug, titre, description_courte, niveau_techno, biomimetique, mise_en_place, impact_ecologie, impact_social, impact_economie_locale, pourquoi, point_vigilance, credits, source, categorie_id, statut, propose_par)
select 'poulailler', 'Poulailler partagé', 'Quelques poules mangent les restes, donnent des œufs et un prétexte pour passer tous les jours.', 'low'::referentiel.niveau_techno, false, 'Quelques semaines', 2, 2, 2, 'Quelques poules mangent les restes, donnent des œufs et offrent une raison de passer au lieu tous les jours. Le soin partagé soude un petit groupe de voisins.', 'Des animaux, c''est un engagement quotidien, vacances comprises. Vérifie le règlement local, protège l''abri des prédateurs et organise un planning solide.', 'Jeu de démonstration EVAD.', null, c.id, 'publiee', null
from referentiel.categorie c where c.slug = 'alimentation'
on conflict (slug) do update set titre = excluded.titre, description_courte = excluded.description_courte, niveau_techno = excluded.niveau_techno, biomimetique = excluded.biomimetique, mise_en_place = excluded.mise_en_place, impact_ecologie = excluded.impact_ecologie, impact_social = excluded.impact_social, impact_economie_locale = excluded.impact_economie_locale, pourquoi = excluded.pourquoi, point_vigilance = excluded.point_vigilance, credits = excluded.credits, source = excluded.source, categorie_id = excluded.categorie_id, statut = 'publiee';
delete from referentiel.solution_type_projet where solution_id = (select id from referentiel.solution where slug = 'poulailler');
insert into referentiel.solution_type_projet (solution_id, type_projet_id) select (select id from referentiel.solution where slug = 'poulailler'), t.id from referentiel.type_projet t where t.slug in ('jardin-partage', 'eco-lieu');
delete from referentiel.solution_etape where solution_id = (select id from referentiel.solution where slug = 'poulailler');
insert into referentiel.solution_etape (solution_id, ordre, texte) values
  ((select id from referentiel.solution where slug = 'poulailler'), 1, 'Vérifier ce que permet le règlement de la commune.'),
  ((select id from referentiel.solution where slug = 'poulailler'), 2, 'Constituer une équipe de soin avec un planning hebdomadaire.'),
  ((select id from referentiel.solution where slug = 'poulailler'), 3, 'Construire un abri fermé la nuit et un parcours ombragé.'),
  ((select id from referentiel.solution where slug = 'poulailler'), 4, 'Accueillir trois ou quatre poules.'),
  ((select id from referentiel.solution where slug = 'poulailler'), 5, 'Partager les œufs et tenir un petit cahier de suivi.');
delete from referentiel.solution_ressource where solution_id = (select id from referentiel.solution where slug = 'poulailler');
insert into referentiel.solution_ressource (solution_id, nom, cout_installation_min, cout_installation_max, cout_entretien_min, cout_entretien_max, unite) values
  ((select id from referentiel.solution where slug = 'poulailler'), 'Abri et parcours grillagé', null, null, null, null, null),
  ((select id from referentiel.solution where slug = 'poulailler'), 'Mangeoire et abreuvoir', null, null, null, null, null),
  ((select id from referentiel.solution where slug = 'poulailler'), 'Paille et grain', null, null, null, null, null);
delete from referentiel.solution_oups where solution_id = (select id from referentiel.solution where slug = 'poulailler');
insert into referentiel.solution_oups (solution_id, ordre, probleme, rattrapage) values
  ((select id from referentiel.solution where slug = 'poulailler'), 1, 'Personne ne passe pendant les vacances.', 'Prévois des remplaçants dès le départ et un distributeur qui tient deux jours.');

-- Conseil de lieu ouvert
insert into referentiel.solution (slug, titre, description_courte, niveau_techno, biomimetique, mise_en_place, impact_ecologie, impact_social, impact_economie_locale, pourquoi, point_vigilance, credits, source, categorie_id, statut, propose_par)
select 'conseil', 'Conseil de lieu ouvert', 'Chaque mois, toute personne qui fréquente le lieu peut proposer et décider avec le collectif.', 'low'::referentiel.niveau_techno, false, 'Un week-end', 1, 3, 1, 'Chaque mois, toute personne qui fréquente le lieu peut proposer et décider avec le collectif. Les décisions sont mieux comprises et le lieu ne repose plus sur deux ou trois personnes.', 'Un conseil ouvert a besoin d''un cadre : ordre du jour connu à l''avance, temps de parole partagé, compte rendu affiché.', 'Jeu de démonstration EVAD.', null, c.id, 'publiee', null
from referentiel.categorie c where c.slug = 'gouvernance'
on conflict (slug) do update set titre = excluded.titre, description_courte = excluded.description_courte, niveau_techno = excluded.niveau_techno, biomimetique = excluded.biomimetique, mise_en_place = excluded.mise_en_place, impact_ecologie = excluded.impact_ecologie, impact_social = excluded.impact_social, impact_economie_locale = excluded.impact_economie_locale, pourquoi = excluded.pourquoi, point_vigilance = excluded.point_vigilance, credits = excluded.credits, source = excluded.source, categorie_id = excluded.categorie_id, statut = 'publiee';
delete from referentiel.solution_type_projet where solution_id = (select id from referentiel.solution where slug = 'conseil');
insert into referentiel.solution_type_projet (solution_id, type_projet_id) select (select id from referentiel.solution where slug = 'conseil'), t.id from referentiel.type_projet t where t.slug in ('jardin-partage', 'tiers-lieu', 'eco-lieu', 'fablab');
delete from referentiel.solution_etape where solution_id = (select id from referentiel.solution where slug = 'conseil');
insert into referentiel.solution_etape (solution_id, ordre, texte) values
  ((select id from referentiel.solution where slug = 'conseil'), 1, 'Fixer un rendez-vous mensuel, toujours au même moment.'),
  ((select id from referentiel.solution where slug = 'conseil'), 2, 'Publier l''ordre du jour une semaine avant.'),
  ((select id from referentiel.solution where slug = 'conseil'), 3, 'Désigner à chaque séance un animateur et un gardien du temps.'),
  ((select id from referentiel.solution where slug = 'conseil'), 4, 'Décider par consentement plutôt qu''au vote quand c''est possible.'),
  ((select id from referentiel.solution where slug = 'conseil'), 5, 'Afficher le compte rendu dans le lieu.');
delete from referentiel.solution_ressource where solution_id = (select id from referentiel.solution where slug = 'conseil');
insert into referentiel.solution_ressource (solution_id, nom, cout_installation_min, cout_installation_max, cout_entretien_min, cout_entretien_max, unite) values
  ((select id from referentiel.solution where slug = 'conseil'), 'Une salle et un cercle de chaises', null, null, null, null, null),
  ((select id from referentiel.solution where slug = 'conseil'), 'Un tableau d''affichage', null, null, null, null, null);
delete from referentiel.solution_oups where solution_id = (select id from referentiel.solution where slug = 'conseil');
insert into referentiel.solution_oups (solution_id, ordre, probleme, rattrapage) values
  ((select id from referentiel.solution where slug = 'conseil'), 1, 'Ce sont toujours les mêmes qui parlent.', 'Fais un tour de parole systématique et propose des petits groupes avant la décision.');

-- Budget participatif du lieu
insert into referentiel.solution (slug, titre, description_courte, niveau_techno, biomimetique, mise_en_place, impact_ecologie, impact_social, impact_economie_locale, pourquoi, point_vigilance, credits, source, categorie_id, statut, propose_par)
select 'budget', 'Budget participatif du lieu', 'Une part du budget est décidée par les usagers : ils choisissent les prochains chantiers.', 'low'::referentiel.niveau_techno, false, 'Quelques semaines', 1, 2, 2, 'Une part du budget est décidée par les usagers : ils proposent et choisissent les prochains chantiers. On dépense pour ce qui compte vraiment aux yeux de ceux qui font vivre le lieu.', 'Annonce clairement la somme en jeu et ce qui est finançable. Un vote dont le résultat n''est pas suivi d''effet abîme la confiance.', 'Jeu de démonstration EVAD.', null, c.id, 'publiee', null
from referentiel.categorie c where c.slug = 'gouvernance'
on conflict (slug) do update set titre = excluded.titre, description_courte = excluded.description_courte, niveau_techno = excluded.niveau_techno, biomimetique = excluded.biomimetique, mise_en_place = excluded.mise_en_place, impact_ecologie = excluded.impact_ecologie, impact_social = excluded.impact_social, impact_economie_locale = excluded.impact_economie_locale, pourquoi = excluded.pourquoi, point_vigilance = excluded.point_vigilance, credits = excluded.credits, source = excluded.source, categorie_id = excluded.categorie_id, statut = 'publiee';
delete from referentiel.solution_type_projet where solution_id = (select id from referentiel.solution where slug = 'budget');
insert into referentiel.solution_type_projet (solution_id, type_projet_id) select (select id from referentiel.solution where slug = 'budget'), t.id from referentiel.type_projet t where t.slug in ('jardin-partage', 'tiers-lieu', 'eco-lieu', 'fablab');
delete from referentiel.solution_etape where solution_id = (select id from referentiel.solution where slug = 'budget');
insert into referentiel.solution_etape (solution_id, ordre, texte) values
  ((select id from referentiel.solution where slug = 'budget'), 1, 'Réserver une part du budget annuel.'),
  ((select id from referentiel.solution where slug = 'budget'), 2, 'Recueillir les idées pendant un mois, dans une urne et en ligne.'),
  ((select id from referentiel.solution where slug = 'budget'), 3, 'Vérifier la faisabilité de chaque idée avec le collectif.'),
  ((select id from referentiel.solution where slug = 'budget'), 4, 'Organiser le vote, ouvert à tous les usagers.'),
  ((select id from referentiel.solution where slug = 'budget'), 5, 'Réaliser le projet retenu et afficher l''avancement.');
delete from referentiel.solution_ressource where solution_id = (select id from referentiel.solution where slug = 'budget');
insert into referentiel.solution_ressource (solution_id, nom, cout_installation_min, cout_installation_max, cout_entretien_min, cout_entretien_max, unite) values
  ((select id from referentiel.solution where slug = 'budget'), 'Une urne et des bulletins', null, null, null, null, null),
  ((select id from referentiel.solution where slug = 'budget'), 'Un panneau de suivi', null, null, null, null, null);
delete from referentiel.solution_oups where solution_id = (select id from referentiel.solution where slug = 'budget');
insert into referentiel.solution_oups (solution_id, ordre, probleme, rattrapage) values
  ((select id from referentiel.solution where slug = 'budget'), 1, 'Peu de personnes votent.', 'Fais durer le vote deux semaines et installe l''urne là où les gens passent, pas au fond du bureau.');

-- Désimperméabilisation des sols
insert into referentiel.solution (slug, titre, description_courte, niveau_techno, biomimetique, mise_en_place, impact_ecologie, impact_social, impact_economie_locale, pourquoi, point_vigilance, credits, source, categorie_id, statut, propose_par)
select 'desimpermeabilisation', 'Désimperméabilisation des sols', 'Retirer le bitume ou le béton pour que la pluie retourne dans le sol, sous des plantations ou un revêtement qui laisse passer l''eau.', 'low'::referentiel.niveau_techno, false, '6 à 12 mois', 3, 2, 1, 'Un sol qui respire absorbe la pluie, nourrit les plantes et rafraîchit le lieu en été. On limite aussi les flaques, les débordements et la pollution des cours d''eau.', 'Le chantier ne se limite pas à casser l''enrobé : il faut prévoir l''évacuation des gravats, parfois une dépollution, et la reconstitution d''un sol vivant. Un diagnostic du sol avant de commencer évite les mauvaises surprises.', 'D''après la fiche « Désimperméabilisation » de Plus fraîche ma ville (ADEME), contenu sous licence ouverte Etalab 2.0. Coûts hors taxes, fourniture et pose, repris de cette fiche. Résumé et adaptation : EVAD.', 'https://plusfraichemaville.fr/fiche-solution/desimpermabilisation', c.id, 'publiee', null
from referentiel.categorie c where c.slug = 'eau'
on conflict (slug) do update set titre = excluded.titre, description_courte = excluded.description_courte, niveau_techno = excluded.niveau_techno, biomimetique = excluded.biomimetique, mise_en_place = excluded.mise_en_place, impact_ecologie = excluded.impact_ecologie, impact_social = excluded.impact_social, impact_economie_locale = excluded.impact_economie_locale, pourquoi = excluded.pourquoi, point_vigilance = excluded.point_vigilance, credits = excluded.credits, source = excluded.source, categorie_id = excluded.categorie_id, statut = 'publiee';
delete from referentiel.solution_type_projet where solution_id = (select id from referentiel.solution where slug = 'desimpermeabilisation');
insert into referentiel.solution_type_projet (solution_id, type_projet_id) select (select id from referentiel.solution where slug = 'desimpermeabilisation'), t.id from referentiel.type_projet t where t.slug in ('tiers-lieu', 'eco-lieu', 'jardin-partage');
delete from referentiel.solution_etape where solution_id = (select id from referentiel.solution where slug = 'desimpermeabilisation');
insert into referentiel.solution_etape (solution_id, ordre, texte) values
  ((select id from referentiel.solution where slug = 'desimpermeabilisation'), 1, 'Diagnostiquer le sol : sa capacité à infiltrer l''eau et une éventuelle pollution.'),
  ((select id from referentiel.solution where slug = 'desimpermeabilisation'), 2, 'Repérer avec les usagers les surfaces à ouvrir en priorité.'),
  ((select id from referentiel.solution where slug = 'desimpermeabilisation'), 3, 'Choisir entre pleine terre plantée et revêtement perméable, en préférant les solutions fondées sur la nature.'),
  ((select id from referentiel.solution where slug = 'desimpermeabilisation'), 4, 'Chercher les financements.'),
  ((select id from referentiel.solution where slug = 'desimpermeabilisation'), 5, 'Réaliser les travaux, puis entretenir pour que le sol reste perméable.');
delete from referentiel.solution_ressource where solution_id = (select id from referentiel.solution where slug = 'desimpermeabilisation');
insert into referentiel.solution_ressource (solution_id, nom, cout_installation_min, cout_installation_max, cout_entretien_min, cout_entretien_max, unite) values
  ((select id from referentiel.solution where slug = 'desimpermeabilisation'), 'Désimperméabilisation, coût global', 60, 150, 1, 10, '€ HT / m²'),
  ((select id from referentiel.solution where slug = 'desimpermeabilisation'), 'Noue d''infiltration végétalisée', 60, 90, null, null, '€ HT / mètre linéaire'),
  ((select id from referentiel.solution where slug = 'desimpermeabilisation'), 'Jardin de pluie', 80, 120, null, null, '€ HT / m²'),
  ((select id from referentiel.solution where slug = 'desimpermeabilisation'), 'Pavés drainants ou à joints élargis', 55, 80, null, null, '€ HT / m²'),
  ((select id from referentiel.solution where slug = 'desimpermeabilisation'), 'Dalles alvéolées', 40, 60, null, null, '€ HT / m²');
delete from referentiel.solution_oups where solution_id = (select id from referentiel.solution where slug = 'desimpermeabilisation');
insert into referentiel.solution_oups (solution_id, ordre, probleme, rattrapage) values
  ((select id from referentiel.solution where slug = 'desimpermeabilisation'), 1, 'Le revêtement drainant se colmate avec les feuilles et les poussières.', 'Nettoie-le régulièrement et fais curer les ouvrages.'),
  ((select id from referentiel.solution where slug = 'desimpermeabilisation'), 2, 'L''eau stagne encore plusieurs jours après la pluie.', 'Fais inspecter l''ouvrage et vérifier que l''eau circule bien jusqu''au sol.');

-- Jardin de pluie et noue plantée
insert into referentiel.solution (slug, titre, description_courte, niveau_techno, biomimetique, mise_en_place, impact_ecologie, impact_social, impact_economie_locale, pourquoi, point_vigilance, credits, source, categorie_id, statut, propose_par)
select 'jardin-de-pluie', 'Jardin de pluie et noue plantée', 'Un creux planté qui recueille l''eau de pluie, la ralentit et la laisse s''infiltrer au pied des végétaux.', 'low'::referentiel.niveau_techno, false, '1 à 3 mois', 3, 2, 1, 'L''eau de pluie est gérée sur place au lieu de filer à l''égout : elle abreuve les plantations sans arrosage, limite les inondations et rafraîchit l''air.', 'Les creux accumulent feuilles et déchets : prévois un entretien régulier. Arrose le temps de la reprise, protège l''ouvrage des véhicules, et n''utilise jamais de sel de déneigement à proximité.', 'D''après la fiche « Ouvrage paysager de gestion des eaux pluviales » de Plus fraîche ma ville (ADEME), contenu sous licence ouverte Etalab 2.0. Coûts hors taxes, fourniture et pose, repris de cette fiche. Résumé et adaptation : EVAD.', 'https://plusfraichemaville.fr/fiche-solution/gestion-eaux-pluviales', c.id, 'publiee', null
from referentiel.categorie c where c.slug = 'eau'
on conflict (slug) do update set titre = excluded.titre, description_courte = excluded.description_courte, niveau_techno = excluded.niveau_techno, biomimetique = excluded.biomimetique, mise_en_place = excluded.mise_en_place, impact_ecologie = excluded.impact_ecologie, impact_social = excluded.impact_social, impact_economie_locale = excluded.impact_economie_locale, pourquoi = excluded.pourquoi, point_vigilance = excluded.point_vigilance, credits = excluded.credits, source = excluded.source, categorie_id = excluded.categorie_id, statut = 'publiee';
delete from referentiel.solution_type_projet where solution_id = (select id from referentiel.solution where slug = 'jardin-de-pluie');
insert into referentiel.solution_type_projet (solution_id, type_projet_id) select (select id from referentiel.solution where slug = 'jardin-de-pluie'), t.id from referentiel.type_projet t where t.slug in ('jardin-partage', 'eco-lieu', 'tiers-lieu');
delete from referentiel.solution_etape where solution_id = (select id from referentiel.solution where slug = 'jardin-de-pluie');
insert into referentiel.solution_etape (solution_id, ordre, texte) values
  ((select id from referentiel.solution where slug = 'jardin-de-pluie'), 1, 'Diagnostiquer : trajets de l''eau, nature du sol, réseaux enterrés.'),
  ((select id from referentiel.solution where slug = 'jardin-de-pluie'), 2, 'Ouvrir le sol si la surface est revêtue.'),
  ((select id from referentiel.solution where slug = 'jardin-de-pluie'), 3, 'Creuser une dépression en pente douce.'),
  ((select id from referentiel.solution where slug = 'jardin-de-pluie'), 4, 'Aménager une tranchée d''infiltration au pied des plantations.'),
  ((select id from referentiel.solution where slug = 'jardin-de-pluie'), 5, 'Reprendre les abords pour guider l''eau vers l''ouvrage, puis planter.');
delete from referentiel.solution_ressource where solution_id = (select id from referentiel.solution where slug = 'jardin-de-pluie');
insert into referentiel.solution_ressource (solution_id, nom, cout_installation_min, cout_installation_max, cout_entretien_min, cout_entretien_max, unite) values
  ((select id from referentiel.solution where slug = 'jardin-de-pluie'), 'Ouvrage paysager, coût global', 30, 500, 10, 30, '€ HT / m²'),
  ((select id from referentiel.solution where slug = 'jardin-de-pluie'), 'Jardin de pluie', 80, 120, null, null, '€ HT / m²'),
  ((select id from referentiel.solution where slug = 'jardin-de-pluie'), 'Noue d''infiltration végétalisée', 60, 90, null, null, '€ HT / mètre linéaire'),
  ((select id from referentiel.solution where slug = 'jardin-de-pluie'), 'Tranchée d''infiltration', 150, 225, null, null, '€ HT / mètre linéaire'),
  ((select id from referentiel.solution where slug = 'jardin-de-pluie'), 'Géotextile', 4, 5, null, null, '€ HT / m²');
delete from referentiel.solution_oups where solution_id = (select id from referentiel.solution where slug = 'jardin-de-pluie');

-- Toiture végétalisée
insert into referentiel.solution (slug, titre, description_courte, niveau_techno, biomimetique, mise_en_place, impact_ecologie, impact_social, impact_economie_locale, pourquoi, point_vigilance, credits, source, categorie_id, statut, propose_par)
select 'toiture-vegetalisee', 'Toiture végétalisée', 'Un toit couvert de plantes adaptées, qui garde la fraîcheur, isole le bâtiment et retient une partie de la pluie.', 'low'::referentiel.niveau_techno, false, '3 à 6 mois', 3, 1, 1, 'Les plantes et le substrat absorbent moins de chaleur qu''une toiture minérale et améliorent le confort à l''intérieur. Le toit devient aussi un refuge pour les insectes.', 'Fais vérifier que la structure supporte le poids, ainsi que la pente du toit. L''étanchéité doit être posée par une entreprise qualifiée. Choisis des plantes adaptées au climat local et prévois un entretien régulier.', 'D''après la fiche « Toiture végétalisée » de Plus fraîche ma ville (ADEME), contenu sous licence ouverte Etalab 2.0. Coûts hors taxes, fourniture et pose, repris de cette fiche. Résumé et adaptation : EVAD.', 'https://plusfraichemaville.fr/fiche-solution/toiture-vegetalisee', c.id, 'publiee', null
from referentiel.categorie c where c.slug = 'eco-construction'
on conflict (slug) do update set titre = excluded.titre, description_courte = excluded.description_courte, niveau_techno = excluded.niveau_techno, biomimetique = excluded.biomimetique, mise_en_place = excluded.mise_en_place, impact_ecologie = excluded.impact_ecologie, impact_social = excluded.impact_social, impact_economie_locale = excluded.impact_economie_locale, pourquoi = excluded.pourquoi, point_vigilance = excluded.point_vigilance, credits = excluded.credits, source = excluded.source, categorie_id = excluded.categorie_id, statut = 'publiee';
delete from referentiel.solution_type_projet where solution_id = (select id from referentiel.solution where slug = 'toiture-vegetalisee');
insert into referentiel.solution_type_projet (solution_id, type_projet_id) select (select id from referentiel.solution where slug = 'toiture-vegetalisee'), t.id from referentiel.type_projet t where t.slug in ('tiers-lieu', 'eco-lieu', 'fablab');
delete from referentiel.solution_etape where solution_id = (select id from referentiel.solution where slug = 'toiture-vegetalisee');
insert into referentiel.solution_etape (solution_id, ordre, texte) values
  ((select id from referentiel.solution where slug = 'toiture-vegetalisee'), 1, 'Faire vérifier la charpente et la pente par un professionnel.'),
  ((select id from referentiel.solution where slug = 'toiture-vegetalisee'), 2, 'Laisser une bande sans végétation pour accéder à l''étanchéité et aux évacuations d''eau.'),
  ((select id from referentiel.solution where slug = 'toiture-vegetalisee'), 3, 'Faire poser la membrane étanche résistante aux racines.'),
  ((select id from referentiel.solution where slug = 'toiture-vegetalisee'), 4, 'Installer la couche de drainage, le filtre puis le substrat.'),
  ((select id from referentiel.solution where slug = 'toiture-vegetalisee'), 5, 'Planter et mettre en place l''entretien.');
delete from referentiel.solution_ressource where solution_id = (select id from referentiel.solution where slug = 'toiture-vegetalisee');
insert into referentiel.solution_ressource (solution_id, nom, cout_installation_min, cout_installation_max, cout_entretien_min, cout_entretien_max, unite) values
  ((select id from referentiel.solution where slug = 'toiture-vegetalisee'), 'Toiture extensive', 60, 90, 5, 20, '€ HT / m²'),
  ((select id from referentiel.solution where slug = 'toiture-vegetalisee'), 'Toiture semi-intensive', 100, 150, null, null, '€ HT / m²'),
  ((select id from referentiel.solution where slug = 'toiture-vegetalisee'), 'Toiture intensive', 200, 300, null, null, '€ HT / m²'),
  ((select id from referentiel.solution where slug = 'toiture-vegetalisee'), 'Couche de drainage et filtre', 30, 50, null, null, '€ HT / m²');
delete from referentiel.solution_oups where solution_id = (select id from referentiel.solution where slug = 'toiture-vegetalisee');

-- Ventilation naturelle
insert into referentiel.solution (slug, titre, description_courte, niveau_techno, biomimetique, mise_en_place, impact_ecologie, impact_social, impact_economie_locale, pourquoi, point_vigilance, credits, source, categorie_id, statut, propose_par)
select 'ventilation-naturelle', 'Ventilation naturelle', 'Rafraîchir un bâtiment sans climatisation, en faisant circuler l''air grâce au vent et aux écarts de température.', 'low'::referentiel.niveau_techno, false, '1 à 3 mois', 2, 2, 1, 'La nuit, l''air extérieur est souvent plus frais : le faire entrer suffit à refroidir le bâtiment pour la journée suivante. On évite la climatisation et sa consommation.', 'Une ventilation traversante demande assez d''ouvertures sur des façades opposées. Les composants sont peu nombreux mais doivent être vérifiés régulièrement.', 'D''après la fiche « Ventilation naturelle » de Plus fraîche ma ville (ADEME), contenu sous licence ouverte Etalab 2.0. Coûts hors taxes, fourniture et pose, repris de cette fiche. Résumé et adaptation : EVAD.', 'https://plusfraichemaville.fr/fiche-solution/ventilation-naturelle', c.id, 'publiee', null
from referentiel.categorie c where c.slug = 'eco-construction'
on conflict (slug) do update set titre = excluded.titre, description_courte = excluded.description_courte, niveau_techno = excluded.niveau_techno, biomimetique = excluded.biomimetique, mise_en_place = excluded.mise_en_place, impact_ecologie = excluded.impact_ecologie, impact_social = excluded.impact_social, impact_economie_locale = excluded.impact_economie_locale, pourquoi = excluded.pourquoi, point_vigilance = excluded.point_vigilance, credits = excluded.credits, source = excluded.source, categorie_id = excluded.categorie_id, statut = 'publiee';
delete from referentiel.solution_type_projet where solution_id = (select id from referentiel.solution where slug = 'ventilation-naturelle');
insert into referentiel.solution_type_projet (solution_id, type_projet_id) select (select id from referentiel.solution where slug = 'ventilation-naturelle'), t.id from referentiel.type_projet t where t.slug in ('tiers-lieu', 'fablab', 'eco-lieu');
delete from referentiel.solution_etape where solution_id = (select id from referentiel.solution where slug = 'ventilation-naturelle');
insert into referentiel.solution_etape (solution_id, ordre, texte) values
  ((select id from referentiel.solution where slug = 'ventilation-naturelle'), 1, 'Étudier le site : vents dominants, relief, bruit, orientation.'),
  ((select id from referentiel.solution where slug = 'ventilation-naturelle'), 2, 'Concevoir avec un architecte et un bureau d''études un circuit d''air simple et court.'),
  ((select id from referentiel.solution where slug = 'ventilation-naturelle'), 3, 'Réaliser les ouvertures et les conduits, en gardant un accès facile pour l''entretien.'),
  ((select id from referentiel.solution where slug = 'ventilation-naturelle'), 4, 'Surveiller l''installation et changer les filtres quand il y en a.');
delete from referentiel.solution_ressource where solution_id = (select id from referentiel.solution where slug = 'ventilation-naturelle');
insert into referentiel.solution_ressource (solution_id, nom, cout_installation_min, cout_installation_max, cout_entretien_min, cout_entretien_max, unite) values
  ((select id from referentiel.solution where slug = 'ventilation-naturelle'), 'Ventilation naturelle, coût global', 10, 80, 1, 10, '€ HT / m²'),
  ((select id from referentiel.solution where slug = 'ventilation-naturelle'), 'Grille de ventilation', 15, 23, null, null, '€ HT / unité'),
  ((select id from referentiel.solution where slug = 'ventilation-naturelle'), 'Extracteur statique', 180, 270, null, null, '€ HT / unité'),
  ((select id from referentiel.solution where slug = 'ventilation-naturelle'), 'Cheminée de ventilation', 900, 1350, null, null, '€ HT / unité');
delete from referentiel.solution_oups where solution_id = (select id from referentiel.solution where slug = 'ventilation-naturelle');

-- Pain rassis revalorisé
insert into referentiel.solution (slug, titre, description_courte, niveau_techno, biomimetique, mise_en_place, impact_ecologie, impact_social, impact_economie_locale, pourquoi, point_vigilance, credits, source, categorie_id, statut, propose_par)
select 'pain-rassis-revalorise', 'Pain rassis revalorisé', 'Le pain invendu ou rassis est transformé en un ingrédient à cuisiner au lieu de finir à la poubelle.', 'low'::referentiel.niveau_techno, false, 'Quelques semaines', 2, 2, 2, 'Le pain rassis part presque toujours à la benne. À Bordeaux, Franck Wallet, ancien urbaniste, a mis au point le Crumbler pour lui donner une seconde vie en cuisine. Les invendus des boulangers retrouvent de la valeur. Une piste pour un café associatif ou une cantine de tiers-lieu qui travaille avec les boulangers du quartier.', 'Cette fiche résume un portrait publié par Shamengo. Les étapes de mise en œuvre ne sont pas encore documentées par un lieu du Commun.', 'D''après le portrait de Franck Wallet publié par Shamengo. Résumé : EVAD.', 'https://www.shamengo.com/fr/video/jaide-vos-vieux-croutons-de-pain-a-sevader/', c.id, 'publiee', null
from referentiel.categorie c where c.slug = 'reemploi'
on conflict (slug) do update set titre = excluded.titre, description_courte = excluded.description_courte, niveau_techno = excluded.niveau_techno, biomimetique = excluded.biomimetique, mise_en_place = excluded.mise_en_place, impact_ecologie = excluded.impact_ecologie, impact_social = excluded.impact_social, impact_economie_locale = excluded.impact_economie_locale, pourquoi = excluded.pourquoi, point_vigilance = excluded.point_vigilance, credits = excluded.credits, source = excluded.source, categorie_id = excluded.categorie_id, statut = 'publiee';
delete from referentiel.solution_type_projet where solution_id = (select id from referentiel.solution where slug = 'pain-rassis-revalorise');
insert into referentiel.solution_type_projet (solution_id, type_projet_id) select (select id from referentiel.solution where slug = 'pain-rassis-revalorise'), t.id from referentiel.type_projet t where t.slug in ('tiers-lieu', 'eco-lieu');
delete from referentiel.solution_etape where solution_id = (select id from referentiel.solution where slug = 'pain-rassis-revalorise');
delete from referentiel.solution_ressource where solution_id = (select id from referentiel.solution where slug = 'pain-rassis-revalorise');
delete from referentiel.solution_oups where solution_id = (select id from referentiel.solution where slug = 'pain-rassis-revalorise');

-- Chauffage solaire thermique
insert into referentiel.solution (slug, titre, description_courte, niveau_techno, biomimetique, mise_en_place, impact_ecologie, impact_social, impact_economie_locale, pourquoi, point_vigilance, credits, source, categorie_id, statut, propose_par)
select 'chauffage-solaire-thermique', 'Chauffage solaire thermique', 'Des capteurs sur le toit captent la chaleur du soleil et l''envoient directement dans le chauffage du bâtiment.', 'low'::referentiel.niveau_techno, false, 'Plusieurs mois', 3, 1, 2, 'Le soleil chauffe sans passer par l''électricité. Olivier Godin, ingénieur thermicien, a conçu avec son entreprise Solisart, créée en 2010, un système qui réinjecte la chaleur solaire dans le chauffage et l''ajuste selon l''ensoleillement. Shamengo le présente comme une approche low tech.', 'Cette fiche résume un portrait publié par Shamengo. Fais dimensionner l''installation par un professionnel. Les étapes de mise en œuvre ne sont pas encore documentées par un lieu du Commun.', 'D''après le portrait d''Olivier Godin publié par Shamengo. Résumé : EVAD.', 'https://www.shamengo.com/fr/video/mon-chauffage-solaire-thermique-est-le-plus-efficace-du-marche/', c.id, 'publiee', null
from referentiel.categorie c where c.slug = 'energie'
on conflict (slug) do update set titre = excluded.titre, description_courte = excluded.description_courte, niveau_techno = excluded.niveau_techno, biomimetique = excluded.biomimetique, mise_en_place = excluded.mise_en_place, impact_ecologie = excluded.impact_ecologie, impact_social = excluded.impact_social, impact_economie_locale = excluded.impact_economie_locale, pourquoi = excluded.pourquoi, point_vigilance = excluded.point_vigilance, credits = excluded.credits, source = excluded.source, categorie_id = excluded.categorie_id, statut = 'publiee';
delete from referentiel.solution_type_projet where solution_id = (select id from referentiel.solution where slug = 'chauffage-solaire-thermique');
insert into referentiel.solution_type_projet (solution_id, type_projet_id) select (select id from referentiel.solution where slug = 'chauffage-solaire-thermique'), t.id from referentiel.type_projet t where t.slug in ('eco-lieu', 'tiers-lieu');
delete from referentiel.solution_etape where solution_id = (select id from referentiel.solution where slug = 'chauffage-solaire-thermique');
delete from referentiel.solution_ressource where solution_id = (select id from referentiel.solution where slug = 'chauffage-solaire-thermique');
delete from referentiel.solution_oups where solution_id = (select id from referentiel.solution where slug = 'chauffage-solaire-thermique');

-- Dalle isolante en chaux et liège
insert into referentiel.solution (slug, titre, description_courte, niveau_techno, biomimetique, mise_en_place, impact_ecologie, impact_social, impact_economie_locale, pourquoi, point_vigilance, credits, source, categorie_id, statut, propose_par)
select 'dalle-chaux-liege', 'Dalle isolante en chaux et liège', 'Une dalle de sol coulée en chaux et liège, pour isoler une bâtisse ancienne avec des matériaux naturels.', 'low'::referentiel.niveau_techno, false, 'Quelques semaines', 2, 2, 2, 'En mars 2025, Shamengo, l''entreprise Saint-Astier et l''association Echomer ont coulé une dalle isolante de 12 centimètres dans une longère en écorénovation à Latresne, en chantier collaboratif. C''était le premier chantier de cette ampleur pour cette formule.', 'Cette fiche résume un chantier raconté par Shamengo. La formule est récente : rapproche-toi d''un artisan qui connaît la chaux avant de te lancer. Les étapes de mise en œuvre ne sont pas encore documentées par un lieu du Commun.', 'D''après le récit de chantier « Une dalle de chaux liège pour vos vieilles bâtisses » publié par Shamengo. Résumé : EVAD.', 'https://www.shamengo.com/fr/video/une-dalle-de-chaux-liege-pour-vos-vieilles-batisses/', c.id, 'publiee', null
from referentiel.categorie c where c.slug = 'eco-construction'
on conflict (slug) do update set titre = excluded.titre, description_courte = excluded.description_courte, niveau_techno = excluded.niveau_techno, biomimetique = excluded.biomimetique, mise_en_place = excluded.mise_en_place, impact_ecologie = excluded.impact_ecologie, impact_social = excluded.impact_social, impact_economie_locale = excluded.impact_economie_locale, pourquoi = excluded.pourquoi, point_vigilance = excluded.point_vigilance, credits = excluded.credits, source = excluded.source, categorie_id = excluded.categorie_id, statut = 'publiee';
delete from referentiel.solution_type_projet where solution_id = (select id from referentiel.solution where slug = 'dalle-chaux-liege');
insert into referentiel.solution_type_projet (solution_id, type_projet_id) select (select id from referentiel.solution where slug = 'dalle-chaux-liege'), t.id from referentiel.type_projet t where t.slug in ('eco-lieu', 'tiers-lieu');
delete from referentiel.solution_etape where solution_id = (select id from referentiel.solution where slug = 'dalle-chaux-liege');
delete from referentiel.solution_ressource where solution_id = (select id from referentiel.solution where slug = 'dalle-chaux-liege');
delete from referentiel.solution_oups where solution_id = (select id from referentiel.solution where slug = 'dalle-chaux-liege');

-- Rafraîchissement inspiré des termitières
insert into referentiel.solution (slug, titre, description_courte, niveau_techno, biomimetique, mise_en_place, impact_ecologie, impact_social, impact_economie_locale, pourquoi, point_vigilance, credits, source, categorie_id, statut, propose_par)
select 'rafraichissement-termitiere', 'Rafraîchissement inspiré des termitières', 'Un bâtiment qui se rafraîchit seul, en imitant la circulation d''air des termitières.', 'low'::referentiel.niveau_techno, true, 'Plusieurs mois', 3, 1, 1, 'Les termitières gardent une température stable grâce à leurs conduits d''air. L''architecte Mick Pearce, installé à Harare, s''en est inspiré pour inventer une climatisation écologique. Shamengo le compte parmi ses pionniers.', 'Cette fiche résume un portrait publié par Shamengo. Le principe demande une conception d''architecte dès le départ. Les étapes de mise en œuvre ne sont pas encore documentées par un lieu du Commun.', 'D''après le portrait de Mick Pearce publié par Shamengo. Résumé : EVAD.', 'https://www.shamengo.com/fr/communaute/mick-pearce/', c.id, 'publiee', null
from referentiel.categorie c where c.slug = 'eco-construction'
on conflict (slug) do update set titre = excluded.titre, description_courte = excluded.description_courte, niveau_techno = excluded.niveau_techno, biomimetique = excluded.biomimetique, mise_en_place = excluded.mise_en_place, impact_ecologie = excluded.impact_ecologie, impact_social = excluded.impact_social, impact_economie_locale = excluded.impact_economie_locale, pourquoi = excluded.pourquoi, point_vigilance = excluded.point_vigilance, credits = excluded.credits, source = excluded.source, categorie_id = excluded.categorie_id, statut = 'publiee';
delete from referentiel.solution_type_projet where solution_id = (select id from referentiel.solution where slug = 'rafraichissement-termitiere');
insert into referentiel.solution_type_projet (solution_id, type_projet_id) select (select id from referentiel.solution where slug = 'rafraichissement-termitiere'), t.id from referentiel.type_projet t where t.slug in ('tiers-lieu', 'eco-lieu', 'fablab');
delete from referentiel.solution_etape where solution_id = (select id from referentiel.solution where slug = 'rafraichissement-termitiere');
delete from referentiel.solution_ressource where solution_id = (select id from referentiel.solution where slug = 'rafraichissement-termitiere');
delete from referentiel.solution_oups where solution_id = (select id from referentiel.solution where slug = 'rafraichissement-termitiere');

-- Solutions complémentaires (une ligne par paire, lue dans les deux sens par la vue)
delete from referentiel.solution_complementaire where solution_id in (select id from referentiel.solution where slug in ('recup-eau', 'mare', 'haie', 'compost', 'solaire', 'four', 'ressourcerie', 'repair', 'planches', 'poulailler', 'conseil', 'budget', 'desimpermeabilisation', 'jardin-de-pluie', 'toiture-vegetalisee', 'ventilation-naturelle', 'pain-rassis-revalorise', 'chauffage-solaire-thermique', 'dalle-chaux-liege', 'rafraichissement-termitiere')) and complementaire_id in (select id from referentiel.solution where slug in ('recup-eau', 'mare', 'haie', 'compost', 'solaire', 'four', 'ressourcerie', 'repair', 'planches', 'poulailler', 'conseil', 'budget', 'desimpermeabilisation', 'jardin-de-pluie', 'toiture-vegetalisee', 'ventilation-naturelle', 'pain-rassis-revalorise', 'chauffage-solaire-thermique', 'dalle-chaux-liege', 'rafraichissement-termitiere'));
insert into referentiel.solution_complementaire (solution_id, complementaire_id) values
  ((select id from referentiel.solution where slug = 'recup-eau'), (select id from referentiel.solution where slug = 'mare')),
  ((select id from referentiel.solution where slug = 'recup-eau'), (select id from referentiel.solution where slug = 'planches')),
  ((select id from referentiel.solution where slug = 'recup-eau'), (select id from referentiel.solution where slug = 'jardin-de-pluie')),
  ((select id from referentiel.solution where slug = 'mare'), (select id from referentiel.solution where slug = 'haie')),
  ((select id from referentiel.solution where slug = 'haie'), (select id from referentiel.solution where slug = 'compost')),
  ((select id from referentiel.solution where slug = 'haie'), (select id from referentiel.solution where slug = 'four')),
  ((select id from referentiel.solution where slug = 'compost'), (select id from referentiel.solution where slug = 'planches')),
  ((select id from referentiel.solution where slug = 'compost'), (select id from referentiel.solution where slug = 'poulailler')),
  ((select id from referentiel.solution where slug = 'solaire'), (select id from referentiel.solution where slug = 'chauffage-solaire-thermique')),
  ((select id from referentiel.solution where slug = 'solaire'), (select id from referentiel.solution where slug = 'budget')),
  ((select id from referentiel.solution where slug = 'solaire'), (select id from referentiel.solution where slug = 'toiture-vegetalisee')),
  ((select id from referentiel.solution where slug = 'four'), (select id from referentiel.solution where slug = 'pain-rassis-revalorise')),
  ((select id from referentiel.solution where slug = 'four'), (select id from referentiel.solution where slug = 'conseil')),
  ((select id from referentiel.solution where slug = 'ressourcerie'), (select id from referentiel.solution where slug = 'repair')),
  ((select id from referentiel.solution where slug = 'ressourcerie'), (select id from referentiel.solution where slug = 'pain-rassis-revalorise')),
  ((select id from referentiel.solution where slug = 'planches'), (select id from referentiel.solution where slug = 'poulailler')),
  ((select id from referentiel.solution where slug = 'conseil'), (select id from referentiel.solution where slug = 'budget')),
  ((select id from referentiel.solution where slug = 'desimpermeabilisation'), (select id from referentiel.solution where slug = 'jardin-de-pluie')),
  ((select id from referentiel.solution where slug = 'desimpermeabilisation'), (select id from referentiel.solution where slug = 'toiture-vegetalisee')),
  ((select id from referentiel.solution where slug = 'desimpermeabilisation'), (select id from referentiel.solution where slug = 'recup-eau')),
  ((select id from referentiel.solution where slug = 'jardin-de-pluie'), (select id from referentiel.solution where slug = 'mare')),
  ((select id from referentiel.solution where slug = 'toiture-vegetalisee'), (select id from referentiel.solution where slug = 'ventilation-naturelle')),
  ((select id from referentiel.solution where slug = 'ventilation-naturelle'), (select id from referentiel.solution where slug = 'rafraichissement-termitiere')),
  ((select id from referentiel.solution where slug = 'ventilation-naturelle'), (select id from referentiel.solution where slug = 'dalle-chaux-liege'));

commit;
