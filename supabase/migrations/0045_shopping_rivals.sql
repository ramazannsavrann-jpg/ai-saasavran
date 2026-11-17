-- 0045: Rakip ürünlerin kendi Google Shopping araması. Önceden rakip ürün yalnız kendi ürünün aramasında çıkarsa
-- görülüyordu (17 Kasım ABD ölçümünde hiçbiri çıkmadı). Artık kendi ürün için kontrol istendiğinde ona bağlı rakip
-- ürünler de sıraya girer ve her biri kendi adıyla aranır (rakip başına 1 SerpApi araması). Rakipler yalnız istek
-- üzerine aranır; haftalık otomatik kontrole girmez (arama hakkı korunur).

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
  -- Rakip ürünler de kendi aramalarıyla sıraya girer (son 20 saatte aranmadıysa)
  update products r set shopping_requested_at = now()
   where r.rival_of = p_product
     and not exists (select 1 from shopping_checks c where c.product_id = r.id and c.created_at > now() - interval '20 hours');
end $$;

create or replace function pending_shopping_checks(p_limit int default 5)
returns table (product_id uuid, workspace_id uuid, brand_name text, product_name text, shopping_query text, country text, rivals jsonb, requested boolean)
language sql security definer set search_path = public as $$
  select p.id, p.workspace_id, coalesce(p.rival_brand, b.name), p.name, p.shopping_query, coalesce(b.country, 'TR'),
         case when p.rival_of is null
              then coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name, 'brand', r.rival_brand)) from products r where r.rival_of = p.id), '[]'::jsonb)
              else '[]'::jsonb end,
         p.shopping_requested_at is not null
    from products p join brands b on b.id = p.brand_id join workspaces w on w.id = p.workspace_id
   where w.status = 'active' and w.paid_live_allowed and b.data_origin <> 'simulated'
     and (p.shopping_attempted_at is null or p.shopping_attempted_at < now() - interval '20 hours')
     and (
       (p.shopping_requested_at is not null and not exists (select 1 from shopping_checks c where c.product_id = p.id and c.created_at >= p.shopping_requested_at))
       or (p.rival_of is null and not exists (select 1 from shopping_checks c where c.product_id = p.id and c.created_at > now() - interval '7 days'))
     )
   order by (p.shopping_requested_at is null), (p.rival_of is not null), (select max(c.created_at) from shopping_checks c where c.product_id = p.id) nulls first, p.created_at
   limit p_limit;
$$;

revoke all on function request_shopping_check(uuid) from public;
revoke all on function pending_shopping_checks(int) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function request_shopping_check(uuid) from anon;
    grant execute on function request_shopping_check(uuid) to authenticated;
    revoke all on function pending_shopping_checks(int) from anon, authenticated;
    grant execute on function pending_shopping_checks(int) to service_role;
  end if;
end $$;
