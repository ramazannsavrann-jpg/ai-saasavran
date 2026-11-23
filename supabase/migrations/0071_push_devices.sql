-- Telefon bildirimleri (mobil uygulama, 24 Kasım): cihaz kaydı ve gönderim kaydı.
-- Bildirim metinleri rakip dili içermez (23 Kasım kararı): "Haftalık ölçüm yapıldı", "Sorgunuz hazır".

create table if not exists push_devices (
  token        text primary key,
  user_id      uuid not null,  -- hesap silinince delete_my_account() user_id sütunlu tüm tabloları temizler
  platform     text not null check (platform in ('android', 'ios')),
  lang         text not null default 'tr' check (lang in ('tr', 'en')),
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists push_devices_user on push_devices(user_id);
alter table push_devices enable row level security;
drop policy if exists push_devices_own on push_devices;
create policy push_devices_own on push_devices for select using (user_id = auth.uid());

-- Hangi ölçüm için bildirim gönderildi (aynı ölçüm iki kez bildirilmez)
create table if not exists push_sent (
  run_id     uuid primary key references runs(id) on delete cascade,
  sent       int not null default 0,
  created_at timestamptz not null default now()
);
alter table push_sent enable row level security;

-- Kullanıcı: kendi cihazını kaydeder / günceller (aynı token başka kullanıcıdaysa bu kullanıcıya geçer: telefonda hesap değişti)
create or replace function register_push_device(p_token text, p_platform text, p_lang text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if p_token is null or length(p_token) < 20 or length(p_token) > 4096 then raise exception 'invalid_token'; end if;
  insert into push_devices (token, user_id, platform, lang)
  values (p_token, auth.uid(), p_platform, case when p_lang = 'en' then 'en' else 'tr' end)
  on conflict (token) do update set user_id = excluded.user_id, platform = excluded.platform, lang = excluded.lang, last_seen_at = now();
end $$;

-- Kullanıcı: bu cihazda bildirimleri kapatır
create or replace function unregister_push_device(p_token text) returns void
language sql security definer set search_path = public as $$
  delete from push_devices where token = p_token and user_id = auth.uid();
$$;

-- İşçi: son 2 günde biten, henüz bildirilmemiş ölçümler ve bildirim alacak cihazlar
create or replace function pending_run_pushes(p_limit int default 100)
returns table (run_id uuid, brand_name text, trigger text, token text, lang text)
language sql stable security definer set search_path = public as $$
  with r as (
    select ru.id, ru.workspace_id, ru.trigger, b.name
      from runs ru join brands b on b.id = ru.brand_id
     where ru.status = 'done' and ru.finished_at > now() - interval '2 days'
       and ru.data_origin = 'live_api' and not b.is_competitor
       and not exists (select 1 from push_sent s where s.run_id = ru.id)
     order by ru.finished_at
     limit p_limit
  )
  select r.id, r.name, r.trigger::text, d.token, d.lang
    from r join workspace_members m on m.workspace_id = r.workspace_id
           join push_devices d on d.user_id = m.user_id
  union all
  -- cihazı olmayan ölçümler de işaretlensin diye boş satır (token null)
  select r.id, r.name, r.trigger::text, null, null from r
$$;

create or replace function record_run_push(p_run uuid, p_sent int) returns void
language sql security definer set search_path = public as $$
  insert into push_sent (run_id, sent) values (p_run, p_sent) on conflict (run_id) do nothing;
$$;

create or replace function drop_push_device(p_token text) returns void
language sql security definer set search_path = public as $$
  delete from push_devices where token = p_token;
$$;

revoke all on function pending_run_pushes(int) from public;
revoke all on function record_run_push(uuid, int) from public;
revoke all on function drop_push_device(text) from public;
revoke all on function register_push_device(text, text, text) from public;
revoke all on function unregister_push_device(text) from public;
grant execute on function register_push_device(text, text, text) to authenticated;
grant execute on function unregister_push_device(text) to authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function pending_run_pushes(int) to service_role;
    grant execute on function record_run_push(uuid, int) to service_role;
    grant execute on function drop_push_device(text) to service_role;
    grant select on push_devices to authenticated;
  end if;
end $$;
