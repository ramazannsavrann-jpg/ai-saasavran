# Paket maliyet hesabı

Bu tablo `npm run pricing` ile fiyat kartlarından üretilir (fiyatlar 2026-11-06'da kontrol edildi). Her CI çalışmasında yeniden hesaplanır.

## Sonuç

| Paket | Fiyat | Çağrı/ay | Tipik: maliyet / brüt marj | Kötü durum: maliyet / brüt marj |
|---|---|---|---|---|
| Starter (eski öneri: 50 soru, 3 tekrar) | $29.00 | 1950 | $14.75 / %49 | $46.94 / %-62 |
| Starter (yeni: 25 soru, 2 tekrar) | $29.00 | 650 | $6.86 / %76 | $18.75 / %35 |
| Starter — sadece Gemini (bugünkü durum) | $29.00 | 217 | $2.97 / %90 | $12.31 / %58 |
| Pro (eski: 3 marka, 50 soru, 3 tekrar) | $79.00 | 5850 | $41.44 / %48 | $135.50 / %-72 |
| Pro (yeni: 3 marka, 30 soru, 2 tekrar) | $79.00 | 2340 | $20.12 / %75 | $59.40 / %25 |
| Agency (yeni: 10 marka, 30 soru, 2 tekrar) | $199.00 | 7800 | $61.58 / %69 | $189.58 / %5 |

Çağrı başı API maliyeti:
- Tipik: gemini $0.0003, openai $0.0121, perplexity $0.0059
- Kötü durum: gemini $0.0353, openai $0.0239, perplexity $0.0059

Ücretsiz Gemini kotasıyla (günde 450 çağrı) izlenebilecek "Starter yeni" marka sayısı: 62

## Yorum

- **Eski Starter (50 soru, 3 tekrar, 3 motor) 29 $'a sürdürülemez:** kötü durumda zarar eder.
- **Yeni Starter (25 soru, 2 tekrar, haftalık, 3 motor):** tipik maliyet ~7 $, kötü durumda ~19 $. 29 $'da kârlı. Veritabanında aylık ücretli API tavanı 12 $; aşılacaksa müşteri otomatik durdurulur.
- **Bugünkü durum (yalnız ücretsiz Gemini):** API maliyeti 0 $. Ücretsiz günlük kotayla (450 çağrı) aynı anda en fazla ~62 Starter markası izlenebilir.
- **Pro ve Agency** eski kotalarla kötü durumda zarar ediyordu; kotalar düşürüldü (her ikisi de marka başı 30 soru × 2 tekrar). Agency kötü durumda marjı %5'e düşüyor; bu yüzden aylık ücretli API tavanı (90 $) zarar etmeyi engelliyor.

## Varsayımlar (gerçek ölçümle güncellenecek)

| Kalem | Değer | Kaynak / not |
|---|---|---|
| Gemini 2.5 Flash-Lite | 0,10 $ / 0,40 $ per 1M token; dayanak ücretli katmanda günde 1.500 ücretsiz, sonra 1.000'de 35 $ | aistudio.google.com/docs/pricing |
| Gemini ücretsiz katman | Dayanak günde 500 istek (Flash + Flash-Lite ortak). Gemini 3.x'te ücretsiz dayanak yok. **Ücretsiz katman içeriği Google tarafından ürün geliştirmede kullanılır.** | aynı sayfa |
| OpenAI gpt-5.4-nano + web_search | 0,20 $ / 1,25 $ per 1M; arama 1.000 çağrıda 10 $; arama içeriği girdi token sayılır | üçüncü taraf özet; resmi sayfadan teyit edilecek |
| Perplexity Sonar (düşük bağlam) | 1 $ / 1 $ per 1M + 1.000 istekte 5 $ | üçüncü taraf özet; resmi sayfadan teyit edilecek |
| Tipik çağrı | 150 girdi / 700 çıktı token (OpenAI: 6.000 girdi) | tahmin |
| LLM ek yükü (sınıflandırma + öneri) | marka başına 0,5–1 $/ay | tahmin |
| Altyapı payı | müşteri başına 1,25–2,5 $/ay | Supabase Pro ~25 $ / 10–20 müşteri |
| Ödeme komisyonu | %4 | varsayım; iyzico/PayTR teklifiyle güncellenecek |
