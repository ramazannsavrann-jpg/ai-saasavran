-- Altın aylık çağrı kotası 2.340 → 2.520. 2.340 tam haftalık ihtiyaçtı (3 marka × 30 soru × 6 çağrı × 4,33 hafta),
-- hiç pay yoktu; 5 haftalı aylarda ve yeniden denemelerde ay bitmeden ölçüm dururdu. Diğer paketlerle aynı ~%8 pay
-- (Platin 4.200 = 5 × 840, Elmas 12.600 = 15 × 840). Harcama tavanı (100 $) değişmedi.
update plans set monthly_engine_calls = 2520 where id = 'altin';
