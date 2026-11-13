-- Le Commun d'EVAD : droits et règles RLS.
-- Lecture publique des solutions publiées ; écriture réservée aux personnes connectées
-- (elles proposent) et au conseil régénératif (il valide et publie).

grant usage on schema referentiel to anon, authenticated;
grant select on all tables in schema referentiel to anon, authenticated;
grant insert, update, delete on all tables in schema referentiel to authenticated;
grant usage, select on all sequences in schema referentiel to authenticated;
grant execute on function referentiel.est_conseil() to anon, authenticated;

alter table referentiel.categorie               enable row level security;
alter table referentiel.type_projet             enable row level security;
alter table referentiel.solution                enable row level security;
alter table referentiel.solution_type_projet    enable row level security;
alter table referentiel.solution_etape          enable row level security;
alter table referentiel.solution_ressource      enable row level security;
alter table referentiel.solution_oups           enable row level security;
alter table referentiel.solution_complementaire enable row level security;
alter table referentiel.conseil_membre          enable row level security;

-- Listes de référence : lisibles par tous, modifiables par le conseil.
drop policy if exists categorie_lecture on referentiel.categorie;
create policy categorie_lecture on referentiel.categorie for select using (true);
drop policy if exists categorie_conseil on referentiel.categorie;
create policy categorie_conseil on referentiel.categorie for all to authenticated
  using (referentiel.est_conseil()) with check (referentiel.est_conseil());

drop policy if exists type_projet_lecture on referentiel.type_projet;
create policy type_projet_lecture on referentiel.type_projet for select using (true);
drop policy if exists type_projet_conseil on referentiel.type_projet;
create policy type_projet_conseil on referentiel.type_projet for all to authenticated
  using (referentiel.est_conseil()) with check (referentiel.est_conseil());

-- Solutions : tout le monde lit les publiées ; chacun relit ses propositions ; le conseil lit tout.
drop policy if exists solution_lecture on referentiel.solution;
create policy solution_lecture on referentiel.solution for select
  using (statut = 'publiee' or propose_par = auth.uid() or referentiel.est_conseil());

-- Proposer : une personne connectée insère une solution en son nom, forcément « proposee ».
drop policy if exists solution_proposer on referentiel.solution;
create policy solution_proposer on referentiel.solution for insert to authenticated
  with check ((propose_par = auth.uid() and statut = 'proposee') or referentiel.est_conseil());

-- Modifier, publier, supprimer : le conseil régénératif seulement.
drop policy if exists solution_conseil_maj on referentiel.solution;
create policy solution_conseil_maj on referentiel.solution for update to authenticated
  using (referentiel.est_conseil()) with check (referentiel.est_conseil());
drop policy if exists solution_conseil_suppr on referentiel.solution;
create policy solution_conseil_suppr on referentiel.solution for delete to authenticated
  using (referentiel.est_conseil());

-- Tables filles : visibles si la solution parente l'est (la règle de solution s'applique dans la sous-requête).
-- Les types de projet d'une proposition peuvent être posés par son auteur ; le reste est au conseil.
drop policy if exists stp_lecture on referentiel.solution_type_projet;
create policy stp_lecture on referentiel.solution_type_projet for select
  using (exists (select 1 from referentiel.solution s where s.id = solution_id));
drop policy if exists stp_proposer on referentiel.solution_type_projet;
create policy stp_proposer on referentiel.solution_type_projet for insert to authenticated
  with check (referentiel.est_conseil() or exists (
    select 1 from referentiel.solution s
    where s.id = solution_id and s.propose_par = auth.uid() and s.statut = 'proposee'));
drop policy if exists stp_conseil_maj on referentiel.solution_type_projet;
create policy stp_conseil_maj on referentiel.solution_type_projet for update to authenticated
  using (referentiel.est_conseil()) with check (referentiel.est_conseil());
drop policy if exists stp_conseil_suppr on referentiel.solution_type_projet;
create policy stp_conseil_suppr on referentiel.solution_type_projet for delete to authenticated
  using (referentiel.est_conseil());

do $$
declare t text;
begin
  foreach t in array array['solution_etape', 'solution_ressource', 'solution_oups'] loop
    execute format('drop policy if exists %I on referentiel.%I', t || '_lecture', t);
    execute format('create policy %I on referentiel.%I for select using (exists (select 1 from referentiel.solution s where s.id = solution_id))', t || '_lecture', t);
    execute format('drop policy if exists %I on referentiel.%I', t || '_conseil', t);
    execute format('create policy %I on referentiel.%I for all to authenticated using (referentiel.est_conseil()) with check (referentiel.est_conseil())', t || '_conseil', t);
  end loop;
end $$;

drop policy if exists sc_lecture on referentiel.solution_complementaire;
create policy sc_lecture on referentiel.solution_complementaire for select
  using (exists (select 1 from referentiel.solution s where s.id = solution_id)
     and exists (select 1 from referentiel.solution s where s.id = complementaire_id));
drop policy if exists sc_conseil on referentiel.solution_complementaire;
create policy sc_conseil on referentiel.solution_complementaire for all to authenticated
  using (referentiel.est_conseil()) with check (referentiel.est_conseil());

-- Conseil régénératif : chacun peut seulement savoir s'il en fait partie. Aucune écriture par l'API.
drop policy if exists conseil_soi on referentiel.conseil_membre;
create policy conseil_soi on referentiel.conseil_membre for select to authenticated
  using (user_id = auth.uid());
revoke insert, update, delete on referentiel.conseil_membre from authenticated;
