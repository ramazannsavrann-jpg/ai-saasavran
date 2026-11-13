-- 0041: İçerik planı. Markanın önerilmediği bir soru için, yapay zekânın o soruya verdiği gerçek cevaplardan ve kaynak sitelerden
-- küçük bir LLM ile içerik planı (başlık, bölümler, yazılması gereken bilgiler, SSS, yer alınacak siteler) çıkarılır.
-- Yalnız istenince; ücretli paketler; marka başına 30 günde 20 plan; aynı soru için 7 günde bir.
create table content_briefs (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  brand_id     uuid not null references brands(id) on delete cascade,
  prompt_id    uuid not null references prompts(id) on delete cascade,
  status       text not null default 'queued' check (status in ('queued', 'done', 'failed')),
  brief        jsonb check (brief is null or (jsonb_typeof(brief) = 'object' and length(brief::text) <= 16000)),
  error        text,
  cost_usd     numeric not null default 0,
  created_at   timestamptz not null default now(),
  done_at      timestamptz
);
create index on content_briefs (brand_id, created_at desc);
alter table content_briefs enable row level security;
create policy content_briefs_read on content_briefs for select using (is_member(workspace_id));

create or replace function request_content_brief(p_brand uuid, p_prompt uuid) returns void
language plpgsql security definer set search_path = public as $$
declare b record; w record;
begin
  select * into b from brands where id = p_brand and not is_competitor;
  if not found then raise exception 'Marka bulunamadı'; end if;
  if not is_member(b.workspace_id, 'editor') then raise exception 'Yetki yok'; end if;
  if not exists (select 1 from prompts where id = p_prompt and brand_id = p_brand) then raise exception 'Soru bulunamadı'; end if;
  select * into w from workspaces where id = b.workspace_id;
  if w.plan = 'free' and w.kind <> 'growth_lab' then raise exception 'İçerik planı ücretli paketlerde'; end if;
  if exists (select 1 from content_briefs where brand_id = p_brand and prompt_id = p_prompt and (status = 'queued' or created_at > now() - interval '7 days')) then
    raise exception 'Bu soru için yakın zamanda plan hazırlandı';
  end if;
  if (select count(*) from content_briefs where brand_id = p_brand and created_at > now() - interval '30 days' and status <> 'failed') >= 20 then
    raise exception 'Bu marka için 30 günde en fazla 20 içerik planı hazırlanabilir';
  end if;
  insert into content_briefs (workspace_id, brand_id, prompt_id) values (b.workspace_id, p_brand, p_prompt);
end $$;

-- Sunucu: bekleyen planlar ve gereken bağlam (son 30 günün en güncel 4 cevabı, kaynaklar, rakipler)
create or replace function pending_content_briefs(p_limit int default 10)
returns table (brief_id uuid, workspace_id uuid, brand_id uuid, brand_name text, website text, fact_card text, prompt_text text, lang text, answers jsonb, competitors text[])
language sql stable security definer set search_path = public as $$
  select c.id, c.workspace_id, b.id, b.name, b.website, b.fact_card, p.text, p.language,
         coalesce((select jsonb_agg(jsonb_build_object('provider', x.provider, 'answer', left(x.answer_text, 3000), 'cited', coalesce(x.cited_urls, '{}')))
                     from (select r.provider, r.answer_text, r.cited_urls from responses r join runs ru on ru.id = r.run_id and ru.status = 'done'
                            where r.prompt_id = p.id and r.created_at > now() - interval '30 days' order by r.created_at desc limit 4) x), '[]'::jsonb),
         array(select bb.name from brands bb where bb.owner_brand_id = b.id and bb.is_competitor order by bb.name)
    from content_briefs c join brands b on b.id = c.brand_id join prompts p on p.id = c.prompt_id
   where c.status = 'queued' order by c.created_at limit p_limit;
$$;

do $$
begin
  revoke all on function pending_content_briefs(int) from public;
  revoke all on function request_content_brief(uuid, uuid) from public;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function pending_content_briefs(int) from anon, authenticated;
    grant execute on function pending_content_briefs(int) to service_role;
    revoke all on function request_content_brief(uuid, uuid) from anon;
    grant execute on function request_content_brief(uuid, uuid) to authenticated;
    revoke all on content_briefs from anon;
  end if;
end $$;
