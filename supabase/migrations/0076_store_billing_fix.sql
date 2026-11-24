-- 0076: Mağaza ödemesi düzeltmeleri (Play öncesi inceleme, 24 Kasım).
--  * Paddle etkin olunca billing_source='paddle' olur; eski Play token'ının bitişi siteden ödeyen alanı düşürmez (ve tersi).
--  * Bekleyen (PENDING) satın alma pakete dokunmaz; tamamlanınca işçi yakalar.
--  * Aynı alanda yenilenen ikinci mağaza aboneliği reddedilir (çift ücret olmasın; onaylanmayan satın almayı Google iade eder).
--  * Paket, alanın etkin mağaza aboneliklerinin en yükseğinden yeniden hesaplanır (biri bitince doğru pakete iner).
--  * Hesap silme: iptal edilmiş (yenilenmeyecek) Google Play aboneliği engel değil; yenilenecekse ayrı sonuç döner.

create or replace function apply_subscription(
  p_workspace uuid, p_plan text, p_status text, p_subscription text, p_customer text, p_period_end timestamptz
) returns text language plpgsql security definer set search_path = public as $$
declare w record; active boolean := p_status in ('active', 'trialing', 'past_due');
begin
  select * into w from workspaces where id = p_workspace for update;
  if not found then return 'workspace_not_found'; end if;
  if w.kind not in ('business', 'agency') then return 'not_customer_workspace'; end if;
  if p_plan not in ('starter', 'altin', 'pro', 'agency') then return 'unknown_plan'; end if;
  -- Eski bir aboneliğin iptal olayı, alanın yeni aktif aboneliğini geri almasın
  if w.paddle_subscription_id is not null and w.paddle_subscription_id <> p_subscription
     and w.subscription_status in ('active', 'trialing', 'past_due') and not active then
    return 'stale_event';
  end if;
  -- Alan şu an mağaza (Google Play) aboneliğiyle ödüyorsa, eski Paddle aboneliğinin pasif olayı onu düşürmesin
  if not active and w.billing_source <> 'paddle' and w.subscription_status in ('active', 'trialing', 'past_due') then
    return 'other_billing_source';
  end if;
  update workspaces set
    plan = case when active then p_plan else 'free' end,
    subscription_status = p_status,
    paddle_subscription_id = p_subscription,
    billing_source = case when active then 'paddle' else billing_source end,
    paddle_customer_id = coalesce(p_customer, paddle_customer_id),
    current_period_end = p_period_end,
    paid_live_allowed = active,
    status = case when active and status = 'paused' and paused_reason in ('monthly_call_quota', 'monthly_cost_cap') then 'active' else status end,
    paused_reason = case when active and status = 'paused' and paused_reason in ('monthly_call_quota', 'monthly_cost_cap') then null else paused_reason end
  where id = p_workspace;
  return 'ok';
end $$;

