-- Le Commun d'EVAD : schéma « referentiel ».
-- À exécuter dans Supabase > SQL Editor, puis 002_rls.sql, 003_vues.sql et seed/demo.sql.
-- Rejouable sans risque : chaque objet est créé s'il n'existe pas.

create schema if not exists referentiel;

do $$ begin create type referentiel.niveau_techno as enum ('low', 'high');
exception when duplicate_object then null; end $$;
do $$ begin create type referentiel.statut_solution as enum ('brouillon', 'proposee', 'publiee');
exception when duplicate_object then null; end $$;

-- Catégories (liste extensible), avec couleur et pictogramme au trait.
create table if not exists referentiel.categorie (
  id      smallint generated always as identity primary key,
  slug    text unique not null,
  nom     text not null,
  couleur text not null check (couleur ~ '^#[0-9A-Fa-f]{6}$'),
  picto   text not null,
  ordre   smallint not null default 0
);

-- Types de projet (liste extensible), avec pictogramme.
create table if not exists referentiel.type_projet (
  id    smallint generated always as identity primary key,
  slug  text unique not null,
  nom   text not null,
  picto text not null,
  ordre smallint not null default 0
);

-- Une solution du Commun. Une proposition peut être incomplète, une fiche publiée non.
create table if not exists referentiel.solution (
  id                     uuid primary key default gen_random_uuid(),
  slug                   text unique not null,
  titre                  text not null check (char_length(titre) between 3 and 120),
  description_courte     text check (description_courte is null or char_length(description_courte) <= 600),
  photo_url              text,
  photo_alt              text,
  categorie_id           smallint not null references referentiel.categorie,
  niveau_techno          referentiel.niveau_techno,
  biomimetique           boolean not null default false,
  mise_en_place          text,
  impact_ecologie        smallint check (impact_ecologie between 1 and 3),
  impact_social          smallint check (impact_social between 1 and 3),
  impact_economie_locale smallint check (impact_economie_locale between 1 and 3),
  pourquoi               text,
  point_vigilance        text,
  credits                text,
  source                 text,
  statut                 referentiel.statut_solution not null default 'brouillon',
  propose_par            uuid references auth.users on delete set null default auth.uid(),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint publiee_complete check (statut <> 'publiee' or (
    description_courte is not null and niveau_techno is not null and mise_en_place is not null
    and impact_ecologie is not null and impact_social is not null
    and impact_economie_locale is not null and pourquoi is not null))
);
create index if not exists solution_statut_idx    on referentiel.solution (statut);
create index if not exists solution_categorie_idx on referentiel.solution (categorie_id);

create table if not exists referentiel.solution_type_projet (
  solution_id    uuid     not null references referentiel.solution on delete cascade,
  type_projet_id smallint not null references referentiel.type_projet on delete cascade,
  primary key (solution_id, type_projet_id)
);

-- Étapes de mise en œuvre, numérotées.
create table if not exists referentiel.solution_etape (
  id          bigint generated always as identity primary key,
  solution_id uuid not null references referentiel.solution on delete cascade,
  ordre       smallint not null,
  texte       text not null,
  unique (solution_id, ordre)
);

-- Ressources et coûts. Tous les montants sont facultatifs : jamais de valeur inventée.
create table if not exists referentiel.solution_ressource (
  id                    bigint generated always as identity primary key,
  solution_id           uuid not null references referentiel.solution on delete cascade,
  nom                   text not null,
  cout_installation_min numeric,
  cout_installation_max numeric,
  cout_entretien_min    numeric,
  cout_entretien_max    numeric,
  unite                 text,
  check (cout_installation_min is null or cout_installation_max is null or cout_installation_min <= cout_installation_max),
  check (cout_entretien_min    is null or cout_entretien_max    is null or cout_entretien_min    <= cout_entretien_max)
);
create index if not exists solution_ressource_solution_idx on referentiel.solution_ressource (solution_id);

-- « Oups » : un problème fréquent et la façon de le rattraper.
create table if not exists referentiel.solution_oups (
  id          bigint generated always as identity primary key,
  solution_id uuid not null references referentiel.solution on delete cascade,
  ordre       smallint not null default 0,
  probleme    text not null,
  rattrapage  text not null
);
create index if not exists solution_oups_solution_idx on referentiel.solution_oups (solution_id);

-- Lien entre deux solutions qui vont bien ensemble (lu dans les deux sens par la vue).
create table if not exists referentiel.solution_complementaire (
  solution_id       uuid not null references referentiel.solution on delete cascade,
  complementaire_id uuid not null references referentiel.solution on delete cascade,
  primary key (solution_id, complementaire_id),
  check (solution_id <> complementaire_id)
);

-- Qui siège au conseil régénératif (seul à pouvoir publier). Géré depuis le SQL Editor :
--   insert into referentiel.conseil_membre (user_id) select id from auth.users where email = '...';
create table if not exists referentiel.conseil_membre (
  user_id uuid primary key references auth.users on delete cascade
);

create or replace function referentiel.est_conseil() returns boolean
language sql stable security definer set search_path = referentiel, pg_temp as $$
  select exists (select 1 from referentiel.conseil_membre where user_id = auth.uid());
$$;

-- Slug lisible depuis un titre : minuscules, sans accents, tirets.
create or replace function referentiel.slugifier(t text) returns text
language sql immutable as $$
  select trim(both '-' from regexp_replace(
    translate(replace(replace(lower(coalesce(t, '')), 'œ', 'oe'), 'æ', 'ae'),
              'àâäáãåçéèêëíìîïñóòôöõúùûüýÿ', 'aaaaaaceeeeiiiinooooouuuuyy'),
    '[^a-z0-9]+', '-', 'g'));
$$;

-- Avant insertion : cinq propositions par jour au plus par personne, et un slug.
-- Slug fourni : il est gardé tel quel (la contrainte d'unicité tranche, ce qui laisse « on conflict (slug) »
-- fonctionner pour rejouer le jeu de démo). Slug absent : fabriqué depuis le titre, avec un suffixe s'il est pris.
create or replace function referentiel.solution_avant_insertion() returns trigger
language plpgsql security definer set search_path = referentiel, pg_temp as $$
declare base text; essai text; n int := 1;
begin
  if auth.uid() is not null and not referentiel.est_conseil() then
    if (select count(*) from referentiel.solution
        where propose_par = auth.uid() and created_at > now() - interval '1 day') >= 5 then
      raise exception 'Cinq propositions par jour au plus. Reviens demain.' using errcode = 'P0001';
    end if;
  end if;
  if nullif(new.slug, '') is not null then
    new.slug := referentiel.slugifier(new.slug);
    if new.slug <> '' then return new; end if;
  end if;
  base := referentiel.slugifier(new.titre);
  if base = '' then base := 'solution'; end if;
  essai := base;
  while exists (select 1 from referentiel.solution where slug = essai) loop
    n := n + 1; essai := base || '-' || n;
  end loop;
  new.slug := essai;
  return new;
end $$;
drop trigger if exists solution_avant_insertion on referentiel.solution;
create trigger solution_avant_insertion before insert on referentiel.solution
  for each row execute function referentiel.solution_avant_insertion();

create or replace function referentiel.toucher_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at := now(); return new; end $$;
drop trigger if exists solution_updated_at on referentiel.solution;
create trigger solution_updated_at before update on referentiel.solution
  for each row execute function referentiel.toucher_updated_at();
