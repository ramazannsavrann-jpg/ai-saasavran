-- 0040: Gerçek soru keşfi. Google'da insanların sorduğu sorular ("Diğer kişiler şunları da sordu" ve ilgili aramalar, SerpApi)
-- markanın sektörü/şehri için toplanır; müşteri tek tıkla soru listesine ekler. Yalnız ücretli paketler; marka başına 30 günde 2 keşif.
create table prompt_suggestions (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  brand_id     uuid not null references brands(id) on delete cascade,
  text         text not null check (length(text) between 5 and 300),
  source       text not null check (source in ('paa', 'related')),
  seed         text not null check (length(seed) <= 200),
  dismissed    boolean not null default false,
  created_at   timestamptz not null default now()
);
alter table prompt_suggestions add constraint prompt_suggestions_uniq unique (brand_id, text);
alter table prompt_suggestions enable row level security;
create policy prompt_suggestions_read on prompt_suggestions for select using (is_member(workspace_id));
create policy prompt_suggestions_dismiss on prompt_suggestions for update using (is_member(workspace_id, 'editor')) with check (is_member(workspace_id, 'editor'));

create table discovery_runs (
  id           uuid primary key default gen_random_uuid(),
  brand_id     uuid not null references brands(id) on delete cascade,
  requested_at timestamptz not null default now(),
  done_at      timestamptz,
  found        int,
  searches     int,
  error        text
);
create index on discovery_runs (brand_id, requested_at desc);
alter table discovery_runs enable row level security;
create policy discovery_runs_read on discovery_runs for select using (exists (select 1 from brands b where b.id = brand_id and is_member(b.workspace_id)));

create or replace function request_prompt_discovery(p_brand uuid) returns void
language plpgsql security definer set search_path = public as $$
declare b record; w record;
begin
  select * into b from brands where id = p_brand and not is_competitor;
  if not found then raise exception 'Marka bulunamadı'; end if;
  if not is_member(b.workspace_id, 'editor') then raise exception 'Yetki yok'; end if;
  select * into w from workspaces where id = b.workspace_id;
  if w.plan = 'free' and w.kind <> 'growth_lab' then raise exception 'Soru keşfi ücretli paketlerde'; end if;
  if b.sector is null or length(trim(b.sector)) < 2 then raise exception 'Önce markanın sektörünü yazın'; end if;
  if exists (select 1 from discovery_runs where brand_id = p_brand and done_at is null) then raise exception 'Keşif zaten sırada'; end if;
  if (select count(*) from discovery_runs where brand_id = p_brand and requested_at > now() - interval '30 days' and error is null) >= 2 then
    raise exception 'Bu marka için 30 günde en fazla 2 keşif yapılabilir';
  end if;
  insert into discovery_runs (brand_id) values (p_brand);
end $$;

create or replace function pending_discovery(p_limit int default 5)
returns table (run_id uuid, brand_id uuid, workspace_id uuid, brand_name text, sector text, city text, country text, lang text)
language sql stable security definer set search_path = public as $$
  select d.id, b.id, b.workspace_id, b.name, b.sector, b.city, b.country,
         coalesce((select p.language from prompts p where p.brand_id = b.id and p.active group by p.language order by count(*) desc limit 1), 'tr')
    from discovery_runs d join brands b on b.id = d.brand_id
   where d.done_at is null order by d.requested_at limit p_limit;
$$;

do $$
begin
  revoke all on function pending_discovery(int) from public;
  revoke all on function request_prompt_discovery(uuid) from public;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function pending_discovery(int) from anon, authenticated;
    grant execute on function pending_discovery(int) to service_role;
    revoke all on function request_prompt_discovery(uuid) from anon;
    grant execute on function request_prompt_discovery(uuid) to authenticated;
    revoke all on prompt_suggestions, discovery_runs from anon;
  end if;
end $$;
