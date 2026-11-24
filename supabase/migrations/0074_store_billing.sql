-- 0074: Mağaza ödemesi (mobil uygulama, 23 Kasım kararları): uygulamada abonelik ve ek soru paketi Google Play
-- (ileride App Store) üzerinden alınır; Paddle yalnız sitede. Elmas uygulamada satılmaz.
-- Satın alma her zaman sunucuda Google'a sorularak doğrulanır (functions/api/store/*); istemcinin sözüne güvenilmez.
-- Ek soru paketi: yalnız aboneliği olup bu ayki soru hakkını bitirenler alır; dönem (ay) sonunda biter.

alter table workspaces add column if not exists billing_source text not null default 'paddle'
  check (billing_source in ('paddle', 'google_play', 'app_store'));

create table if not exists store_subscriptions (
  purchase_token text primary key,
  platform       text not null check (platform in ('google_play', 'app_store')),
  workspace_id   uuid not null references workspaces(id) on delete cascade,
  user_id        uuid,
  product_id     text not null,
  plan           text not null,
  state          text not null,
  active         boolean not null,
  expiry_at      timestamptz,
  auto_renewing  boolean,
  order_id       text,
  linked_token   text,
  updated_at     timestamptz not null default now()
);
create index if not exists store_subscriptions_ws on store_subscriptions(workspace_id);
alter table store_subscriptions enable row level security;
drop policy if exists store_subscriptions_member on store_subscriptions;
create policy store_subscriptions_member on store_subscriptions for select using (is_member(workspace_id));

create table if not exists quota_extras (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references workspaces(id) on delete cascade,
  credits        int not null check (credits > 0),
  expires_at     timestamptz not null,
  source         text not null,
  purchase_token text unique,
  product_id     text,
  created_at     timestamptz not null default now()
);
create index if not exists quota_extras_ws on quota_extras(workspace_id, expires_at);
alter table quota_extras enable row level security;
drop policy if exists quota_extras_member on quota_extras;
create policy quota_extras_member on quota_extras for select using (is_member(workspace_id));

