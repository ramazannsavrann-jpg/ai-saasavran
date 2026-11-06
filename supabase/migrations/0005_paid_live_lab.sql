-- 0005: Ücretli canlı aramalı ölçüm, yalnız Growth Lab'de ve toplam harcama tavanıyla.
-- Kullanıcı izni (7 Kasım 2026): toplam en fazla 3 $; müşteri hesaplarında kapalı.

-- 1) Toplam (tüm zamanlar, tüm çalışma alanları) ücretli harcama tavanı
alter table app_settings add column paid_total_cap_usd numeric(10,4) not null default 0;
update app_settings set paid_total_cap_usd = 3.00;

-- 2) Ücretli canlı ölçüm izni yalnız Growth Lab türündeki alanda olabilir (müşteri alanında imkânsız)
alter table workspaces add column paid_live_allowed boolean not null default false;
alter table workspaces add constraint paid_live_only_growth_lab check (not paid_live_allowed or kind = 'growth_lab');
update workspaces set paid_live_allowed = true where kind = 'growth_lab';

-- 3) Kota kontrolü: ücretli çağrı için alan izni + toplam tavan (alan durdurulmaz, yalnız reddedilir)
create or replace function reserve_engine_call(
  p_workspace uuid, p_provider text, p_billing billing_tier,
  p_worst_paid_usd numeric, p_free_daily_limit int default null
) returns text language plpgsql security definer set search_path = public as $$
declare
  ws record; pl record; used_calls int; used_paid numeric; today_calls int; total_paid numeric; total_cap numeric;
begin
  select * into ws from workspaces where id = p_workspace for update;
  if not found then return 'workspace_not_found'; end if;
  if ws.status = 'paused' then return 'workspace_paused'; end if;
  select * into pl from plans where id = ws.plan;

  if p_billing = 'paid' then
    if not ws.paid_live_allowed then return 'paid_not_allowed'; end if;
    perform 1 from app_settings for update;  -- toplam tavan için tüm ücretli çağrılar sıralı
    select paid_total_cap_usd into total_cap from app_settings;
    select coalesce(sum(cost_usd), 0) into total_paid from cost_ledger where billing = 'paid';
    if total_paid + p_worst_paid_usd > total_cap then return 'global_paid_cap'; end if;
  end if;

  select count(*) filter (where task = 'query_engine'),
         coalesce(sum(cost_usd) filter (where billing = 'paid'), 0)
    into used_calls, used_paid
    from cost_ledger
   where workspace_id = p_workspace and created_at >= date_trunc('month', now());

  if used_calls >= pl.monthly_engine_calls then
    update workspaces set status='paused', paused_reason='monthly_call_quota', paused_at=now() where id=p_workspace;
    return 'monthly_call_quota';
  end if;
  if p_billing = 'paid' and used_paid + p_worst_paid_usd > pl.monthly_paid_cap_usd then
    update workspaces set status='paused', paused_reason='monthly_cost_cap', paused_at=now() where id=p_workspace;
    return 'monthly_cost_cap';
  end if;
  if p_billing = 'free' and p_free_daily_limit is not null then
    insert into provider_daily_usage(provider, day, calls) values (p_provider, current_date, 0)
      on conflict do nothing;
    update provider_daily_usage set calls = calls + 1
     where provider = p_provider and day = current_date and calls < p_free_daily_limit
     returning calls into today_calls;
    if today_calls is null then return 'provider_free_daily_limit'; end if;
  end if;
  return 'ok';
end $$;
revoke all on function reserve_engine_call(uuid, text, billing_tier, numeric, int) from public;

-- 4) Ölçüm isteği: istenirse canlı aramalı (yalnız izinli alanda)
drop function if exists request_run(uuid);
create or replace function request_run(p_brand uuid, p_live boolean default false) returns uuid
language plpgsql security definer set search_path = public as $$
declare b record; w record; t measurement_type; r uuid; np int; live boolean; remaining numeric; budget numeric;
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
  if p_live and not w.paid_live_allowed then raise exception 'Canlı aramalı ölçüm bu hesapta kapalı'; end if;
  select live_search_enabled, paid_total_cap_usd - (select coalesce(sum(cost_usd), 0) from cost_ledger where billing = 'paid')
    into live, remaining from app_settings;
  if p_live and remaining <= 0.05 then raise exception 'Ücretli kullanım tavanına ulaşıldı'; end if;
  t := case when w.kind = 'demo_lab' then 'simulated'
            when live or p_live then 'live_search'
            else 'model_knowledge' end;
  budget := greatest((select monthly_paid_cap_usd from plans where id = w.plan), 0.01);
  if t = 'live_search' then budget := least(budget, greatest(remaining, 0.01)); end if;
  insert into runs (workspace_id, brand_id, status, data_origin, measurement_type, max_cost_usd, prompts_total)
  values (b.workspace_id, p_brand, 'queued',
          case when t = 'simulated' then 'simulated' else 'live_api' end::data_origin,
          t, budget, np)
  returning id into r;
  return r;
end $$;
revoke all on function request_run(uuid, boolean) from public;
grant execute on function request_run(uuid, boolean) to authenticated;

-- 5) Kalan ücretli bütçe (izinli alanın üyelerine gösterilir)
create or replace function paid_budget(p_workspace uuid) returns table (allowed boolean, cap_usd numeric, spent_usd numeric)
language sql stable security definer set search_path = public as $$
  select w.paid_live_allowed, s.paid_total_cap_usd,
         (select coalesce(sum(cost_usd), 0) from cost_ledger where billing = 'paid')
    from workspaces w, app_settings s
   where w.id = p_workspace and is_member(w.id, 'viewer');
$$;
revoke all on function paid_budget(uuid) from public;
grant execute on function paid_budget(uuid) to authenticated;

-- Supabase'de anon rolü varsa ondan da geri al (yerel test ortamında bu rol yok)
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function reserve_engine_call(uuid, text, billing_tier, numeric, int) from anon, authenticated;
    revoke all on function request_run(uuid, boolean) from anon;
    revoke all on function paid_budget(uuid) from anon;
  end if;
end $$;
