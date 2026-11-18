-- Haftalık e-posta: canlı arama ile model bilgisi (aramasız) ve motorlar tek orana karıştırılmaz (değişmez kural, 18 Kasım denetimi).
-- Satır = marka × ölçüm türü × motor. Rakip de aynı tür + motor içinde sayılır.
drop function if exists weekly_digest();
create function weekly_digest() returns table (
  user_id uuid, lang text, token uuid, brand_id uuid, brand_name text, workspace_name text,
  measurement_type text, provider text,
  cur_n int, cur_mention int, cur_recommend int, prev_n int, prev_mention int, prev_recommend int,
  top_competitor text, top_competitor_rec int
) language sql stable security definer set search_path = public as $$
  with targets as (
    select m.user_id, coalesce(p.lang, 'en') lang, p.token, b.id brand_id, b.name brand_name, w.name workspace_name
      from workspace_members m
      join workspaces w on w.id = m.workspace_id and w.kind in ('business', 'agency')
      join brands b on b.workspace_id = w.id and not b.is_competitor
      left join email_prefs p on p.user_id = m.user_id
     where coalesce(p.weekly, true) and (p.last_weekly_at is null or p.last_weekly_at < now() - interval '6 days')
  ), resp as (
    select r.id resp_id, ru.brand_id, r.measurement_type::text mt, r.provider, ru.created_at > now() - interval '7 days' as cur
      from responses r join runs ru on ru.id = r.run_id
     where ru.status = 'done' and ru.data_origin = 'live_api' and ru.trigger <> 'seed'
       and r.measurement_type <> 'simulated'
       and ru.created_at > now() - interval '14 days'
       and ru.brand_id in (select t.brand_id from targets t)
  ), agg as (
    select re.brand_id, re.mt, re.provider,
      count(*) filter (where re.cur)::int cur_n,
      count(*) filter (where re.cur and mn.mentioned)::int cur_m,
      count(*) filter (where re.cur and mn.recommended)::int cur_r,
      count(*) filter (where not re.cur)::int prev_n,
      count(*) filter (where not re.cur and mn.mentioned)::int prev_m,
      count(*) filter (where not re.cur and mn.recommended)::int prev_r
      from resp re left join mentions mn on mn.response_id = re.resp_id and mn.brand_id = re.brand_id
     group by re.brand_id, re.mt, re.provider
  ), comp as (
    select distinct on (re.brand_id, re.mt, re.provider) re.brand_id, re.mt, re.provider, cb.name, count(*) filter (where mn.recommended)::int rec
      from resp re
      join mentions mn on mn.response_id = re.resp_id
      join brands cb on cb.id = mn.brand_id and cb.is_competitor and cb.owner_brand_id = re.brand_id
     where re.cur
     group by re.brand_id, re.mt, re.provider, cb.name
     order by re.brand_id, re.mt, re.provider, rec desc, cb.name
  )
  select t.user_id, t.lang, t.token, t.brand_id, t.brand_name, t.workspace_name, a.mt, a.provider,
         a.cur_n, a.cur_m, a.cur_r, a.prev_n, a.prev_m, a.prev_r, c.name, c.rec
    from targets t join agg a on a.brand_id = t.brand_id and a.cur_n > 0
    left join comp c on c.brand_id = t.brand_id and c.mt = a.mt and c.provider = a.provider
   order by t.user_id, t.brand_name, a.mt, a.provider;
$$;
revoke all on function weekly_digest() from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function weekly_digest() from anon, authenticated;
  end if;
end $$;
