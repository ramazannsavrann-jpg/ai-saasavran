-- API ve MCP rapor çıktısına güven puanı girdileri (22 Kasım 2026). Gövde 0030 ile aynı, yalnız "confidence" eklendi.
-- Puanı functions/api/_api-lib.js summarize(), panelle aynı fonksiyonla (engine/src/metrics.ts confidenceScore) hesaplar.
create or replace function brand_report_json(p_brand uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare b record; lr uuid; res jsonb;
begin
  select * into b from brands where id = p_brand and not is_competitor;
  if not found then return null; end if;
  -- en son biten ölçüm (canlı aramalı varsa o)
  select r.id into lr from runs r where r.brand_id = b.id and r.status = 'done'
   order by (r.measurement_type = 'live_search') desc, coalesce(r.finished_at, r.created_at) desc limit 1;
  select jsonb_build_object(
    'brand', jsonb_build_object('name', b.name, 'sector', b.sector, 'city', b.city, 'country', coalesce(b.country, 'TR')),
    'vis', jsonb_build_object(
      'live_search', coalesce((select jsonb_agg(to_jsonb(v)) from brand_visibility(b.id, 'live_search') v
                                where v.run_id in (select id from runs where brand_id = b.id and status = 'done' and measurement_type = 'live_search' order by coalesce(finished_at, created_at) desc limit 12)), '[]'::jsonb),
      'model_knowledge', coalesce((select jsonb_agg(to_jsonb(v)) from brand_visibility(b.id, 'model_knowledge') v
                                where v.run_id in (select id from runs where brand_id = b.id and status = 'done' and measurement_type = 'model_knowledge' order by coalesce(finished_at, created_at) desc limit 12)), '[]'::jsonb)),
    -- Güven puanı girdileri (0068): her ölçüm türünün son ölçümü, motor bazında (run_confidence, 0066)
    'confidence', jsonb_build_object(
      'live_search', coalesce((select jsonb_agg(to_jsonb(c)) from run_confidence((select id from runs where brand_id = b.id and status = 'done' and measurement_type = 'live_search' order by coalesce(finished_at, created_at) desc limit 1)) c), '[]'::jsonb),
      'model_knowledge', coalesce((select jsonb_agg(to_jsonb(c)) from run_confidence((select id from runs where brand_id = b.id and status = 'done' and measurement_type = 'model_knowledge' order by coalesce(finished_at, created_at) desc limit 1)) c), '[]'::jsonb)),
    'latest_run', lr,
    'questions', coalesce((select jsonb_agg(jsonb_build_object('text', q.prompt_text, 'answers', q.answers, 'recommended', q.target_recommended, 'mentioned', q.target_mentioned, 'top_competitor', q.top_competitor) order by q.prompt_text)
                            from run_prompt_results(lr) q), '[]'::jsonb),
    'sources', coalesce((select jsonb_agg(jsonb_build_object('domain', d, 'count', c) order by c desc, d)
                          from (select lower(regexp_replace(split_part(split_part(u, '://', 2), '/', 1), '^www\.', '')) d, count(*) c
                                  from responses r, unnest(r.cited_urls) u where r.run_id = lr group by 1 order by 2 desc, 1 limit 10) x), '[]'::jsonb)
  ) into res;
  return res;
end $$;
