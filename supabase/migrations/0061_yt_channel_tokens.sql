-- YouTube kanal izinleri (yalnız servis rolü okur/yazar; RLS açık, politika yok).
create table if not exists public.yt_channel_tokens (
  channel text primary key check (channel in ('tr','en')),
  refresh_token text not null,
  updated_at timestamptz not null default now()
);
alter table public.yt_channel_tokens enable row level security;
revoke all on public.yt_channel_tokens from anon, authenticated;
