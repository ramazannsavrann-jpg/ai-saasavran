-- Altın paketi (250 $/ay) ve ücretli aylık tavanlar (22 Kasım 2026 sahip onayı).
-- Tavanlar: Gümüş 45 $, Altın 100 $, Platin 250 $, Elmas 750 $. Kota (çağrı) sınırı değişmedi.
-- Altın: 3 marka, marka başı 30 soru, 6 rakip, aylık 2.340 çağrı, ChatGPT + Claude + Perplexity + Gemini.

insert into plans (id, name, price_usd, max_brands, max_prompts_per_brand, max_competitors, monthly_engine_calls, monthly_paid_cap_usd)
values ('altin', 'Altın', 250, 3, 30, 6, 2340, 100)
on conflict (id) do update set
  name = excluded.name,
  price_usd = excluded.price_usd,
  max_brands = excluded.max_brands,
  max_prompts_per_brand = excluded.max_prompts_per_brand,
  max_competitors = excluded.max_competitors,
  monthly_engine_calls = excluded.monthly_engine_calls,
  monthly_paid_cap_usd = excluded.monthly_paid_cap_usd;

update plans set monthly_paid_cap_usd = 45  where id = 'starter';
update plans set monthly_paid_cap_usd = 250 where id = 'pro';
update plans set monthly_paid_cap_usd = 750 where id = 'agency';

-- Takım üye sınırı: Altın için 2 kişi.
update plans set max_members = 2 where id = 'altin';

-- Abonelik kontrolü: Altın da ücretli paket sayılır.
create or replace function is_subscribed(p_workspace uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from workspaces where id = p_workspace and kind in ('business', 'agency')
                 and plan in ('starter', 'altin', 'pro', 'agency') and subscription_status in ('active', 'trialing', 'past_due'));
$$;

alter table workspaces drop constraint paid_live_only_lab_or_subscriber;
alter table workspaces add constraint paid_live_only_lab_or_subscriber check (
  not paid_live_allowed or kind = 'growth_lab'
  or (kind in ('business', 'agency') and plan in ('starter', 'altin', 'pro', 'agency') and coalesce(subscription_status, '') in ('active', 'trialing', 'past_due')));

-- Yönetici paket atama: altin eklendi (diğer kurallar 0023 ile aynı).
create or replace function admin_set_plan(p_workspace uuid, p_plan text, p_until date default null) returns text
language plpgsql security definer set search_path = public as $$
declare w record;
begin
  if not is_platform_admin() then raise exception 'Yetki yok'; end if;
  select * into w from workspaces where id = p_workspace for update;
  if not found then raise exception 'Çalışma alanı bulunamadı'; end if;
  if w.kind not in ('business', 'agency') then raise exception 'Yalnız müşteri çalışma alanlarına paket verilebilir'; end if;
  if w.paddle_subscription_id is not null and w.subscription_status in ('active', 'trialing', 'past_due') then
    raise exception 'Bu alanın ücretli (Paddle) aboneliği var; paketi abonelikten yönetilir';
  end if;
  if p_until is not null and p_until < current_date then raise exception 'Bitiş tarihi geçmişte olamaz'; end if;
  if p_plan = 'free' then
    update workspaces set plan = 'free', subscription_status = null, paid_live_allowed = false, comped = false, comped_until = null where id = p_workspace;
  elsif p_plan in ('starter', 'altin', 'pro', 'agency') then
    update workspaces set plan = p_plan, subscription_status = 'active', paid_live_allowed = true, comped = true, comped_until = p_until,
      status = case when status = 'paused' and paused_reason in ('monthly_call_quota', 'monthly_cost_cap') then 'active' else status end,
      paused_reason = case when status = 'paused' and paused_reason in ('monthly_call_quota', 'monthly_cost_cap') then null else paused_reason end
    where id = p_workspace;
  else
    raise exception 'Bilinmeyen paket: %', p_plan;
  end if;
  insert into admin_log (admin_id, workspace_id, action, detail)
    values (auth.uid(), p_workspace, 'set_plan', jsonb_build_object('from', w.plan, 'to', p_plan, 'until', p_until));
  return 'ok';
end $$;