-- Mağaza ürün kimliği → paket / ek hak (Play Console'da aynı kimliklerle açılır; docs/STORE.md)
create or replace function store_plan_for(p_product text) returns text language sql immutable as $$
  select case p_product when 'gumus' then 'starter' when 'altin' then 'altin' when 'platin' then 'pro' else null end;
$$;
create or replace function store_pack_credits(p_product text) returns int language sql immutable as $$
  select case p_product when 'ek_250' then 250 when 'ek_500' then 500 when 'ek_1000' then 1000 else null end;
$$;

-- Soru hakkı: 0072 + bu ay geçerli ek paketler soru hakkına eklenir
create or replace function quota_status(p_workspace uuid) returns table (
  hybrid boolean, total int, weekly_cap int, weekly_used int, manual_cap int, manual_used int, manual_left int
) language sql stable security definer set search_path = public as $$
  with w as (select w.id, p.monthly_engine_calls total, p.weekly_share share, quota_hybrid(w.id) hy
               from workspaces w join plans p on p.id = w.plan where w.id = p_workspace),
  x as (select coalesce(sum(credits), 0)::int extra from quota_extras
         where workspace_id = p_workspace and expires_at > now() and created_at >= date_trunc('month', now())),
  u as (select count(*) filter (where r.trigger is distinct from 'manual')::int wk, count(*) filter (where r.trigger = 'manual')::int mn
          from cost_ledger c left join runs r on r.id = c.run_id
         where c.workspace_id = p_workspace and c.task = 'query_engine' and c.created_at >= date_trunc('month', now()))
  select w.hy, w.total + x.extra,
         case when w.hy then floor(w.total * w.share)::int else w.total end,
         u.wk,
         case when w.hy then w.total - floor(w.total * w.share)::int + x.extra else w.total end,
         case when w.hy then u.mn else u.wk + u.mn end,
         greatest(0, case when w.hy then w.total - floor(w.total * w.share)::int + x.extra - u.mn else w.total - u.wk - u.mn end)
    from w, x, u;
$$;

-- Sunucu (doğrulanmış mağaza aboneliği): çalışma alanının paketini günceller.
-- p_state: Google subscriptionState (SUBSCRIPTION_STATE_ACTIVE, _IN_GRACE_PERIOD, _ON_HOLD, _PAUSED, _CANCELED, _EXPIRED …)
create or replace function apply_store_subscription(
  p_platform text, p_token text, p_workspace uuid, p_user uuid, p_product text, p_state text,
  p_expiry timestamptz, p_auto boolean, p_order text, p_linked text default null
) returns text language plpgsql security definer set search_path = public as $$
declare w record; pl text := store_plan_for(p_product); act boolean; known record;
begin
  if pl is null then return 'unknown_product'; end if;
  select * into known from store_subscriptions where purchase_token = p_token;
  -- Token ilk kez geliyorsa: satın alan kullanıcı alanın düzenleyicisi olmalı (yenilemelerde token bilinir)
  if not found then
    if p_linked is not null and exists (select 1 from store_subscriptions where purchase_token = p_linked and workspace_id = p_workspace) then
      null; -- paket değişikliği: eski token aynı alana aitti
    elsif p_user is null or not exists (select 1 from workspace_members m where m.workspace_id = p_workspace and m.user_id = p_user and m.role in ('owner', 'admin', 'editor')) then
      return 'not_member';
    end if;
  elsif known.workspace_id <> p_workspace then
    return 'token_other_workspace';
  end if;
  select * into w from workspaces where id = p_workspace for update;
  if not found then return 'workspace_not_found'; end if;
  if w.kind not in ('business', 'agency') then return 'not_customer_workspace'; end if;
  act := p_state in ('SUBSCRIPTION_STATE_ACTIVE', 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD')
         or (p_state = 'SUBSCRIPTION_STATE_CANCELED' and p_expiry > now());   -- iptal: dönem sonuna kadar kullanır
  -- Sitede (Paddle) etkin aboneliği olan alana mağazadan ikinci abonelik bağlanmaz
  if act and w.billing_source = 'paddle' and w.subscription_status in ('active', 'trialing', 'past_due') and w.paddle_subscription_id is not null then
    return 'already_subscribed_web';
  end if;
  insert into store_subscriptions (purchase_token, platform, workspace_id, user_id, product_id, plan, state, active, expiry_at, auto_renewing, order_id, linked_token, updated_at)
  values (p_token, p_platform, p_workspace, p_user, p_product, pl, p_state, act, p_expiry, p_auto, p_order, p_linked, now())
  on conflict (purchase_token) do update set product_id = excluded.product_id, plan = excluded.plan, state = excluded.state,
    active = excluded.active, expiry_at = excluded.expiry_at, auto_renewing = excluded.auto_renewing,
    order_id = coalesce(excluded.order_id, store_subscriptions.order_id), updated_at = now();
  if p_linked is not null then update store_subscriptions set active = false, updated_at = now() where purchase_token = p_linked; end if;
  -- Alanın başka etkin mağaza aboneliği varsa (ör. yeni token), pasif olay onu düşürmesin
  if not act and exists (select 1 from store_subscriptions where workspace_id = p_workspace and active and purchase_token <> p_token) then
    return 'ok_other_active';
  end if;
  update workspaces set
    plan = case when act then pl else 'free' end,
    subscription_status = case when act then (case when p_state = 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD' then 'past_due' else 'active' end)
                               else 'canceled' end,
    billing_source = p_platform,
    current_period_end = p_expiry,
    paid_live_allowed = act,
    status = case when act and status = 'paused' and paused_reason in ('monthly_call_quota', 'monthly_cost_cap') then 'active' else status end,
    paused_reason = case when act and status = 'paused' and paused_reason in ('monthly_call_quota', 'monthly_cost_cap') then null else paused_reason end
  where id = p_workspace;
  return 'ok';
end $$;

-- Sunucu (doğrulanmış tek seferlik satın alma): ek soru paketi. Yalnız karma düzendeki aboneye ve
-- soru hakkı bitmiş/bitmek üzereyken (kalan < soru hakkının %10'u); dönem (ay) sonunda biter. Aynı token iki kez işlenmez.
create or replace function grant_quota_pack(p_platform text, p_token text, p_workspace uuid, p_user uuid, p_product text)
returns text language plpgsql security definer set search_path = public as $$
declare c int := store_pack_credits(p_product); q record;
begin
  if c is null then return 'unknown_product'; end if;
  if exists (select 1 from quota_extras where purchase_token = p_token) then return 'already_granted'; end if;
  if p_user is null or not exists (select 1 from workspace_members m where m.workspace_id = p_workspace and m.user_id = p_user and m.role in ('owner', 'admin', 'editor')) then
    return 'not_member';
  end if;
  select * into q from quota_status(p_workspace);
  if not q.hybrid then return 'not_subscriber'; end if;
  if q.manual_left >= greatest(1, floor(q.manual_cap * 0.10)) then return 'quota_not_exhausted'; end if;
  insert into quota_extras (workspace_id, credits, expires_at, source, purchase_token, product_id)
  values (p_workspace, c, date_trunc('month', now()) + interval '1 month', p_platform, p_token, p_product);
  return 'ok';
end $$;

-- Uygulama: ek paket satın alınabilir mi (düğmeyi göstermek için; asıl kontrol grant_quota_pack'te)
create or replace function can_buy_quota_pack(p_workspace uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select q.hybrid and q.manual_left < greatest(1, floor(q.manual_cap * 0.10))
                     from quota_status(p_workspace) q where is_member(p_workspace)), false);
$$;

-- Sunucu: token'dan alanı bul (RTDN bildirimleri için)
create or replace function store_token_workspace(p_token text) returns uuid
language sql stable security definer set search_path = public as $$
  select workspace_id from store_subscriptions where purchase_token = p_token;
$$;

-- İşçi: Google'a yeniden sorulacak abonelikler (etkin olanlar ya da yakın zamanda bitmiş olanlar; 6 saatte bir).
-- Gerçek zamanlı bildirim (RTDN) kurulmasa da yenileme/iptal/süre dolması böyle yakalanır.
create or replace function store_subscriptions_due(p_limit int default 50)
returns table (purchase_token text, workspace_id uuid, product_id text)
language sql stable security definer set search_path = public as $$
  select s.purchase_token, s.workspace_id, s.product_id from store_subscriptions s
   where s.platform = 'google_play' and s.updated_at < now() - interval '6 hours'
     and (s.active or s.expiry_at > now() - interval '3 days')
   order by s.updated_at limit p_limit;
$$;
revoke all on function store_subscriptions_due(int) from public;

revoke all on function apply_store_subscription(text, text, uuid, uuid, text, text, timestamptz, boolean, text, text) from public;
revoke all on function grant_quota_pack(text, text, uuid, uuid, text) from public;
revoke all on function store_token_workspace(text) from public;
revoke all on function can_buy_quota_pack(uuid) from public;
grant execute on function can_buy_quota_pack(uuid) to authenticated;
do $$ declare f text; begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    foreach f in array array['apply_store_subscription(text, text, uuid, uuid, text, text, timestamptz, boolean, text, text)', 'grant_quota_pack(text, text, uuid, uuid, text)',
                             'store_token_workspace(text)', 'can_buy_quota_pack(uuid)', 'quota_status(uuid)'] loop
      execute format('revoke all on function %s from anon', f);
    end loop;
    execute 'revoke all on function store_subscriptions_due(int) from anon';
    foreach f in array array['apply_store_subscription(text, text, uuid, uuid, text, text, timestamptz, boolean, text, text)', 'grant_quota_pack(text, text, uuid, uuid, text)', 'store_token_workspace(text)', 'store_subscriptions_due(int)'] loop
      execute format('revoke all on function %s from authenticated', f);
      execute format('grant execute on function %s to service_role', f);
    end loop;
  end if;
end $$;
