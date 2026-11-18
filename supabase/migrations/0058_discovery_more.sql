-- 0058 (19 Kasım): Gerçek soru keşfi genişledi. Ücretli: marka başına 30 günde 4 keşif (önce 2).
-- Ücretsiz: marka başına 1 keşif (önce hiç). Keşif başına en fazla 5 SerpApi araması (işçide; DISCOVERY_RESERVE Shopping'i korur).
create or replace function request_prompt_discovery(p_brand uuid) returns void
language plpgsql security definer set search_path = public as $$
declare b record; w record;
begin
  select * into b from brands where id = p_brand and not is_competitor;
  if not found then raise exception 'Marka bulunamadı'; end if;
  if not is_member(b.workspace_id, 'editor') then raise exception 'Yetki yok'; end if;
  select * into w from workspaces where id = b.workspace_id;
  if b.sector is null or length(trim(b.sector)) < 2 then raise exception 'Önce markanın sektörünü yazın'; end if;
  if exists (select 1 from discovery_runs where brand_id = p_brand and done_at is null) then raise exception 'Keşif zaten sırada'; end if;
  if w.plan = 'free' and w.kind <> 'growth_lab' then
    if exists (select 1 from discovery_runs where brand_id = p_brand and error is null) then
      raise exception 'Ücretsiz pakette 1 keşif yapılabilir; daha fazlası ücretli paketlerde';
    end if;
  elsif (select count(*) from discovery_runs where brand_id = p_brand and requested_at > now() - interval '30 days' and error is null) >= 4 then
    raise exception 'Bu marka için 30 günde en fazla 4 keşif yapılabilir';
  end if;
  insert into discovery_runs (brand_id) values (p_brand);
end $$;

do $$
begin
  revoke all on function request_prompt_discovery(uuid) from public;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function request_prompt_discovery(uuid) from anon;
    grant execute on function request_prompt_discovery(uuid) to authenticated;
  end if;
end $$;
