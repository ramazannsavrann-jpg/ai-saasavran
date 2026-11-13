-- 0035: TruthGuard (1. aşama). Marka sahibi "doğru bilgi kartı" girer; işçi, markanın geçtiği cevaplardaki iddiaları bu kartla
-- karşılaştırır (küçük LLM, cevapta birebir alıntı zorunlu). Yalnız ücretli paketler ve Growth Lab. Örnekleme: her soru × motor
-- için haftada en fazla bir kontrol (en güncel cevap).
alter table brands add column fact_card text check (fact_card is null or length(trim(fact_card)) between 10 and 3000);
alter table brands add column fact_card_updated_at timestamptz;

create table truth_checks (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  brand_id     uuid not null references brands(id) on delete cascade,
  run_id       uuid references runs(id) on delete cascade,
  response_id  uuid references responses(id) on delete cascade,
  prompt_id    uuid references prompts(id) on delete set null,
  provider     text not null,
  claims       jsonb not null default '[]'::jsonb check (jsonb_typeof(claims) = 'array' and length(claims::text) <= 12000),
  failed       boolean not null default false,
  cost_usd     numeric not null default 0,
  created_at   timestamptz not null default now()
);
create index on truth_checks (brand_id, created_at desc);
create index on truth_checks (response_id);
alter table truth_checks enable row level security;
create policy truth_checks_read on truth_checks for select using (is_member(workspace_id));
-- yazma yalnız sunucu (service role)

-- Sunucu: kontrol bekleyen cevaplar
create or replace function pending_truth_checks(p_limit int default 40)
returns table (response_id uuid, workspace_id uuid, brand_id uuid, run_id uuid, prompt_id uuid, provider text, brand_name text, fact_card text, answer_text text)
language sql stable security definer set search_path = public as $$
  select x.response_id, x.workspace_id, x.brand_id, x.run_id, x.prompt_id, x.provider, x.brand_name, x.fact_card, x.answer_text from (
    select distinct on (r.prompt_id, r.provider) r.id response_id, r.workspace_id, b.id brand_id, r.run_id, r.prompt_id, r.provider, b.name brand_name, b.fact_card, r.answer_text, r.created_at
      from responses r
      join runs ru on ru.id = r.run_id and ru.status = 'done' and ru.data_origin = 'live_api' and ru.trigger <> 'seed'
      join brands b on b.id = ru.brand_id and not b.is_competitor and b.fact_card is not null
      join workspaces w on w.id = r.workspace_id and (w.plan <> 'free' or w.kind = 'growth_lab')
      join mentions m on m.response_id = r.id and m.brand_id = b.id and m.mentioned
     where r.created_at > now() - interval '7 days'
       and not exists (select 1 from truth_checks t where t.brand_id = b.id and t.prompt_id = r.prompt_id and t.provider = r.provider
                         and t.created_at > now() - interval '6 days' and t.created_at > coalesce(b.fact_card_updated_at, '-infinity'))
     order by r.prompt_id, r.provider, r.created_at desc
  ) x order by x.created_at desc limit p_limit;
$$;

-- Bilgi kartı değişince tarih güncellenir (yeni kartla yeniden kontrol edilsin)
create or replace function touch_fact_card() returns trigger language plpgsql set search_path = public as $$
begin
  if new.fact_card is distinct from old.fact_card then new.fact_card_updated_at := now(); end if;
  return new;
end $$;
create trigger brands_fact_card before update on brands for each row execute function touch_fact_card();

do $$
begin
  revoke all on function pending_truth_checks(int) from public;
  revoke all on function touch_fact_card() from public;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function pending_truth_checks(int) from anon, authenticated;
    grant execute on function pending_truth_checks(int) to service_role;
    revoke all on function touch_fact_card() from anon, authenticated;
    revoke all on truth_checks from anon;
  end if;
end $$;
