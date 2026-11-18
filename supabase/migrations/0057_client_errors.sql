-- Panel hata kaydı (18 Kasım): beyaz ekran yerine hata yakalanır ve buraya yazılır.
-- Giriş yapmış kullanıcı yalnız kendi adına ekleyebilir; kimse okuyamaz (yalnız servis rolü / yönetici SQL ile).
create table if not exists client_errors (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid default auth.uid(),
  kind text not null check (char_length(kind) <= 20),
  path text check (char_length(path) <= 200),
  message text check (char_length(message) <= 500),
  stack text check (char_length(stack) <= 2000),
  user_agent text check (char_length(user_agent) <= 300)
);
create index if not exists client_errors_created_idx on client_errors (created_at desc);
create index if not exists client_errors_user_idx on client_errors (user_id);
alter table client_errors enable row level security;
drop policy if exists client_errors_insert on client_errors;
create policy client_errors_insert on client_errors for insert
  with check (auth.uid() is not null and user_id = auth.uid());
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on client_errors from anon, authenticated;
    grant insert (kind, path, message, stack, user_agent) on client_errors to authenticated;
  end if;
end $$;
