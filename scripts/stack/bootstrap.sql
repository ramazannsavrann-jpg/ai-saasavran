-- Supabase bulut ortamındaki rolleri ve varsayılan yetkileri yerel/CI test ortamında taklit eder.
-- Bu dosya yalnızca test ortamı içindir; Supabase bulutta bu roller zaten vardır.

create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
create role authenticator login password 'devpass' noinherit;
grant anon, authenticated, service_role to authenticator;

create role supabase_auth_admin login password 'devpass' createrole noinherit;
create schema auth authorization supabase_auth_admin;
alter role supabase_auth_admin set search_path = auth;
grant usage on schema auth to anon, authenticated, service_role;

-- Supabase'in varsayılanı: public şemadaki her şey bu rollere açıktır, koruma RLS ile sağlanır.
-- Testleri bulutla aynı (ve en riskli) varsayılanlarla çalıştırmak için birebir kopyalanır.
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
