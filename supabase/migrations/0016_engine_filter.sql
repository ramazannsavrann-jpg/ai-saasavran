-- 0016: Canlı ölçümde birden çok motor (ChatGPT + Claude). Soru bazlı sonuçlar motora göre süzülebilir.
-- Eski imza kaldırılıp isteğe bağlı p_provider ile yeniden tanımlanır (boşsa tüm motorlar, eskisi gibi).
drop function if exists run_prompt_results(uuid);
create function run_prompt_results(p_run uuid, p_provider text default null) returns table (
  prompt_id uuid, prompt_text text, intent prompt_intent, answers int,
  target_mentioned int, target_recommended int, best_rank int, top_competitor text, top_competitor_recs int
) language sql stable security invoker set search_path = public as $$
  with r as (select * from runs where id = p_run),
  resp as (select x.* from responses x join r on x.run_id = r.id where p_provider is null or x.provider = p_provider),
  agg as (
    select resp.prompt_id, m.brand_id, b.name, b.is_competitor,
           count(*) filter (where m.mentioned) men, count(*) filter (where m.recommended) rec, min(m.rank) best
    from resp join mentions m on m.response_id = resp.id join brands b on b.id = m.brand_id
    group by 1, 2, 3, 4
  )
  select p.id, p.text, p.intent,
    (select count(*)::int from resp where resp.prompt_id = p.id),
    coalesce((select men::int from agg where agg.prompt_id = p.id and not is_competitor), 0),
    coalesce((select rec::int from agg where agg.prompt_id = p.id and not is_competitor), 0),
    (select best::int from agg where agg.prompt_id = p.id and not is_competitor),
    (select name from agg where agg.prompt_id = p.id and is_competitor and rec > 0 order by rec desc, name limit 1),
    coalesce((select max(rec)::int from agg where agg.prompt_id = p.id and is_competitor), 0)
  from prompts p join r on p.brand_id = r.brand_id
  where exists (select 1 from resp where resp.prompt_id = p.id)
  order by p.created_at;
$$;
-- Yetki: eski fonksiyon gibi varsayılan (security invoker; satır güvenliği responses/mentions üzerinde geçerli).
