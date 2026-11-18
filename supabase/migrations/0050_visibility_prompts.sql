-- brand_visibility: farklı soru sayısı (prompts) da döner. Panel güven aralığını soru bazında (tekrarlar bağımsız sayılmadan)
-- hesaplar ve küçük örneklem uyarısını soru sayısına da bağlar (18 Kasım ölçüm standardı). Dönüş tipi değiştiği için drop + create.
drop function if exists brand_visibility(uuid, measurement_type);
create function brand_visibility(p_brand uuid, p_type measurement_type) returns table (
  run_id uuid, run_at timestamptz, provider text, model text,
  brand_id uuid, brand_name text, is_target boolean, n int, mentioned int, recommended int, cited int, prompts int
) language sql stable security invoker set search_path = public as $$
  select r.id, coalesce(r.finished_at, r.created_at), resp.provider, resp.model,
         b.id, b.name, b.id = p_brand,
         count(*)::int,
         count(*) filter (where m.mentioned)::int,
         count(*) filter (where m.recommended)::int,
         count(*) filter (where m.cited)::int,
         count(distinct resp.prompt_id)::int
  from runs r
  join responses resp on resp.run_id = r.id and resp.measurement_type = p_type
  join mentions m on m.response_id = resp.id
  join brands b on b.id = m.brand_id
  where r.brand_id = p_brand and r.status = 'done' and r.measurement_type = p_type
  group by r.id, r.finished_at, r.created_at, resp.provider, resp.model, b.id, b.name
  order by 2, 6;
$$;
