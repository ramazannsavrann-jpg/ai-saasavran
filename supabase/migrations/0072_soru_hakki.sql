-- 0072: Soru hakkı (karma ölçüm, 23-24 Kasım sahibin kararı).
-- Ücretli abonelerde aylık sorgu kotası ikiye ayrılır:
--   %30 haftalık otomatik "hafif" ölçüm: tüm sorular, ChatGPT (canlı arama) ve Gemini birer kez sorar.
--   %70 "soru hakkı": müşterinin istediği zaman başlattığı tam ölçüm (ChatGPT, Claude, Perplexity canlı + Gemini).
-- 1 soru hakkı = bir sorunun bir yapay zekâya bir kez sorulması (cost_ledger'daki bir query_engine satırı).
-- Ücretsiz paket, Growth Lab ve Demo Lab eskisi gibi (paylaşım yok).

alter table plans add column if not exists weekly_share numeric not null default 1
  check (weekly_share > 0 and weekly_share <= 1);
update plans set weekly_share = 0.30 where id in ('starter', 'altin', 'pro', 'agency');

-- Hafif ölçüm: her motor 1 kez; canlı aramada yalnız ChatGPT
alter table runs add column if not exists light boolean not null default false;

-- Karma düzen bu çalışma alanında geçerli mi
create or replace function quota_hybrid(p_workspace uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select w.kind in ('business', 'agency') and p.weekly_share < 1 and is_subscribed(w.id)
                     from workspaces w join plans p on p.id = w.plan where w.id = p_workspace), false);
$$;

-- Bir ölçümün yaklaşık kaç soru hakkı kullanacağı (soru sayısı × motor × tekrar). Worker kurallarıyla aynı:
-- canlı aramada ChatGPT 2, Claude 1, Perplexity 1; aramasızda Gemini 2 (ücretsizde 1); hafif ölçümde her motor 1 ve canlıda yalnız ChatGPT.
create or replace function run_call_estimate(p_plan text, p_type measurement_type, p_prompts int, p_light boolean default false) returns int
language sql immutable as $$
  select p_prompts * case
    when p_type = 'simulated' then 0
    when p_light then 1
    when p_type = 'live_search' then 4
    when p_plan = 'free' then 1
    else 2 end;
$$;

-- Bu ayki kullanım: haftalık (otomatik) ve istek üzerine ayrı
create or replace function quota_status(p_workspace uuid) returns table (
  hybrid boolean, total int, weekly_cap int, weekly_used int, manual_cap int, manual_used int, manual_left int
) language sql stable security definer set search_path = public as $$
  with w as (select w.id, p.monthly_engine_calls total, p.weekly_share share, quota_hybrid(w.id) hy
               from workspaces w join plans p on p.id = w.plan where w.id = p_workspace),
  -- İstek üzerine (manual) olanlar soru hakkından düşer; haftalık, telafi (recovery) ve diğerleri haftalık paydan
  u as (select count(*) filter (where r.trigger is distinct from 'manual')::int wk, count(*) filter (where r.trigger = 'manual')::int mn
          from cost_ledger c left join runs r on r.id = c.run_id
         where c.workspace_id = p_workspace and c.task = 'query_engine' and c.created_at >= date_trunc('month', now()))
  select w.hy, w.total,
         case when w.hy then floor(w.total * w.share)::int else w.total end,
         u.wk,
         case when w.hy then w.total - floor(w.total * w.share)::int else w.total end,
         case when w.hy then u.mn else u.wk + u.mn end,
         greatest(0, case when w.hy then w.total - floor(w.total * w.share)::int - u.mn else w.total - u.wk - u.mn end)
    from w, u;
$$;

-- Üyeler kendi çalışma alanının soru hakkını görür
create or replace function my_quota(p_workspace uuid) returns table (
  hybrid boolean, total int, weekly_cap int, weekly_used int, manual_cap int, manual_used int, manual_left int
) language sql stable security definer set search_path = public as $$
  select * from quota_status(p_workspace) where is_member(p_workspace);
$$;

-- İstek üzerine ölçüm: 0013 sürümü + karma düzende soru hakkı kontrolü
create or replace function request_run(p_brand uuid, p_live boolean default false) returns uuid
language plpgsql security definer set search_path = public as $$
declare b record; w record; mr int; t measurement_type; r uuid; np int; live boolean; remaining numeric; budget numeric; q record; need int;
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
  if t = 'model_knowledge' and gemini_free_restricted(b.country) then
    raise exception 'Bu ülke için ücretsiz Gemini ölçümü kapalı. ChatGPT canlı aramalı ölçüm ücretli paketlerde kullanılabilir.';
  end if;
  -- Soru hakkı (karma düzen): bu ölçüm kalan haktan fazlasını kullanacaksa başlamaz
  select * into q from quota_status(w.id);
  if q.hybrid then
    need := run_call_estimate(w.plan, t, np);
    if need > q.manual_left then
      raise exception 'Soru hakkınız yetmiyor: bu ölçüm % soru hakkı kullanır, bu ay % hakkınız kaldı. Hakkınız yeni ay başında yenilenir.', need, q.manual_left;
    end if;
  end if;
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