create or replace function apply_store_subscription(
  p_platform text, p_token text, p_workspace uuid, p_user uuid, p_product text, p_state text,
  p_expiry timestamptz, p_auto boolean, p_order text, p_linked text default null
) returns text language plpgsql security definer set search_path = public as $$
declare w record; pl text := store_plan_for(p_product); act boolean; known record; best record;
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
  act := coalesce(p_state in ('SUBSCRIPTION_STATE_ACTIVE', 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD')
         or (p_state = 'SUBSCRIPTION_STATE_CANCELED' and p_expiry > now()), false);   -- iptal: dönem sonuna kadar kullanır
  -- Sitede (Paddle) etkin aboneliği olan alana mağazadan ikinci abonelik bağlanmaz
  if act and w.billing_source = 'paddle' and w.subscription_status in ('active', 'trialing', 'past_due') and w.paddle_subscription_id is not null then
    update store_subscriptions set updated_at = now() where purchase_token = p_token;
    return 'already_subscribed_web';
  end if;
  -- Yeni token, bağlı (linked) değil ve alanda yenilenecek başka etkin mağaza aboneliği var: çift abonelik
  if act and known.purchase_token is null and p_linked is null and exists (
       select 1 from store_subscriptions s where s.workspace_id = p_workspace and s.active and s.auto_renewing is not false) then
    return 'already_subscribed_store';
  end if;
  insert into store_subscriptions (purchase_token, platform, workspace_id, user_id, product_id, plan, state, active, expiry_at, auto_renewing, order_id, linked_token, updated_at)
  values (p_token, p_platform, p_workspace, p_user, p_product, pl, p_state, act, p_expiry, p_auto, p_order, p_linked, now())
  on conflict (purchase_token) do update set product_id = excluded.product_id, plan = excluded.plan, state = excluded.state,
    active = excluded.active, expiry_at = excluded.expiry_at, auto_renewing = excluded.auto_renewing,
    order_id = coalesce(excluded.order_id, store_subscriptions.order_id), updated_at = now();
  -- Ödemesi bekleyen satın alma: kaydedilir, pakete dokunulmaz (tamamlanınca işçi/yeniden doğrulama işler)
  if p_state = 'SUBSCRIPTION_STATE_PENDING' then return 'pending'; end if;
  if p_linked is not null then update store_subscriptions set active = false, updated_at = now() where purchase_token = p_linked; end if;
  -- Paket: alanın etkin mağaza aboneliklerinin en yükseği
  select s.* into best from store_subscriptions s where s.workspace_id = p_workspace and s.active
   order by case s.plan when 'pro' then 3 when 'altin' then 2 when 'starter' then 1 else 0 end desc, s.expiry_at desc nulls last limit 1;
  if not found then
    -- Etkin mağaza aboneliği kalmadı: alan şu an bu mağazayla ödüyorsa ücretsize iner; başka yolla (Paddle) ödüyorsa dokunulmaz
    if w.billing_source <> p_platform then return 'ok_not_billing_source'; end if;
    update workspaces set plan = 'free', subscription_status = 'canceled', current_period_end = p_expiry, paid_live_allowed = false
     where id = p_workspace;
    return 'ok';
  end if;
  update workspaces set
    plan = best.plan,
    subscription_status = case when best.state = 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD' then 'past_due' else 'active' end,
    billing_source = p_platform,
    current_period_end = best.expiry_at,
    paid_live_allowed = true,
    status = case when status = 'paused' and paused_reason in ('monthly_call_quota', 'monthly_cost_cap') then 'active' else status end,
    paused_reason = case when status = 'paused' and paused_reason in ('monthly_call_quota', 'monthly_cost_cap') then null else paused_reason end
  where id = p_workspace;
  return 'ok';
end $$;

-- İşçi: Google'a yeniden sorulacak abonelikler; ödemesi bekleyenler (süresi henüz yok) 7 gün boyunca da sorulur.
create or replace function store_subscriptions_due(p_limit int default 50)
returns table (purchase_token text, workspace_id uuid, product_id text)
language sql stable security definer set search_path = public as $$
  select s.purchase_token, s.workspace_id, s.product_id from store_subscriptions s
   where s.platform = 'google_play' and s.updated_at < now() - interval '6 hours'
     and (s.active or s.expiry_at > now() - interval '3 days'
          or (s.expiry_at is null and s.state = 'SUBSCRIPTION_STATE_PENDING' and s.updated_at > now() - interval '7 days'))
   order by s.updated_at limit p_limit;
$$;

create or replace function delete_my_account() returns text
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  w record;
  heir uuid;
  t record;
begin
  if uid is null then return 'not_signed_in'; end if;
  if exists (select 1 from platform_admins where user_id = uid) then return 'admin'; end if;

  -- Yenilenecek mağaza aboneliği (Google Play): önce Google Play'de iptal edilmeli. İptal edilmiş (yenilenmeyecek) olan engel değil.
  if exists (
    select 1 from workspace_members m join store_subscriptions s on s.workspace_id = m.workspace_id
    where m.user_id = uid and m.role = 'owner' and s.active and s.auto_renewing is not false
      and not exists (select 1 from workspace_members o where o.workspace_id = m.workspace_id and o.role = 'owner' and o.user_id <> uid)
  ) then
    return 'active_store_subscription';
  end if;
  -- Sitedeki (Paddle) etkin abonelik: önce sitede iptal edilmeli
  if exists (
    select 1 from workspace_members m join workspaces ws on ws.id = m.workspace_id
    where m.user_id = uid and m.role = 'owner' and ws.billing_source = 'paddle'
      and coalesce(ws.subscription_status, '') in ('active', 'trialing', 'past_due')
      and not exists (select 1 from workspace_members o where o.workspace_id = ws.id and o.role = 'owner' and o.user_id <> uid)
  ) then
    return 'active_subscription';
  end if;

  for w in
    select m.workspace_id from workspace_members m
    where m.user_id = uid and m.role = 'owner'
      and not exists (select 1 from workspace_members o where o.workspace_id = m.workspace_id and o.role = 'owner' and o.user_id <> uid)
  loop
    select o.user_id into heir from workspace_members o
      where o.workspace_id = w.workspace_id and o.user_id <> uid
      order by case o.role when 'admin' then 0 when 'editor' then 1 else 2 end, o.created_at
      limit 1;
    if heir is null then
      delete from workspaces where id = w.workspace_id;
    else
      update workspace_members set role = 'owner' where workspace_id = w.workspace_id and user_id = heir;
    end if;
  end loop;

  delete from workspace_invites where invited_by = uid;
  for t in
    select c.table_name from information_schema.columns c
    join information_schema.tables tb on tb.table_schema = c.table_schema and tb.table_name = c.table_name
    where c.table_schema = 'public' and c.column_name = 'user_id' and tb.table_type = 'BASE TABLE'
  loop
    execute format('delete from public.%I where user_id = $1', t.table_name) using uid;
  end loop;

  if to_regclass('auth.users') is not null then
    execute 'delete from auth.users where id = $1' using uid;
  end if;
  return 'deleted';
end $$;


do $$ declare f text; begin
  foreach f in array array['apply_store_subscription(text, text, uuid, uuid, text, text, timestamptz, boolean, text, text)',
                           'store_subscriptions_due(int)', 'apply_subscription(uuid, text, text, text, text, timestamptz)'] loop
    execute format('revoke all on function %s from public', f);
    if exists (select 1 from pg_roles where rolname = 'anon') then execute format('revoke all on function %s from anon', f); end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then execute format('revoke all on function %s from authenticated', f); end if;
    if exists (select 1 from pg_roles where rolname = 'service_role') then execute format('grant execute on function %s to service_role', f); end if;
  end loop;
  revoke all on function delete_my_account() from public;
  if exists (select 1 from pg_roles where rolname = 'anon') then execute 'revoke all on function delete_my_account() from anon'; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then execute 'grant execute on function delete_my_account() to authenticated'; end if;
end $$;
