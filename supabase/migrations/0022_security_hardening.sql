-- 0022: Güvenlik sıkılaştırması (Supabase güvenlik denetçisi bulguları).
-- 1) Giriş yapmamış ziyaretçi (anon) yalnız oturum gerektiren SECURITY DEFINER fonksiyonları çağıramasın.
--    Fonksiyonlar zaten üyelik kontrolü yapıyor (anon için boş döner); bu, ikinci bir kilit.
--    is_member ve is_platform_admin açık kalır: satır güvenliği (RLS) kuralları bunları her rolde çağırır.
-- 2) Tetikleyici fonksiyonları API'den hiç çağrılamasın.
-- 3) Arama yolu (search_path) sabit olmayan iki fonksiyona sabit yol verilir.
do $$
declare f text;
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    foreach f in array array[
      'billing_customer(uuid)', 'billing_summary(uuid)', 'paid_budget(uuid)', 'workspace_usage(uuid)',
      'create_workspace(text, workspace_kind)', 'rename_workspace(uuid, text)', 'request_site_audit(uuid)',
      'my_email_prefs()', 'set_email_prefs(text, boolean)'
    ] loop
      if to_regprocedure(f) is not null then
        execute format('revoke execute on function %s from public, anon', f);
        execute format('grant execute on function %s to authenticated', f);
      end if;
    end loop;
    foreach f in array array['flag_reanalysis()', 'guard_simulated()', 'guard_products_shopping()'] loop
      if to_regprocedure(f) is not null then
        execute format('revoke execute on function %s from public, anon, authenticated', f);
      end if;
    end loop;
  end if;
end $$;

alter function guard_simulated() set search_path = public;
alter function gemini_free_restricted(text) set search_path = public;