-- Haftalık otomatik ölçüm: 0029 sürümü + karma düzende hafif ölçüm ve %30 sınırı
create or replace function schedule_weekly_runs(p_limit int default 50) returns int
language plpgsql security definer set search_path = public as $$
declare b record; n int := 0; np int; used int; reps int; t measurement_type; live boolean; q record; need int;
begin
  select live_search_enabled into live from app_settings;
  for b in
    select br.*, w.plan, w.kind, w.paid_live_allowed, is_subscribed(w.id) as subscribed, pl.monthly_engine_calls, pl.monthly_runs, pl.monthly_paid_cap_usd,
           not exists (select 1 from runs r where r.brand_id = br.id and r.measurement_type <> 'live_search'
                        and r.created_at > now() - make_interval(days => br.measure_every_days)) as regular_due,
           (w.kind = 'growth_lab' and w.paid_live_allowed and br.live_every_days is not null
            and not exists (select 1 from runs r where r.brand_id = br.id and r.measurement_type = 'live_search'
                             and r.created_at > now() - make_interval(days => br.live_every_days))) as lab_live
      from brands br
      join workspaces w on w.id = br.workspace_id
      join plans pl on pl.id = w.plan
     where not br.is_competitor and br.auto_weekly
       and w.status = 'active' and w.kind <> 'demo_lab'
       and not exists (select 1 from runs r where r.brand_id = br.id and r.status in ('queued', 'running'))
     order by br.created_at
  loop
    exit when n >= p_limit;
    continue when not (b.regular_due or b.lab_live);
    select count(*) into np from prompts where brand_id = b.id and active;
    continue when np = 0;
    continue when b.monthly_runs is not null and runs_this_month(b.workspace_id) >= b.monthly_runs;
    select * into q from quota_status(b.workspace_id);
    if q.hybrid then
      -- Karma düzen: tüm sorular, Gemini 1 kez + (canlı arama açıksa) ChatGPT 1 kez; haftalık pay (%30) dolunca durur
      if not b.regular_due then continue; end if;
      need := np * (case when gemini_free_restricted(b.country) then 0 else 1 end + case when live or b.paid_live_allowed then 1 else 0 end);
      continue when need = 0 or q.weekly_used + need > q.weekly_cap;
      if not gemini_free_restricted(b.country) then
        insert into runs (workspace_id, brand_id, status, data_origin, measurement_type, max_cost_usd, prompts_total, trigger, light)
        values (b.workspace_id, b.id, 'queued', 'live_api', 'model_knowledge', greatest(b.monthly_paid_cap_usd, 0.01), np, 'weekly', true);
        n := n + 1;
      end if;
      if live or b.paid_live_allowed then
        insert into runs (workspace_id, brand_id, status, data_origin, measurement_type, max_cost_usd, prompts_total, trigger, light)
        values (b.workspace_id, b.id, 'queued', 'live_api', 'live_search', greatest(b.monthly_paid_cap_usd, 0.01), np, 'weekly', true);
        n := n + 1;
      end if;
      continue;
    end if;
    reps := case when b.plan = 'free' then 1 else 2 end;
    select count(*) into used from cost_ledger
     where workspace_id = b.workspace_id and task = 'query_engine' and created_at >= date_trunc('month', now());
    continue when used + np * reps > b.monthly_engine_calls;
    if b.regular_due then
      t := case when live then 'live_search' else 'model_knowledge' end;
      -- Ücretsiz Gemini (aramasız) ölçümü AEA, İsviçre ve Birleşik Krallık markalarında yapılmaz
      if t = 'live_search' or not gemini_free_restricted(b.country) then
        insert into runs (workspace_id, brand_id, status, data_origin, measurement_type, max_cost_usd, prompts_total, trigger)
        values (b.workspace_id, b.id, 'queued', 'live_api', t, greatest(b.monthly_paid_cap_usd, 0.01), np, 'weekly');
        n := n + 1;
      end if;
      -- Aboneler: ayrıca canlı web aramalı ölçüm (paket tavanıyla sınırlı)
      if b.subscribed and t <> 'live_search' then
        insert into runs (workspace_id, brand_id, status, data_origin, measurement_type, max_cost_usd, prompts_total, trigger)
        values (b.workspace_id, b.id, 'queued', 'live_api', 'live_search', greatest(b.monthly_paid_cap_usd, 0.01), np, 'weekly');
        n := n + 1;
        continue;
      end if;
    end if;
    -- Growth Lab: seçilen markalarda seyrek canlı aramalı ölçüm (toplam ücretli tavanla sınırlı)
    if b.lab_live and not exists (select 1 from runs r where r.brand_id = b.id and r.status in ('queued', 'running') and r.measurement_type = 'live_search') then
      insert into runs (workspace_id, brand_id, status, data_origin, measurement_type, max_cost_usd, prompts_total, trigger)
      values (b.workspace_id, b.id, 'queued', 'live_api', 'live_search', 1, np, 'weekly');
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

revoke all on function schedule_weekly_runs(integer) from public;
revoke all on function quota_status(uuid) from public;
revoke all on function quota_hybrid(uuid) from public;
revoke all on function my_quota(uuid) from public;
grant execute on function my_quota(uuid) to authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function schedule_weekly_runs(integer) from anon, authenticated;
  end if;
end $$;
