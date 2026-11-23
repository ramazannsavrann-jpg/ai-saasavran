-- 0070: Mobil uygulamanın Bildirimler ekranı için marka uyarıları (düşüş + rakibin öne geçtiği sorular).
-- drop_alerts tablosuna doğrudan erişim yok (RLS); yalnız markanın çalışma alanı üyeleri kendi uyarılarını okur.
create or replace function brand_alerts(p_brand uuid, p_limit int default 20)
returns table (run_id uuid, checked_at timestamptz, measurement_type text, detail jsonb)
language plpgsql stable security definer set search_path = public as $$
declare ws uuid;
begin
  select workspace_id into ws from brands where id = p_brand;
  if ws is null or not is_member(ws) then return; end if;
  return query
    select a.run_id, a.checked_at, r.measurement_type::text, a.detail
      from drop_alerts a join runs r on r.id = a.run_id
     where a.brand_id = p_brand and a.alerted
     order by a.checked_at desc
     limit least(greatest(coalesce(p_limit, 20), 1), 50);
end $$;
revoke all on function brand_alerts(uuid, int) from public;
grant execute on function brand_alerts(uuid, int) to authenticated;
