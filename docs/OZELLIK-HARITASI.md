# Özellik haritası ve iş bölümü (17 Kasım 2026)

Bu belge, sahibin ChatGPT ve Perplexity ile hazırladığı iki strateji notundaki maddeleri **kodda gerçekten olanla**
eşleştirir. Yeni bir Claude oturumu herhangi bir özellik önermeden önce bu belgeyi ve `docs/STATUS.md`'yi okumalıdır.
Amaç: var olan özelliği yokmuş gibi yeniden yazmamak, eksik olanı da var saymamak.

Durumlar: **Var** (çalışıyor, kodda ve testte) · **Kısmen** · **Eksik** · **Yeni** (hiç yok) ·
**Araştırma** (kod incelemesi yetmedi) · **Onay** (sahibin kararı gerekli).
Not: "Var" kod incelemesine dayanır; gerçek müşteri verisiyle her özellik ayrı doğrulanmadı.

## 1. Kararlar (sahip, 17 Kasım)

| Konu | Karar |
|---|---|
| Pazar | Öncelik Türkiye; global de hedefte (site TR + EN sürüyor) |
| İş bölümü | **Marka + ürün tarafı:** 20 Kasım'dan itibaren ikinci Claude hesabı. **Kamu modülü (SaaSavran Public):** bu oturumdaki Claude |
| Kamu modülü | Planda. Ayrıntı ve sıra sahip onayıyla; henüz kod yok |
| Çalışma şekli | Claude önerir, sahip her adıma izin verir. Her iş ayrı dal + PR; PR'ı sahip birleştirir |
| Altyapı | Supabase + Cloudflare Pages + GitHub Actions + Paddle korunur; yeni ücretli servis onaysız eklenmez |

## 2. İki oturumun çakışmaması için kurallar

- İşe her zaman güncel `main`'den başla; açık PR'ı olan dosyaya dokunmadan önce sahibe sor.
- **Migration numarası:** yeni dosyadan hemen önce `main`'i çek ve son numarayı kontrol et (17 Kasım'da son: `0044`).
  Aynı numara iki dalda açılırsa ikinci PR birleşmeden önce numarasını değiştirir.
- Kamu modülü kendi alanında çalışır: tablolar `pub_` önekli, kod `engine/src/public/`, `functions/api/public/`,
  `web/src/pages/Public*.tsx`. Marka/ürün tarafı bu alanlara, kamu tarafı da marka/ürün dosyalarına dokunmaz.
- Ortak dosyalar (kimlik doğrulama, faturalama, `workspaces`/`plans`, `providers/`, `pipeline.ts`, `worker.ts`,
  CI iş akışları) yalnız sahibin onayıyla ve tek oturumda değiştirilir.
- Her önemli değişiklikte `docs/STATUS.md` güncellenir; diğer oturum durumu oradan öğrenir.

## 3. ChatGPT notu (Cuma talimatı) ↔ kod

### Ürün özellikleri

