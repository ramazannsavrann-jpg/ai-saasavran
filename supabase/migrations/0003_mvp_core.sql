-- AI SaaSavran — 0003: MVP çekirdeği
--  * Ölçüm türleri ayrı veri türü: live_search / model_knowledge / simulated
--  * API hata sınıfları
--  * Demo Lab'in gerçek müşterilerden tam ayrımı (platform yöneticisi + iki yönlü veri koruması)
--  * Paket limitleri (marka, rakip, soru)
--  * Arayüzün kullandığı güvenli RPC'ler; istemcinin doğrudan yazamayacağı alanlar
--  * GÜVENLİK DÜZELTMELERİ: workspace güncelleme politikası paket/durum değiştirmeye izin veriyordu;
--    Supabase varsayılan fonksiyon yetkileri sunucu fonksiyonlarını istemciye açıyordu.

-- =========================================================
-- 1) Ölçüm türü
-- =========================================================
create type measurement_type as enum ('live_search', 'model_knowledge', 'simulated');

alter table runs add column measurement_type measurement_type;
alter table runs add column provider text;
alter table runs add column model text;
update runs set measurement_type = case when data_origin = 'simulated' then 'simulated' else 'model_knowledge' end::measurement_type;
alter table runs alter column measurement_type set not null;
alter table runs add constraint runs_type_origin check ((measurement_type = 'simulated') = (data_origin = 'simulated'));

alter table responses add column measurement_type measurement_type;
update responses set measurement_type = case
  when data_origin = 'simulated' then 'simulated'
  when method = 'api_with_search' then 'live_search'
  else 'model_knowledge' end::measurement_type;
alter table responses alter column measurement_type set not null;
alter table responses add constraint responses_type_consistent check (
  (measurement_type = 'simulated'       and data_origin = 'simulated' and method = 'simulation') or
  (measurement_type = 'live_search'     and data_origin = 'live_api'  and method = 'api_with_search') or
  (measurement_type = 'model_knowledge' and data_origin = 'live_api'  and method = 'api_no_search')
);

-- Platform ayarı: canlı arama kapalı. Açmak bilinçli bir veritabanı değişikliği gerektirir.
create table app_settings (
  id                  boolean primary key default true check (id),
  live_search_enabled boolean not null default false,
  updated_at          timestamptz not null default now()
);
insert into app_settings default values;
alter table app_settings enable row level security;
create policy app_settings_read on app_settings for select using (true);

-- =========================================================
-- 2) API hata sınıfları ve run sonucu
-- =========================================================
create type api_error_class as enum (
  'unsupported_feature', 'quota_exceeded', 'auth_error', 'model_not_found', 'transient', 'invalid_request'
);
alter table runs add column stop_reason text;
alter table runs add column error_class api_error_class;
alter table runs add column calls_ok int not null default 0;
alter table runs add column calls_failed int not null default 0;
alter table runs add column prompts_total int not null default 0;
alter table cost_ledger add column error_class api_error_class;

-- =========================================================
-- 3) Demo Lab ayrımı
-- =========================================================
create table platform_admins (user_id uuid primary key, created_at timestamptz not null default now());
alter table platform_admins enable row level security; -- politika yok: yalnızca sunucu

create or replace function is_platform_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from platform_admins where user_id = auth.uid());
$$;

-- İki yönlü koruma: demo'ya yalnızca simüle, gerçek müşteriye yalnızca gerçek veri.
create or replace function guard_simulated() returns trigger language plpgsql as $$
declare k workspace_kind;
begin
  select kind into k from workspaces where id = new.workspace_id;
  if new.data_origin = 'simulated' and k <> 'demo_lab' then
    raise exception 'Simüle veri yalnızca demo_lab workspace''ine yazılabilir';
  end if;
  if new.data_origin <> 'simulated' and k = 'demo_lab' then
    raise exception 'Demo Lab''e gerçek veri yazılamaz';
  end if;
  return new;
end $$;

-- Demo Lab'e yalnızca platform yöneticileri üye olabilir
create or replace function guard_demo_membership() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select kind from workspaces where id = new.workspace_id) = 'demo_lab'
     and not exists (select 1 from platform_admins where user_id = new.user_id) then
    raise exception 'Demo Lab''e yalnızca platform yöneticileri eklenebilir';
  end if;
  return new;
end $$;
create trigger members_demo_guard before insert or update on workspace_members
  for each row execute function guard_demo_membership();

