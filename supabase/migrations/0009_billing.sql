-- 0009: Paddle abonelikleri. Ödeme yapan müşterinin alanı ücretli pakete geçer ve ChatGPT canlı aramalı ölçüm açılır.
-- Güvenlik: abonelik bilgisi yalnız sunucu (Paddle bildirimi → apply_subscription, service role) tarafından yazılır.
-- Toplam deneme tavanı (paid_total_cap_usd) artık yalnız Growth Lab'e uygulanır; abonelerde paket aylık tavanı geçerli.

alter table workspaces
  add column paddle_subscription_id text unique,
  add column paddle_customer_id text,
  add column subscription_status text check (subscription_status in ('active', 'trialing', 'past_due', 'paused', 'canceled')),
  add column current_period_end timestamptz;

create or replace function is_subscribed(p_workspace uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from workspaces where id = p_workspace and kind in ('business', 'agency')
                 and plan in ('starter', 'pro', 'agency') and subscription_status in ('active', 'trialing', 'past_due'));
$$;

alter table workspaces drop constraint paid_live_only_growth_lab;
alter table workspaces add constraint paid_live_only_lab_or_subscriber check (
  not paid_live_allowed or kind = 'growth_lab'
  or (kind in ('business', 'agency') and plan in ('starter', 'pro', 'agency') and coalesce(subscription_status, '') in ('active', 'trialing', 'past_due')));

-- Paddle bildirimi işleyici (yalnız sunucu). Aktif abonelikte paketi açar; iptal/duraklatmada Free'ye döner.
create or replace function apply_subscription(
  p_workspace uuid, p_plan text, p_status text, p_subscription text, p_customer text, p_period_end timestamptz
) returns text language plpgsql security definer set search_path = public as $$
declare w record; active boolean := p_status in ('active', 'trialing', 'past_due');
begin
  select * into w from workspaces where id = p_workspace for update;
  if not found then return 'workspace_not_found'; end if;
  if w.kind not in ('business', 'agency') then return 'not_customer_workspace'; end if;
  if p_plan not in ('starter', 'pro', 'agency') then return 'unknown_plan'; end if;
  -- Eski bir aboneliğin iptal olayı, alanın yeni aktif aboneliğini geri almasın
  if w.paddle_subscription_id is not null and w.paddle_subscription_id <> p_subscription
     and w.subscription_status in ('active', 'trialing', 'past_due') and not active then
    return 'stale_event';
  end if;
  update workspaces set
    plan = case when active then p_plan else 'free' end,
    subscription_status = p_status,
    paddle_subscription_id = p_subscription,
    paddle_customer_id = coalesce(p_customer, paddle_customer_id),
    current_period_end = p_period_end,
    paid_live_allowed = active,
    status = case when active and status = 'paused' and paused_reason in ('monthly_call_quota', 'monthly_cost_cap') then 'active' else status end,
    paused_reason = case when active and status = 'paused' and paused_reason in ('monthly_call_quota', 'monthly_cost_cap') then null else paused_reason end
  where id = p_workspace;
  return 'ok';
end $$;

-- Hesap sayfası için abonelik özeti (üyeler görür) ve portal için müşteri kimliği (yalnız sahip/editör, sunucu üzerinden)
create or replace function billing_summary(p_workspace uuid) returns table (plan text, subscription_status text, current_period_end timestamptz, has_customer boolean)
language sql stable security definer set search_path = public as $$
  select w.plan, w.subscription_status, w.current_period_end, w.paddle_customer_id is not null
    from workspaces w where w.id = p_workspace and is_member(w.id, 'viewer');
$$;
create or replace function billing_customer(p_workspace uuid) returns text
language sql stable security definer set search_path = public as $$
  select w.paddle_customer_id from workspaces w where w.id = p_workspace and is_member(w.id, 'editor');
$$;

