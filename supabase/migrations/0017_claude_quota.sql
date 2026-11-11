-- 0017: Claude müşteri paketlerinde. Canlı ölçümde ChatGPT (2 tekrar) + Claude (1 tekrar) çalıştığı için
-- aylık sorgu kotaları Claude çağrılarını karşılayacak kadar artırıldı. Ücretli harcama tavanları DEĞİŞMEDİ (9 / 50 / 150 $).
-- Hesap (haftalık, ayda 4,33 ölçüm): Plus 217 Gemini + 217 ChatGPT + 108 Claude = 542; Pro 3.248; Business 9.743.
update plans set monthly_engine_calls = 620   where id = 'starter';
update plans set monthly_engine_calls = 3600  where id = 'pro';
update plans set monthly_engine_calls = 10800 where id = 'agency';