-- =========================================================
-- 4) Güvenlik düzeltmeleri: istemci yazma yetkileri
-- =========================================================
drop policy if exists ws_write on workspaces;      -- paket/durum/bütçe değiştirmeye izin veriyordu
drop policy if exists mem_admin on workspace_members; -- davet akışı gelene kadar üyelik yalnızca RPC ile

create or replace function rename_workspace(p_workspace uuid, p_name text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_member(p_workspace, 'admin') then raise exception 'Yetki yok'; end if;
  if length(trim(p_name)) not between 1 and 120 then raise exception 'Geçersiz ad'; end if;
  update workspaces set name = trim(p_name) where id = p_workspace;
end $$;

-- =========================================================
-- 5) Paket limitleri ve tutarlılık (marka / rakip / soru)
-- =========================================================
create or replace function guard_brand_limits() returns trigger language plpgsql security definer set search_path = public as $$
declare pl record; n int; owner_ws uuid; owner_is_comp boolean;
begin
  select p.* into pl from workspaces w join plans p on p.id = w.plan where w.id = new.workspace_id;
  if new.is_competitor then
    if new.owner_brand_id is null then raise exception 'Rakip bir markaya bağlı olmalı'; end if;
    select workspace_id, is_competitor into owner_ws, owner_is_comp from brands where id = new.owner_brand_id;
    if owner_ws is distinct from new.workspace_id or owner_is_comp then
      raise exception 'Rakip aynı çalışma alanındaki bir ana markaya bağlanmalı';
    end if;
    if tg_op = 'INSERT' then
      select count(*) into n from brands where owner_brand_id = new.owner_brand_id and is_competitor;
      if n >= pl.max_competitors then raise exception 'Paket limiti: en fazla % rakip', pl.max_competitors; end if;
    end if;
  else
    if new.owner_brand_id is not null then raise exception 'Ana marka başka markaya bağlanamaz'; end if;
    if tg_op = 'INSERT' then
      select count(*) into n from brands where workspace_id = new.workspace_id and not is_competitor;
      if n >= pl.max_brands then raise exception 'Paket limiti: en fazla % marka', pl.max_brands; end if;
    end if;
  end if;
  return new;
end $$;
create trigger zz_brands_limits before insert or update on brands for each row execute function guard_brand_limits();

create or replace function guard_prompt_limits() returns trigger language plpgsql security definer set search_path = public as $$
declare pl record; n int; b record;
begin
  select * into b from brands where id = new.brand_id;
  if b.workspace_id is distinct from new.workspace_id or b.is_competitor then
    raise exception 'Soru aynı çalışma alanındaki bir ana markaya ait olmalı';
  end if;
  if length(trim(new.text)) not between 5 and 300 then raise exception 'Soru 5–300 karakter olmalı'; end if;
  if tg_op = 'INSERT' and new.active then
    select p.* into pl from workspaces w join plans p on p.id = w.plan where w.id = new.workspace_id;
    select count(*) into n from prompts where brand_id = new.brand_id and active;
    if n >= pl.max_prompts_per_brand then raise exception 'Paket limiti: marka başına en fazla % aktif soru', pl.max_prompts_per_brand; end if;
  end if;
  return new;
end $$;
create trigger zz_prompts_limits before insert or update on prompts for each row execute function guard_prompt_limits();

-- =========================================================
-- 6) Arayüz RPC'leri (oturum açmış kullanıcı)
-- =========================================================
create or replace function create_workspace(p_name text, p_kind workspace_kind) returns uuid
language plpgsql security definer set search_path = public as $$
declare ws uuid; n int;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  if p_kind not in ('business', 'agency') then raise exception 'Bu çalışma alanı türü oluşturulamaz'; end if;
  if length(trim(p_name)) not between 1 and 120 then raise exception 'Geçersiz ad'; end if;
  select count(*) into n from workspace_members where user_id = auth.uid() and role = 'owner';
  if n >= 5 then raise exception 'En fazla 5 çalışma alanı oluşturulabilir'; end if;
  insert into workspaces (name, kind, plan) values (trim(p_name), p_kind, 'free') returning id into ws;
  insert into workspace_members (workspace_id, user_id, role) values (ws, auth.uid(), 'owner');
  return ws;
end $$;

