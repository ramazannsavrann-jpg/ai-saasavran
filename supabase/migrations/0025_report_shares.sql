-- 0025: Paylaşılabilir rapor bağlantısı. Marka sahibi (editör ve üstü) salt okunur bir bağlantı üretir;
-- bağlantıyı bilen herkes giriş yapmadan raporu görür (en fazla 90 gün, istenince iptal edilir).
-- Raporda: marka, son ölçümlerin sayıları, rakip karşılaştırması, sorular ve kaynak alan adları. Cevap metinleri yok.
create table report_shares (
  id           uuid primary key default gen_random_uuid(),
  token        uuid not null unique default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  brand_id     uuid not null references brands(id) on delete cascade,
  created_by   uuid not null,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  revoked_at   timestamptz
);
create index on report_shares (brand_id);
alter table report_shares enable row level security;
create policy report_shares_read on report_shares for select using (is_member(workspace_id));

create or replace function create_report_share(p_brand uuid, p_days int default 30) returns uuid
language plpgsql security definer set search_path = public as $$
declare b record; t uuid;
begin
  select * into b from brands where id = p_brand and not is_competitor;
  if not found then raise exception 'Marka bulunamadı'; end if;
  if not is_member(b.workspace_id, 'editor') then raise exception 'Yetki yok'; end if;
  if b.data_origin = 'simulated' then raise exception 'Demo (simüle) marka için paylaşım bağlantısı üretilmez'; end if;
  if p_days not between 1 and 90 then raise exception 'Süre 1 ile 90 gün arasında olmalı'; end if;
  if (select count(*) from report_shares s where s.brand_id = p_brand and s.revoked_at is null and s.expires_at > now()) >= 10 then
    raise exception 'Bu marka için en fazla 10 etkin bağlantı olabilir; eskilerden birini iptal edin';
  end if;
  insert into report_shares (workspace_id, brand_id, created_by, expires_at)
    values (b.workspace_id, p_brand, auth.uid(), now() + make_interval(days => p_days)) returning token into t;
  return t;
end $$;

create or replace function revoke_report_share(p_share uuid) returns void
language plpgsql security definer set search_path = public as $$
declare s record;
begin
  select * into s from report_shares where id = p_share;
  if not found then raise exception 'Bağlantı bulunamadı'; end if;
  if not is_member(s.workspace_id, 'editor') then raise exception 'Yetki yok'; end if;
  update report_shares set revoked_at = now() where id = p_share and revoked_at is null;
end $$;

-- Herkese açık rapor verisi (yalnız sunucu: Cloudflare fonksiyonu, service role). Geçersiz/iptal/süresi dolmuş: null.
create or replace function shared_report(p_token uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s record; b record; lr uuid; res jsonb;
begin
  select * into s from report_shares where token = p_token and revoked_at is null and expires_at > now();
  if not found then return null; end if;
  select * into b from brands where id = s.brand_id;
  -- en son biten ölçüm (canlı aramalı varsa o)
  select r.id into lr from runs r where r.brand_id = b.id and r.status = 'done'
   order by (r.measurement_type = 'live_search') desc, coalesce(r.finished_at, r.created_at) desc limit 1;
  select jsonb_build_object(
    'brand', jsonb_build_object('name', b.name, 'sector', b.sector, 'city', b.city, 'country', coalesce(b.country, 'TR')),
    'expires_at', s.expires_at,
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

revoke all on function create_report_share(uuid, int) from public;
revoke all on function revoke_report_share(uuid) from public;
revoke all on function shared_report(uuid) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function create_report_share(uuid, int) from anon;
    revoke all on function revoke_report_share(uuid) from anon;
    grant execute on function create_report_share(uuid, int) to authenticated;
    grant execute on function revoke_report_share(uuid) to authenticated;
    revoke all on function shared_report(uuid) from anon, authenticated;
    grant execute on function shared_report(uuid) to service_role;
    revoke all on report_shares from anon;
    revoke insert, update, delete on report_shares from authenticated;
  end if;
end $$;
