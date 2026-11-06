-- AI SaaSavran — 0004: haftalık otomatik ölçüm, web sitesi kontrolü, Demo/Growth Lab yardımcıları
-- Yalnızca ekleme yapar; mevcut veriyi değiştirmez.

-- =========================================================
-- 1) Haftalık otomatik ölçüm
-- =========================================================
alter table brands add column auto_weekly boolean not null default true;
alter table runs add column trigger text not null default 'manual' check (trigger in ('manual', 'weekly', 'seed'));

-- Sıraya alınacak haftalık ölçümler. İşçi (service role) her çalıştığında çağırır.
-- Kurallar: ana marka, otomatik açık, çalışma alanı aktif, demo değil, aktif soru var,
-- son 7 günde ölçüm yok, bekleyen ölçüm yok, bu ayki kalan kota yeterli (kotayı aşacak ölçüm başlatılmaz).
create or replace function schedule_weekly_runs(p_limit int default 50) returns int
language plpgsql security definer set search_path = public as $$
declare b record; n int := 0; np int; used int; reps int; t measurement_type; live boolean;
begin
  select live_search_enabled into live from app_settings;
  for b in
    select br.*, w.plan, w.kind, pl.monthly_engine_calls, pl.monthly_paid_cap_usd
      from brands br
      join workspaces w on w.id = br.workspace_id
      join plans pl on pl.id = w.plan
     where not br.is_competitor and br.auto_weekly
       and w.status = 'active' and w.kind <> 'demo_lab'
       and not exists (select 1 from runs r where r.brand_id = br.id and r.status in ('queued', 'running'))
       and not exists (select 1 from runs r where r.brand_id = br.id and r.created_at > now() - interval '7 days')
     order by br.created_at
     limit p_limit
  loop
    select count(*) into np from prompts where brand_id = b.id and active;
    continue when np = 0;
    reps := case when b.plan = 'free' then 1 else 2 end;
    select count(*) into used from cost_ledger
     where workspace_id = b.workspace_id and task = 'query_engine' and created_at >= date_trunc('month', now());
    continue when used + np * reps > b.monthly_engine_calls;
    t := case when live then 'live_search' else 'model_knowledge' end;
    insert into runs (workspace_id, brand_id, status, data_origin, measurement_type, max_cost_usd, prompts_total, trigger)
    values (b.workspace_id, b.id, 'queued', 'live_api', t, greatest(b.monthly_paid_cap_usd, 0.01), np, 'weekly');
    n := n + 1;
  end loop;
  return n;
end $$;

-- =========================================================
-- 2) Web sitesi kontrolü (yapay zekâ botları, işletme bilgisi, yapılandırılmış veri)
-- =========================================================
create table site_audits (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  brand_id     uuid not null references brands(id) on delete cascade,
  url          text not null,
  status       text not null check (status in ('ok', 'unreachable')),
  checks       jsonb not null default '[]',   -- [{id, ok, severity, detail}]
  created_at   timestamptz not null default now()
);
create index on site_audits (brand_id, created_at desc);
alter table site_audits enable row level security;
create policy site_audits_read on site_audits for select using (is_member(workspace_id));
-- yazma yalnızca sunucu (service role)

-- Kontrol isteği (kullanıcı) — işçi bekleyen istekleri işler
alter table brands add column audit_requested_at timestamptz;
create or replace function request_site_audit(p_brand uuid) returns void
language plpgsql security definer set search_path = public as $$
declare b record;
begin
  select * into b from brands where id = p_brand and not is_competitor;
  if not found then raise exception 'Marka bulunamadı'; end if;
  if not is_member(b.workspace_id, 'editor') then raise exception 'Yetki yok'; end if;
  if b.website is null or length(trim(b.website)) = 0 then raise exception 'Önce markaya web sitesi ekleyin'; end if;
  if exists (select 1 from site_audits where brand_id = p_brand and created_at > now() - interval '1 hour') then
    raise exception 'Bu site son bir saat içinde kontrol edildi';
  end if;
  update brands set audit_requested_at = now() where id = p_brand;
end $$;

create or replace function pending_site_audits(p_limit int default 10)
returns table (brand_id uuid, workspace_id uuid, website text)
language sql security definer set search_path = public as $$
  select b.id, b.workspace_id, b.website from brands b
   where not b.is_competitor and b.website is not null and length(trim(b.website)) > 0
     and b.data_origin = 'live_api'
     and (
       (b.audit_requested_at is not null and not exists (select 1 from site_audits a where a.brand_id = b.id and a.created_at >= b.audit_requested_at))
       or not exists (select 1 from site_audits a where a.brand_id = b.id and a.created_at > now() - interval '7 days')
     )
   order by b.audit_requested_at desc nulls last
   limit p_limit;
$$;

-- =========================================================
-- 3) Platform yöneticisi atama (yalnızca sunucu; e-posta ile)
-- =========================================================
create or replace function ensure_platform_admin(p_email text) returns uuid
language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  select id into uid from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if uid is null then return null; end if;
  insert into platform_admins (user_id) values (uid) on conflict do nothing;
  return uid;
end $$;

-- =========================================================
-- 4) Yetkiler: sunucu fonksiyonları istemciye kapalı
-- =========================================================
do $$
declare f text;
begin
  foreach f in array array['schedule_weekly_runs(integer)', 'pending_site_audits(integer)', 'ensure_platform_admin(text)'] loop
    execute format('revoke all on function %s from public', f);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke all on function %s from anon, authenticated', f);
      execute format('grant execute on function %s to service_role', f);
    end if;
  end loop;
end $$;
