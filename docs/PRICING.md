# Paket maliyet hesabı

Bu tablo `npm run pricing` ile fiyat kartlarından üretilir (fiyatlar 2026-11-07'de kontrol edildi; OpenAI değerleri gerçek ölçümden). Tablo 18 Kasım 2026 denetiminde `npm run pricing` çıktısıyla yenilendi. Her CI çalışmasında yeniden hesaplanır.

## Sonuç

| Paket | Fiyat | Çağrı/ay | Tipik: maliyet / brüt marj | Kötü durum: maliyet / brüt marj |
|---|---|---|---|---|
| Starter (eski öneri: 50 soru, 3 tekrar) | $29.00 | 1950 | $20.32 / %30 | $42.69 / %-47 |
| Starter (yeni: 25 soru, 2 tekrar) | $29.00 | 650 | $9.24 / %68 | $17.86 / %38 |
| Starter önerisi (ChatGPT + Gemini, 20 soru, 2 tekrar) | $29.00 | 347 | $7.32 / %75 | $12.61 / %57 |
| Starter — sadece Gemini (bugünkü durum) | $29.00 | 217 | $4.09 / %86 | $8.87 / %69 |
| Pro (eski: 3 marka, 50 soru, 3 tekrar) | $79.00 | 5850 | $57.06 / %28 | $121.68 / %-54 |
| Pro (yeni: 3 marka, 30 soru, 2 tekrar) | $79.00 | 2340 | $27.14 / %66 | $54.64 / %31 |
| Agency (yeni: 10 marka, 30 soru, 2 tekrar) | $199.00 | 7800 | $83.18 / %58 | $171.92 / %14 |
| Free (15 soru, Gemini aramasız, haftada 1 tekrar) | $0.00 | 65 | $1.87 / — | $4.53 / — |
| Plus (1 marka, 25 soru, ChatGPT canlı + Gemini) | $20.00 | 433 | $7.77 / %61 | $13.95 / %30 |
| Pro (5 marka, 30 soru, ChatGPT canlı + Gemini) | $99.00 | 2600 | $36.33 / %63 | $66.63 / %33 |
| Business (15 marka, 30 soru, ChatGPT canlı + Gemini) | $249.00 | 7800 | $103.09 / %59 | $191.50 / %23 |
| Plus 29 $ (ChatGPT + Claude + Perplexity + Gemini) | $29.00 | 650 | $10.79 / %63 | $18.89 / %35 |
| Pro 149 $ (ChatGPT + Claude + Perplexity + Gemini) | $149.00 | 3900 | $54.27 / %64 | $96.11 / %35 |
| Business 449 $ (ChatGPT + Claude + Perplexity + Gemini) | $449.00 | 11700 | $159.41 / %64 | $282.43 / %37 |
| Plus + Claude (1 marka, 25 soru) | $20.00 | 542 | $9.84 / %51 | $16.71 / %16 |
| Pro + Claude (5 marka, 30 soru) | $99.00 | 3250 | $48.71 / %51 | $83.21 / %16 |
| Business + Claude (15 marka, 30 soru) | $249.00 | 9750 | $140.24 / %44 | $241.23 / %3 |

Çağrı başı API maliyeti:
- Tipik: gemini $0.0018, openai $0.0191, claude $0.0191, perplexity $0.0047
- Kötü durum: gemini $0.0158, openai $0.0255, claude $0.0255, perplexity $0.0160

Ücretsiz Gemini kotasıyla (günde 450 çağrı) izlenebilecek "Starter yeni" marka sayısı: 62

**Gerçek ölçüm (7 Kasım 2026):** ChatGPT (gpt-6-luna + web araması) ile 30 canlı cevap toplam 0,58 $ tuttu: cevap başına ortalama **0,0194 $** (ort. 17.400 girdi / 670 çıktı token, ~1,7 arama). İlk tahmin 0,012 $ idi; arama içeriği token sayısı beklenenden yüksek çıktı. Tablo bu gerçek değerle yeniden hesaplandı.

**Fiyat kararı bekliyor (kullanıcı):** ChatGPT analizinin önerisi "Starter 29 $: 1 marka, 20 soru, ChatGPT + Gemini, haftalık" bu hesapla tipik ~6,5 $, kötü durumda ~11,8 $ maliyet (%77 / %59 brüt marj).

## Yorum

- **Eski Starter (50 soru, 3 tekrar, 3 motor) 29 $'a sürdürülemez:** kötü durumda zarar eder.
- **Yeni Starter (25 soru, 2 tekrar, haftalık, 3 motor):** tipik maliyet ~7 $, kötü durumda ~15 $. 29 $'da kârlı. Veritabanında aylık ücretli API tavanı 12 $; aşılacaksa müşteri otomatik durdurulur.
- **Bugünkü durum (yalnız ücretsiz Gemini):** API maliyeti 0 $, ancak ücretsiz katmanda arama dayanağı olmadığı için ölçüm canlı web aramasını yansıtmayabilir (bkz. STATUS.md). Ücretli katmanın aylık 5.000 ücretsiz dayanağıyla ~23 Starter markası neredeyse yalnızca token maliyetiyle (~0,40 $/ay/marka) izlenebilir.
- **Pro ve Agency** eski kotalarla kötü durumda zarar ediyordu; kotalar düşürüldü (her ikisi de marka başı 30 soru × 2 tekrar). Aylık ücretli API tavanları kötü durumda bile zarar etmeyi engelliyor.

## Varsayımlar (gerçek ölçümle güncellenecek)

| Kalem | Değer | Kaynak / not |
|---|---|---|
| Gemini 3.5 Flash-Lite | 0,30 $ / 2,50 $ per 1M token; dayanak ücretli katmanda ayda 5.000 ücretsiz (tüm müşteriler ortak), sonra 1.000'de 14 $ | aistudio.google.com/docs/pricing |
| Gemini ücretsiz katman | Gemini 2.5 modelleri yeni kullanıcılara kapalı (2026-11-06 gerçek test, HTTP 404). Gemini 3.x'te ücretsiz arama dayanağı yok (fiyat sayfası). **Ücretsiz katman içeriği Google tarafından ürün geliştirmede kullanılır.** | fiyat sayfası + CI testi |
| OpenAI gpt-5.4-nano + web_search | 0,20 $ / 1,25 $ per 1M; arama 1.000 çağrıda 10 $; arama içeriği girdi token sayılır | üçüncü taraf özet; resmi sayfadan teyit edilecek |
| Perplexity Sonar (düşük bağlam) | 1 $ / 1 $ per 1M + 1.000 istekte 5 $ | üçüncü taraf özet; resmi sayfadan teyit edilecek |
| Tipik çağrı | 150 girdi / 700 çıktı token (OpenAI: 6.000 girdi) | tahmin |
| LLM ek yükü (sınıflandırma + öneri) | marka başına 0,5–1 $/ay | tahmin |
| Altyapı payı | müşteri başına 1,25–2,5 $/ay | Supabase Pro ~25 $ / 10–20 müşteri |
| Ödeme komisyonu | %4 | varsayım; iyzico/PayTR teklifiyle güncellenecek |

## Güncel fiyatlar (12 Kasım 2026, migration 0019)

**Plus 29 $ · Pro 149 $ · Business 449 $** (aylık). Site ve `engine/src/pricing.ts` bu fiyatları kullanır.
Limitler ve aylık ücretli harcama tavanları değişmedi (Plus 9 $, Pro 50 $, Business 150 $). Aşağıdaki
7 Kasım tablosundaki 20 / 99 / 249 $ fiyatları **eskidir**; yalnız geçmiş kayıt olarak duruyor.

## Eski karar (7 Kasım 2026): ChatGPT tarzı paketler

Kurucunun isteğiyle paket yapısı ChatGPT'ye benzetildi: Free / Plus / Pro / Business. Pro için ChatGPT'deki 200 $ yerine
99 $ seçildi, çünkü rakipler (Otterly, Peec AI) bu bantta. Kaynak: `supabase/migrations/0007_plans_v2.sql`, `engine/src/pricing.ts`.

| Paket | Fiyat/ay | Marka × soru | Rakip | Aylık cevap kotası | Motorlar | Ücretli tavan | ChatGPT maliyeti (tipik / kötü) | Tipik brüt kâr |
|---|---|---|---|---|---|---|---|---|
| Free | 0 $ | 1 × 15 (haftada 1 tekrar), **ayda en fazla 4 ölçüm** (migration 0008) | 3 | 100 | Gemini aramasız (ücretsiz katman) | 0 $ | 0 $ | — |
| Plus | 20 $ | 1 × 25 (haftada 2 tekrar) | 5 | 520 | ChatGPT canlı + Gemini | 9 $ | 4,1 $ / 5,5 $ | %65 |
| Pro | 99 $ | 5 × 30 | 8 | 3.000 | ChatGPT canlı + Gemini | 50 $ | 24,8 $ / 33,2 $ | %65 |
| Business | 249 $ | 15 × 30 | 10 | 9.000 | ChatGPT canlı + Gemini | 150 $ | 74,4 $ / 99,5 $ | %60 |

**Zarar etmeme kuralı:** her ücretli paketin aylık harcama tavanı + %4 ödeme komisyonu fiyatın altında; tavana gelince ölçüm durur.
Bu yüzden en kötü durumda bile müşteri başına zarar edilmez (birim testi: "Güncel paketler").

**Ücretsiz paket neden zarar ettirmez:** yalnız Gemini ücretsiz katmanını kullanır (para maliyeti 0). Tek sınır, tüm kullanıcılar
için ortak günlük Gemini kotası (kendi tavanımız 450/gün). Free kullanıcı başına ~65 cevap/ay → aynı anda ~200 aktif ücretsiz marka.
Dolarsa ölçüm ertesi güne kalır, para harcanmaz. Ücretli müşteriler gelince Gemini için ayrı ücretli anahtar düşünülmeli
(ücretsiz katmanda Google içerikleri kullanabilir) ve `app_settings.paid_total_cap_usd` (o tarihte 3 $; 18 Kasım itibarıyla 25 $) yükseltilmeli.

(Eski not, 7 Kasım: o tarihte ücretli paketler satışta değildi. Bugün Paddle bağlı; güncel fiyat 29 / 149 / 449 $ ve toplam ücretli tavan 25 $.)
