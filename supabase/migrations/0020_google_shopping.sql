-- 0020: Google Shopping görünürlüğü. Ücretli alanlarda kendi ürünleriniz haftada bir otomatik olarak
-- Google Shopping'de aranır (SerpApi). Kayıt: ürününüzün sırası, fiyatı, satıcısı, rakip ürünlerin sırası ve ilk 20 ilan.
-- İsteğe bağlı "alışveriş sorgusu" (örn. "erkek koşu ayakkabısı") girilmezse marka + ürün adı aranır.
alter table products add column shopping_query text check (shopping_query is null or length(trim(shopping_query)) between 2 and 120);
alter table products add column shopping_requested_at timestamptz;
alter table products add column shopping_attempted_at timestamptz;

create or replace function guard_products_shopping() returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- istek ve deneme zamanları yalnız sunucu fonksiyonlarıyla yazılır
  new.shopping_requested_at := null;
  new.shopping_attempted_at := null;
  return new;
end $$;
create trigger products_shopping_guard before insert on products for each row execute function guard_products_shopping();

create table shopping_checks (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  product_id   uuid not null references products(id) on delete cascade,
  query        text not null,
  country      text not null,
  own_position int,                 -- listedeki ilk eşleşme (null: listede yok)
  own_price    text,
  own_seller   text,
  own_count    int not null default 0,
  rivals       jsonb not null default '[]',   -- [{id, position, price, seller}]
  items        jsonb not null default '[]',   -- ilk 20 ilan: [{position,title,source,price,link,match}]
  source       text not null default 'serpapi',
  created_at   timestamptz not null default now()
);
create index on shopping_checks (product_id, created_at desc);
create index on shopping_checks (created_at);
alter table shopping_checks enable row level security;
create policy shopping_checks_read on shopping_checks for select using (is_member(workspace_id));
-- yazma yalnız sunucu (service role)

create or replace function request_shopping_check(p_product uuid) returns void
language plpgsql security definer set search_path = public as $$
declare p record; w record;
begin
  select * into p from products where id = p_product;
  if not found then raise exception 'Ürün bulunamadı'; end if;
  if p.rival_of is not null then raise exception 'Google Shopping kontrolü kendi ürünleriniz için yapılır; rakip ürünler aynı aramada gösterilir'; end if;
  if not is_member(p.workspace_id, 'editor') then raise exception 'Yetki yok'; end if;
  select * into w from workspaces where id = p.workspace_id;
  if not w.paid_live_allowed then raise exception 'Google Shopping kontrolü ücretli paketlerde kullanılabilir'; end if;
  if w.status = 'paused' then raise exception 'Çalışma alanı durduruldu: %', w.paused_reason; end if;
  if p.shopping_requested_at is not null and not exists (select 1 from shopping_checks c where c.product_id = p.id and c.created_at >= p.shopping_requested_at) then
    raise exception 'Bu ürün için zaten bekleyen bir Google Shopping kontrolü var';
  end if;
  if exists (select 1 from shopping_checks c where c.product_id = p.id and c.created_at > now() - interval '20 hours') then
    raise exception 'Bu ürün bugün Google Shopping''de kontrol edildi. Yarın tekrar deneyebilirsiniz.';
  end if;
  update products set shopping_requested_at = now() where id = p_product;
end $$;

-- Sıradaki kontroller: önce kullanıcı istekleri, sonra 7 günden eski (ya da hiç) kontrol edilmemiş ürünler.
-- Bir ürün 20 saatte en fazla bir kez denenir (hata olsa bile tekrar tekrar arama harcanmaz).
create or replace function pending_shopping_checks(p_limit int default 5)
returns table (product_id uuid, workspace_id uuid, brand_name text, product_name text, shopping_query text, country text, rivals jsonb, requested boolean)
language sql security definer set search_path = public as $$
  select p.id, p.workspace_id, b.name, p.name, p.shopping_query, coalesce(b.country, 'TR'),
         coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name, 'brand', r.rival_brand)) from products r where r.rival_of = p.id), '[]'::jsonb),
         p.shopping_requested_at is not null
    from products p join brands b on b.id = p.brand_id join workspaces w on w.id = p.workspace_id
   where p.rival_of is null and w.status = 'active' and w.paid_live_allowed and b.data_origin <> 'simulated'
     and (p.shopping_attempted_at is null or p.shopping_attempted_at < now() - interval '20 hours')
     and (
       (p.shopping_requested_at is not null and not exists (select 1 from shopping_checks c where c.product_id = p.id and c.created_at >= p.shopping_requested_at))
       or not exists (select 1 from shopping_checks c where c.product_id = p.id and c.created_at > now() - interval '7 days')
     )
   order by (p.shopping_requested_at is null), (select max(c.created_at) from shopping_checks c where c.product_id = p.id) nulls first, p.created_at
   limit p_limit;
$$;

revoke all on function request_shopping_check(uuid) from public;
revoke all on function pending_shopping_checks(int) from public;
revoke all on function guard_products_shopping() from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function request_shopping_check(uuid) from anon;
    grant execute on function request_shopping_check(uuid) to authenticated;
    revoke all on function pending_shopping_checks(int) from anon, authenticated;
    grant execute on function pending_shopping_checks(int) to service_role;
    revoke all on function guard_products_shopping() from anon, authenticated;
    revoke all on shopping_checks from anon;
    revoke insert, update, delete on shopping_checks from authenticated;
    grant update (name, price, facts, rival_brand, shopping_query) on products to authenticated;
  end if;
end $$;
