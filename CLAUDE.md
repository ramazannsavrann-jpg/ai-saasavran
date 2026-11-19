# CLAUDE.md — AI SaaSavran

Bu dosya her Claude oturumunun başında otomatik okunur. Kısa tut; ayrıntı `docs/` içinde.

## Proje
aisaasavran.com — markaların ve ürünlerin ChatGPT, Gemini, Claude, Perplexity ve Google AI cevaplarında
ne kadar görünür olduğunu ölçen self-service SaaS. Önce Türkiye, sonra global. İşletmeler ve ajanslar.
Google AI (AI Overviews / AI Mode) listede kalır, ileride ölçülecek (18 Kasım kararı); ölçülene kadar sitede "ölçüyoruz" denmez.
Güncel durum: `docs/STATUS.md` · Mimari: `docs/ARCHITECTURE.md` · Fiyat: `docs/PRICING.md` · Yayın: `docs/DEPLOY.md`

## Sahibi hakkında
- Yalnızca Android telefon kullanıyor, bilgisayarı yok; yazılımda yeni. Türkçe konuş.
- Kendisinin yapması gereken her adımı tek tek yaz; adres, ad, değer, secret adı gibi her şeyi
  ayrı satırda kopyala-yapıştır hazır ver.
- Birleştirme için izin istenmez (18 Kasım kararı): testler geçince Claude dalı `main`'e kendisi birleştirir ve
  sonucu bildirir. Panel/secret gibi elle işleri akşama topla.
- Uzun işlerde kısa ara durum mesajı ver.

## Değişmez kurallar
- API anahtarları yalnız GitHub Secrets'ta. Sohbete, koda, commit'e asla yazılmaz.
- `ALLOW_PAID_API=true` olmadan ücretli API çağrılmaz. Google faturalandırması kapalı kalır.
- Uydurma veri asla gerçek gibi gösterilmez; simüle sonuç yalnız Demo Lab'de, "SİMÜLASYON" etiketiyle.
- İletişim adresi `info@aisaasavran.com`. Kişisel e-posta kodda/sitede yer almaz.
- Şirket kurma, ödeme, başvuru: sahibinin onayı olmadan yapılmaz. Kimlik/banka bilgisi istenmez.
- Çalışan sistemi baştan yazma; dokuz ayrı özellik (marka görünürlüğü, ürün görünürlüğü, ürün
  önerilme oranı, rakip ürün karşılaştırması, neden önerildi/önerilmedi, ürün bilgi doğruluğu,
  rakibi öne çıkaran özellikler, kaynak etkisi, iyileştirme takibi) birbirinin yerine konmaz.
- Her yeni GitHub Actions workflow'unda `push` tetikleyicisi + `workflow_dispatch` olsun
  (telefonda "Run workflow" menüsü bulunamıyor).

## Klasörler
```
engine/src/          Ölçüm motoru (pipeline, metrics, usage, report, pricing, truth, shopping…)
engine/src/providers Sağlayıcı adaptörleri: gemini, openai, claude, perplexity, simulated, mock
supabase/migrations  0001–00NN sırayla; yeni değişiklik = yeni dosya, eskisi düzenlenmez
web/                 Arayüz (Vite + React + Supabase JS), mobil öncelikli; web/site = statik site, blog, eğitimler
functions/api/       Cloudflare Pages Functions (check, report, paddle, mcp, v1 API…)
scripts/             İşçi, testler, gizli bilgi taraması, smoke testleri, geo-autopilot
e2e/                 Playwright mobil uçtan uca testler
yt/                  YouTube ayar otomasyonu (YouTube Data API)
```

## Komutlar
```
npm ci
npm run test:all        # gizli bilgi taraması + motor + DB + entegrasyon
npx playwright test     # önce: npm run build --prefix web
npm run pricing         # paket maliyet tablosu
```
`main`'e her birleştirmede CI migration'ları uygular ve siteyi Cloudflare Pages'e yayınlar.

## Çalışma şekli
- Her iş ayrı dalda, test geçince PR. Sonunda gerçek durum raporu ver (ne çalıştı, ne denenmedi).
- Veritabanı değişikliklerini sahibine yaptırma; migration veya araçla kendin uygula.
- Önemli değişiklikte `docs/STATUS.md`'yi güncelle.

## Her özellik / karar / düzeltmeden sonra kontrol listesi (sorulmasa da yapılır)
Bir özellik eklenince, değişince, kaldırılınca ya da yeni bir karar alınınca PR'dan önce:
1. Site metinleri: `web/site/content.mjs` (TR) ve `content-en.mjs` (EN) birlikte güncel mi?
   Özellik listesi, paket/fiyat tablosu, SSS, motor listesi (ChatGPT, Gemini, Claude, Perplexity, Google AI).
2. Panel içi metinler (`web/src`), e-postalar (`engine/src/email.ts`), `method.mjs`, `legal.mjs`,
   eğitim sayfası (`tutorials.mjs`) yeni durumla çelişiyor mu?
