-- 0032: Düşüş uyarısı. Bir ölçüm bittiğinde aynı markanın aynı türdeki önceki ölçümüyle karşılaştırılır (işçi, ek API yok);
-- önerilme oranı istatistiksel olarak belirgin düştüyse çalışma alanı üyelerine e-posta gider. Her ölçüm bir kez kontrol edilir.
alter table email_prefs add column drop_alerts boolean not null default true;

create table drop_alerts (
  run_id      uuid primary key references runs(id) on delete cascade,
  prev_run_id uuid references runs(id) on delete set null,
  brand_id    uuid not null references brands(id) on delete cascade,
  checked_at  timestamptz not null default now(),
  alerted     boolean not null default false,
  sent        int not null default 0,
  detail      jsonb
);
alter table drop_alerts enable row level security;  -- doğrudan erişim yok; yalnız sunucu

-- Sunucu: kontrol bekleyen ölçümler (son 3 gün, bitmiş, gerçek, müşteri çalışma alanı) ve karşılaştırılacak önceki ölçüm
create or replace function pending_drop_checks(p_limit int default 50)
returns table (run_id uuid, prev_run_id uuid, brand_id uuid, brand_name text, workspace_id uuid, measurement_type text, providers text[])
language sql stable security definer set search_path = public as $$
  select r.id,
         (select p.id from runs p
           where p.brand_id = r.brand_id and p.measurement_type = r.measurement_type and p.status = 'done'
             and p.trigger <> 'seed' and p.created_at < r.created_at
           order by p.created_at desc limit 1),
         r.brand_id, b.name, r.workspace_id, r.measurement_type::text,
         array(select distinct x.provider from responses x where x.run_id = r.id order by 1)
    from runs r
    join brands b on b.id = r.brand_id and not b.is_competitor
    join workspaces w on w.id = r.workspace_id and w.kind in ('business', 'agency')
   where r.status = 'done' and r.data_origin = 'live_api' and r.trigger <> 'seed'
     and r.created_at > now() - interval '3 days'
     and not exists (select 1 from drop_alerts d where d.run_id = r.id)
   order by r.created_at
   limit p_limit;
$$;

-- Sunucu: uyarı alacak üyeler (tercihi açık olanlar)
create or replace function drop_alert_recipients(p_workspace uuid)
returns table (user_id uuid, lang text)
language sql stable security definer set search_path = public as $$
  select m.user_id, coalesce(p.lang, 'en')
    from workspace_members m left join email_prefs p on p.user_id = m.user_id
   where m.workspace_id = p_workspace and coalesce(p.drop_alerts, true);
$$;

create or replace function record_drop_check(p_run uuid, p_prev uuid, p_brand uuid, p_alerted boolean, p_sent int, p_detail jsonb)
returns void language sql security definer set search_path = public as $$
  insert into drop_alerts (run_id, prev_run_id, brand_id, alerted, sent, detail) values (p_run, p_prev, p_brand, p_alerted, p_sent, p_detail)
  on conflict (run_id) do nothing;
$$;

-- Kullanıcı: düşüş uyarısı tercihi (kendi kaydı)
create or replace function set_drop_alerts(p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  insert into email_prefs (user_id, drop_alerts) values (auth.uid(), p_on)
  on conflict (user_id) do update set drop_alerts = p_on, updated_at = now();
end $$;
create or replace function my_drop_alerts() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select drop_alerts from email_prefs where user_id = auth.uid()), true);
$$;

-- Sunucu: e-postadaki bağlantıyla düşüş uyarısını kapatma
create or replace function unsubscribe_drop_alerts(p_token uuid) returns boolean
language sql security definer set search_path = public as $$
  update email_prefs set drop_alerts = false, updated_at = now() where token = p_token returning true;
$$;

do $$
declare f text;
begin
  foreach f in array array['pending_drop_checks(int)', 'drop_alert_recipients(uuid)', 'record_drop_check(uuid, uuid, uuid, boolean, int, jsonb)', 'unsubscribe_drop_alerts(uuid)'] loop
    execute format('revoke all on function %s from public', f);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke all on function %s from anon, authenticated', f);
      execute format('grant execute on function %s to service_role', f);
    end if;
  end loop;
  foreach f in array array['set_drop_alerts(boolean)', 'my_drop_alerts()'] loop
    execute format('revoke all on function %s from public', f);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke all on function %s from anon', f);
      execute format('grant execute on function %s to authenticated', f);
    end if;
  end loop;
end $$;
