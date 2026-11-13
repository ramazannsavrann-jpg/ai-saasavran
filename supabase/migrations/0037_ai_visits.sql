-- 0037: Yapay zekâdan gelen ziyaretçi. Müşteri sitesine tek satır kod ekler; kod yalnız ziyaretçi bir yapay zekâ
-- asistanından geldiyse (referrer veya utm_source) bildirir. IP, çerez ve kişisel veri tutulmaz: yalnız gün × kaynak × sayfa sayacı.
alter table brands add column track_key uuid not null default gen_random_uuid();
create unique index brands_track_key on brands (track_key);

create table ai_visits (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  brand_id     uuid not null references brands(id) on delete cascade,
  day          date not null,
  source       text not null check (source in ('chatgpt', 'perplexity', 'gemini', 'claude', 'copilot', 'deepseek', 'grok', 'meta', 'other_ai')),
  path         text not null check (length(path) between 1 and 200),
  visits       int not null default 0 check (visits >= 0),
  primary key (brand_id, day, source, path)
);
alter table ai_visits enable row level security;
create policy ai_visits_read on ai_visits for select using (is_member(workspace_id));

-- Sunucu (Cloudflare fonksiyonu): bir ziyareti sayar. Kötüye kullanım sınırları: marka başına günde en fazla 20.000 ziyaret,
-- 300 farklı sayfa (fazlası "(diğer)" altında). Kaynak sitesi markanın sitesiyle eşleşmiyorsa sayılmaz.
create or replace function record_ai_visit(p_key uuid, p_source text, p_path text, p_host text)
returns boolean language plpgsql security definer set search_path = public as $$
declare b record; d date := (now() at time zone 'Europe/Istanbul')::date; site text; v_path text := left(coalesce(nullif(p_path, ''), '/'), 200);
begin
  select id, workspace_id, website into b from brands where track_key = p_key and not is_competitor;
  if not found then return false; end if;
  if p_source not in ('chatgpt', 'perplexity', 'gemini', 'claude', 'copilot', 'deepseek', 'grok', 'meta', 'other_ai') then return false; end if;
  if b.website is not null then
    site := lower(regexp_replace(regexp_replace(b.website, '^https?://', ''), '^www\.|/.*$', '', 'g'));
    if site <> '' and not (lower(coalesce(p_host, '')) = site or lower(coalesce(p_host, '')) like '%.' || site or lower(coalesce(p_host, '')) = 'www.' || site) then return false; end if;
  end if;
  if (select coalesce(sum(visits), 0) from ai_visits where brand_id = b.id and day = d) >= 20000 then return false; end if;
  if not exists (select 1 from ai_visits where brand_id = b.id and day = d and ai_visits.path = v_path)
     and (select count(distinct v.path) from ai_visits v where v.brand_id = b.id and v.day = d) >= 300 then
    v_path := '(diğer)';
  end if;
  insert into ai_visits (workspace_id, brand_id, day, source, path, visits) values (b.workspace_id, b.id, d, p_source, v_path, 1)
  on conflict (brand_id, day, source, path) do update set visits = ai_visits.visits + 1;
  return true;
end $$;

do $$
begin
  revoke all on function record_ai_visit(uuid, text, text, text) from public;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function record_ai_visit(uuid, text, text, text) from anon, authenticated;
    grant execute on function record_ai_visit(uuid, text, text, text) to service_role;
    revoke all on ai_visits from anon;
  end if;
end $$;
