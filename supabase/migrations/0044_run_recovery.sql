-- 0044: Başarısız müşteri ölçümlerinin otomatik telafisi.
-- Bir müşterinin ölçümü geçici bir hatayla (kota, sağlayıcı hatası, zaman aşımı) hiç sonuç almadan biterse
-- işçi 30 dk sonra aynı ölçümü yeniden sıraya koyar (en çok 3 deneme, 7 gün içinde).
-- Telafi ölçümü başarıyla bitince müşteriye bir kez "sonuçlarınız hazır" e-postası gider.
-- Telafi ölçümü aylık ölçüm hakkından düşmez (başarısız olan zaten sayılmıyordu; yerine geçen de sayılmaz).

alter table runs drop constraint if exists runs_trigger_check;
alter table runs add constraint runs_trigger_check check (trigger in ('manual', 'weekly', 'seed', 'recovery'));
alter table runs add column if not exists retry_of uuid references runs(id) on delete set null;
alter table runs add column if not exists recovery_notified_at timestamptz;
create index if not exists runs_retry_of_idx on runs(retry_of) where retry_of is not null;

-- Zincirin ilk (asıl) ölçümü
create or replace function run_root(p_run uuid) returns uuid
language sql stable security definer set search_path = public as $$
  with recursive c as (
    select id, retry_of, 0 as d from runs where id = p_run
    union all
    select r.id, r.retry_of, c.d + 1 from runs r join c on r.id = c.retry_of where c.d < 10
  )
  select id from c where retry_of is null limit 1;
$$;

create or replace function runs_this_month(p_workspace uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from runs
   where workspace_id = p_workspace and data_origin = 'live_api' and trigger not in ('seed', 'recovery')
     and status not in ('failed', 'budget_blocked') and created_at >= date_trunc('month', now());
$$;

-- Telafi gereken başarısız ölçümleri yeniden sıraya koyar. Döner: eklenen ölçüm sayısı.
create or replace function schedule_recovery_runs(p_limit int default 20, p_delay_minutes int default 30, p_max_attempts int default 3)
returns int
language plpgsql security definer set search_path = public as $$
declare f record; n int := 0; root uuid; attempts int;
begin
  for f in
    select r.* from runs r
      join workspaces w on w.id = r.workspace_id
     where r.status = 'failed' and coalesce(r.calls_ok, 0) = 0
       and r.data_origin = 'live_api' and r.trigger <> 'seed'
       and w.kind in ('business', 'agency') and w.status = 'active'
       and coalesce(r.error_class::text, 'transient') not in ('auth_error', 'invalid_request', 'model_not_found', 'unsupported_feature')
       and coalesce(r.stop_reason, '') not in ('provider_not_configured')
       and coalesce(r.finished_at, r.created_at) < now() - make_interval(mins => p_delay_minutes)
       and r.created_at > now() - interval '7 days'
       -- bu ölçümün yerine zaten bir deneme yapılmadıysa
       and not exists (select 1 from runs x where x.retry_of = r.id)
       -- marka için bekleyen ölçüm yoksa
       and not exists (select 1 from runs q where q.brand_id = r.brand_id and q.status in ('queued', 'running'))
       -- aynı türde sonradan başarılı bir ölçüm yapılmadıysa
       and not exists (select 1 from runs d where d.brand_id = r.brand_id and d.measurement_type = r.measurement_type
                         and d.status = 'done' and d.created_at > r.created_at)
       and exists (select 1 from brands b where b.id = r.brand_id)
     order by r.created_at
     limit p_limit
  loop
    root := run_root(f.id);
    select count(*) into attempts from runs where id = root or (retry_of is not null and run_root(id) = root);
    continue when attempts >= p_max_attempts;
    -- canlı aramalı ölçüm yalnız hâlâ izinli alanda tekrar edilir
    continue when f.measurement_type = 'live_search' and not (select paid_live_allowed from workspaces where id = f.workspace_id);
    insert into runs (workspace_id, brand_id, status, data_origin, measurement_type, max_cost_usd, prompts_total, trigger, retry_of)
    values (f.workspace_id, f.brand_id, 'queued', 'live_api', f.measurement_type, f.max_cost_usd,
            (select count(*) from prompts where brand_id = f.brand_id and active), 'recovery', f.id);
    n := n + 1;
  end loop;
  return n;
end $$;

-- Başarıyla biten ve henüz bildirilmemiş telafi ölçümleri (alıcılarla)
create or replace function pending_recovery_emails(p_limit int default 50)
returns table (run_id uuid, brand_id uuid, brand_name text, workspace_id uuid, measurement_type text, provider text,
               user_id uuid, email text, lang text)
language plpgsql stable security definer set search_path = public as $$
begin
  return query
    select r.id, r.brand_id, b.name, r.workspace_id, r.measurement_type::text, r.provider,
           u.id, u.email::text,
           coalesce(p.lang, case when u.raw_user_meta_data->>'lang' in ('en', 'tr') then u.raw_user_meta_data->>'lang' end, 'en')
      from runs r
      join brands b on b.id = r.brand_id
      join workspace_members m on m.workspace_id = r.workspace_id and m.role in ('owner', 'admin')
      join auth.users u on u.id = m.user_id
      left join email_prefs p on p.user_id = u.id
     where r.trigger = 'recovery' and r.status = 'done' and coalesce(r.calls_ok, 0) > 0
       and r.recovery_notified_at is null and r.finished_at > now() - interval '3 days'
       and u.email is not null and u.email_confirmed_at is not null
     order by r.finished_at
     limit p_limit;
end $$;

create or replace function mark_recovery_notified(p_run uuid) returns void
language sql security definer set search_path = public as $$
  update runs set recovery_notified_at = now() where id = p_run and recovery_notified_at is null;
$$;

revoke all on function run_root(uuid) from public;
revoke all on function runs_this_month(uuid) from public;
revoke all on function schedule_recovery_runs(int, int, int) from public;
revoke all on function pending_recovery_emails(int) from public;
revoke all on function mark_recovery_notified(uuid) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function run_root(uuid) from anon, authenticated;
    revoke all on function runs_this_month(uuid) from anon, authenticated;
    revoke all on function schedule_recovery_runs(int, int, int) from anon, authenticated;
    revoke all on function pending_recovery_emails(int) from anon, authenticated;
    revoke all on function mark_recovery_notified(uuid) from anon, authenticated;
  end if;
end $$;