| Not maddesi | Durum | Kodda karşılığı | Not |
|---|---|---|---|
| Marka görünürlüğü, önerilme oranı, sıra, rakip karşılaştırması | Var | `metrics.ts`, `report.ts`, `Brand.tsx` | Motor bazında, güven aralığıyla |
| Motorların ayrı görülmesi, tek skora gizlememe | Var | Motor karşılaştırması (v1.13), skor türe göre ayrı | Skor yöntem sürümü yok (bkz. 5) |
| Kaynak ve referans analizi | Var | `insights.ts`, `network.ts` | Perplexity atıf yoksa arama sonuçlarını kaynak sayıyor (bkz. 5) |
| Ölçüm tarihi, motor, ülke, soru metni kaydı | Var | `runs`, `responses`, marka başına ülke kodu | Dil alanı soru düzeyinde; ayrıca doğrulanmalı |
| Canlı arama ↔ model bilgisi ayrımı | Var | `measurement_type`, DB kısıtı, raporda ayrı | Değişmez kural |
| Küçük örneklem uyarısı | Var | `lowSample`, Wilson aralıkları | |
| **AI Health Check** | Kısmen | Görünürlük skoru (`visibilityScore`) + site kontrolü (`audit.ts`) + TruthGuard | Tek "sağlık" özeti ekranı yok; yeni hesap yerine mevcut parçaları özetlemek yeterli olabilir |
| **Competitor Why Ahead** | Kısmen | Kayıp kanıt kartları, "kaynaklar kimi destekliyor", motor karşılaştırması | "Neden" iddia edilmez; kanıt dili korunmalı (bkz. 4) |
| **Content Brief** | Var | İçerik planları (v1.30, 0041) | |
| **Source Opportunity** | Var | `sourceOpportunities` (rakip önerilip siz önerilmediğinizde kaynaklar), kaynak ağı "yalnız rakip önerildi" | |
| **Visibility Timeline** | Var | "Zaman içinde" grafiği + tahmin (v1.15) | |
| **AI Bot Traffic** | Var | 0037 `ai_visits`, 0038 `ai_bots`, `traffic.ts` | |
| **Competitor Early Warning** | Kısmen | Düşüş uyarısı e-postası (0032) yalnız kendi marka için | Rakibin yükselişi için uyarı yok |
| **Product Truth Profile** | Kısmen | Ürün doğruluğu pilotu (0015): doğru / yanlış / doğrulanamadı, ChatGPT tek cevap; TruthGuard bilgi kartı (0035); motorlar arası çelişki (0036) | Eksik: SKU/varyant alanları, fiyat/stok alanları, "eksik" ve "çelişkili" durumları, ürün başına kaynak URL. Doğruluğu bağımsız ölçülmedi |
| Ürün/SKU görünürlüğü, rakip ürün | Kısmen | Ürün görünürlüğü (v1.1), rakip ürün karşılaştırması (0018), Google Shopping (0020) | SKU/varyant çözümlemesi yok |
| **Product Truth History** | Eksik | `truth_checks` kayıtları tarihli, ama zaman çizelgesi yok | Kolay: mevcut veriden |
| **Recommendation DNA** | Araştırma | Marka algısı (0034, alıntılı nitelikler), kanıt kartları | "Neden önerildi" ölçülemez; "önerildiğinde birlikte görülen kanıtlar" olarak çerçevelenmeli |
| **AI Citation Dependency** | Kısmen | Kaynak ağı, kendi site payı, kaynak türleri | Zaman içinde bağımlılık eğilimi yok |
| **AI Market Gap Detector** | Araştırma | Soru keşfi (Google PAA, 0040) | Veri yeterliliği belirsiz |
| **AI Market Intelligence** (sektör/ülke) | Kısmen | Ülke karşılaştırması, sektör soru kütüphanesi (43 sektör) | Sektör geneli rapor yok; küçük örneklemden pazar sonucu çıkarılmamalı |
| **Commercial / Revenue Intelligence** | Onay | — | Müşterinin satış verisi yok; rakamlar tahmin olur. Gerçek veri kaynağı (örn. müşteri entegrasyonu) kararlaştırılmadan yapılmamalı |
| İlk 5 dakika onboarding | Var | `StartGuide.tsx` (marka → sorular → rakip → ölçüm → rapor; gerçek veriden), eğitim videoları (PR #73) | Free → ücretli geçiş akışı ayrıca gözden geçirilmeli |
| Demo verisinin gerçek gibi görünmemesi | Var | Demo Lab, "SİMÜLASYON" etiketi, DB tetikleyicisi | Değişmez kural |

### Güvenlik (P0 maddeleri)

| Madde | Durum | Kodda karşılığı / bulgu |
|---|---|---|
| Tenant izolasyonu, RLS | Var | RLS + entegrasyon testleri (yabancı kullanıcı erişemez) |
| RBAC | Var | Ekip rolleri admin / editor / viewer (0026) |
| API anahtarı saklama ve iptal | Var | Yalnız hash saklanır, en fazla 5 etkin anahtar, `revoke` (0030) |
| **API anahtarı süre sonu** | Eksik | `api_keys` tablosunda süre sonu alanı yok |
| **Dakika bazlı API limiti** | Eksik | Yalnız günlük 1.000 çağrı sınırı var |
| Güvenli paylaşım | Var | Süreli, iptal edilebilir, alan listesi sabit (`shared_report`); bütçe/yönetim alanı olmadığını açıkça test eden bir assert eksik |
| XSS | Kısmen | Ücretsiz kontrol sonucu `esc()` ile kaçırılıyor, React varsayılan kaçırma; tam denetim yapılmadı → Araştırma |
| Prompt injection | Araştırma | Cevap metinleri LLM'e veri olarak veriliyor (truth, brief); sistematik inceleme yok |
| **Yedekleme / 8 haftalık silme politikası** | Eksik | Kodda ve belgelerde bulunamadı (Supabase'in kendi yedeği dışında) |
| Kullanıcı/tenant verisi silme | Araştırma | Tablolarda `on delete cascade` var; kullanıcının hesabı silme akışı doğrulanmadı |

### Android Admin uygulaması

| Madde | Durum | Not |
|---|---|---|
| Yönetici paneli | Kısmen | Web panelinde yönetici "Müşteriler" sayfası ve `admin_log` (0023) var |
| Abonelik başlangıç/iptal/ödeme geçmişi | Eksik | `workspaces` yalnız güncel abonelik alanlarını tutuyor; Paddle olay geçmişi tablosu yok |
| Giriş/çıkış hareketleri | Eksik | Uygulama tarafında olay kaydı yok (Supabase Auth kayıtları ayrı) |
| API kullanım/maliyet, kota | Var | `cost_ledger`, `workspace_monthly_usage` |
| Yerel Android uygulaması + anlık bildirim | Onay | Öneri: önce mevcut yönetici sayfasını telefona uygun yapmak + kritik olayları e-posta ile bildirmek; yerel uygulama (push altyapısı, mağaza) sonra |

### Diğer

| Madde | Durum | Not |
|---|---|---|
| Claude Skills araştırması | Araştırma | Kurulum sahibin onayı olmadan yapılmaz |
| Black Friday video serisi | Onay | Ücretsiz Gemini aramasız ölçüm; canlı aramalı ChatGPT/Claude ile aynı tabloda karşılaştırılmamalı. API maliyeti var |
| "Premium global" konum | Karar verildi | Öncelik Türkiye, global hedefte (bkz. 1) |

## 4. Dil ve yöntem ilkeleri (iki oturum için de bağlayıcı)

- Birlikte görülme neden değildir: "artırır", "etkiler", "neden önerildi" gibi kesin ifadeler kullanılmaz; "kanıt",
  "bu ölçümde birlikte görüldü" denir (PR #81).
- Ölçüm ile tahmin ayrı gösterilir; tahmin "gerçek ölçüm değildir" etiketi taşır.
- Canlı aramalı ve aramasız sonuçlar aynı grafikte, skorda ya da tabloda birleştirilmez.
- Her kartta motor, dönem ve payda görünür; cevap, bağlantı ve alan adı sayıları karıştırılmaz.

## 5. Perplexity notundan açık düzeltmeler (marka/ürün tarafı)

Ayrıntı `docs/STATUS.md` v1.33 "Sıradaki düzeltmeler" satırında. Özet:
marka adayı filtresi (RAM/GB/GPU) · site kontrolü (başlıkta marka varyasyonu, ülke/dil seçici sayfası,
"bu sayfada bulunamadı") · TruthGuard durumları (başarısız / kontrol edilmedi / bulgu yok) · sayım tutarlılığı ·
skor yöntem sürümü ve aralık metni · Perplexity kaynak sayımı · soru kaynağı etiketi (DB değişikliği) ·
paylaşılan rapor testi · `docs/PRICING.md` güncel fiyatlar ($60 / $300 / $876).
