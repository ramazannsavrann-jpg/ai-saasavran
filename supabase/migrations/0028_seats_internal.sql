-- 0028: seats_used yalnız sunucu fonksiyonlarının içinde kullanılır; istemciden çağrılamasın
-- (aksi hâlde kimliği bilinen herhangi bir çalışma alanının kişi sayısı öğrenilebilirdi).
revoke all on function seats_used(uuid) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function seats_used(uuid) from anon, authenticated;
  end if;
end $$;
