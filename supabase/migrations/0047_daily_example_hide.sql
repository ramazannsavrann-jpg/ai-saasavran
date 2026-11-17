-- 0047: Ana sayfadaki "bugünün ölçümü" yalnız uygun konulardan gelsin. Bazı Growth Lab alanları (ör. hassas
-- ürün kategorileri, video araştırmaları) siteye ilk gelen ziyaretçiye gösterilmez.
alter table workspaces add column if not exists hide_from_examples boolean not null default false;

create or replace function daily_example(p_day date default current_date) returns jsonb
language sql security definer set search_path = public as $$
with latest as (
  select distinct on (p.id, r.provider, r.measurement_type)
         p.id prompt_id, p.text question, r.provider, r.measurement_type::text mtype, r.run_id
    from prompts p
    join workspaces w on w.id = p.workspace_id and w.kind = 'growth_lab' and not w.hide_from_examples
    join responses r on r.prompt_id = p.id and r.data_origin <> 'simulated' and r.created_at > now() - interval '60 days'
   where not exists (
     select 1 from brands b where b.workspace_id = p.workspace_id
        and (position(lower(b.name) in lower(p.text)) > 0
             or exists (select 1 from unnest(b.aliases) a where length(a) >= 3 and position(lower(a) in lower(p.text)) > 0)))
   order by p.id, r.provider, r.measurement_type, r.created_at desc
), cand as (
  select l.*, (select max(r.created_at) from responses r where r.run_id = l.run_id and r.prompt_id = l.prompt_id and r.provider = l.provider) at,
         row_number() over (order by l.question, l.provider, l.mtype) - 1 ord, count(*) over () n
    from latest l
   where (select count(*) from responses r where r.run_id = l.run_id and r.prompt_id = l.prompt_id and r.provider = l.provider) >= 2
     and (select count(distinct m.brand_id) from mentions m join responses r on r.id = m.response_id
           where r.run_id = l.run_id and r.prompt_id = l.prompt_id and r.provider = l.provider and m.mentioned) >= 2
), c as (
  select * from cand where ord = (((p_day - date '2026-01-01') % n) + n) % n
), resp as (
  select r.id, r.cited_urls from responses r, c where r.run_id = c.run_id and r.prompt_id = c.prompt_id and r.provider = c.provider
), agg as (
  select m.brand_id,
         count(*) filter (where m.mentioned) mentioned,
         count(*) filter (where m.recommended) recommended,
         count(*) filter (where m.rank = 1) first
    from mentions m join resp on resp.id = m.response_id
   group by m.brand_id having count(*) filter (where m.mentioned) > 0
), ranked as (
  select a.*, row_number() over (order by a.recommended desc, a.first desc, a.mentioned desc, a.brand_id) i from agg a
)
select jsonb_build_object(
  'day', p_day, 'question', c.question, 'provider', c.provider, 'measurement_type', c.mtype, 'at', c.at,
  'answers', (select count(*) from resp),
  'sources', (select count(distinct lower(split_part(split_part(u, '://', 2), '/', 1))) from resp, unnest(resp.cited_urls) u),
  'brands', coalesce((select jsonb_agg(jsonb_build_object('label', chr(64 + i::int), 'mentioned', mentioned, 'recommended', recommended, 'first', first) order by i)
                       from ranked where i <= 8), '[]'::jsonb),
  'candidates', c.n
) from c;
$$;

-- Growth Lab 3: ABD prezervatif araştırması (18 Kasım). Bu alan yoksa (test veritabanı) hiçbir şey değişmez.
update workspaces set hide_from_examples = true where id = 'e85b54a8-380a-4a79-a3a8-157c24ae1909';
