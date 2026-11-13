-- 0038: Yapay zekâ botları. Kendi sitemizde Cloudflare ara katmanı, müşteri sitelerinde WordPress eklentisi veya Cloudflare kodu
-- bot isteklerini bildirir. Saklanan: gün × bot × sayfa sayacı, IP doğrulamasından geçen ve hata (4xx/5xx) alan istek sayısı.
-- IP adresi saklanmaz (yalnız doğrulamada kullanılır).
create table ai_bot_hits (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  brand_id     uuid not null references brands(id) on delete cascade,
  day          date not null,
  bot          text not null check (length(bot) between 2 and 40),
  path         text not null check (length(path) between 1 and 200),
  hits         int not null default 0 check (hits >= 0),
  verified     int not null default 0 check (verified >= 0),
  errors       int not null default 0 check (errors >= 0),
  primary key (brand_id, day, bot, path)
);
alter table ai_bot_hits enable row level security;
create policy ai_bot_hits_read on ai_bot_hits for select using (is_member(workspace_id));

create or replace function record_ai_bot(p_key uuid, p_bot text, p_path text, p_status int, p_verified boolean)
returns boolean language plpgsql security definer set search_path = public as $$
declare b record; d date := (now() at time zone 'Europe/Istanbul')::date; v_path text := left(coalesce(nullif(p_path, ''), '/'), 200);
begin
  select id, workspace_id into b from brands where track_key = p_key and not is_competitor;
  if not found or p_bot !~ '^[A-Za-z0-9._-]{2,40}$' then return false; end if;
  if (select coalesce(sum(hits), 0) from ai_bot_hits where brand_id = b.id and day = d) >= 50000 then return false; end if;
  if not exists (select 1 from ai_bot_hits h where h.brand_id = b.id and h.day = d and h.path = v_path)
     and (select count(distinct h.path) from ai_bot_hits h where h.brand_id = b.id and h.day = d) >= 500 then
    v_path := '(diğer)';
  end if;
  insert into ai_bot_hits (workspace_id, brand_id, day, bot, path, hits, verified, errors)
  values (b.workspace_id, b.id, d, p_bot, v_path, 1, case when p_verified then 1 else 0 end, case when coalesce(p_status, 200) >= 400 then 1 else 0 end)
  on conflict (brand_id, day, bot, path) do update set hits = ai_bot_hits.hits + 1,
    verified = ai_bot_hits.verified + excluded.verified, errors = ai_bot_hits.errors + excluded.errors;
  return true;
end $$;

do $$
begin
  revoke all on function record_ai_bot(uuid, text, text, int, boolean) from public;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function record_ai_bot(uuid, text, text, int, boolean) from anon, authenticated;
    grant execute on function record_ai_bot(uuid, text, text, int, boolean) to service_role;
    revoke all on ai_bot_hits from anon;
  end if;
end $$;
