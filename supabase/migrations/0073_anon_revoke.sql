-- 0073: Giriş yapmamış ziyaretçi (anon) bu fonksiyonları çağıramasın (güvenlik denetimi, scripts/security-audit.mjs).
-- Supabase yeni fonksiyonlarda anon'a varsayılan çalıştırma izni verir; "revoke from public" bunu kaldırmaz.
-- delete_my_account (0069) ve soru hakkı fonksiyonları (0072) zaten oturum/üyelik kontrol ediyordu; yine de anon'a kapatılır.
do $$ declare f text; begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    foreach f in array array['delete_my_account()', 'my_quota(uuid)', 'quota_status(uuid)', 'quota_hybrid(uuid)', 'run_call_estimate(text, measurement_type, int, boolean)'] loop
      execute format('revoke all on function %s from anon', f);
    end loop;
  end if;
end $$;
