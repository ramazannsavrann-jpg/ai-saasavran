-- 0023: Platform yöneticisi müşteri çalışma alanlarına ücretsiz paket verebilir (Plus / Pro / Business), süreli ya da süresiz.
-- Ödeme alınmaz; API maliyeti platforma yazılır. Paket kotaları ve harcama tavanları aynen geçerli.
-- Gerçek (Paddle) aboneliği olan alana dokunulmaz. Her işlem admin_log'a yazılır.
alter table workspaces add column comped boolean not null default false;
alter table workspaces add column comped_until date;

create table admin_log (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  admin_id   uuid not null,
  workspace_id uuid references workspaces(id) on delete set null,
  action     text not null,
  detail     jsonb not null default '{}'
);
alter table admin_log enable row level security;
create policy admin_log_read on admin_log for select using (is_platform_admin());

create or replace function admin_workspaces()
returns table (id uuid, name text, kind workspace_kind, plan text, status text, subscription_status text, comped boolean, comped_until date,
               has_paddle boolean, owner_email text, brands int, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_platform_admin() then raise exception 'Yetki yok'; end if;
  return query
    select w.id, w.name, w.kind, w.plan, w.status::text, w.subscription_status, w.comped, w.comped_until,
           w.paddle_subscription_id is not null,
           (select u.email::text from workspace_members m join auth.users u on u.id = m.user_id where m.workspace_id = w.id and m.role = 'owner' order by m.created_at limit 1),
           (select count(*)::int from brands b where b.workspace_id = w.id and not b.is_competitor),
           w.created_at
      from workspaces w where w.kind in ('business', 'agency') order by w.created_at desc;
end $$;

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
  elsif p_plan in ('starter', 'pro', 'agency') then
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

-- Süresi dolan ücretsiz paketler Free'ye döner (işçi her saat çağırır). Paddle aboneliği olan alana dokunmaz.
create or replace function expire_comped() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with x as (
    update workspaces set plan = 'free', subscription_status = null, paid_live_allowed = false, comped = false, comped_until = null
     where comped and comped_until is not null and comped_until < current_date and paddle_subscription_id is null
     returning id
  )
  select count(*) into n from x;
  return n;
end $$;

-- Gerçek abonelik gelirse "ücretsiz verildi" işareti kalkar
create or replace function clear_comped_on_paddle() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.paddle_subscription_id is not null and new.paddle_subscription_id is distinct from old.paddle_subscription_id then
    new.comped := false; new.comped_until := null;
  end if;
  return new;
end $$;
create trigger workspaces_clear_comped before update of paddle_subscription_id on workspaces for each row execute function clear_comped_on_paddle();

revoke all on function admin_workspaces() from public;
revoke all on function admin_set_plan(uuid, text, date) from public;
revoke all on function expire_comped() from public;
revoke all on function clear_comped_on_paddle() from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function admin_workspaces() from anon;
    revoke all on function admin_set_plan(uuid, text, date) from anon;
    grant execute on function admin_workspaces() to authenticated;
    grant execute on function admin_set_plan(uuid, text, date) to authenticated;
    revoke all on function expire_comped() from anon, authenticated;
    grant execute on function expire_comped() to service_role;
    revoke all on function clear_comped_on_paddle() from anon, authenticated;
    revoke all on admin_log from anon;
    revoke insert, update, delete on admin_log from authenticated;
    -- istemci kendi alanında comped alanlarını değiştiremez
    revoke update (comped, comped_until) on workspaces from authenticated;
  end if;
end $$;
