-- Güven puanı (Confidence Score) girdileri, 22 Kasım 2026.
-- Bir ölçümde markanın her (soru, motor) çifti için kaç cevap var ve tekrarlarda "önerildi" sonucu aynı mı?
-- Puanın kendisi engine/src/metrics.ts confidenceScore() ile hesaplanır (panel ve paylaşılan rapor aynı fonksiyonu kullanır).
-- security invoker: panelde RLS geçerli; paylaşılan rapor (security definer) içinden çağrılır.
create or replace function run_confidence(p_run uuid) returns table (
  provider text, answers int, prompts int, repeat_groups int, consistent_groups int
) language sql stable security invoker set search_path = public as $$
  with g as (
    select resp.provider, resp.prompt_id, count(*) as reps,
           bool_and(m.recommended) as all_yes, bool_or(m.recommended) as any_yes
    from runs r
    join responses resp on resp.run_id = r.id
    join mentions m on m.response_id = resp.id and m.brand_id = r.brand_id
    where r.id = p_run
    group by resp.provider, resp.prompt_id
  )
  select g.provider, sum(g.reps)::int, count(*)::int,
         count(*) filter (where g.reps >= 2)::int,
         count(*) filter (where g.reps >= 2 and (g.all_yes or not g.any_yes))::int
  from g group by g.provider order by g.provider;
$$;

-- Paylaşılan rapor: 0054 ile aynı, yalnız "confidence" alanı eklendi.
create or replace function shared_report(p_token uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s record; b record; lr uuid; res jsonb;
begin
  select * into s from report_shares where token = p_token and revoked_at is null and expires_at > now();
  if not found then return null; end if;
  select * into b from brands where id = s.brand_id;
  -- en son biten ölçüm (canlı aramalı varsa o)
  select r.id into lr from runs r where r.brand_id = b.id and r.status = 'done'
   order by (r.measurement_type = 'live_search') desc, coalesce(r.finished_at, r.created_at) desc limit 1;
  select jsonb_build_object(
    'brand', jsonb_build_object('name', b.name, 'sector', b.sector, 'city', b.city, 'country', coalesce(b.country, 'TR')),
    'expires_at', s.expires_at,
    'branding', (select case when w.plan = 'agency' and is_subscribed(w.id) and (w.report_brand_name is not null or w.report_logo is not null)
                             then jsonb_build_object('name', w.report_brand_name, 'logo', w.report_logo, 'accent', w.report_accent) end
                   from workspaces w where w.id = s.workspace_id),
    'vis', jsonb_build_object(
      'live_search', coalesce((select jsonb_agg(to_jsonb(v)) from brand_visibility(b.id, 'live_search') v
                                where v.run_id in (select id from runs where brand_id = b.id and status = 'done' and measurement_type = 'live_search' order by coalesce(finished_at, created_at) desc limit 12)), '[]'::jsonb),
      'model_knowledge', coalesce((select jsonb_agg(to_jsonb(v)) from brand_visibility(b.id, 'model_knowledge') v
                                where v.run_id in (select id from runs where brand_id = b.id and status = 'done' and measurement_type = 'model_knowledge' order by coalesce(finished_at, created_at) desc limit 12)), '[]'::jsonb)),
    -- Güven puanı girdileri (0066): her ölçüm türünün son ölçümü, motor bazında
    'confidence', jsonb_build_object(
      'live_search', coalesce((select jsonb_agg(to_jsonb(c)) from run_confidence((select id from runs where brand_id = b.id and status = 'done' and measurement_type = 'live_search' order by coalesce(finished_at, created_at) desc limit 1)) c), '[]'::jsonb),
      'model_knowledge', coalesce((select jsonb_agg(to_jsonb(c)) from run_confidence((select id from runs where brand_id = b.id and status = 'done' and measurement_type = 'model_knowledge' order by coalesce(finished_at, created_at) desc limit 1)) c), '[]'::jsonb)),
    'latest_run', lr,
    -- Sahibin rapor ekranında hesaplanan ilk 3 öneri (0054); paylaşılan rapora "en önemli 3 iş" olarak çıkar
    'actions', case when b.top_actions is not null then jsonb_build_object('items', b.top_actions, 'at', b.top_actions_at) end,
    'questions', coalesce((select jsonb_agg(jsonb_build_object('text', q.prompt_text, 'answers', q.answers, 'recommended', q.target_recommended, 'mentioned', q.target_mentioned, 'top_competitor', q.top_competitor) order by q.prompt_text)
                            from run_prompt_results(lr) q), '[]'::jsonb),
    'sources', coalesce((select jsonb_agg(jsonb_build_object('domain', d, 'count', c) order by c desc, d)
                          from (select lower(regexp_replace(split_part(split_part(u, '://', 2), '/', 1), '^www\.', '')) d, count(*) c
                                  from responses r, unnest(r.cited_urls) u where r.run_id = lr group by 1 order by 2 desc, 1 limit 10) x), '[]'::jsonb)
  ) into res;
  return res;
end $$;
