-- 0015: Ürün Doğruluğu (pilot). Kullanıcı ürünün doğru bilgilerini girer; ChatGPT (canlı arama) ürünü anlatır;
-- küçük bir LLM adımı cevaptaki iddiaları girilen bilgilerle karşılaştırır: doğru / yanlış / doğrulanamadı.
-- Yalnız ücretli canlı ölçüme izinli alanlarda (abone, Growth Lab) çalışır; maliyet paket tavanına sayılır.

create table products (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  brand_id     uuid not null references brands(id) on delete cascade,
  name         text not null check (length(trim(name)) between 2 and 120),
  price        text check (price is null or length(price) <= 60),
  facts        text not null check (length(trim(facts)) between 10 and 2000),
  check_requested_at timestamptz,
  created_at   timestamptz not null default now()
);
create index on products (brand_id);
alter table products enable row level security;
create policy products_read on products for select using (is_member(workspace_id));
create policy products_write on products for all
  using (is_member(workspace_id, 'editor'))
  with check (is_member(workspace_id, 'editor')
              and exists (select 1 from brands b where b.id = brand_id and b.workspace_id = products.workspace_id and not b.is_competitor));

create or replace function guard_products() returns trigger language plpgsql security definer set search_path = public as $$
declare n int;
begin
  new.check_requested_at := null;  -- kontrol isteği yalnız request_product_check ile verilir
  select count(*) into n from products where brand_id = new.brand_id;
  if n >= 10 then raise exception 'Marka başına en fazla 10 ürün eklenebilir'; end if;
  return new;
end $$;
create trigger products_guard before insert on products for each row execute function guard_products();

create table product_checks (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  product_id   uuid not null references products(id) on delete cascade,
  provider     text not null,
  model        text not null,
  question     text not null,
  answer_text  text not null,
  cited_urls   text[] not null default '{}',
  recognized   boolean,                       -- cevap doğru ürünü mü anlatıyor (null: karşılaştırma yapılamadı)
  claims       jsonb not null default '[]',   -- [{claim, status: correct|wrong|unverifiable, fact}]
  judge        text,                          -- 'llm:<model>' ya da null (karşılaştırma başarısız)
  cost_usd     numeric(10,6) not null default 0,
  created_at   timestamptz not null default now()
);
create index on product_checks (product_id, created_at desc);
alter table product_checks enable row level security;
create policy product_checks_read on product_checks for select using (is_member(workspace_id));
-- yazma yalnız sunucu (service role)

create or replace function request_product_check(p_product uuid) returns void
language plpgsql security definer set search_path = public as $$
declare p record; w record;
begin
  select * into p from products where id = p_product;
  if not found then raise exception 'Ürün bulunamadı'; end if;
  if not is_member(p.workspace_id, 'editor') then raise exception 'Yetki yok'; end if;
  select * into w from workspaces where id = p.workspace_id;
  if not w.paid_live_allowed then raise exception 'Ürün doğruluğu kontrolü ChatGPT canlı aramalı ücretli paketlerde kullanılabilir'; end if;
  if w.status = 'paused' then raise exception 'Çalışma alanı durduruldu: %', w.paused_reason; end if;
  if p.check_requested_at is not null and not exists (select 1 from product_checks c where c.product_id = p.id and c.created_at >= p.check_requested_at) then
    raise exception 'Bu ürün için zaten bekleyen bir kontrol var';
  end if;
  if exists (select 1 from product_checks c where c.product_id = p.id and c.created_at > now() - interval '20 hours') then
    raise exception 'Bu ürün bugün kontrol edildi. Yarın tekrar deneyebilirsiniz.';
  end if;
  update products set check_requested_at = now() where id = p_product;
end $$;

create or replace function pending_product_checks(p_limit int default 5)
returns table (product_id uuid, workspace_id uuid, brand_name text, product_name text, price text, facts text, country text)
language sql security definer set search_path = public as $$
  select p.id, p.workspace_id, b.name, p.name, p.price, p.facts, b.country
    from products p join brands b on b.id = p.brand_id join workspaces w on w.id = p.workspace_id
   where p.check_requested_at is not null and w.status = 'active' and w.paid_live_allowed
     and not exists (select 1 from product_checks c where c.product_id = p.id and c.created_at >= p.check_requested_at)
   order by p.check_requested_at limit p_limit;
$$;

revoke all on function request_product_check(uuid) from public;
revoke all on function pending_product_checks(int) from public;
revoke all on function guard_products() from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function request_product_check(uuid) from anon;
    grant execute on function request_product_check(uuid) to authenticated;
    revoke all on function pending_product_checks(int) from anon, authenticated;
    grant execute on function pending_product_checks(int) to service_role;
    revoke all on function guard_products() from anon, authenticated;
    revoke all on products from anon;
    revoke all on product_checks from anon;
    -- istemci kontrol isteğini doğrudan yazamaz: yalnız ad, fiyat ve bilgiler güncellenebilir
    revoke update on products from authenticated;
    grant update (name, price, facts) on products to authenticated;
    revoke insert, update, delete on product_checks from authenticated;
  end if;
end $$;
