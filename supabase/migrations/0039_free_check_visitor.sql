-- 0039: Ücretsiz kontrolü kim kullanıyor? İstemci türü (tarayıcı / bot / otomatik araç / bizim testimiz) ve ülke kaydedilir.
-- IP zaten yalnız şifrelenmiş (karma) olarak tutuluyor; yönetici görünümünde o da gösterilmez.
alter table free_checks add column visitor_kind text check (visitor_kind in ('browser', 'bot', 'script', 'test'));
alter table free_checks add column country text check (country is null or country ~ '^[A-Z]{2}$');

create or replace function tag_free_check(p_id uuid, p_kind text, p_country text) returns void
language sql security definer set search_path = public as $$
  update free_checks set visitor_kind = p_kind, country = case when p_country ~ '^[A-Z]{2}$' then p_country end where id = p_id;
$$;

-- Yönetici: son 60 günün ücretsiz kontrolleri (IP karması olmadan)
create or replace function admin_free_checks()
returns table (created_at timestamptz, lang text, brand text, category text, city text, visitor_kind text, country text, total int, mentioned int, recommended int, repeat_visitor boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_platform_admin() then raise exception 'Yetki yok'; end if;
  return query
    select f.created_at, f.lang, f.brand, f.category, f.city, f.visitor_kind, f.country, f.total, f.mentioned, f.recommended,
           exists (select 1 from free_checks g where g.ip_hash = f.ip_hash and g.id <> f.id)
      from free_checks f where f.created_at > now() - interval '60 days' order by f.created_at desc limit 300;
end $$;

do $$
begin
  revoke all on function tag_free_check(uuid, text, text) from public;
  revoke all on function admin_free_checks() from public;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function tag_free_check(uuid, text, text) from anon, authenticated;
    grant execute on function tag_free_check(uuid, text, text) to service_role;
    revoke all on function admin_free_checks() from anon;
    grant execute on function admin_free_checks() to authenticated;
  end if;
end $$;
