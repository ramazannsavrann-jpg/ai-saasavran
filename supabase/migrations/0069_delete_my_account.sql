-- 0069: Kullanıcı hesabını kendisi siler (Google Play / App Store şartı + site).
-- Kurallar:
--  * Aktif/deneme/gecikmiş Paddle aboneliği olan alanın sahibi önce aboneliği iptal etmeli ('active_subscription').
--  * Platform yöneticisi bu yoldan silinemez ('admin').
--  * Kullanıcının tek sahibi olduğu alanda başka üye varsa sahiplik en eski üyeye geçer (ekibin verisi silinmez);
--    başka üye yoksa alan ve tüm verisi (markalar, ölçümler, raporlar) silinir.
--  * public şemadaki user_id sütunlu tüm kişisel kayıtlar ve davetleri silinir; en sonda auth.users kaydı silinir.
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

  if exists (
    select 1 from workspace_members m join workspaces ws on ws.id = m.workspace_id
    where m.user_id = uid and m.role = 'owner'
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

revoke all on function delete_my_account() from public;
grant execute on function delete_my_account() to authenticated;
