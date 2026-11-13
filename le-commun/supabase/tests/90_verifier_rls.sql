-- Vérification des règles RLS du Commun, à lancer après les migrations et le jeu de démo
-- sur la base locale d'essai (psql -qAt -f ..., ou PGlite). Chaque ligne affiche « ok » ou « ECHEC ».
insert into referentiel.conseil_membre (user_id) values ('00000000-0000-0000-0000-00000000000c') on conflict do nothing;

-- petit outil d'essai, dans un schéma à part, retiré à la fin
create schema if not exists essai;
create or replace function essai.verifier(nom text, requete text, attendu text) returns text language plpgsql as $$
declare obtenu text;
begin
  begin execute requete into obtenu; exception when others then obtenu := 'refus'; end;
  return case when obtenu is not distinct from attendu then 'ok     ' else 'ECHEC  ' end || nom || ' (obtenu : ' || coalesce(obtenu, 'null') || ', attendu : ' || attendu || ')';
end $$;
grant usage on schema essai to anon, authenticated;
grant execute on function essai.verifier(text, text, text) to anon, authenticated;

-- ===== visiteur anonyme =====
begin; set local role anon;
select essai.verifier('anonyme : voit les 20 solutions publiées', 'select count(*)::text from referentiel.solution_carte', '20');
select essai.verifier('anonyme : voit catégories', 'select count(*)::text from referentiel.categorie', '7');
select essai.verifier('anonyme : voit les étapes des fiches publiées', 'select (count(*) > 50)::text from referentiel.solution_etape', 'true');
select essai.verifier('anonyme : ne peut pas proposer', $q$insert into referentiel.solution (titre, categorie_id, statut) values ('Essai anonyme', 1, 'proposee') returning 'insere'$q$, 'refus');
select essai.verifier('anonyme : ne peut pas modifier', $q$with m as (update referentiel.solution set titre = 'Pirate' where slug = 'compost' returning 1) select count(*)::text from m$q$, 'refus');
select essai.verifier('anonyme : ne voit pas le conseil', 'select count(*)::text from referentiel.conseil_membre', '0');
select essai.verifier('complémentaires lues dans les deux sens (mare <-> recup-eau)', $q$select count(*)::text from referentiel.solution_complementaire_v v join referentiel.solution s on s.id = v.solution_id where s.slug = 'mare' and v.slug = 'recup-eau'$q$, '1');
rollback;

-- ===== Alice, connectée, propose =====
begin; set local role authenticated; select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', true);
select essai.verifier('connectée : propose une solution', $q$insert into referentiel.solution (titre, categorie_id, description_courte, statut) values ('Bancs en palettes de réemploi', 1, 'Des bancs faits de palettes.', 'proposee') returning slug$q$, 'bancs-en-palettes-de-reemploi');
select essai.verifier('connectée : relit sa proposition', $q$select statut::text from referentiel.solution where slug = 'bancs-en-palettes-de-reemploi'$q$, 'proposee');
select essai.verifier('connectée : pose les types de sa proposition', $q$with i as (insert into referentiel.solution_type_projet (solution_id, type_projet_id) select id, 1 from referentiel.solution where slug = 'bancs-en-palettes-de-reemploi' returning 1) select count(*)::text from i$q$, '1');
select essai.verifier('connectée : ne peut pas publier directement', $q$insert into referentiel.solution (titre, categorie_id, statut) values ('Publication sauvage', 1, 'publiee') returning 'insere'$q$, 'refus');
select essai.verifier('connectée : ne peut pas proposer au nom d''un autre', $q$insert into referentiel.solution (titre, categorie_id, statut, propose_par) values ('Usurpation', 1, 'proposee', '00000000-0000-0000-0000-00000000000b') returning 'insere'$q$, 'refus');
select essai.verifier('connectée : ne peut pas publier sa proposition', $q$with m as (update referentiel.solution set statut = 'publiee' where slug = 'bancs-en-palettes-de-reemploi' returning 1) select count(*)::text from m$q$, '0');
select essai.verifier('connectée : ne peut pas modifier une fiche publiée', $q$with m as (update referentiel.solution set titre = 'Pirate' where slug = 'compost' returning 1) select count(*)::text from m$q$, '0');
select essai.verifier('connectée : ne peut pas toucher aux types d''une fiche publiée', $q$insert into referentiel.solution_type_projet (solution_id, type_projet_id) select id, 4 from referentiel.solution where slug = 'mare' returning 'insere'$q$, 'refus');
select essai.verifier('slug unique : un doublon de titre reçoit un suffixe', $q$insert into referentiel.solution (titre, categorie_id, statut) values ('Compost', 1, 'proposee') returning slug$q$, 'compost-2');
select essai.verifier('3e, 4e, 5e propositions du jour', $q$with i as (insert into referentiel.solution (titre, categorie_id, statut) values ('Essai trois', 1, 'proposee'), ('Essai quatre', 1, 'proposee'), ('Essai cinq', 1, 'proposee') returning 1) select count(*)::text from i$q$, '3');
select essai.verifier('6e proposition du jour refusée', $q$insert into referentiel.solution (titre, categorie_id, statut) values ('Essai six', 1, 'proposee') returning 'insere'$q$, 'refus');
commit;

