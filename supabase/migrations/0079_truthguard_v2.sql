-- 0079: TruthGuard v2 (27 Kasım).
--  * Bilgi kartının kaynağı: resmî sayfa adresleri (fact_sources) ve kartın kontrol tarihi (fact_checked_on). Video/araştırmada
--    "doğrusu" diye gösterilen bilginin nereden geldiği raporda görünsün.
--  * Kart sınırı 3000 → 5000 karakter (telefon gibi kategorilerde güncel model listesi + güncelleme politikası sığsın).
--  * Growth Lab'de (video ve araştırma ölçümleri) rakip markalar da bilgi kartı varsa kontrol edilir: videoda "yapay zekâ hangi
--    markayı en çok yanlış/eski anlatıyor" karşılaştırması yapılabilsin. Müşteri alanlarında yalnız kendi markası (değişmedi).
--  * İddialarda yeni "outdated" durumu ve konu etiketi yalnız JSON içinde; şema değişikliği gerekmez.
alter table brands add column if not exists fact_sources text[] not null default '{}'
  check (cardinality(fact_sources) <= 10);
alter table brands add column if not exists fact_checked_on date;
alter table brands drop constraint if exists brands_fact_card_check;
alter table brands add constraint brands_fact_card_check check (fact_card is null or length(trim(fact_card)) between 10 and 5000);

create or replace function pending_truth_checks(p_limit int default 40)
returns table (response_id uuid, workspace_id uuid, brand_id uuid, run_id uuid, prompt_id uuid, provider text, brand_name text, fact_card text, answer_text text)
language sql stable security definer set search_path = public as $$
  select x.response_id, x.workspace_id, x.brand_id, x.run_id, x.prompt_id, x.provider, x.brand_name, x.fact_card, x.answer_text from (
    select distinct on (b.id, r.prompt_id, r.provider) r.id response_id, r.workspace_id, b.id brand_id, r.run_id, r.prompt_id, r.provider, b.name brand_name, b.fact_card, r.answer_text, r.created_at
      from responses r
      join runs ru on ru.id = r.run_id and ru.status = 'done' and ru.data_origin = 'live_api' and ru.trigger <> 'seed'
      join workspaces w on w.id = r.workspace_id and (w.plan <> 'free' or w.kind = 'growth_lab')
      join brands b on b.fact_card is not null and (
             (b.id = ru.brand_id and not b.is_competitor)
          or (w.kind = 'growth_lab' and b.is_competitor and b.owner_brand_id = ru.brand_id))
      join mentions m on m.response_id = r.id and m.brand_id = b.id and m.mentioned
     where r.created_at > now() - interval '7 days'
       and not exists (select 1 from truth_checks t where t.brand_id = b.id and t.prompt_id = r.prompt_id and t.provider = r.provider
                         and t.created_at > now() - interval '6 days' and t.created_at > coalesce(b.fact_card_updated_at, '-infinity'))
     order by b.id, r.prompt_id, r.provider, r.created_at desc
  ) x order by x.created_at desc limit p_limit;
$$;

do $$ begin
  revoke all on function pending_truth_checks(int) from public;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function pending_truth_checks(int) from anon, authenticated;
    grant execute on function pending_truth_checks(int) to service_role;
  end if;
end $$;
