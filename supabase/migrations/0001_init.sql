-- AI SaaSavran — ilk şema (v0.1)
-- İlke: her müşteri verisi bir workspace'e bağlıdır; RLS ile yalnızca üyeler erişir.
-- Demo ve gerçek veri "data_origin" sütunuyla ayrılır ve karıştırılamaz.

-- gen_random_uuid() Postgres 13+ içinde yerleşik; ek eklenti gerekmez.

-- ---------- Çalışma alanları ve üyelik ----------
create type workspace_kind as enum ('business', 'agency', 'demo_lab', 'growth_lab');
create type member_role   as enum ('owner', 'admin', 'editor', 'viewer');
create type data_origin   as enum ('live_api', 'simulated');  -- simulated = yalnızca Demo Lab

create table workspaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(name) between 1 and 120),
  kind        workspace_kind not null,
  plan        text not null default 'free',
  monthly_budget_usd numeric(10,2) not null default 0 check (monthly_budget_usd >= 0),
  created_at  timestamptz not null default now()
);

create table workspace_members (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id      uuid not null,
  role         member_role not null default 'viewer',
  created_at   timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

-- Yardımcı: kullanıcı bu workspace'in üyesi mi? (RLS özyinelemesini önlemek için security definer)
create or replace function is_member(ws uuid, min_role member_role default 'viewer')
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from workspace_members m
    where m.workspace_id = ws
      and m.user_id = auth.uid()
      and case min_role
            when 'viewer' then true
            when 'editor' then m.role in ('owner','admin','editor')
            when 'admin'  then m.role in ('owner','admin')
            when 'owner'  then m.role = 'owner'
          end
  );
$$;

-- ---------- Markalar, rakipler, sorular ----------
create table brands (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name         text not null,
  aliases      text[] not null default '{}',     -- "Ali Usta Döner", "AliUsta" ...
  website      text,
  sector       text,
  city         text,
  is_competitor boolean not null default false,
  owner_brand_id uuid references brands(id) on delete cascade, -- rakipse hangi markanın rakibi
  data_origin  data_origin not null default 'live_api',
  created_at   timestamptz not null default now()
);
create index on brands (workspace_id);

create type prompt_intent as enum ('informational', 'comparison', 'purchase', 'local');

create table prompts (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  brand_id     uuid not null references brands(id) on delete cascade,
  text         text not null,
  intent       prompt_intent not null,
  language     text not null default 'tr',
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);
create index on prompts (workspace_id, brand_id);

-- ---------- Çalıştırmalar ve cevaplar ----------
create type run_status as enum ('queued', 'running', 'done', 'failed', 'budget_blocked');

create table runs (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  brand_id     uuid not null references brands(id) on delete cascade,
  status       run_status not null default 'queued',
  data_origin  data_origin not null,
  max_cost_usd numeric(10,4) not null check (max_cost_usd > 0),  -- her görevin tavanı zorunlu
  cost_usd     numeric(10,4) not null default 0,
  started_at   timestamptz,
  finished_at  timestamptz,
  error        text,
  created_at   timestamptz not null default now()
);
create index on runs (workspace_id, created_at desc);

create table responses (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  run_id       uuid not null references runs(id) on delete cascade,
  prompt_id    uuid not null references prompts(id) on delete cascade,
  provider     text not null,        -- 'openai' | 'gemini' | 'perplexity' | 'mock'
  model        text not null,        -- gerçek model kimliği, tarih karşılaştırması için
  method       text not null,        -- 'api_with_search' — tüketici arayüzü değildir
  repetition   smallint not null default 1,
  answer_text  text not null,
  cited_urls   text[] not null default '{}',
  data_origin  data_origin not null,
  input_tokens  integer not null default 0,
  output_tokens integer not null default 0,
  cost_usd     numeric(10,6) not null default 0,
  created_at   timestamptz not null default now()
);
create index on responses (workspace_id, run_id);

-- Her cevapta her marka (bizimki + rakipler) için tek satır
create table mentions (
  response_id  uuid not null references responses(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  brand_id     uuid not null references brands(id) on delete cascade,
  mentioned    boolean not null,
  recommended  boolean not null,
  cited        boolean not null,
  rank         smallint,                -- listede kaçıncı sırada (yoksa null)
  classifier   text not null,           -- 'rules_v1' | 'llm:<model>' — hangi yöntemle karar verildi
  primary key (response_id, brand_id)
);

-- ---------- Maliyet defteri ----------
create table cost_ledger (
  id           bigint generated always as identity primary key,
  workspace_id uuid references workspaces(id) on delete set null,
  run_id       uuid references runs(id) on delete set null,
  task         text not null,           -- 'query_engine' | 'classify' | 'recommend' ...
  provider     text not null,
  model        text not null,
  input_tokens  integer not null default 0,
  output_tokens integer not null default 0,
  tool_calls   integer not null default 0,
  cost_usd     numeric(10,6) not null,
  cache_hit    boolean not null default false,
  ok           boolean not null default true,
  created_at   timestamptz not null default now()
);
create index on cost_ledger (workspace_id, created_at);

-- ---------- Satır düzeyi güvenlik (RLS) ----------
alter table workspaces        enable row level security;
alter table workspace_members enable row level security;
alter table brands            enable row level security;
alter table prompts           enable row level security;
alter table runs              enable row level security;
alter table responses         enable row level security;
alter table mentions          enable row level security;
alter table cost_ledger       enable row level security;

create policy ws_read  on workspaces for select using (is_member(id));
create policy ws_write on workspaces for update using (is_member(id, 'admin'));

create policy mem_read on workspace_members for select using (is_member(workspace_id));
create policy mem_admin on workspace_members for all
  using (is_member(workspace_id, 'admin')) with check (is_member(workspace_id, 'admin'));

-- İçerik tabloları: üye okur, editör yazar
create policy brands_read  on brands  for select using (is_member(workspace_id));
create policy brands_write on brands  for all using (is_member(workspace_id,'editor')) with check (is_member(workspace_id,'editor'));
create policy prompts_read  on prompts for select using (is_member(workspace_id));
create policy prompts_write on prompts for all using (is_member(workspace_id,'editor')) with check (is_member(workspace_id,'editor'));
create policy runs_read on runs for select using (is_member(workspace_id));
-- runs/responses/mentions/cost_ledger yalnızca sunucu (service role) tarafından yazılır; istemci yazamaz.
create policy responses_read on responses for select using (is_member(workspace_id));
create policy mentions_read  on mentions  for select using (is_member(workspace_id));
create policy cost_read      on cost_ledger for select using (is_member(workspace_id, 'admin'));

-- Demo verisi gerçek workspace'e sızamaz
create or replace function guard_simulated() returns trigger language plpgsql as $$
begin
  if new.data_origin = 'simulated' and
     (select kind from workspaces where id = new.workspace_id) <> 'demo_lab' then
    raise exception 'Simüle veri yalnızca demo_lab workspace''ine yazılabilir';
  end if;
  return new;
end $$;
create trigger brands_sim_guard    before insert or update on brands    for each row execute function guard_simulated();
create trigger runs_sim_guard      before insert or update on runs      for each row execute function guard_simulated();
create trigger responses_sim_guard before insert or update on responses for each row execute function guard_simulated();