-- ===== Bruno et l'anonyme ne voient pas la proposition d'Alice =====
begin; set local role authenticated; select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', true);
select essai.verifier('autre connecté : ne voit pas la proposition d''Alice', $q$select count(*)::text from referentiel.solution where slug = 'bancs-en-palettes-de-reemploi'$q$, '0');
select essai.verifier('autre connecté : ne voit pas ses types', $q$select count(*)::text from referentiel.solution_type_projet st join referentiel.solution s on s.id = st.solution_id where s.slug = 'bancs-en-palettes-de-reemploi'$q$, '0');
rollback;
begin; set local role anon;
select essai.verifier('anonyme : la proposition reste invisible', $q$select count(*)::text from referentiel.solution where statut <> 'publiee'$q$, '0');
select essai.verifier('anonyme : la liste reste à 20', 'select count(*)::text from referentiel.solution_carte', '20');
rollback;

-- ===== le conseil régénératif valide =====
begin; set local role authenticated; select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', true);
select essai.verifier('conseil : voit les propositions', $q$select (count(*) >= 5)::text from referentiel.solution where statut = 'proposee'$q$, 'true');
select essai.verifier('conseil : ne peut pas publier une fiche incomplète', $q$update referentiel.solution set statut = 'publiee' where slug = 'bancs-en-palettes-de-reemploi' returning 'publiee'$q$, 'refus');
select essai.verifier('conseil : complète puis publie', $q$update referentiel.solution set niveau_techno = 'low', mise_en_place = 'Un week-end', impact_ecologie = 2, impact_social = 2, impact_economie_locale = 1, pourquoi = 'Réemployer des palettes.', statut = 'publiee' where slug = 'bancs-en-palettes-de-reemploi' returning statut::text$q$, 'publiee');
select essai.verifier('conseil : ajoute une étape', $q$with i as (insert into referentiel.solution_etape (solution_id, ordre, texte) select id, 1, 'Récupérer des palettes saines.' from referentiel.solution where slug = 'bancs-en-palettes-de-reemploi' returning 1) select count(*)::text from i$q$, '1');
commit;
begin; set local role anon;
select essai.verifier('anonyme : la fiche validée apparaît (21 solutions)', 'select count(*)::text from referentiel.solution_carte', '21');
select essai.verifier('anonyme : avec son type de projet', $q$select array_to_string(types, ',') from referentiel.solution_carte where slug = 'bancs-en-palettes-de-reemploi'$q$, 'jardin-partage');
rollback;

drop schema essai cascade;
