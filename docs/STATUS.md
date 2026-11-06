# Gerçek durum raporu

**Son güncelleme:** 2026-11-06 · v0.5 (haftalık otomatik ölçüm, site kontrolü ve öneriler, Demo Lab ve Growth Lab dolu)

**Canlı adres:** https://aisaasavran.com (yedek: https://ai-saasavran.pages.dev, Türkiye'de erişime kapalı) (Cloudflare Pages + Supabase, ücretsiz katmanlar)

> **Bu sürüm gerçek müşteri kullanımına hazır değildir.** Canlı web araması yapılmıyor; ölçümler Gemini'nin
> aramasız model bilgisini gösterir ve Gemini uygulamasının güncel cevaplarını temsil etmez.
> Bulut ortamı kuruldu (2026-11-06); her yayından sonra canlı site otomatik kontrol ediliyor.

## Çalışan ve test edilen

| Alan | Durum | Test |
|---|---|---|
| Kayıt, giriş, çıkış, şifre değiştirme | ✅ | Gerçek Supabase Auth sunucusuyla (E2E) |
| Google ile giriş (Google'da yayımlandı) | ✅ | E2E (yönlendirme) + canlı ayar kontrolü |
| 22 sektör, hazır sorular, örnek rakipler | ✅ | E2E |
| Marka / rakip / soru düzenleme | ✅ | E2E |
| Cevabı göster (ham yapay zekâ cevabı, marka vurgulu) | ✅ | E2E |
| Gerçek liste sırası (izlenmeyen markalar dahil) | ✅ | Birim + E2E |
| Gizlilik politikası ve kullanım koşulları (taslak) | ⚠️ | Hukuki inceleme bekliyor |
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
| Haftalık otomatik ölçüm (marka başına açılıp kapanır; kota yetmezse atlanır, alan durdurulmaz) | ✅ | Entegrasyon |
| Web sitesi kontrolü (AI botlarına izin, başlık, açıklama, schema.org, SSS, site haritası…) | ✅ | Birim + entegrasyon |
| Öneriler sekmesi (kural tabanlı, yapay zekâ ile üretilmez) | ✅ | Birim + E2E |
| Demo Lab: 10 hayali marka, 6 haftalık simülasyon geçmişi | ✅ | Entegrasyon; canlıda kuruldu |
| Growth Lab: AI SaaSavran'ın kendi görünürlüğü, gerçek aramasız ölçüm | ✅ | Canlıda ilk ölçüm tamamlandı (20/20 cevap) |
| Mobil uyum (yatay taşma yok, 48 px dokunma alanları) | ✅ | E2E her ekranda taşma kontrolü |
| Ürün durumu sayfası (çalışan / kısmen / yok) | ✅ | E2E |

## Test özeti (CI, her push'ta)

31 motor testi · 16 veritabanı kontrolü · 15 entegrasyon testi (gerçek Postgres + Supabase Auth + PostgREST) · 6 mobil uçtan uca test · gizli bilgi taraması · gerçek Gemini bağlantı testi.

## Kısmen

- **Şifre sıfırlama, e-posta doğrulama:** akış hazır; e-posta gönderimi bulutta yapılandırılınca çalışacak.
- **Önerilme tespiti:** kural tabanlı; belirsiz cümleler için yapay zekâ kontrolü yok.
- **İngilizce arayüz:** çeviri altyapısı var, metinler çevrilmedi.
- **Ölçüm işçisi:** GitHub Actions'ta İstanbul 08–23 arası saatlik çalışır; ölçüm sonucu en geç ~1 saatte gelir.

## Bilinen engel

- **`pages.dev` Türkiye'de erişime kapalı** (TFF kararı, Kasım 2025). Çözüm: kendi alan adımız `aisaasavran.com` alındı (Cloudflare, 6 Kasım 2026) ve siteye bağlanıyor.

## Henüz yok

- Canlı web araması (ücretsiz katmanda yok; ücretli kullanım kapalı)
- ChatGPT, Perplexity
- Kaynak (citation) analizi, içerik taslakları
- PDF rapor, yönetici maliyet paneli
- Ödeme, paket yükseltme, ekip daveti
- Gizlilik ve koşullar metinleri yalnız taslak; hukuki inceleme yapılmadı

## Gerçek API testleri (GitHub Actions)

| Deneme | Sonuç |
|---|---|
| `gemini-2.5-flash-lite` | ❌ HTTP 404, yeni kullanıcılara kapalı → `model_not_found` |
| `gemini-3.5-flash-lite`, arama açık, ücretsiz | ❌ HTTP 429 → `unsupported_feature` |
| `gemini-3.5-flash-lite`, arama kapalı, ücretsiz | ✅ çalışıyor, maliyet 0 $ |
| Mobil uçtan uca test, gerçek Gemini ile (kayıt → ölçüm → rapor) | ✅ CI'da geçti (2026-11-06) |

## Canlı aramayı sonradan açmak için (mimari hazır)

1. Ücretli API'ye izin verildiğinde: `ALLOW_PAID_API=true` ve `GEMINI_TIER=paid` (GitHub Secrets).
2. Veritabanında `update app_settings set live_search_enabled = true` (bilinçli, tek satırlık değişiklik).
3. Yeni ölçümler otomatik olarak `live_search` türünde açılır; eski aramasız ölçümler ayrı türde kalır ve karışmaz.
4. Kota ve aylık maliyet tavanları zaten veritabanında; aşılırsa çalışma alanı otomatik durur.
