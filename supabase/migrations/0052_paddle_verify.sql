-- Paddle güvenliği (18 Kasım denetimi):
-- 1) Yeni bir abonelik bir alana ancak checkout'u başlatan kullanıcı o alanın sahibi/yöneticisi/editörüyse bağlanır
--    (custom_data.user_id; tarayıcıdan gelen workspace_id tek başına yetmez). Aynı aboneliğin sonraki olayları (yenileme, iptal) geçer.
-- 2) Olay sırası saklanır: aynı aboneliğin daha eski bir olayı (geç gelen eski "active") yok sayılır.
alter table workspaces add column if not exists paddle_event_at timestamptz;

create or replace function apply_subscription_v2(
  p_workspace uuid, p_plan text, p_status text, p_subscription text, p_customer text, p_period_end timestamptz,
  p_user uuid, p_occurred timestamptz
) returns text language plpgsql security definer set search_path = public as $$
declare w record;
begin
  select * into w from workspaces where id = p_workspace for update;
  if not found then return 'workspace_not_found'; end if;
  if w.paddle_subscription_id is distinct from p_subscription then
    if p_user is null or not exists (
      select 1 from workspace_members m where m.workspace_id = p_workspace and m.user_id = p_user and m.role in ('owner', 'admin', 'editor')
    ) then
      return 'not_member';
    end if;
  elsif p_occurred is not null and w.paddle_event_at is not null and p_occurred < w.paddle_event_at then
    return 'stale_event';
  end if;
  declare res text;
  begin
    res := apply_subscription(p_workspace, p_plan, p_status, p_subscription, p_customer, p_period_end);
    if res = 'ok' and p_occurred is not null then
      update workspaces set paddle_event_at = greatest(coalesce(paddle_event_at, p_occurred), p_occurred) where id = p_workspace;
    end if;
    return res;
  end;
end $$;
revoke all on function apply_subscription_v2(uuid, text, text, text, text, timestamptz, uuid, timestamptz) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function apply_subscription_v2(uuid, text, text, text, text, timestamptz, uuid, timestamptz) from anon, authenticated;
  end if;
end $$;
