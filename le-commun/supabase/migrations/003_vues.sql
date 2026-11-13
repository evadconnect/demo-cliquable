-- Le Commun d'EVAD : vues de lecture (elles respectent les règles RLS de l'appelant).

-- La liste : une ligne par solution publiée, avec sa catégorie et les slugs de ses types de projet.
create or replace view referentiel.solution_carte with (security_invoker = on) as
select s.id, s.slug, s.titre, s.description_courte, s.photo_url, s.photo_alt,
       s.niveau_techno, s.biomimetique, s.mise_en_place,
       s.impact_ecologie, s.impact_social, s.impact_economie_locale, s.pourquoi,
       c.slug as categorie_slug, c.nom as categorie_nom, c.couleur as categorie_couleur,
       c.picto as categorie_picto, c.ordre as categorie_ordre,
       coalesce((select array_agg(t.slug order by t.ordre)
                 from referentiel.solution_type_projet st
                 join referentiel.type_projet t on t.id = st.type_projet_id
                 where st.solution_id = s.id), '{}') as types
from referentiel.solution s
join referentiel.categorie c on c.id = s.categorie_id
where s.statut = 'publiee';

-- Les solutions complémentaires d'une fiche, dans les deux sens du lien.
create or replace view referentiel.solution_complementaire_v with (security_invoker = on) as
select sc.solution_id, s.slug, s.titre, s.description_courte,
       c.slug as categorie_slug, c.nom as categorie_nom, c.couleur as categorie_couleur, c.picto as categorie_picto
from referentiel.solution_complementaire sc
join referentiel.solution s on s.id = sc.complementaire_id
join referentiel.categorie c on c.id = s.categorie_id
where s.statut = 'publiee'
union
select sc.complementaire_id, s.slug, s.titre, s.description_courte,
       c.slug, c.nom, c.couleur, c.picto
from referentiel.solution_complementaire sc
join referentiel.solution s on s.id = sc.solution_id
join referentiel.categorie c on c.id = s.categorie_id
where s.statut = 'publiee';

grant select on referentiel.solution_carte, referentiel.solution_complementaire_v to anon, authenticated;

-- Dernière étape, hors SQL : Supabase > Project Settings > Data API > Exposed schemas, ajouter « referentiel ».
