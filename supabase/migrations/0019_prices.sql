-- 0019: Fiyat güncellemesi (12 Kasım 2026): tipik maliyetin yaklaşık 3 katı. Plus 29 $, Pro 149 $, Business 449 $.
-- Limitler ve ücretli harcama tavanları DEĞİŞMEDİ (9 / 50 / 150 $). Henüz abone yok; mevcut abonelik etkilenmez.
update plans set price_usd = 29  where id = 'starter';
update plans set price_usd = 149 where id = 'pro';
update plans set price_usd = 449 where id = 'agency';
