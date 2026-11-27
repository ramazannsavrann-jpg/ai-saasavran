-- Altın: takım sınırı 1 kişi (sahip kararı, 22 Kasım 2026; 0063 ile 2 kişi olarak açılmıştı).
update plans set max_members = 1 where id = 'altin';

-- Paddle abonelik olayları: Altın da geçerli bir paket (0009'daki listeye eklendi). Gövde 0009 ile aynı.
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
