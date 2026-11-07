-- 0008: Kötüye kullanıma karşı ücretsiz pakette aylık ölçüm sayısı sınırı (Free: ayda 4 ölçüm; haftalık otomatik ölçümler dahil).
-- Ücretli paketlerde sınır yok (null); onlarda cevap kotası ve harcama tavanı geçerli.
alter table plans add column monthly_runs int check (monthly_runs is null or monthly_runs > 0);
update plans set monthly_runs = 4 where id = 'free';

-- Bu ay başlatılan gerçek ölçümler (simülasyon ve tohum verisi hariç; başarısız olanlar da sayılmaz)
create or replace function runs_this_month(p_workspace uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from runs
   where workspace_id = p_workspace and data_origin = 'live_api' and trigger <> 'seed'
     and status not in ('failed', 'budget_blocked') and created_at >= date_trunc('month', now());
$$;
revoke all on function runs_this_month(uuid) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function runs_this_month(uuid) from anon, authenticated;
    revoke all on function request_run(uuid, boolean) from anon;
  end if;
end $$;

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

create or replace function schedule_weekly_runs(p_limit int default 50) returns int
language plpgsql security definer set search_path = public as $$
declare b record; n int := 0; np int; used int; reps int; t measurement_type; live boolean;
begin
  select live_search_enabled into live from app_settings;
  for b in
    select br.*, w.plan, w.kind, pl.monthly_engine_calls, pl.monthly_runs, pl.monthly_paid_cap_usd
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
  end loop;
  return n;
end $$;

