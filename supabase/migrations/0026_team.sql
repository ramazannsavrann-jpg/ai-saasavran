-- 0026: Ekip daveti. Sahip/yönetici e-posta adresiyle davet eder; davet edilen kişi aynı e-postayla giriş yapınca
-- panelde daveti görür ve kabul eder (ya da davet bağlantısını açar). Paket başına kişi sınırı (sahip dahil).
alter table plans add column max_members int not null default 1 check (max_members >= 1);
update plans set max_members = case id when 'free' then 1 when 'starter' then 2 when 'pro' then 5 when 'agency' then 15 else 50 end;

create table workspace_invites (
  id           uuid primary key default gen_random_uuid(),
  token        uuid not null unique default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  email        text not null check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role         member_role not null check (role in ('admin', 'editor', 'viewer')),
  invited_by   uuid not null,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default now() + interval '14 days',
  accepted_at  timestamptz,
  revoked_at   timestamptz
);
create index on workspace_invites (workspace_id);
create index on workspace_invites (email);
alter table workspace_invites enable row level security;
create policy invites_read on workspace_invites for select using (is_member(workspace_id, 'admin'));

create or replace function my_email() returns text language plpgsql stable security definer set search_path = public as $$
begin
  return (select lower(email::text) from auth.users where id = auth.uid());
end $$;

-- Dolu koltuk: üyeler + bekleyen davetler
create or replace function seats_used(p_workspace uuid) returns int language sql stable security definer set search_path = public as $$
  select (select count(*)::int from workspace_members where workspace_id = p_workspace)
       + (select count(*)::int from workspace_invites where workspace_id = p_workspace and accepted_at is null and revoked_at is null and expires_at > now());
$$;

create or replace function create_invite(p_workspace uuid, p_email text, p_role member_role default 'editor') returns uuid
language plpgsql security definer set search_path = public as $$
declare w record; lim int; e text := lower(trim(p_email)); t uuid;
begin
  if not is_member(p_workspace, 'admin') then raise exception 'Davet için sahip ya da yönetici olmalısınız'; end if;
  select * into w from workspaces where id = p_workspace;
  if w.kind not in ('business', 'agency') then raise exception 'Bu çalışma alanına davet gönderilemez'; end if;
  if p_role not in ('admin', 'editor', 'viewer') then raise exception 'Geçersiz rol'; end if;
  if p_role = 'admin' and not is_member(p_workspace, 'owner') then raise exception 'Yönetici rolünü yalnız sahip verebilir'; end if;
  if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Geçerli bir e-posta adresi girin'; end if;
  if exists (select 1 from workspace_members m join auth.users u on u.id = m.user_id where m.workspace_id = p_workspace and lower(u.email::text) = e) then
    raise exception 'Bu kişi zaten ekipte';
  end if;
  if exists (select 1 from workspace_invites where workspace_id = p_workspace and email = e and accepted_at is null and revoked_at is null and expires_at > now()) then
    raise exception 'Bu adrese zaten bekleyen bir davet var';
  end if;
  select max_members into lim from plans where id = w.plan;
  if seats_used(p_workspace) >= lim then
    raise exception 'Paketinizde en fazla % kişi olabilir (sahip dahil). Paketi yükseltin ya da bir daveti iptal edin.', lim;
  end if;
  insert into workspace_invites (workspace_id, email, role, invited_by) values (p_workspace, e, p_role, auth.uid()) returning token into t;
  return t;
end $$;

create or replace function revoke_invite(p_invite uuid) returns void
language plpgsql security definer set search_path = public as $$
declare i record;
begin
  select * into i from workspace_invites where id = p_invite;
  if not found or not is_member(i.workspace_id, 'admin') then raise exception 'Davet bulunamadı'; end if;
  update workspace_invites set revoked_at = now() where id = p_invite and accepted_at is null;
end $$;

-- Giriş yapan kişiye gelen bekleyen davetler (e-posta eşleşmesiyle)
create or replace function my_invites() returns table (id uuid, token uuid, workspace_name text, role member_role, expires_at timestamptz)
language sql stable security definer set search_path = public as $$
  select i.id, i.token, w.name, i.role, i.expires_at
    from workspace_invites i join workspaces w on w.id = i.workspace_id
   where i.email = my_email() and i.accepted_at is null and i.revoked_at is null and i.expires_at > now()
     and not exists (select 1 from workspace_members m where m.workspace_id = i.workspace_id and m.user_id = auth.uid())
   order by i.created_at desc;
