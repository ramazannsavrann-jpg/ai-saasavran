-- 0036: TruthGuard 3. aşama. Aynı soruya farklı motorların verdiği cevaplarda marka hakkında birbiriyle çelişen bilgiler
-- (bilgi kartı gerekmez). Küçük LLM; her taraf kendi cevabından birebir alıntıyla. Soru başına haftada bir.
create table engine_conflicts (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  brand_id     uuid not null references brands(id) on delete cascade,
  prompt_id    uuid references prompts(id) on delete cascade,
  conflicts    jsonb not null default '[]'::jsonb check (jsonb_typeof(conflicts) = 'array' and length(conflicts::text) <= 12000),
  failed       boolean not null default false,
  cost_usd     numeric not null default 0,
  created_at   timestamptz not null default now()
);
create index on engine_conflicts (brand_id, created_at desc);
alter table engine_conflicts enable row level security;
create policy engine_conflicts_read on engine_conflicts for select using (is_member(workspace_id));

-- Sunucu: en az iki motorun son 7 günde markayı andığı sorular; her motorun en güncel cevabı
create or replace function pending_engine_conflicts(p_limit int default 20)
returns table (workspace_id uuid, brand_id uuid, prompt_id uuid, brand_name text, answers jsonb)
language sql stable security definer set search_path = public as $$
  with latest as (
    select distinct on (ru.brand_id, r.prompt_id, r.provider) ru.brand_id, r.prompt_id, r.provider, r.workspace_id, r.answer_text, r.created_at
      from responses r
      join runs ru on ru.id = r.run_id and ru.status = 'done' and ru.data_origin = 'live_api' and ru.trigger <> 'seed'
      join brands b on b.id = ru.brand_id and not b.is_competitor
      join workspaces w on w.id = r.workspace_id and (w.plan <> 'free' or w.kind = 'growth_lab')
      join mentions m on m.response_id = r.id and m.brand_id = b.id and m.mentioned
     where r.created_at > now() - interval '7 days'
     order by ru.brand_id, r.prompt_id, r.provider, r.created_at desc
  )
  select l.workspace_id, l.brand_id, l.prompt_id, b.name,
         jsonb_agg(jsonb_build_object('provider', l.provider, 'answer', left(l.answer_text, 4000)) order by l.provider)
    from latest l join brands b on b.id = l.brand_id
   where not exists (select 1 from engine_conflicts c where c.brand_id = l.brand_id and c.prompt_id = l.prompt_id and c.created_at > now() - interval '6 days')
   group by l.workspace_id, l.brand_id, l.prompt_id, b.name
  having count(*) >= 2
   order by max(l.created_at) desc
   limit p_limit;
$$;

do $$
begin
  revoke all on function pending_engine_conflicts(int) from public;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function pending_engine_conflicts(int) from anon, authenticated;
    grant execute on function pending_engine_conflicts(int) to service_role;
    revoke all on engine_conflicts from anon;
  end if;
end $$;
