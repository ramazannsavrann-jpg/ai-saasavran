-- 0013: (1) Ücretsiz Gemini'nin AEA, İsviçre ve Birleşik Krallık'ta kapatılması, (2) Aksiyon ve Sonuç Takibi.
-- (1) Google Gemini API ek koşulları bu bölgelerdeki kullanıcılara yalnız ücretli servisle hizmet verilmesini ister.
--     Google faturalandırması kapalı olduğu için, ülkesi bu listede olan markalarda aramasız Gemini ölçümü başlatılmaz.
--     Not: ölçülen şey markanın ülke kodudur; kullanıcının bulunduğu ülke uygulama içinde bilinmez (ücretsiz kontrol sayfası
--     ziyaretçinin ülkesine göre ayrıca kapatılır: functions/api/check.js).
create or replace function gemini_free_restricted(p_country text) returns boolean
language sql immutable as $$
  select upper(coalesce(p_country, '')) = any (array[
    'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE',
    'IS','LI','NO','CH','GB']);
$$;

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
  if t = 'model_knowledge' and gemini_free_restricted(b.country) then
    raise exception 'Bu ülke için ücretsiz Gemini ölçümü kapalı. ChatGPT canlı aramalı ölçüm ücretli paketlerde kullanılabilir.';
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
    -- Ücretsiz Gemini (aramasız) ölçümü AEA, İsviçre ve Birleşik Krallık markalarında yapılmaz
    if t = 'live_search' or not gemini_free_restricted(b.country) then
      insert into runs (workspace_id, brand_id, status, data_origin, measurement_type, max_cost_usd, prompts_total, trigger)
      values (b.workspace_id, b.id, 'queued', 'live_api', t, greatest(b.monthly_paid_cap_usd, 0.01), np, 'weekly');
      n := n + 1;
    end if;
    -- Aboneler: ayrıca ChatGPT canlı web aramalı ölçüm (paket tavanıyla sınırlı)
    if b.subscribed and t <> 'live_search' then
      insert into runs (workspace_id, brand_id, status, data_origin, measurement_type, max_cost_usd, prompts_total, trigger)
      values (b.workspace_id, b.id, 'queued', 'live_api', 'live_search', greatest(b.monthly_paid_cap_usd, 0.01), np, 'weekly');
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

-- (2) Aksiyon ve Sonuç Takibi: kullanıcı yaptığı iyileştirmeyi tarihle kaydeder; rapor önce/sonra ölçümleri karşılaştırır.
create table brand_actions (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  brand_id     uuid not null references brands(id) on delete cascade,
  title        text not null check (length(trim(title)) between 3 and 200),
  note         text check (note is null or length(note) <= 1000),
  done_on      date not null default current_date check (done_on <= current_date + 1),
  created_by   uuid default auth.uid(),
  created_at   timestamptz not null default now()
);
create index on brand_actions (brand_id, done_on desc);
alter table brand_actions enable row level security;
create policy brand_actions_read on brand_actions for select using (is_member(workspace_id));
create policy brand_actions_write on brand_actions for all
  using (is_member(workspace_id, 'editor'))
  with check (is_member(workspace_id, 'editor')
              and exists (select 1 from brands b where b.id = brand_id and b.workspace_id = brand_actions.workspace_id and not b.is_competitor));

do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function request_run(uuid, boolean) from anon;
    revoke all on function schedule_weekly_runs(integer) from anon, authenticated;
    revoke all on brand_actions from anon;
  end if;
end $$;
revoke all on function schedule_weekly_runs(integer) from public;
