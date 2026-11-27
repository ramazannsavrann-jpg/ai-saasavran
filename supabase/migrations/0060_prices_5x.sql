-- 0060: Fiyat güncellemesi (21 Kasım 2026): tipik ölçüm maliyeti x5 (Paddle komisyonu dahil).
-- Plus 60 $, Pro 300 $, Business 876 $. Limitler ve ücretli harcama tavanları DEĞİŞMEDİ (9 / 50 / 150 $).
-- Henüz ücretli abone yok; mevcut abonelik etkilenmez.
update plans set price_usd = 60  where id = 'starter';
update plans set price_usd = 300 where id = 'pro';
update plans set price_usd = 876 where id = 'agency';
