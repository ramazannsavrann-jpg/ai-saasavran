# Gerçek durum raporu

**Son güncelleme:** 2026-11-06 · v0.2

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

## Yazıldı ama gerçek ortamda test EDİLMEDİ

- **Gemini gerçek bağlantısı** — `GEMINI_API_KEY` GitHub'a eklenince CI'daki `gemini-smoke` işi test edecek.
- **OpenAI gerçek bağlantısı** — ücretli; izin verilmedi.

## Henüz yok

- Perplexity adaptörü (yeni Agent API şeması doğrulanmadı)
- Supabase projesi ve bağlantısı
- Web arayüzü (giriş, workspace, marka ekleme, rapor ekranı)
- Soru üretici, belirsiz öneri sınıflandırıcısı, öneri motoru
- Haftalık zamanlayıcı, PDF rapor, yönetici paneli, ödeme
