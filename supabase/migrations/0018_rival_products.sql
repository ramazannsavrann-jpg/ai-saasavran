-- 0018: Rakip ürünler. Kullanıcı kendi ürününün karşısına rakip ürün ekler; rapor ikisinin görünürlüğünü
-- aynı cevaplarda yan yana gösterir (ek API çağrısı yok). Rakip ürünün "doğru bilgileri" istenmez.
alter table products add column rival_of uuid references products(id) on delete cascade;
alter table products add column rival_brand text check (rival_brand is null or length(trim(rival_brand)) between 1 and 80);
alter table products drop constraint if exists products_facts_check;
alter table products alter column facts drop not null;
alter table products add constraint products_facts_check check (
  (rival_of is null and facts is not null and length(trim(facts)) between 10 and 2000)
  or (rival_of is not null and (facts is null or length(facts) <= 2000))
);
create index on products (rival_of);

create or replace function guard_products() returns trigger language plpgsql security definer set search_path = public as $$
declare n int; parent record;
begin
  new.check_requested_at := null;  -- kontrol isteği yalnız request_product_check ile verilir
  if new.rival_of is null then
    select count(*) into n from products where brand_id = new.brand_id and rival_of is null;
    if n >= 10 then raise exception 'Marka başına en fazla 10 ürün eklenebilir'; end if;
  else
    select * into parent from products where id = new.rival_of;
    if not found or parent.rival_of is not null or parent.brand_id <> new.brand_id then
      raise exception 'Rakip ürün yalnız kendi ürününüze bağlanabilir';
    end if;
    select count(*) into n from products where rival_of = new.rival_of;
    if n >= 5 then raise exception 'Ürün başına en fazla 5 rakip ürün eklenebilir'; end if;
  end if;
  return new;
end $$;

-- Doğruluk kontrolü yalnız kendi ürünleriniz için
create or replace function request_product_check(p_product uuid) returns void
language plpgsql security definer set search_path = public as $$
declare p record; w record;
begin
  select * into p from products where id = p_product;
  if not found then raise exception 'Ürün bulunamadı'; end if;
  if p.rival_of is not null then raise exception 'Doğruluk kontrolü yalnız kendi ürünleriniz için yapılır'; end if;
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
revoke all on function request_product_check(uuid) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function request_product_check(uuid) from anon;
    grant execute on function request_product_check(uuid) to authenticated;
    revoke all on function guard_products() from anon, authenticated;
    grant update (name, price, facts, rival_brand) on products to authenticated;
  end if;
end $$;