-- Ölçüm isteği: tür sunucuda belirlenir, istemci seçemez.
create or replace function request_run(p_brand uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare b record; w record; t measurement_type; r uuid; np int; live boolean;
begin
  select * into b from brands where id = p_brand and not is_competitor;
  if not found then raise exception 'Marka bulunamadı'; end if;
  if not is_member(b.workspace_id, 'editor') then raise exception 'Yetki yok'; end if;
  select * into w from workspaces where id = b.workspace_id;
  if w.status = 'paused' then raise exception 'Çalışma alanı durduruldu: %', w.paused_reason; end if;
  select count(*) into np from prompts where brand_id = p_brand and active;
  if np = 0 then raise exception 'Önce en az bir soru ekleyin'; end if;
  if exists (select 1 from runs where brand_id = p_brand and status in ('queued', 'running')) then
    raise exception 'Bu marka için zaten bekleyen bir ölçüm var';
  end if;
  select live_search_enabled into live from app_settings;
  t := case when w.kind = 'demo_lab' then 'simulated'
            when live then 'live_search'
            else 'model_knowledge' end;
  insert into runs (workspace_id, brand_id, status, data_origin, measurement_type, max_cost_usd, prompts_total)
  values (b.workspace_id, p_brand, 'queued',
          case when t = 'simulated' then 'simulated' else 'live_api' end::data_origin,
          t, greatest((select monthly_paid_cap_usd from plans where id = w.plan), 0.01), np)
  returning id into r;
  return r;
end $$;

-- Aylık kullanım özeti (üyeler görebilir; ayrıntılı maliyet defteri yalnızca yöneticiye açık)
create or replace function workspace_usage(p_workspace uuid) returns table (
  plan_id text, plan_name text, status ws_status, paused_reason text,
  engine_calls int, engine_call_limit int, free_calls int, paid_cost_usd numeric, paid_cap_usd numeric,
  brands_used int, brand_limit int, prompt_limit int, competitor_limit int, live_search_enabled boolean
) language sql stable security definer set search_path = public as $$
  select p.id, p.name, w.status, w.paused_reason,
    (select count(*)::int from cost_ledger c where c.workspace_id = w.id and c.task = 'query_engine' and c.created_at >= date_trunc('month', now())),
    p.monthly_engine_calls,
    (select count(*)::int from cost_ledger c where c.workspace_id = w.id and c.task = 'query_engine' and c.billing = 'free' and c.created_at >= date_trunc('month', now())),
    (select coalesce(sum(cost_usd), 0) from cost_ledger c where c.workspace_id = w.id and c.billing = 'paid' and c.created_at >= date_trunc('month', now())),
    p.monthly_paid_cap_usd,
    (select count(*)::int from brands b where b.workspace_id = w.id and not b.is_competitor),
    p.max_brands, p.max_prompts_per_brand, p.max_competitors,
    (select live_search_enabled from app_settings)
  from workspaces w join plans p on p.id = w.plan
  where w.id = p_workspace and is_member(p_workspace);
$$;

-- Görünürlük serisi: her run × sağlayıcı × marka için sayımlar. Tür karıştırılamaz (parametre zorunlu).
create or replace function brand_visibility(p_brand uuid, p_type measurement_type) returns table (
  run_id uuid, run_at timestamptz, provider text, model text,
  brand_id uuid, brand_name text, is_target boolean, n int, mentioned int, recommended int, cited int
) language sql stable security invoker set search_path = public as $$
  select r.id, coalesce(r.finished_at, r.created_at), resp.provider, resp.model,
         b.id, b.name, b.id = p_brand,
         count(*)::int,
         count(*) filter (where m.mentioned)::int,
         count(*) filter (where m.recommended)::int,
         count(*) filter (where m.cited)::int
  from runs r
  join responses resp on resp.run_id = r.id and resp.measurement_type = p_type
  join mentions m on m.response_id = resp.id
  join brands b on b.id = m.brand_id
  where r.brand_id = p_brand and r.status = 'done' and r.measurement_type = p_type
  group by r.id, r.finished_at, r.created_at, resp.provider, resp.model, b.id, b.name
  order by 2, 6;
$$;

-- Soru bazlı sonuç (tek run)
create or replace function run_prompt_results(p_run uuid) returns table (
  prompt_id uuid, prompt_text text, intent prompt_intent, answers int,
  target_mentioned int, target_recommended int, best_rank int, top_competitor text, top_competitor_recs int
) language sql stable security invoker set search_path = public as $$
  with r as (select * from runs where id = p_run),
  resp as (select x.* from responses x join r on x.run_id = r.id),
  agg as (
    select resp.prompt_id, m.brand_id, b.name, b.is_competitor,
           count(*) filter (where m.mentioned) men, count(*) filter (where m.recommended) rec, min(m.rank) best
    from resp join mentions m on m.response_id = resp.id join brands b on b.id = m.brand_id
    group by 1, 2, 3, 4
  )
  select p.id, p.text, p.intent,
    (select count(*)::int from resp where resp.prompt_id = p.id),
    coalesce((select men::int from agg where agg.prompt_id = p.id and not is_competitor), 0),
    coalesce((select rec::int from agg where agg.prompt_id = p.id and not is_competitor), 0),
    (select best::int from agg where agg.prompt_id = p.id and not is_competitor),
    (select name from agg where agg.prompt_id = p.id and is_competitor and rec > 0 order by rec desc, name limit 1),
    coalesce((select max(rec)::int from agg where agg.prompt_id = p.id and is_competitor), 0)
  from prompts p join r on p.brand_id = r.brand_id
  where exists (select 1 from resp where resp.prompt_id = p.id)
  order by p.created_at;
$$;

-- =========================================================
-- 7) Sunucu (worker) RPC'leri
-- =========================================================
create or replace function claim_next_run() returns setof runs
language plpgsql security definer set search_path = public as $$
declare r runs;
begin
  select * into r from runs where status = 'queued' order by created_at for update skip locked limit 1;
  if not found then return; end if;
  update runs set status = 'running', started_at = now() where id = r.id returning * into r;
  return next r;
