# Paket maliyet hesabı

Bu tablo `npm run pricing` ile fiyat kartlarından üretilir (fiyatlar 2026-11-06'da kontrol edildi). Her CI çalışmasında yeniden hesaplanır.

## Sonuç

| Paket | Fiyat | Çağrı/ay | Tipik: maliyet / brüt marj | Kötü durum: maliyet / brüt marj |
|---|---|---|---|---|
| Starter (eski öneri: 50 soru, 3 tekrar) | $29.00 | 1950 | $15.73 / %46 | $34.26 / %-18 |
| Starter (yeni: 25 soru, 2 tekrar) | $29.00 | 650 | $7.18 / %75 | $14.53 / %50 |
| Starter — sadece Gemini (bugünkü durum) | $29.00 | 217 | $3.30 / %89 | $8.08 / %72 |
| Pro (eski: 3 marka, 50 soru, 3 tekrar) | $79.00 | 5850 | $44.36 / %44 | $97.47 / %-23 |
| Pro (yeni: 3 marka, 30 soru, 2 tekrar) | $79.00 | 2340 | $21.29 / %73 | $44.19 / %44 |
| Agency (yeni: 10 marka, 30 soru, 2 tekrar) | $199.00 | 7800 | $65.48 / %67 | $138.88 / %30 |

Çağrı başı API maliyeti:
- Tipik: gemini $0.0018, openai $0.0121, perplexity $0.0059
- Kötü durum: gemini $0.0158, openai $0.0239, perplexity $0.0059

Ücretsiz Gemini kotasıyla (günde 450 çağrı) izlenebilecek "Starter yeni" marka sayısı: 62

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
