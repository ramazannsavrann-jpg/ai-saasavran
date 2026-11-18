-- Paylaşılan rapora "en önemli 3 iş" (18 Kasım denetimi): girişsiz rapor öneri motorunu çalıştıramaz; sahip/editör rapor
-- ekranını açtığında hesaplanan ilk 3 öneri markada saklanır ve paylaşılan rapor bunu tarihiyle gösterir.
alter table brands add column if not exists top_actions jsonb;
alter table brands add column if not exists top_actions_at timestamptz;

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
