# Gerçek durum raporu

**Son güncelleme:** 2026-11-11 · v0.7 (denetim düzeltmeleri, kayıp zekâsı özellikleri, bölge kısıtı)

**Canlı adres:** https://aisaasavran.com (Cloudflare Pages + Supabase)

> **Erken erişim.** Ödeme (Paddle) ve haftalık e-posta (Resend) kodu hazır ve testli, ancak gerçek bir ödeme
> ve gerçek bir gelen kutusu teslimi uçtan uca henüz doğrulanmadı. Hukuki metinleri avukat incelemedi.

## 11 Kasım 2026 denetimi: yapılan düzeltmeler

| Konu | Önce | Şimdi |
|---|---|---|
| Yarıda kesilen ölçüm | "çalışıyor" durumunda kalıyor, markayı kilitliyordu | 60 dk sonra kapatılır (0012); işçi 25 dk sonra yeni ölçüm almaz |
| Kota nedeniyle durdurulan alan | Yeni ayda açılmıyordu | Ay başında kendiliğinden açılır (0012) |
| Marka eşleştirme | "Ada" markası "Adalet" kelimesinde bulunuyordu | Tam kelime + Türkçe ek + alan adı (rules_v3) |
| Canlı arama konumu | Sabit TR | Marka başına ülke kodu; boşsa TR |
| Ödeme komisyonu hesabı | %4 varsayım | Paddle %5 + 0,50 $ |
| Site metinleri | "ChatGPT müşterilere açık değil", "PDF yok" diyordu | Güncel duruma göre düzeltildi |

## Yeni (v0.6)

- **Kaynaklar kimi destekliyor** (Rakip Kaynak Egemenliği): her kaynak site kaç cevapta kullanıldı, kime ait, o cevaplarda kim önerildi.
- **Kayıp nedeni: kanıtlar**: önerilmediğiniz her soru için yerinize önerilen rakip, kullanılan kaynaklar, sitenizin kaynak gösterilip gösterilmediği. Kanıt yoksa neden üretilmez.
- İkisi de yalnız canlı aramalı ölçümde çalışır ve ek API çağrısı yapmaz.

## v0.7 (11 Kasım 2026, ikinci ve üçüncü paket)

- **Ücretsiz Gemini bölge kısıtı (0013):** AEA, İsviçre ve Birleşik Krallık. Ücretsiz kontrol sayfası bu ülkelerden gelen ziyaretçiye kapalı; ülke kodu bu listede olan markalarda aramasız Gemini ölçümü başlatılmaz; yeni marka formunda ülke kodu ziyaretçinin ülkesinden önceden doldurulur (`/api/geo`).
- **Yaptıklarım ve sonuçları** (Aksiyon ve Sonuç Takibi): `brand_actions` tablosu; önce/sonra karşılaştırması motor bazında, güven aralıkları ayrışmadıkça "ölçüm oynaklığı olabilir".
- **Hangi koşulda görünüyorsunuz** (Koşullu Görünürlük Haritası): soru niyetine göre, son 4 ölçümün toplamı.
- Kota %80'e gelince panelde uyarı; kota dolunca ay başında kendiliğinden açıldığı yazılır.
- Canlı test (11 Kasım, ChatGPT gpt-6-luna, yeni anahtar): 20/20 çağrı başarılı, 0,42 $, 4,4 dk.

## v0.8 (11 Kasım 2026, dördüncü paket)

- **"Önerildi mi" LLM kontrolü (0014):** yalnız ücretli ChatGPT ölçümlerinde; cevap başına tek çağrı, web araması yok, maliyeti paket tavanına sayılır, sorgu kotasına sayılmaz. Hata olursa kural sonucu geçerli kalır. `mentions.classifier` alanı `llm:<model>` ya da `rules_v3` yazar.
- **Soru etiketi:** soruya "ucuz", "premium", "Almanya" gibi kısa etiket; rapor etiketlere göre de önerilme oranı verir.

## Bilinen açık konular

- Bölge kısıtı uygulama içinde markanın ülke koduna dayanır; kullanıcı kodu değiştirebilir. Kesin uygulama için sunucu tarafında kullanıcı ülkesi gerekir.

- Ücretsiz (Gemini) ölçümlerde "önerildi" tespiti kural tabanlıdır; listede geçen marka önerilmiş sayılır (olumsuz ifade yoksa). LLM kontrolü yalnız ücretli ölçümlerdedir ve doğruluğu elle etiketlenmiş cevaplarla henüz ölçülmedi.
- Perplexity, ekip daveti, ürün/SKU ölçümü yok.
- Aşağıdaki tablolar 6 Kasım 2026 tarihlidir; "Henüz yok" bölümündeki ödeme, PDF ve ChatGPT satırları artık geçerli değildir.

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
| Ücretli canlı aramalı ölçüm (ChatGPT, OpenAI `gpt-6-luna` + web araması) | 🧪 Deneme | Yalnız Growth Lab'de; toplam 3 $ tavanı veritabanında; müşteri alanlarında veritabanı kısıtıyla imkânsız. Kullanıcı izni 7 Kasım 2026. |
| Claude (Anthropic `claude-haiku-5-5` + web araması) adaptörü | 🧪 Deneme | 11 Kasım 2026 eklendi. Birim testli; gerçek bağlantı testi `claude-smoke.yml` (3 çağrı, 0,15 $ tavan). Growth Lab'de canlı ölçüm ChatGPT + Claude birlikte çalışır (LIVE_ENGINES, varsayılan `openai,claude`); rapor motor seçicili. Müşteri paketlerinde yalnız ChatGPT (paket maliyeti tek motora göre). Toplam 3 $ deneme tavanı iki motora birlikte uygulanır. |
| Kaynak (citation) analizi: yapay zekânın baktığı siteler | 🧪 Deneme | Yalnız canlı aramalı ölçümde |
| "Cevaplarda geçen diğer adlar": takip edilmeyen markaları bulup "benim markam / rakip" diye işaretletme; geçmiş ölçümleri ücretsiz yeniden hesaplama | ✅ | Birim + entegrasyon |
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

- Müşteriler için canlı web araması (yalnız Growth Lab'de 3 $ tavanlı deneme açık)
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
