-- Pour tester les migrations sur un PostgreSQL local : imite ce que Supabase fournit
-- (rôles anon et authenticated, schéma auth, fonction auth.uid()). Ne jamais exécuter sur Supabase.
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@exemple.test'),
  ('00000000-0000-0000-0000-00000000000b', 'bruno@exemple.test'),
  ('00000000-0000-0000-0000-00000000000c', 'conseil@exemple.test');