$$;

create or replace function accept_invite(p_token uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare i record;
begin
  if auth.uid() is null then raise exception 'Önce giriş yapın'; end if;
  select * into i from workspace_invites where token = p_token for update;
  if not found or i.revoked_at is not null then raise exception 'Davet bulunamadı ya da iptal edildi'; end if;
  if i.accepted_at is not null then
    if exists (select 1 from workspace_members where workspace_id = i.workspace_id and user_id = auth.uid()) then return i.workspace_id; end if;
    raise exception 'Bu davet daha önce kullanıldı';
  end if;
  if i.expires_at <= now() then raise exception 'Davetin süresi dolmuş; yeni davet isteyin'; end if;
  if i.email <> my_email() then raise exception 'Bu davet başka bir e-posta adresine gönderildi. Davet edilen adresle giriş yapın.'; end if;
  insert into workspace_members (workspace_id, user_id, role) values (i.workspace_id, auth.uid(), i.role) on conflict do nothing;
  update workspace_invites set accepted_at = now() where id = i.id;
  return i.workspace_id;
end $$;

-- Ekip listesi (üyeler görür): e-posta ve rol
create or replace function workspace_team(p_workspace uuid) returns table (user_id uuid, email text, role member_role, joined_at timestamptz, is_me boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  return query
    select m.user_id, u.email::text, m.role, m.created_at, m.user_id = auth.uid()
      from workspace_members m join auth.users u on u.id = m.user_id
     where m.workspace_id = p_workspace and is_member(p_workspace)
     order by (m.role = 'owner') desc, m.created_at;
end $$;

create or replace function set_member_role(p_workspace uuid, p_user uuid, p_role member_role) returns void
language plpgsql security definer set search_path = public as $$
declare cur member_role;
begin
  if not is_member(p_workspace, 'admin') then raise exception 'Yetki yok'; end if;
  select role into cur from workspace_members where workspace_id = p_workspace and user_id = p_user;
  if not found then raise exception 'Üye bulunamadı'; end if;
  if cur = 'owner' or p_role = 'owner' then raise exception 'Sahiplik buradan değiştirilemez'; end if;
  if (cur = 'admin' or p_role = 'admin') and not is_member(p_workspace, 'owner') then raise exception 'Yönetici rolünü yalnız sahip değiştirebilir'; end if;
  update workspace_members set role = p_role where workspace_id = p_workspace and user_id = p_user;
end $$;

-- Üyeyi çıkarma (yönetici) ya da ekipten ayrılma (kendisi). Sahip çıkarılamaz.
create or replace function remove_member(p_workspace uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare cur member_role;
begin
  select role into cur from workspace_members where workspace_id = p_workspace and user_id = p_user;
  if not found then raise exception 'Üye bulunamadı'; end if;
  if cur = 'owner' then raise exception 'Çalışma alanının sahibi çıkarılamaz'; end if;
  if p_user <> auth.uid() then
    if not is_member(p_workspace, 'admin') then raise exception 'Yetki yok'; end if;
    if cur = 'admin' and not is_member(p_workspace, 'owner') then raise exception 'Yöneticiyi yalnız sahip çıkarabilir'; end if;
  end if;
  delete from workspace_members where workspace_id = p_workspace and user_id = p_user;
end $$;

do $$
declare f text;
begin
  foreach f in array array['my_email()', 'seats_used(uuid)', 'create_invite(uuid, text, member_role)', 'revoke_invite(uuid)', 'my_invites()',
                           'accept_invite(uuid)', 'workspace_team(uuid)', 'set_member_role(uuid, uuid, member_role)', 'remove_member(uuid, uuid)'] loop
    execute format('revoke all on function %s from public', f);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke all on function %s from anon', f);
      execute format('grant execute on function %s to authenticated', f);
    end if;
  end loop;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on workspace_invites from anon;
    revoke insert, update, delete on workspace_invites from authenticated;
  end if;
end $$;
