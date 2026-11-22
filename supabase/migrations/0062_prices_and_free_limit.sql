-- 0062: Fiyat ve ücretsiz paket güncellemesi (22 Kasım 2026, sahip onayı).
-- Plus 130 $, Pro 400 $, Business 1500 $ (aylık). Free: ayda 1 ölçüm (Gemini, aramasız).
-- Limitler ve ücretli harcama tavanları DEĞİŞMEDİ. Henüz ücretli abone yok.
-- "Önerilen" 250 $ paketi bu migration'da YOK: içeriği sahip onayını bekliyor.
update plans set price_usd = 130  where id = 'starter';
update plans set price_usd = 400  where id = 'pro';
update plans set price_usd = 1500 where id = 'agency';
update plans set monthly_runs = 1 where id = 'free';