3. Paket kotası/fiyatı değiştiyse `docs/PRICING.md` + `npm run pricing` çıktısı ile site aynı mı?
4. Site, artık doğru olmayan bir şey söylüyor mu ("henüz yok", eski motor/paket adı, eski rakam)?
5. Mobil görünüm: dar ekranda taşma, iki satıra kayan menü, kırık görsel var mı (Playwright mobil test).
6. Yeni hesaplama varsa mantığı ve birimleri test et; uydurma veri gerçek gibi görünmesin.
7. `docs/STATUS.md` güncelle; kalıcı bir kural/karar değiştiyse bu CLAUDE.md'yi de güncelle.
PR açıklamasında bu kontrollerden neyin değiştiğini kısaca yaz.

## Elle yazılan rapor / e-posta
- Aynı şirketin markaları (ör. MACFit, MAC/One, Mars Athletic) tek rakip sayılır; bağlantı kaynaktan doğrulanır.
- Motor adları çevrilmez (Gemini, ChatGPT, Claude, Perplexity). E-posta alıcının dilinde yazılır.

## Görünürlük düzeni (18 Kasım, otomatik)
- Ölçüm sayfaları `web/site/data/measurements.json`'dan üretilir (`web/site/measurements.mjs`); veri elle düzenlenmez,
  `visibility.yml` her pazartesi yeniler. Yayın sonunda IndexNow bildirimi (`scripts/indexnow.mjs`).
- Kendi markamız 2 haftada bir ölçülür (`scripts/self-measure.ts`). Ana sayfa kutusu ve karşılaştırma tablosu `web/site/data/self.json`'dan kendiliğinden güncellenir (`export-measurements.ts` yazar); elle düzenleme gerekmez.
- Haftalık yazı: yalnız gerçek ölçüm verisiyle; uydurma rakam, uydurma alıntı yok.
- Rakip karşılaştırma sayfaları (`web/site/compare.mjs`) gerçek adlarla (18 Kasım kararı); rakip bilgisi yalnız resmî sayfalarından, kötüleme yok, en geç 3 ayda bir fiyat kontrolü. Kurucu: Ramazan Savran (Antalya), `/tr/kurucu/`.
- Görünürlük Endeksi (`web/site/visibility-index.mjs`) aynı veriden üretilir; yeni sektörde soru eklenince `SECTORS` listesine anahtar kelime ekle (sektörsüz soru endekse girmez).

## Video ve sosyal medya
- **KANAL KURALI (20 Kasım, her oturum/hesap/sohbet için zorunlu; eski "iki dilli YouTube" kurallarının yerine geçer):**
  İngilizce video/Shorts YALNIZ **AI SaaSavran EN** kanalına (@AISaaSavranEN, `UCJ3mA2nPzsinfO9MgccFtdA`);
  Türkçe video/Shorts YALNIZ **AI SaaSavran** kanalına (@AISaaSavran, `UCHL4sdkEenxkpuP4_Hq1RZw`) yüklenir.
  Başlık, açıklama, etiket ve hashtag her kanalda yalnız o kanalın dilinde (iki dilli metin yok); oynatma
  listeleri de kendi kanalında ve kendi dilinde. EN kanalında Türkiye/Türkçe adlı liste açılmaz.
  Eğitim (Eğitim/Tutorial) videoları EN kanalına yüklenmez; TR kanalında liste dışı kalır, yalnız siteden izlenir.
  Her yüklemede: çocuklara yönelik değil, ücretli tanıtım yok, yapay içerik işareti, video dili, kurala uygun kapak.
  vidIQ yalnız TR kanalına bağlı (ikinci kanal ücretli): EN yüklemeleri YouTube Studio'dan yapılır.
- Video kurulumu ve şablonlar: `seslendirme` dalında `video/README.md` + `video/sablon/`.
- Paylaşım kuralları (Instagram 3'lü set: TR Reels → EN Reels → ayrı gönderi; YouTube oynatma listeleri,
  açıklama metinleri): aynı dosyada "PAYLAŞIM KURALLARI" bölümü. Yeni video işinden önce oku.
- ZORUNLU (19 Kasım): YouTube/Instagram paylaşımından önce README'deki "PAYLAŞMADAN ÖNCE KONTROL LİSTESİ"
  uygulanır ve "PAYLAŞIM KAYDI"na bakılır; paylaşımdan sonra kayıt güncellenir. "Eksik/yok" demeden önce
  gerçek profil/kanal dahil iki kaynakla doğrulanır.
- Shorts/Reels düzeni (15 Kasım, bundan sonraki videolar): kanca → **marka kartı** (ölçülen gerçek adlar
  ortada, büyük etiketler) → sonuçlar. Shorts arayüzünün kapattığı yerlere (üst 160 px, y>1400, y>1000 iken
  x>900) hiçbir sahnede yazı/grafik konmaz. Ayrıntı: README'de "MARKA KARTI + GÜVENLİ ALAN".
