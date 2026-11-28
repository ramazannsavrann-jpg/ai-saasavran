# Yapay zekâ tartışma masası

Ürün fikri üretmek için üç yapay zekâ sırayla tartışır, ardından Claude kodu yazar.

| Tur | Kim | Görev |
|---|---|---|
| 1 | ChatGPT | 3 ürün fikri önerir |
| 2 | Perplexity | Canlı web aramasıyla rakipleri ve talebi araştırır (kaynaklı) |
| 3 | Gemini | Şeytanın avukatı: riskleri söyler, puan verir |
| 4 | ChatGPT | Tek fikir seçer, MVP + ilk 100 kullanıcı planı |
| 5 | Perplexity | Seçilen fikri son kez kontrol eder |
| 6 | Gemini | Hakem: Claude için yazılım şartnamesi |
| — | Claude | Şartnameyi okur, gerekirse itiraz eder, ürünü kodlar |

- Konu: `tartisma/konu.md` (`tartisma` dalında). Değişince iş kendiliğinden çalışır.
- Sonuç: `tartisma/sonuc/<tarih>-<konu>.md` (aynı dal). İçinde motor başına gerçek maliyet tablosu var.
- Tavan: tartışma başına 0,15 $. Her çağrıdan önce en kötü maliyet hesaplanır, tavanı aşacaksa durur.
- Modeller (en ucuzlar): ChatGPT `gpt-6-luna` (aramasız), Perplexity `sonar` (web aramalı), Gemini `gemini-3.5-flash-lite` (aramasız, `GEMINI_CANLI_API_KEY`).
- Bu araç AI SaaSavran ölçüm motoruna dokunmaz; harcama aynı API hesaplarından düşer ve deneme bütçesine sayılır.

## Ar-Ge modu (çip projesi)
`tartisma/konu.md` ilk satırı `MOD: arge` ise turlar Ar-Ge için değişir: baş mimar (ChatGPT) → literatür (Perplexity) → denetçi (Gemini) → deney planı → literatür kontrolü → Ar-Ge yol haritası.
Kural (28 Kasım, sahibin isteği): çip işinde takılınca, hangi sohbette olunursa olunsun bu masaya sorulur. Dış yapay zekâlara kod gönderilmez, yalnız özet ve ölçümler.
Günlük tavan: 0,50 $ (aynı UTC günündeki sonuç dosyalarının toplamı; kodda kontrol edilir).
