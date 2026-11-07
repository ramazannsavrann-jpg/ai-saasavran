-- 0010: Üye olmadan ücretsiz kontrol (sitedeki /check/). Kötüye kullanıma karşı: kişi (IP özeti) başına 30 günde 2 kontrol,
-- günde en fazla 80 kontrol, ve ortak Gemini ücretsiz günlük tavanından (provider_daily_usage) pay düşülür.
-- Yalnız sunucu (Cloudflare Function, service role) erişir; IP'nin kendisi değil, gizli tuzla özeti saklanır.
create table free_checks (
  id          uuid primary key default gen_random_uuid(),
  ip_hash     text not null,
  lang        text not null check (lang in ('en', 'tr')),
  brand       text not null check (length(brand) between 1 and 80),
  category    text not null check (length(category) between 1 and 80),
  city        text check (length(city) <= 80),
  total       int,
  mentioned   int,
  recommended int,
  created_at  timestamptz not null default now()
);
create index free_checks_ip on free_checks (ip_hash, created_at);
alter table free_checks enable row level security; -- politika yok: istemciye kapalı

create or replace function reserve_free_check(
  p_ip_hash text, p_lang text, p_brand text, p_category text, p_city text, p_calls int, p_daily_limit int
) returns text language plpgsql security definer set search_path = public as $$
declare used int; new_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('free_check'));
  if (select count(*) from free_checks where ip_hash = p_ip_hash and created_at > now() - interval '30 days') >= 2 then
    return 'person_limit';
  end if;
  if (select count(*) from free_checks where created_at >= current_date) >= 80 then return 'daily_limit'; end if;
  insert into provider_daily_usage(provider, day, calls) values ('gemini', current_date, 0) on conflict do nothing;
  update provider_daily_usage set calls = calls + p_calls
   where provider = 'gemini' and day = current_date and calls + p_calls <= p_daily_limit
   returning calls into used;
  if used is null then return 'daily_limit'; end if;
  insert into free_checks (ip_hash, lang, brand, category, city) values (p_ip_hash, p_lang, p_brand, p_category, nullif(p_city, ''))
    returning id into new_id;
  return 'ok:' || new_id;
end $$;

create or replace function finish_free_check(p_id uuid, p_total int, p_mentioned int, p_recommended int) returns void
language sql security definer set search_path = public as $$
  update free_checks set total = p_total, mentioned = p_mentioned, recommended = p_recommended where id = p_id;
$$;

revoke all on function reserve_free_check(text, text, text, text, text, int, int) from public;
revoke all on function finish_free_check(uuid, int, int, int) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function reserve_free_check(text, text, text, text, text, int, int) from anon, authenticated;
    revoke all on function finish_free_check(uuid, int, int, int) from anon, authenticated;
  end if;
end $$;
