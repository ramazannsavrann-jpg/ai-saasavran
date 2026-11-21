-- YouTube kanal izinleri (yalnız servis rolü okur/yazar; RLS açık, politika yok).
create table if not exists public.yt_channel_tokens (
  channel text primary key check (channel in ('tr','en')),
  refresh_token text not null,
  updated_at timestamptz not null default now()
);
alter table public.yt_channel_tokens enable row level security;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on public.yt_channel_tokens from anon, authenticated;
  end if;
end $$;
