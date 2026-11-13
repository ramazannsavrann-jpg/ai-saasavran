-- 0034: Marka algısı. "Önerildi mi?" kontrolü aynı çağrıda hedef markanın algısını da çıkarır (duygu + nitelikler,
-- her nitelik cevaptan birebir alıntıyla). Yalnız hedef markanın anılma satırında, yalnız ücretli paketlerde.
alter table mentions add column perception jsonb check (perception is null or (jsonb_typeof(perception) = 'object' and length(perception::text) <= 4000));

-- Sunucu: algısı henüz çıkarılmamış eski cevaplar (ücretli paket veya Growth Lab, canlı arama, son 60 gün)
create or replace function pending_perception(p_limit int default 40)
returns table (response_id uuid, workspace_id uuid, run_id uuid, brand_id uuid, brand_name text, answer_text text, names text[])
language sql stable security definer set search_path = public as $$
  select r.id, r.workspace_id, r.run_id, m.brand_id, b.name, r.answer_text,
         array(select bb.name from mentions mm join brands bb on bb.id = mm.brand_id where mm.response_id = r.id and mm.mentioned order by bb.name)
    from mentions m
    join responses r on r.id = m.response_id
    join runs ru on ru.id = r.run_id and ru.status = 'done' and ru.measurement_type = 'live_search'
    join brands b on b.id = m.brand_id and not b.is_competitor
    join workspaces w on w.id = r.workspace_id and (w.plan <> 'free' or w.kind = 'growth_lab')
   where m.mentioned and m.perception is null and r.created_at > now() - interval '60 days'
   order by r.created_at desc
   limit p_limit;
$$;

create or replace function set_perception(p_response uuid, p_brand uuid, p_perception jsonb) returns void
language sql security definer set search_path = public as $$
  update mentions set perception = p_perception where response_id = p_response and brand_id = p_brand;
$$;

-- Sunucu: algı çıkarmaya şimdiye kadar harcanan toplam (geriye dönük doldurma tavanı için)
create or replace function perception_spend() returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce(sum(cost_usd), 0) from cost_ledger where task = 'perception';
$$;

do $$
declare f text;
begin
  foreach f in array array['pending_perception(int)', 'set_perception(uuid, uuid, jsonb)', 'perception_spend()'] loop
    execute format('revoke all on function %s from public', f);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke all on function %s from anon, authenticated', f);
      execute format('grant execute on function %s to service_role', f);
    end if;
  end loop;
end $$;
