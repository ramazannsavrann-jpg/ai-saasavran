# Gerçek durum raporu

**Son güncelleme:** 2026-11-06 · v0.3 (MVP arayüzü)

> **Bu sürüm gerçek müşteri kullanımına hazır değildir.** Canlı web araması yapılmıyor; ölçümler Gemini'nin
> aramasız model bilgisini gösterir ve Gemini uygulamasının güncel cevaplarını temsil etmez.
> Ayrıca bulut ortamı (Supabase + barındırma) henüz kurulmadı; uygulama yalnızca test ortamında çalışıyor.

## Çalışan ve test edilen

| Alan | Durum | Test |
|---|---|---|
| Kayıt, giriş, çıkış, şifre değiştirme | ✅ | Gerçek Supabase Auth sunucusuyla (E2E) |
| Çalışma alanı (işletme / ajans) | ✅ | Entegrasyon + E2E |
| Marka, rakip, soru yönetimi + paket limitleri | ✅ | Entegrasyon + E2E |
| Şablondan soru önerileri (sektör + şehir, Türkçe ek uyumu) | ✅ | E2E |
| Ölçüm isteği → kuyruk → işçi → sonuç | ✅ | Entegrasyon + E2E |
| Gemini aramasız ölçüm (ayrı veri türü: `model_knowledge`) | ✅ | Gerçek API (CI), entegrasyon |
| Rapor: önerilme, anılma, rakip payı, güven aralığı, düşük örneklem uyarısı | ✅ | E2E |
| Geçmiş ölçüm grafiği (veri türüne göre çizgi stili) | ✅ | E2E |
| Soru bazında sonuç | ✅ | Entegrasyon + E2E |
| Her ilgili ekranda "Canlı web araması yapılmadı" uyarısı | ✅ | E2E |
| Hata sınıfları: desteklenmeyen özellik, kota, yetki, model yok, geçici, geçersiz istek | ✅ | Birim + entegrasyon |
| Müşteri izolasyonu (RLS) | ✅ | Entegrasyon + E2E (başka müşterinin markası açılamıyor) |
| Maliyet koruması: ücretli kilit, aylık kota, otomatik durdurma | ✅ | Birim + veritabanı + entegrasyon |
| Demo Lab: yalnız platform yöneticisi, yalnız simülasyon, müşteriden ayrı | ✅ | Entegrasyon + E2E |
| Mobil uyum (yatay taşma yok, 48 px dokunma alanları) | ✅ | E2E her ekranda taşma kontrolü |
| Ürün durumu sayfası (çalışan / kısmen / yok) | ✅ | E2E |

## Kısmen

- **Şifre sıfırlama, e-posta doğrulama:** akış hazır; e-posta gönderimi bulutta yapılandırılınca çalışacak.
- **Önerilme tespiti:** kural tabanlı; belirsiz cümleler için yapay zekâ kontrolü yok.
- **İngilizce arayüz:** çeviri altyapısı var, metinler çevrilmedi.
- **Ölçüm işçisi:** kod ve GitHub Actions iş akışı hazır; Supabase bağlanmadığı için çalıştırıldığında "atlandı" der.

## Henüz yok

- Canlı web araması (ücretsiz katmanda yok; ücretli kullanım kapalı)
- ChatGPT, Perplexity
- Kaynak (citation) analizi, iyileştirme önerileri, içerik taslakları
- Haftalık otomatik ölçüm, PDF rapor, yönetici maliyet paneli
- Ödeme, paket yükseltme, ekip daveti
- KVKK aydınlatma metni ve gizlilik politikası (hukuki metin)
- **Bulut ortamı:** Supabase projesi + arayüz barındırma

## Gerçek API testleri (GitHub Actions)

| Deneme | Sonuç |
|---|---|
| `gemini-2.5-flash-lite` | ❌ HTTP 404, yeni kullanıcılara kapalı → `model_not_found` |
| `gemini-3.5-flash-lite`, arama açık, ücretsiz | ❌ HTTP 429 → `unsupported_feature` |
| `gemini-3.5-flash-lite`, arama kapalı, ücretsiz | ✅ çalışıyor, maliyet 0 $ |

## Canlı aramayı sonradan açmak için (mimari hazır)

1. Ücretli API'ye izin verildiğinde: `ALLOW_PAID_API=true` ve `GEMINI_TIER=paid` (GitHub Secrets).
2. Veritabanında `update app_settings set live_search_enabled = true` (bilinçli, tek satırlık değişiklik).
3. Yeni ölçümler otomatik olarak `live_search` türünde açılır; eski aramasız ölçümler ayrı türde kalır ve karışmaz.
4. Kota ve aylık maliyet tavanları zaten veritabanında; aşılırsa çalışma alanı otomatik durur.
