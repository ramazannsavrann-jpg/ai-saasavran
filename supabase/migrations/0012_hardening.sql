-- 0012: Sağlamlaştırma (11 Kasım 2026 denetimi)
--  1) Yarıda kesilen ölçümler "running" durumunda kalıyordu; markanın yeni ölçüm alması ve haftalık ölçüm engelleniyordu.
--  2) Aylık kota/harcama tavanı nedeniyle durdurulan çalışma alanı yeni ay başında kendiliğinden açılmıyordu.
--  3) Canlı aramalı ölçümde konum sabit "TR" idi; marka başına ülke (ISO 3166-1, iki harf) eklendi. Boşsa TR kalır.
-- Yalnız ekleme yapar; mevcut veriyi değiştirmez.

alter table brands add column country text check (country is null or country ~ '^[A-Z]{2}$');

-- İşçi her çalıştığında çağırır. Eşik, işçi iş süresi sınırından (45 dk) uzun olmalıdır.
create or replace function recover_stale_runs(p_minutes int default 60) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with stale as (
    select r.id,
           (select count(*)::int from responses x where x.run_id = r.id) as ok,
           (select x.provider from responses x where x.run_id = r.id limit 1) as provider,
           (select x.model from responses x where x.run_id = r.id limit 1) as model
      from runs r
     where r.status = 'running' and r.started_at < now() - make_interval(mins => p_minutes)
  )
  update runs r
     set status = (case when s.ok > 0 then 'done' else 'failed' end)::run_status,
         stop_reason = 'worker_timeout',
         error = 'Ölçüm yarıda kesildi (işçi zaman aşımı)',
         calls_ok = s.ok,
         provider = coalesce(r.provider, s.provider),
         model = coalesce(r.model, s.model),
         finished_at = now()
    from stale s where r.id = s.id;
  get diagnostics n = row_count;
  return n;
end $$;

-- Önceki ayda kota/tavan nedeniyle durdurulan alanları yeni ayda yeniden açar.
create or replace function resume_quota_paused() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update workspaces set status = 'active', paused_reason = null, paused_at = null
   where status = 'paused' and paused_reason in ('monthly_call_quota', 'monthly_cost_cap')
     and paused_at < date_trunc('month', now());
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function recover_stale_runs(int) from public;
revoke all on function resume_quota_paused() from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function recover_stale_runs(int) from anon, authenticated;
    revoke all on function resume_quota_paused() from anon, authenticated;
    grant execute on function recover_stale_runs(int) to service_role;
    grant execute on function resume_quota_paused() to service_role;
  end if;
end $$;