revoke all on function apply_subscription(uuid, text, text, text, text, timestamptz) from public;
revoke all on function is_subscribed(uuid) from public;
revoke all on function billing_summary(uuid) from public;
revoke all on function billing_customer(uuid) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function apply_subscription(uuid, text, text, text, text, timestamptz) from anon, authenticated;
    revoke all on function is_subscribed(uuid) from anon, authenticated;
    grant execute on function billing_summary(uuid) to authenticated;
    grant execute on function billing_customer(uuid) to authenticated;
  end if;
end $$;

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
    -- Toplam (deneme) tavanı yalnız abonesiz alanlara (Growth Lab) uygulanır; abonelerde paket tavanı geçerli
    if not is_subscribed(p_workspace) then
      perform 1 from app_settings for update;
      select paid_total_cap_usd into total_cap from app_settings;
      select coalesce(sum(c.cost_usd), 0) into total_paid from cost_ledger c
        join workspaces w2 on w2.id = c.workspace_id where c.billing = 'paid' and w2.kind = 'growth_lab';
      if total_paid + p_worst_paid_usd > total_cap then return 'global_paid_cap'; end if;
    end if;
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

create or replace function request_run(p_brand uuid, p_live boolean default false) returns uuid
language plpgsql security definer set search_path = public as $$
declare b record; w record; mr int; t measurement_type; r uuid; np int; live boolean; remaining numeric; budget numeric;
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
  select monthly_runs into mr from plans where id = w.plan;
  if mr is not null and runs_this_month(b.workspace_id) >= mr then
    raise exception 'Bu ayki ölçüm hakkınız doldu (% / ay). Yeni ay başında yenilenir.', mr;
  end if;
  if p_live and not w.paid_live_allowed then raise exception 'Canlı aramalı ölçüm bu hesapta kapalı'; end if;
  if is_subscribed(w.id) then
    select live_search_enabled into live from app_settings;
    select pl.monthly_paid_cap_usd - (select coalesce(sum(cost_usd), 0) from cost_ledger
            where workspace_id = w.id and billing = 'paid' and created_at >= date_trunc('month', now()))
      into remaining from plans pl where pl.id = w.plan;
  else
    select live_search_enabled, paid_total_cap_usd - (select coalesce(sum(c.cost_usd), 0) from cost_ledger c
             join workspaces w2 on w2.id = c.workspace_id where c.billing = 'paid' and w2.kind = 'growth_lab')
      into live, remaining from app_settings;
  end if;
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

create or replace function schedule_weekly_runs(p_limit int default 50) returns int
language plpgsql security definer set search_path = public as $$
declare b record; n int := 0; np int; used int; reps int; t measurement_type; live boolean;
begin
  select live_search_enabled into live from app_settings;
  for b in
    select br.*, w.plan, w.kind, is_subscribed(w.id) as subscribed, pl.monthly_engine_calls, pl.monthly_runs, pl.monthly_paid_cap_usd
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
    continue when b.monthly_runs is not null and runs_this_month(b.workspace_id) >= b.monthly_runs;
    reps := case when b.plan = 'free' then 1 else 2 end;
    select count(*) into used from cost_ledger
     where workspace_id = b.workspace_id and task = 'query_engine' and created_at >= date_trunc('month', now());
    continue when used + np * reps > b.monthly_engine_calls;
    t := case when live then 'live_search' else 'model_knowledge' end;
    insert into runs (workspace_id, brand_id, status, data_origin, measurement_type, max_cost_usd, prompts_total, trigger)
    values (b.workspace_id, b.id, 'queued', 'live_api', t, greatest(b.monthly_paid_cap_usd, 0.01), np, 'weekly');
    n := n + 1;
    -- Aboneler: ayrıca ChatGPT canlı web aramalı ölçüm (paket tavanıyla sınırlı)
    if b.subscribed and t <> 'live_search' then
      insert into runs (workspace_id, brand_id, status, data_origin, measurement_type, max_cost_usd, prompts_total, trigger)
      values (b.workspace_id, b.id, 'queued', 'live_api', 'live_search', greatest(b.monthly_paid_cap_usd, 0.01), np, 'weekly');
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

