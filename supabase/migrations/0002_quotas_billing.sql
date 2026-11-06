-- AI SaaSavran — 0002: paket kotaları, müşteri başına kullanım, ücretsiz/ücretli ayrımı, otomatik durdurma
-- Geri alınabilir: yalnızca yeni tablo/sütun/fonksiyon ekler; mevcut veriyi değiştirmez.

create type billing_tier as enum ('free', 'paid');
create type ws_status as enum ('active', 'paused');

-- ---------- Paketler ----------
create table plans (
  id                    text primary key,           -- 'free', 'starter', 'pro', 'agency', 'agency_plus'
  name                  text not null,
  price_usd             numeric(8,2) not null check (price_usd >= 0),
  max_brands            int not null check (max_brands > 0),
  max_prompts_per_brand int not null check (max_prompts_per_brand > 0),
  max_competitors       int not null check (max_competitors >= 0),
  monthly_engine_calls  int not null check (monthly_engine_calls >= 0),
  monthly_paid_cap_usd  numeric(10,2) not null check (monthly_paid_cap_usd >= 0)
);

-- Kotalar docs/PRICING.md hesabına göre; fiyatlar test edilecek varsayımlardır.
insert into plans values
  ('free',        'Free',         0,   1, 10,  2,   40,   0),
  ('starter',     'Starter',     29,   1, 25,  3,  700,  12),
  ('pro',         'Pro',         79,   3, 30,  5, 2400,  35),
  ('agency',      'Agency',     199,  10, 30,  5, 8000,  90),
  ('agency_plus', 'Agency Plus',399,  25, 40,  8, 26000, 180);

alter table workspaces
  add constraint workspaces_plan_fk foreign key (plan) references plans(id),
  add column status ws_status not null default 'active',
  add column paused_reason text,
  add column paused_at timestamptz;

-- ---------- Ücretsiz / ücretli ayrımı ----------
alter table cost_ledger add column billing billing_tier not null default 'paid';
alter table cost_ledger add column paid_equivalent_usd numeric(10,6) not null default 0;
alter table responses   add column billing billing_tier not null default 'paid';
alter table responses   add column search_queries text[] not null default '{}';

-- Ücretsiz katmanın sağlayıcı tarafı günlük sınırı (tüm müşteriler ortak)
create table provider_daily_usage (
  provider text not null,
  day      date not null,
  calls    int  not null default 0,
  primary key (provider, day)
);
alter table provider_daily_usage enable row level security; -- istemciye kapalı (politika yok)

-- Workspace aylık kullanım özeti (ücretsiz ve ücretli ayrı satırlar)
create view workspace_monthly_usage with (security_invoker = true) as
select workspace_id,
       date_trunc('month', created_at)::date as month,
       billing,
       count(*) filter (where task = 'query_engine')      as engine_calls,
       sum(cost_usd)                                       as cost_usd,
       sum(paid_equivalent_usd)                            as paid_equivalent_usd,
       sum(input_tokens)                                   as input_tokens,
       sum(output_tokens)                                  as output_tokens,
       count(*) filter (where cache_hit)                   as cache_hits,
       count(*) filter (where not ok)                      as failures
from cost_ledger
group by 1, 2, 3;

-- ---------- Çağrı öncesi rezervasyon (atomik) ----------
-- Döner: 'ok' veya red nedeni. Red nedeni bütçe/kota ise workspace otomatik durdurulur.
create or replace function reserve_engine_call(
  p_workspace uuid, p_provider text, p_billing billing_tier,
  p_worst_paid_usd numeric, p_free_daily_limit int default null
) returns text language plpgsql security definer set search_path = public as $$
declare
  ws record; pl record; used_calls int; used_paid numeric; today_calls int;
begin
  select * into ws from workspaces where id = p_workspace for update;  -- aynı workspace için sıralı
  if not found then return 'workspace_not_found'; end if;
  if ws.status = 'paused' then return 'workspace_paused'; end if;
  select * into pl from plans where id = ws.plan;

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
    if today_calls is null then return 'provider_free_daily_limit'; end if; -- müşteri durdurulmaz, ertesi gün devam
  end if;
  return 'ok';
end $$;

-- Çağrı sonrası gerçek maliyet kaydı; tavan aşıldıysa durdur.
create or replace function record_engine_call(
  p_workspace uuid, p_run uuid, p_provider text, p_model text, p_billing billing_tier,
  p_in int, p_out int, p_cost numeric, p_paid_equiv numeric, p_ok boolean
) returns void language plpgsql security definer set search_path = public as $$
declare paid numeric; cap numeric;
begin
  insert into cost_ledger(workspace_id, run_id, task, provider, model, input_tokens, output_tokens,
                          tool_calls, cost_usd, billing, paid_equivalent_usd, ok)
  values (p_workspace, p_run, 'query_engine', p_provider, p_model, p_in, p_out, 1,
          case when p_billing = 'free' then 0 else p_cost end, p_billing, p_paid_equiv, p_ok);
  if p_run is not null then
    update runs set cost_usd = cost_usd + case when p_billing='free' then 0 else p_cost end where id = p_run;
  end if;
  select coalesce(sum(cost_usd) filter (where billing='paid'),0) into paid
    from cost_ledger where workspace_id = p_workspace and created_at >= date_trunc('month', now());
  select pl.monthly_paid_cap_usd into cap from workspaces w join plans pl on pl.id = w.plan where w.id = p_workspace;
  if paid > cap then
    update workspaces set status='paused', paused_reason='monthly_cost_cap', paused_at=now() where id = p_workspace;
  end if;
end $$;

-- Bu fonksiyonlar yalnızca sunucu (service role) tarafından çağrılır.
revoke all on function reserve_engine_call(uuid, text, billing_tier, numeric, int) from public;
revoke all on function record_engine_call(uuid, uuid, text, text, billing_tier, int, int, numeric, numeric, boolean) from public;

-- Plan bilgisi herkese okunur (fiyat sayfası); yazma yok.
alter table plans enable row level security;
create policy plans_read on plans for select using (true);
