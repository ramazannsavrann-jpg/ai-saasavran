-- 0043: Perplexity müşteri paketlerinde (her soruyu 1 kez). Aylık motor çağrısı kotaları buna göre yükseltildi.
-- Plus: 1 marka x 25 soru x 4,33 hafta = 108 çağrı/motor -> ChatGPT 216 + Gemini 216 + Claude 108 + Perplexity 108 = 648
-- Pro: 5 x 30 x 4,33 = 650/motor -> 1300 + 1300 + 650 + 650 = 3900
-- Business: 15 x 30 x 4,33 = 1950/motor -> 3900 + 3900 + 1950 + 1950 = 11700
-- Ücretli harcama tavanları (9 / 50 / 150 $) aynı kalır: tipik aylık API Plus ~6,7 $, Pro ~40 $, Business ~121 $.
update plans set monthly_engine_calls = 760   where id = 'starter';
update plans set monthly_engine_calls = 4200  where id = 'pro';
update plans set monthly_engine_calls = 12600 where id = 'agency';