end $$;

create or replace function finish_run(
  p_run uuid, p_status run_status, p_stop_reason text, p_error_class api_error_class,
  p_error text, p_ok int, p_failed int, p_provider text, p_model text
) returns void language sql security definer set search_path = public as $$
  update runs set status = p_status, stop_reason = p_stop_reason, error_class = p_error_class,
    error = left(p_error, 500), calls_ok = p_ok, calls_failed = p_failed,
    provider = p_provider, model = p_model, finished_at = now()
  where id = p_run;
$$;

-- record_engine_call artık hata sınıfını da kaydeder
drop function record_engine_call(uuid, uuid, text, text, billing_tier, int, int, numeric, numeric, boolean);
create or replace function record_engine_call(
  p_workspace uuid, p_run uuid, p_provider text, p_model text, p_billing billing_tier,
  p_in int, p_out int, p_cost numeric, p_paid_equiv numeric, p_ok boolean, p_error_class api_error_class default null
) returns void language plpgsql security definer set search_path = public as $$
declare paid numeric; cap numeric;
begin
  insert into cost_ledger(workspace_id, run_id, task, provider, model, input_tokens, output_tokens,
                          tool_calls, cost_usd, billing, paid_equivalent_usd, ok, error_class)
  values (p_workspace, p_run, 'query_engine', p_provider, p_model, p_in, p_out, 1,
          case when p_billing = 'free' then 0 else p_cost end, p_billing, p_paid_equiv, p_ok, p_error_class);
  if p_run is not null then
    update runs set cost_usd = cost_usd + case when p_billing = 'free' then 0 else p_cost end where id = p_run;
  end if;
  select coalesce(sum(cost_usd) filter (where billing = 'paid'), 0) into paid
    from cost_ledger where workspace_id = p_workspace and created_at >= date_trunc('month', now());
  select pl.monthly_paid_cap_usd into cap from workspaces w join plans pl on pl.id = w.plan where w.id = p_workspace;
  if paid > cap then
    update workspaces set status = 'paused', paused_reason = 'monthly_cost_cap', paused_at = now() where id = p_workspace;
  end if;
end $$;

-- =========================================================
-- 8) Fonksiyon yetkileri — Supabase varsayılanları anon/authenticated'a EXECUTE verir; açıkça geri alınır.
-- =========================================================
do $$
declare f text;
begin
  foreach f in array array[
    'reserve_engine_call(uuid, text, billing_tier, numeric, integer)',
    'record_engine_call(uuid, uuid, text, text, billing_tier, integer, integer, numeric, numeric, boolean, api_error_class)',
    'claim_next_run()',
    'finish_run(uuid, run_status, text, api_error_class, text, integer, integer, text, text)',
    'guard_simulated()', 'guard_demo_membership()', 'guard_brand_limits()', 'guard_prompt_limits()'
  ] loop
    execute format('revoke all on function %s from public', f);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke all on function %s from anon, authenticated', f);
      execute format('grant execute on function %s to service_role', f);
    end if;
  end loop;
end $$;
