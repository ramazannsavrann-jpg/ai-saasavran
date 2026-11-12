-- 0030: Geliştirici API'si ve MCP (yapay zekâ ajanları için). Pro ve Business paketlerinde çalışma alanı başına en fazla 5 anahtar.
-- Anahtar yalnız oluşturulurken bir kez gösterilir; veritabanında yalnız SHA-256 özeti tutulur. Salt okunur: markalar ve raporlar.
-- Günlük sınır: anahtar başına 1000 istek.
create or replace function brand_report_json(p_brand uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare b record; lr uuid; res jsonb;
begin
  select * into b from brands where id = p_brand and not is_competitor;
  if not found then return null; end if;
  -- en son biten ölçüm (canlı aramalı varsa o)
  select r.id into lr from runs r where r.brand_id = b.id and r.status = 'done'
   order by (r.measurement_type = 'live_search') desc, coalesce(r.finished_at, r.created_at) desc limit 1;
  select jsonb_build_object(
    'brand', jsonb_build_object('name', b.name, 'sector', b.sector, 'city', b.city, 'country', coalesce(b.country, 'TR')),
    'vis', jsonb_build_object(
      'live_search', coalesce((select jsonb_agg(to_jsonb(v)) from brand_visibility(b.id, 'live_search') v
                                where v.run_id in (select id from runs where brand_id = b.id and status = 'done' and measurement_type = 'live_search' order by coalesce(finished_at, created_at) desc limit 12)), '[]'::jsonb),
      'model_knowledge', coalesce((select jsonb_agg(to_jsonb(v)) from brand_visibility(b.id, 'model_knowledge') v
                                where v.run_id in (select id from runs where brand_id = b.id and status = 'done' and measurement_type = 'model_knowledge' order by coalesce(finished_at, created_at) desc limit 12)), '[]'::jsonb)),
    'latest_run', lr,
    'questions', coalesce((select jsonb_agg(jsonb_build_object('text', q.prompt_text, 'answers', q.answers, 'recommended', q.target_recommended, 'mentioned', q.target_mentioned, 'top_competitor', q.top_competitor) order by q.prompt_text)
                            from run_prompt_results(lr) q), '[]'::jsonb),
    'sources', coalesce((select jsonb_agg(jsonb_build_object('domain', d, 'count', c) order by c desc, d)
                          from (select lower(regexp_replace(split_part(split_part(u, '://', 2), '/', 1), '^www\.', '')) d, count(*) c
                                  from responses r, unnest(r.cited_urls) u where r.run_id = lr group by 1 order by 2 desc, 1 limit 10) x), '[]'::jsonb)
  ) into res;
  return res;
end $$;

-- Paylaşılan rapor ortak rapor fonksiyonunu kullanır (aynı içerik + bağlantının bitiş tarihi)
create or replace function shared_report(p_token uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s record; r jsonb;
begin
  select * into s from report_shares where token = p_token and revoked_at is null and expires_at > now();
  if not found then return null; end if;
  r := brand_report_json(s.brand_id);
  return case when r is null then null else r || jsonb_build_object('expires_at', s.expires_at) end;
end $$;

create table api_keys (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name         text not null check (length(trim(name)) between 1 and 60),
  prefix       text not null,
  key_hash     text not null unique,
  created_by   uuid not null,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz,
  day          date,
  day_count    int not null default 0,
  revoked_at   timestamptz
);
create index on api_keys (workspace_id);
alter table api_keys enable row level security;
create policy api_keys_read on api_keys for select using (is_member(workspace_id, 'admin'));

-- Yeni anahtar (sahip/yönetici). Düz anahtar yalnız bu dönüşte görünür.
create or replace function create_api_key(p_workspace uuid, p_name text) returns text
language plpgsql security definer set search_path = public as $$
declare w record; k text;
begin
  if not is_member(p_workspace, 'admin') then raise exception 'API anahtarı için sahip ya da yönetici olmalısınız'; end if;
  select * into w from workspaces where id = p_workspace;
  if w.kind not in ('business', 'agency') or w.plan not in ('pro', 'agency') then raise exception 'API ve MCP erişimi Pro ve Business paketlerinde var'; end if;
  if (select count(*) from api_keys where workspace_id = p_workspace and revoked_at is null) >= 5 then raise exception 'En fazla 5 etkin anahtar olabilir; birini iptal edin'; end if;
  k := 'aisv_' || replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into api_keys (workspace_id, name, prefix, key_hash, created_by)
    values (p_workspace, trim(p_name), left(k, 12), encode(sha256(convert_to(k, 'UTF8')), 'hex'), auth.uid());
  return k;
end $$;

create or replace function revoke_api_key(p_key uuid) returns void
language plpgsql security definer set search_path = public as $$
declare a record;
begin
  select * into a from api_keys where id = p_key;
  if not found or not is_member(a.workspace_id, 'admin') then raise exception 'Anahtar bulunamadı'; end if;
  update api_keys set revoked_at = now() where id = p_key and revoked_at is null;
end $$;

-- Sunucu (Cloudflare fonksiyonu, service role): anahtar özetinden çalışma alanı. Geçersiz/iptal/paket dışı/günlük sınır: hata kodu.
create or replace function api_auth(p_key_hash text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a record; w record;
begin
  select * into a from api_keys where key_hash = p_key_hash and revoked_at is null for update;
  if not found then return jsonb_build_object('error', 'invalid_key'); end if;
  select * into w from workspaces where id = a.workspace_id;
  if w.plan not in ('pro', 'agency') then return jsonb_build_object('error', 'plan'); end if;
  if a.day = current_date and a.day_count >= 1000 then return jsonb_build_object('error', 'rate_limit'); end if;
  update api_keys set last_used_at = now(),
         day_count = case when day = current_date then day_count + 1 else 1 end, day = current_date
   where id = a.id;
  return jsonb_build_object('workspace_id', w.id, 'workspace', w.name);
end $$;

create or replace function api_brands(p_workspace uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', b.id, 'name', b.name, 'sector', b.sector, 'city', b.city, 'country', coalesce(b.country, 'TR'),
           'last_measured_at', (select max(coalesce(r.finished_at, r.created_at)) from runs r where r.brand_id = b.id and r.status = 'done')) order by b.created_at), '[]'::jsonb)
    from brands b where b.workspace_id = p_workspace and not b.is_competitor;
$$;

create or replace function api_brand_report(p_workspace uuid, p_brand uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from brands where id = p_brand and workspace_id = p_workspace and not is_competitor) then return null; end if;
  return brand_report_json(p_brand);
end $$;

do $$
declare f text;
begin
  foreach f in array array['brand_report_json(uuid)', 'shared_report(uuid)', 'api_auth(text)', 'api_brands(uuid)', 'api_brand_report(uuid, uuid)'] loop
    execute format('revoke all on function %s from public', f);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke all on function %s from anon, authenticated', f);
      execute format('grant execute on function %s to service_role', f);
    end if;
  end loop;
  foreach f in array array['create_api_key(uuid, text)', 'revoke_api_key(uuid)'] loop
    execute format('revoke all on function %s from public', f);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke all on function %s from anon', f);
      execute format('grant execute on function %s to authenticated', f);
    end if;
  end loop;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on api_keys from anon;
    revoke insert, update, delete on api_keys from authenticated;
    revoke select on api_keys from authenticated;
    grant select (id, workspace_id, name, prefix, created_by, created_at, last_used_at, day, day_count, revoked_at) on api_keys to authenticated;
  end if;
end $$;
