# CLAUDE.md — AI SaaSavran

Bu dosya her Claude oturumunun başında otomatik okunur. Kısa tut; ayrıntı `docs/` içinde.

## Proje
aisaasavran.com — markaların ve ürünlerin ChatGPT, Gemini, Claude, Perplexity ve Google AI cevaplarında
ne kadar görünür olduğunu ölçen self-service SaaS. Önce Türkiye, sonra global. İşletmeler ve ajanslar.
Güncel durum: `docs/STATUS.md` · Mimari: `docs/ARCHITECTURE.md` · Fiyat: `docs/PRICING.md` · Yayın: `docs/DEPLOY.md`

## Sahibi hakkında
- Yalnızca Android telefon kullanıyor, bilgisayarı yok; yazılımda yeni. Türkçe konuş.
- Kendisinin yapması gereken her adımı tek tek yaz; adres, ad, değer, secret adı gibi her şeyi
  ayrı satırda kopyala-yapıştır hazır ver.
- PR'ları kendisi birleştirir (kolay, her zaman gönderilebilir). Panel/secret gibi elle işleri akşama topla.
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

## Video ve sosyal medya
- Video kurulumu ve şablonlar: `seslendirme` dalında `video/README.md` + `video/sablon/`.
- Paylaşım kuralları (Instagram 3'lü set: TR Reels → EN Reels → ayrı gönderi; YouTube oynatma listeleri,
  açıklama metinleri): aynı dosyada "PAYLAŞIM KURALLARI" bölümü. Yeni video işinden önce oku.
