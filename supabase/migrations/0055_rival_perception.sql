-- Rakibi öne çıkaran özellikler (18 Kasım denetimi, en zayıf özellik): rakip önerilip hedef marka önerilmediğinde, yapay zekânın
-- rakibe yakıştırdığı nitelikler de (algı, birebir alıntılı) çıkarılır. Aynı ucuz algı çağrısı; önce hedef markalar işlenir.
create or replace function pending_perception(p_limit int default 40)
returns table (response_id uuid, workspace_id uuid, run_id uuid, brand_id uuid, brand_name text, answer_text text, names text[])
language sql stable security definer set search_path = public as $$
  select r.id, r.workspace_id, r.run_id, m.brand_id, b.name, r.answer_text,
         array(select bb.name from mentions mm join brands bb on bb.id = mm.brand_id where mm.response_id = r.id and mm.mentioned order by bb.name)
    from mentions m
    join responses r on r.id = m.response_id
    join runs ru on ru.id = r.run_id and ru.status = 'done' and ru.measurement_type = 'live_search'
    join brands b on b.id = m.brand_id
    join workspaces w on w.id = r.workspace_id and (w.plan <> 'free' or w.kind = 'growth_lab')
   where m.perception is null and r.created_at > now() - interval '60 days'
     and (
       (not b.is_competitor and m.mentioned)
       or (b.is_competitor and m.recommended and not exists (
             select 1 from mentions t where t.response_id = r.id and t.brand_id = b.owner_brand_id and t.recommended))
     )
   order by b.is_competitor, r.created_at desc
   limit p_limit;
$$;
