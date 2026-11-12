-- 0029: Ölçüm aralığı markaya göre. measure_every_days: otomatik ölçüm kaç günde bir (varsayılan 7).
-- live_every_days: yalnız Growth Lab'de, canlı aramalı (ücretli) otomatik ölçüm kaç günde bir (boş: otomatik canlı yok).
-- Growth Lab'in canlı ölçümleri toplam ücretli harcama tavanıyla (app_settings.paid_total_cap_usd) sınırlıdır; tavan dolunca durur.
alter table brands add column measure_every_days int not null default 7 check (measure_every_days between 1 and 60);
alter table brands add column live_every_days int check (live_every_days is null or live_every_days between 7 and 90);

create or replace function schedule_weekly_runs(p_limit int default 50) returns int
language plpgsql security definer set search_path = public as $$
declare b record; n int := 0; np int; used int; reps int; t measurement_type; live boolean; lab_live_due boolean;
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
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function schedule_weekly_runs(integer) from anon, authenticated;
  end if;
end $$;
