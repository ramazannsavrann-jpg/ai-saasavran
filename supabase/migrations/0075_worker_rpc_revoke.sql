-- 0075: Yalnız işçinin (service_role) çağırması gereken SECURITY DEFINER fonksiyonlar giriş yapmış kullanıcıya da kapalı.
-- 0071/0072/0073 bunları yalnız anon'dan almıştı; Supabase varsayılan olarak authenticated'a da EXECUTE verir.
-- Açık kalsaydı: başka kullanıcıların bildirim cihaz kayıtları okunabilir/silinebilir, başka alanın kotası görülebilirdi.
-- Uygulamanın kullandıkları (my_quota, can_buy_quota_pack) üyelik kontrolü yapar ve açık kalır.
do $$ declare f text; begin
  foreach f in array array['pending_run_pushes(int)', 'record_run_push(uuid, int)', 'drop_push_device(text)',
                           'quota_status(uuid)', 'quota_hybrid(uuid)'] loop
    execute format('revoke all on function %s from public', f);
    if exists (select 1 from pg_roles where rolname = 'anon') then execute format('revoke all on function %s from anon', f); end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then execute format('revoke all on function %s from authenticated', f); end if;
    if exists (select 1 from pg_roles where rolname = 'service_role') then execute format('grant execute on function %s to service_role', f); end if;
  end loop;
end $$;
