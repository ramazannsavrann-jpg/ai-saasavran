# Mobil uygulama ve Google Play — devir notu (25 Kasım 2026)

Bu not, işi diğer hesabın kaldığı yerden sürdürmesi içindir. Kayıt satırı `docs/KAYIT.md`'de **MOBIL-001**.
Sahibi yalnız Android telefon kullanıyor: her adımı tek tek, kopyala-yapıştır hazır ver. Türkçe yaz.

## Bitenler

**Uygulama (Capacitor, `web/src/mobile`, `web/android`, `web/ios`)**
- Main'de, CI yeşil. Paket adı `com.aisaasavran.app`. Uygulamanın adı `SaaSavran: YZ Görünürlüğü` (EN: `SaaSavran: AI Visibility`).
- Android sürümleri `mobil-android.yml` ile otomatik üretilir. Bunlar yalnız depo sahibinin gördüğü taslak sürümlerdir: GitHub Releases → `mobil-android-N` (.aab + .apk). versionCode = çalıştırma numarası.
- Play öncesi bağımsız inceleme (3 ajan) yapıldı ve bulguların hepsi düzeltildi (#176). Ayrıntı: `docs/STATUS.md`, 24 Kasım.
- Sonradan düzeltilenler:
  - Google ile girişten sonra kurulum ekranına yanlış yönlendirme (#182).
  - Hesap ekranında işletme alanı seçimi (#183).
  - Gemini canlı arama metinleri ve soru hakkı tahmini 6/soru, migration 0077 (#181).
- Veritabanı:
  - 0075: işçi fonksiyonları giriş yapmış kullanıcıya kapalı. Güvenlik denetimi `authenticated`'ı da denetliyor.
  - 0076: mağaza ödemesi düzeltmeleri.
  - 0077: soru hakkı tahmini.

**Play Console (sahibinin hesabı, kişisel geliştirici hesabı, kimlik doğrulandı)**
- Uygulama oluşturuldu ve 11 beyanın hepsi tamamlandı:
  - İçerik derecelendirmesi ve hedef kitle (18+, küçükler kısıtlı)
  - Veri güvenliği (kullanıcı içeriği "paylaşılıyor", sebebi Gemini ücretsiz katmanı)
  - Reklam kimliği yok, sağlık yok
  - Tacirlik (satıcı), hizmet şartları `https://aisaasavran.com/terms/`
- Gizlilik adresi `https://aisaasavran.com/privacy/`, hesap silme adresi `https://aisaasavran.com/delete-account/`.
- Mağaza girişi:
  - Ad, kısa ve tam açıklama: `docs/STORE-LISTING.md`
  - Simge `web/public/icons/icon-512.png`, öne çıkan görsel `docs/store/one-cikan-tr.png`
  - Gerçek veriyle 5 ekran görüntüsü. Kaynaklar ekranı rakip adı gösterdiği için konmadı.
  - Simge ve özellik grafiği "yapay zekâyla oluşturuldu" olarak etiketlendi.
- Kategori İş. İletişim info@aisaasavran.com, web sitesi aisaasavran.com.
- İnceleme (reviewer) hesabı: `inceleme@aisaasavran.com`. Şifre yalnız Play Console'daki "Oturum açma bilgileri"nde; koda, kayda ve sohbete yazılmaz.
  - Kendi alanı "Google Play inceleme" (business). Gümüş paketi ödemesiz tanımlı (comped), bitişi 31.03.2027.
  - İçinde AI SaaSavran markası ve 10 gerçek soru var. Bir canlı ölçüm yapıldı: 4 motor, 60 cevap, 0,79 $.
  - Growth Lab'den çıkarıldı.
- Dahili test:
  - 1.0.5 (versionCode 5) yüklendi.
  - Test kullanıcı listesi "Ben" (sahibin Gmail adresi).
  - Sahibin telefonunda Play'den kurulu. Google ile giriş çalışıyor.
- Satıcı (ödeme) profili açıldı (bireysel). Hesap grubu cevaplandı: başka hesap yok.
- Ürünler oluşturuldu ve etkin:
  - Abonelikler (temel plan `aylik`, aylık, otomatik yenilenir, ek süre 7 gün):
    - `gumus`: 129.99 USD, 6.599 TL
    - `altin`: 249.99 USD, 12.599 TL
    - `platin`: 399.99 USD, 20.599 TL
  - Tek seferlik ürünler (satın alma seçeneği `tek`, dijital içerik, çoklu adet kapalı):
    - `ek_250`: 39.99 USD, 2.029 TL
    - `ek_500`: 69.99 USD, 3.549 TL
    - `ek_1000`: 129.99 USD, 6.599 TL
- Hizmet hesabı `firebase-adminsdk-fbsvc@ai-saasavran.iam.gserviceaccount.com` Play Console'a davet edildi (Etkin). İzinleri:
  - Uygulama bilgilerini görüntüleme
  - Finansal verileri görüntüleme
  - Siparişleri ve abonelikleri yönetme

## Açık işler (sırayla)

1. **Play API izni henüz geçmedi.** "Google ayar kontrolü" iş akışı (`google-ayar-kontrol.yml`) 25 Kasım 11:00'de hâlâ HTTP 403 veriyordu. Önce iş akışını çalıştır; çıktı artık hata mesajını da yazıyor.
   - Mesaj "API has not been used / disabled" ise: Google Cloud'da `ai-saasavran` projesi için **Google Play Android Developer API** etkinleştirilmeli. Bu bir ayar değişikliği, sahibin onayıyla yapılır. Link:
     `https://console.cloud.google.com/apis/library/androidpublisher.googleapis.com?project=ai-saasavran`
   - Mesaj "permission" ise: Play Console → Kullanıcılar ve izinler → hizmet hesabı → izinler ve uygulama erişimi kontrol edilir. Bazen 24–36 saat bekleme gerekir.
2. **Lisans testi:** Play Console → Ayarlar → Lisans testi'ne sahibin Gmail adresi (`ramazannsavrann@gmail.com`) eklendi mi, sor ya da ekran görüntüsünden kontrol et.
3. **Satın alma denemesi** (1. ve 2. madde bittikten sonra):
   - Uygulamada Hesap → Paketler ve ödeme'de fiyatlar görünmeli.
   - Lisans testçisiyle Gümüş satın alınır. Sonra Supabase'de `store_subscriptions` tablosunda satır oluşmalı ve alanın planı `starter` olmalı.
   - Sahibin "Deneme" alanında (business, free) denenebilir. Test bitince plan ve abonelik Google Play'den iptal edilir.
4. **Yeni sürümü dahili teste yükle:** GitHub Releases'daki son `mobil-android-N` (en az 6; alan seçimi ve giriş düzeltmesi içinde). Adımlar: Test edin ve yayınlayın → Test → Dahili test → Yeni sürüm oluştur → .aab yükle → sürüm adı `1.0.N` → Kaydet ve yayınla.
5. **Kapalı test (üretim için zorunlu):** en az 12 test kullanıcısı, 14 gün kesintisiz. Sahip Gmail adreslerini topluyor. Liste gelince:
   - Kapalı test kanalı açılır.
   - Aynı .aab yüklenir, liste eklenir, katılım bağlantısı paylaşılır.
6. **Bildirim testi:** telefonda Hesap → bildirim anahtarı açılır, bir ölçüm başlatılır, bildirim gelmeli. Henüz denenmedi.
7. Sonraki adımlar, ertelendi:
   - %15 hizmet ücreti koşullarının kabulü (Ödeme profili sayfasındaki kart).
   - Mağaza girişinin İngilizce çevirisi (`docs/STORE-LISTING.md` EN metni).
   - iOS ve App Store (Mac/Apple geliştirici hesabı gerekir).
   - Güncelleme mimarisi 1. adım: `engine_configs` tablosu. Plan dokümanında onaylı, başlanmadı.

## Dikkat

- Uygulamada siteye ya da Paddle'a yönlendiren ödeme metni ve bağlantısı olmayacak (Play ödeme politikası).
- Ana sayfada ve bildirimlerde rakip dili yok. Mağaza ekran görüntülerinde rakip adı yok.
- Ürün kimlikleri ve temel plan kimliği koddaki ile birebir aynı olmalı (`web/src/mobile/store.ts`, `0074_store_billing.sql`). Play'de bu kimlikler sonradan değiştirilemez.
- RTDN (Pub/Sub) kurulmadı ve isteğe bağlı: işçi her 6 saatte bir abonelikleri Google'dan yeniden sorar. İstenirse secret adı `GOOGLE_PLAY_RTDN_KEY`.
