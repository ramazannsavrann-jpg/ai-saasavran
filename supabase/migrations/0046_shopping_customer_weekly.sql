-- 0046: Google Shopping müşteride yalnız kendi ürünleri için haftada bir otomatik (17 Kasım kararı).
-- Elle "Şimdi kontrol et" ve rakip ürün aramaları yalnız Growth Lab'de (video/araştırma). Sebep: SerpApi arama hakkı
-- bütün müşteriler arasında ortak. Haftalık otomatik kontrol (pending_shopping_checks) değişmedi.

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
  -- 0046: müşteride ürünler haftada bir otomatik kontrol edilir; elle istek ve rakip aramaları yalnız test alanında
  if w.kind <> 'growth_lab' then raise exception 'Google Shopping ürünleriniz için haftada bir otomatik kontrol edilir'; end if;
  if w.status = 'paused' then raise exception 'Çalışma alanı durduruldu: %', w.paused_reason; end if;
  if p.shopping_requested_at is not null and not exists (select 1 from shopping_checks c where c.product_id = p.id and c.created_at >= p.shopping_requested_at) then
    raise exception 'Bu ürün için zaten bekleyen bir Google Shopping kontrolü var';
  end if;
  if exists (select 1 from shopping_checks c where c.product_id = p.id and c.created_at > now() - interval '20 hours') then
    raise exception 'Bu ürün bugün Google Shopping''de kontrol edildi. Yarın tekrar deneyebilirsiniz.';
  end if;
  update products set shopping_requested_at = now() where id = p_product;
  -- Rakip ürünler de kendi aramalarıyla sıraya girer (son 20 saatte aranmadıysa)
  update products r set shopping_requested_at = now()
   where r.rival_of = p_product
     and not exists (select 1 from shopping_checks c where c.product_id = r.id and c.created_at > now() - interval '20 hours');
end $$;

revoke all on function request_shopping_check(uuid) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function request_shopping_check(uuid) from anon;
    grant execute on function request_shopping_check(uuid) to authenticated;
  end if;
end $$;
