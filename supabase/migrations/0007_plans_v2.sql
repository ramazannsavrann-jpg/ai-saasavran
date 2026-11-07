-- 0007: ChatGPT tarzı paketler (Free / Plus / Pro / Business) ve daha cömert ücretsiz paket.
-- Paket kimlikleri aynı kalır (starter=Plus, agency=Business); yalnız ad, fiyat ve kotalar değişir.
-- Ücretsiz paket yalnız Gemini ücretsiz katmanını kullanır (para maliyeti 0). Ücretli paketlerde
-- monthly_paid_cap_usd, en kötü durumda bile API harcamasının fiyatın altında kalmasını garanti eder.
-- Hesap: docs/PRICING.md ve engine/src/pricing.ts.
update plans set name = 'Free',     price_usd = 0,   max_brands = 1,  max_prompts_per_brand = 15, max_competitors = 3,  monthly_engine_calls = 100,  monthly_paid_cap_usd = 0   where id = 'free';
update plans set name = 'Plus',     price_usd = 20,  max_brands = 1,  max_prompts_per_brand = 25, max_competitors = 5,  monthly_engine_calls = 520,  monthly_paid_cap_usd = 9   where id = 'starter';
update plans set name = 'Pro',      price_usd = 99,  max_brands = 5,  max_prompts_per_brand = 30, max_competitors = 8,  monthly_engine_calls = 3000, monthly_paid_cap_usd = 50  where id = 'pro';
update plans set name = 'Business', price_usd = 249, max_brands = 15, max_prompts_per_brand = 30, max_competitors = 10, monthly_engine_calls = 9000, monthly_paid_cap_usd = 150 where id = 'agency';
-- agency_plus: yalnız iç kullanım (Demo Lab, pilot); satışta yok.
update plans set name = 'Internal' where id = 'agency_plus';
