# Gerçek durum raporu

**Son güncelleme:** 2026-11-06 · v0.2.1

## Çalışan ve test edilen

| Parça | Test |
|---|---|
| Görünürlük metrikleri (anılma, öneri, kaynak, pay, sıra, güven aralığı) | 6 birim testi |
| Gemini adaptörü: istek biçimi, anahtarın gizlenmesi, cevap ayrıştırma, kaynak alan adı çözümü | 3 birim testi (sentetik örnek cevapla) |
| OpenAI adaptörü: cevap ayrıştırma ve ücret hesabı | 1 birim testi |
| Ücretli API kilidi (iki katman) | 2 test |
| Görev bütçesi, önbellek, müşteri kotası, maliyet tavanı, ücretsiz günlük sınır, 429 ve 5xx davranışı | 7 test |
| Rapor etiketleme (simülasyon, karışık kaynak, boş rapor) | 1 test |
| Paket maliyet hesabı | 1 test + `npm run pricing` |
| Veritabanı şeması, RLS, kota/durdurma fonksiyonları | 15 kontrol (gerçek Postgres, PGlite) |
| Gizli bilgi taraması | CI'da her push |

## Gerçek API testi (GitHub Actions, 2026-11-06)

| Deneme | Sonuç |
|---|---|
| `gemini-2.5-flash-lite` | ❌ HTTP 404 — yeni kullanıcılara kapalı |
| `gemini-3.5-flash-lite`, arama **açık**, ücretsiz anahtar | ❌ HTTP 429 — ücretsiz katmanda arama dayanağı kotası yok |
| `gemini-3.5-flash-lite`, arama **kapalı**, ücretsiz anahtar | ✅ Çalıştı: 2,1 sn, 24/194 token, maliyet 0 $ (ücretli eşdeğeri 0,0005 $) |

**Sonuç:** 0 $ ile gerçek Gemini ölçümü yalnızca **aramasız** yapılabiliyor. Bu, modelin eğitim verisinden bildiğini ölçer; Gemini uygulamasının canlı web aramalı cevaplarını temsil etmez. Bu tür sonuçlar `api_no_search` olarak etiketlenir ve raporda ayrıca belirtilmelidir.

**Bilinen eksik:** Akış, ücretsiz katmandaki her 429'u "günlük kota doldu" olarak yorumluyor. Arama dayanağının hiç olmadığı durum ayrı bir neden olarak ayrılmalı.

## Yazıldı ama gerçek ortamda test EDİLMEDİ

- **Gemini arama dayanaklı ölçüm** — Google faturalandırması açılmadan mümkün değil.
- **OpenAI gerçek bağlantısı** — ücretli; izin verilmedi.

## Henüz yok

- Perplexity adaptörü (yeni Agent API şeması doğrulanmadı)
- Supabase projesi ve bağlantısı
- Web arayüzü (giriş, workspace, marka ekleme, rapor ekranı)
- Soru üretici, belirsiz öneri sınıflandırıcısı, öneri motoru
- Haftalık zamanlayıcı, PDF rapor, yönetici paneli, ödeme
