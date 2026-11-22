# Gerçek durum raporu

**Son güncelleme:** 2026-11-22 · Profound alternatifleri rehberi (TR+EN)

> **22 Kasım (sahip onaylı değişiklikler):** Fiyatlar Plus 130 $, Pro 400 $, Business 1500 $ (migration 0062; Free ayda 1 ölçüm, Gemini). Site, JSON-LD, `billing.ts`, yasal metinler ve README güncellendi. PR #145 ve #146 birleştirildi. Karşılaştırma sayfasında Semrush fiyatı kaldırıldı (doğrulanamadı), Otterly para birimi €29 olarak düzeltildi. Ücretsiz kontrol sonucuna "Ücretsiz AI Model Bilgisi Kontrolü" etiketi eklendi. **Açık:** Önerilen (250 $) paketi içeriği onay bekliyor; Confidence Score ve Drop Alerts henüz başlanmadı; sektör havuzu yalnız sekiz TR ve dört EN sektörde genişletildi. **Askıda:** Paddle ve hukuki metin işleri (müşteri yok).

> **22 Kasım (canlı site denetimi ve düzeltmeler):** Canlı HTML doğrudan kontrol edildi (özet araçla yapılan ilk okuma bazı sorunları yanlış göstermişti: `==` işaretleri ve "5 şaşırtıcı" listesi sorunu gerçekte yoktu). Düzeltilenler: İngilizce alt bilgi artık dört motoru sayıyor (ChatGPT, Gemini, Claude, Perplexity); ücretsiz kontrol formunun altına Gemini'nin AEA/İsviçre/BK'da kullanılamadığı notu eklendi; "ChatGPT tarzı" ifadesi "aylık ödenir" oldu. Yeni blog yazısı (TR+EN, 22 Kasım): kendi 18 Kasım ölçümümüz (7 soru × 3 motor × 2 = 42 cevapta 0 öneri; rakipler 22–33), iki hafta sonra yeniden ölçüm sözü. Açık kalanlar: Turnstile panel ayarı (sahibin akşam işi), plan kimliklerinin (`starter`, `agency`) adları billing'e bağlı olduğu için değiştirilmedi.

> **22 Kasım (GEO Otopilot):** Site denetiminde sorun yoktu (252 sayfa, 13/13). Kendi ölçümümüzde bizi anmayan "Profound'un uygun fiyatlı alternatifleri neler?" sorusuna doğrudan cevap veren `/rehber/profound-alternatifi/` ve `/guides/profound-alternative/` eklendi (`compare.mjs`). Profound bilgisi tryprofound.com/pricing'den 22 Kasım 2026'da; diğer fiyatlar mevcut karşılaştırma sayfalarının kontrol tarihleriyle. Profound'un önerilme sayısı self.json'dan kendiliğinden gelir.

**Canlı adres:** https://aisaasavran.com (Cloudflare Pages + Supabase)

> **21 Kasım (İngilizce arayüz taraması):** Dil değiştirme düğmesinin erişilebilir adı İngilizce modda İngilizce ("Switch to Turkish"); Marka sayfasındaki "Kendi sorunuzu ekleyin" formu, "Soruyu ekle" düğmesi ve "soru sınırı" uyarısı iki dilli yapıldı. Rapor dışa aktarımı, Panel ve Marka sayfasının geri kalanı zaten iki dilliydi. **Bilerek Türkçe bırakılanlar:** Gizlilik ve Kullanım koşulları metinleri (hukuki inceleme olmadan çeviri yayımlanmaz). Sonraki aşama planı: `docs/SONRAKI-ASAMA.md`.
>
> **21 Kasım (öneri raporu denetimi):** İlerleme kontrolü önceki ölçümü ölçüm türüne bakmadan seçiyordu; son ölçüm canlı aramalıysa kendisiyle ya da aramasız ölçümle kıyaslanabiliyordu. `previousSameTypeRun` ile yalnız aynı türden önceki ölçüm kullanılır (`engine/test/previous-run.test.ts`). Aramasız ölçüm notundaki "iyileştirmeler önce web aramalı asistanlarda görünür" iddiası kanıtlanmadığı için kaldırıldı.
>
> **21 Kasım (marka eşleştirme):** Çok kelimeli marka adının ilk kelimesi artık tek başına marka sayılmıyor ("Seattle", "Garanti" gibi). Yalnız tam ad ve tanımlı takma adlar sayılır (Peec yöntemi). Yeni ölçümlerde geçerli; eski kayıtlar yeniden hesaplanmadı. Sonuç: "(video)" gibi ek taşıyan adlar cevapta geçmez; bu markalara sade takma ad (ör. "Seattle Coffee Study") tanımlanmalı. Test: `engine/test/brand-matching.test.ts`, eski üç test yeni kurala göre güncellendi.
>
> **Erken erişim.** Ödeme (Paddle) ve haftalık e-posta (Resend) kodu hazır ve testli, ancak gerçek bir ödeme
> ve gerçek bir gelen kutusu teslimi uçtan uca henüz doğrulanmadı. Hukuki metinleri avukat incelemedi.

> **21 Kasım (piyasa raporundan iki iş):** Yeni rehber **AthenaHQ alternatifi** (`/rehber/athenahq-alternatifi/`, EN `/guides/athenahq-alternative/`,
> compare.mjs): yalnız athenahq.ai/plans (21 Kasım) ve Bloomreach satın alma haberi (16 Kasım 2026); araçlar listesine AthenaHQ bölümü, llms.txt'ye bağlantı.
> SSS "Reklam vererek yapay zekâda çıkabilir miyim?" (TR+EN) güncellendi: ChatGPT reklam satışı Türkiye dahil genişliyor (Aleph, 19 Kasım);
> OpenAI'ye göre reklamlar ayrı ve etiketli, cevabı etkilemez; AI SaaSavran organik öneriyi ölçer. EN Peec SSS'sinde eski "also $29" düzeltildi.

> **20 Kasım (görünürlük iş paketi):** Marka raporunun üstüne **Bu hafta yapılacaklar** (`weeklyTodo`, insights.ts) eklendi:
> kaybedilen soru, bizi anmayan kaynak (Kaynak fırsatları), yapay zekânın aradığı ifade, anılıp önerilmeyen soru ve motor farkından
> en fazla 5 iş; yapay zekâ çağrısı yok. Ürün görünürlüğüne **kazanma** sayısı (1. sırada önerildiği cevap) eklendi. Ajans rehberine
> (TR+EN) "ölçümle müşteri kazanma" bölümü. Rakip YouTube taraması: `scripts/rakip-youtube.py` → `rakip-veri` dalı (her salı).
> CLAUDE.md'ye YouTube açıklama yapısı kuralı.

> **20 Kasım (rakip videolarından iki özellik):** Marka sayfasına, canlı aramalı ölçümlerde iki yeni panel eklendi; ikisi de ek API
> çağrısı yapmaz. **Kazanma oranı** (`winRates`, insights.ts): markanın 1. sırada önerildiği cevap oranı (mentions.rank = 1 ve önerildi),
> Wilson aralığı ve motor kırılımıyla; 20 cevabın altında uyarı. **Yapay zekânın yaptığı aramalar** (`fanoutQueries`): responses.search_queries
> alanındaki arama ifadeleri, tekrarsız sayımla ve motorlarla; arama yapılan cevap oranı. Metodoloji sayfasına "Kazanma oranı" ve arama
> ifadeleri notu eklendi. Testler: engine/test/win-fanout.test.ts.

> **19 Kasım (sektörler ve sorular):** Türkçe sektör listesi 31'den 56'ya, İngilizce 27'den 39'a çıktı (tarım/gübre, tohum/fide,
> hayvancılık/yem, üretim/sanayi B2B, makine, inşaat, enerji, gıda toptan, kimya, ambalaj, diş kliniği, kuaför, spor salonu, avukat,
> mali müşavir, veteriner, düğün, ajans, matbaa, kuyumcu, nakliyat, temizlik, mimarlık, optik, oto servis; EN: agriculture, manufacturing,
> moving, solar vb.). Sektörü "Diğer" ya da listede olmayan markalar artık genel sorularla başlar (`genericTemplates`: güvenilir mi,
> yorumlar, ne iş yapar, alternatifler, nereden alınır); diğer sektörlerde bu sorular ek fikir olarak görünür (`allQuestionIdeas`).
> Google soru keşfi: keşif başına 5 aramaya kadar (önce markanın kendi soruları tohum olur; "Diğer"de sektör tohumu yok), 40 öneriye kadar;
> ücretli paketlerde 30 günde 4 keşif (önce 2), ücretsiz pakette 1 keşif (migration 0058). Sebep: ilk gerçek dış üye (gübre üreticisi)
> sektör bulamayıp "Diğer" ile tek soruyla başladı.

> **18 Kasım (kalite denetimi, 1. aşama):** 7 uzmanlı salt okunur denetim yapıldı (rapor: claude.ai Docs, "AI SaaSavran – Kalite
> Denetimi"). Uygulananlar: Actions günlük/eserlerinde tam cevap ve gizli Growth Lab verisi yok; `ALLOW_PAID_API` depo değişkeninden
> (`vars.ALLOW_PAID_API`, tanımsızsa açık) ve smoke testleri + SerpApi bunu kontrol ediyor; smoke iş akışları yalnız `main`'de;
> haftalık e-posta marka × ölçüm türü × motor (0049); panelde gerçek motor adı, canlı ölçüm varsa canlı görünüm, Öneriler seçili türü
> kullanır; iki nedensellik cümlesi kanıt dilinde; motor listeleri (Perplexity) ve eski fiyat notları düzeltildi; `test:integration` TZ=UTC.
> Fiyat kararı: **60 / 300 / 876 $** (sahip, 21 Kasım; maliyet×5, Paddle komisyonu dahil; migration 0060). Önceki 29 / 149 / 449 $ (18 Kasım) yerine geçti.
>
> **18 Kasım (görünürlük düzeni, otomatik):** IndexNow (anahtar dosyası `web/public/<anahtar>.txt`, `scripts/indexnow.mjs`;
> her yayın sonunda son 7 günde değişen sayfalar Bing/Yandex'e). Ölçüm sayfaları `/measurements/`, `/tr/olcumler/` (gerçek marka
> adları, sahip kararı) — veri `web/site/data/measurements.json`, her pazartesi `visibility.yml` ile Growth Lab'den güncellenir,
> değişirse commit + CI. Kendi ölçümümüz (AI SaaSavran, canlı, tavan 0,60 $) çift ISO haftalarında `scripts/self-measure.ts`.
> Haftalık içerik: Claude zamanlanmış görevi (çarşamba) ölçümlerden 1 yeni TR+EN yazı yazar ve yayınlar.
> 18 Kasım kendi ölçümümüz: 7 markasız soru × 3 motor × 2 = 42 cevapta 0 öneri; 0,59 $.
> Yapay Zekâ Görünürlük Endeksi: `/tr/yapay-zeka-gorunurluk-endeksi/` + `/ai-visibility-index/` + CSV `/ai-visibility-index.csv`
> (`web/site/visibility-index.mjs`): ölçümlerin sektör özeti (sorular metindeki anahtar kelimeyle sektöre ayrılır; yalnız canlı
> aramalı cevaplar toplanır, Gemini ayrı satır; CC BY 4.0, Dataset şeması). Aynı veriyle her pazartesi kendiliğinden güncellenir.
> Karşılaştırma rehberleri geri geldi (sahip kararı, gerçek adlarla): `/rehber/yapay-zeka-gorunurluk-araclari/`, `/rehber/peec-ai-alternatifi/`
> + EN (`web/site/compare.mjs`; rakip bilgisi yalnız resmî sayfalardan, 18 Kasım; 3 ayda bir kontrol). Kurucu sayfası `/tr/kurucu/`, `/founder/`
> (Ramazan Savran, Antalya; Person + Organization.founder şeması; sahip onayı).
> Rehberler: 4 ince rehbere gerçek ölçüm verili bölümler eklendi; yeni TR+EN: markam ChatGPT'de neden çıkmıyor, Perplexity'de görünmek,
> GEO/AEO sözlüğü, llms.txt nedir (`web/site/guides-more.mjs`). Toplam 14 TR + 14 EN rehber (21 Kasım).
> Ücretsiz kontrol sayfası tam sayfa (sorular, sonuç okuma, sınırlar, SSS şeması); gizlilik politikasına ücretsiz kontrol verisi eklendi.
> Kendi ölçümümüz otomatik: `export-measurements.ts` son bitmiş canlı ölçümü `web/site/data/self.json`'a yazar; ana sayfa kutusu ve
> karşılaştırma tablosu buradan (`web/site/self.mjs`). `visibility.yml` bu dosyayı da commit eder.

> **18 Kasım (4 paket, devam):** gizli bilgi taraması Paddle/Resend/SerpApi/Turnstile/GitHub/OAuth + kişisel e-posta; gece Gemini
> testi hatayı gizlemez; `runs.prompts_total` işçide gerçek soru sayısı; SEO: `/tr/fiyatlar/`, sayfa bazlı `lastmod`, RSS `<link>`,
> `favicon.ico`, blog görseli 640×360, başlıklar; uygulama parçalı yüklenir (ilk yük 846 → 571 kB); 0053 29 FK indeksi;
> zaman grafiğinin altında "yöntem/soru seti/motor değişti" notu (0051 alanları); 0054 `brands.top_actions` → paylaşılan raporda
> "En önemli 3 iş" (sahip/editör rapor ekranını açınca güncellenir).

> **18 Kasım (3. aşama, ürün):** Paddle 0052 `apply_subscription_v2` (yeni abonelik yalnız checkout'u başlatan owner/admin/editor
> üyeyle bağlanır; aynı aboneliğin eski olayı `stale_event`). Bilgi kartı `FactCardInline` ile rehberde (6. adım) ve TruthGuard'da.
> Raporda en üstte "Bu hafta yapılacak iş" (Öneriler ile aynı `useRecommendations`). Kaynak panelleri "Kaynaklar", AI ziyaret/bot
> panelleri "Sitenize gelen yapay zekâ ziyaretleri" katlanır grubunda. Müşteriye iç maliyet gösterilmez.
> Yapılmadı: rakip nitelik tablosu (rakip algısı işçide saklanmıyor; LLM maliyeti var), paylaşılan rapora "en önemli 3 iş"
> (girişsiz rapor RPC'sine öneri verisi gerekir), "doğrulanmış bot" etiketinin eklenti bildirimlerinde ayrılması, Turnstile anahtarları.

> **18 Kasım (2. aşama, ölçüm güvenilirliği):** aralık soru bazında (etkin örneklem, ICC 0,67; 0050 `brand_visibility.prompts`);
> fark <10 puan ya da aralık çakışması = "başa baş" (Yapay zekâ ↔ Shopping lideri dahil); küçük örneklem = <20 cevap ya da <10 soru.
> Marka tespiti: kısa BÜYÜK harfli ilk kelime ("ONE"), `parent:` önekli üst şirket takma adı sayılmaz (Growth Lab SKYN güncellendi),
> yaygın kelime adlar yalnız büyük harfle; LLM "önerildi" deyince sıra da hesaplanır; sınıflandırıcıya "hepsi benzer = neutral".
> Yöntem kaydı (0051): `runs.method_version` (2026-11-18), `classifier_version`, `prompt_set_hash`, `engines`; `responses.model_snapshot`.
> Maliyet: ChatGPT ve Claude canlı aramada en fazla 1 web araması (önce 2); Growth Lab'de "bilgi" soruları ücretli motorlara sorulmaz.
> Yapılmadı: eğilim grafiğinde "yöntem değişti" işareti, günler arası önbellek (ölçüm bağımsızlığını bozacağı için bilinçli olarak yok),
> `cost_ledger.tool_calls` ve `runs.prompts_total` sayaç düzeltmesi.

> **18 Kasım (Perplexity kaynak, karar A):** Perplexity'de yalnız cevabın gösterdiği siteler (alıntı ya da metindeki
> bağlantı) kaynak sayılır; aramada bulunup gösterilmeyenler sayılmaz. Geçmiş 96 Growth Lab cevabı 0048 ile düzeltildi
> (1.440 → 21 kaynak). Metodoloji (TR+EN) ve "Kaynaklar kimi destekliyor" paneline açıklama eklendi. Not: 17 Kasım akıllı saat
> Instagram/Shorts "kaynak ağı" görseli eski sayımla üretilmiş olabilir.

> **18 Kasım (iyileştirme paketi):** (1) Site başlık/açıklamalarına Perplexity eklendi (ana sayfa TR başlığı, Hakkımızda,
> Rehberler, marka/ürün görünürlüğü, araç seçimi ve ajans rehberleri). (2) Shopping: "E-Book Reader / e-kitap okuyucu"
> ürünün kendisi sayılır (Kindle elenmiyordu). (3) Marka adayı listesine RAM/GB/GPU/16GB/120Hz gibi teknik terimler girmez.
> (4) TruthGuard: teknik hatayla yapılamayan kontroller "henüz kontrol yok" yerine ayrıca yazılır; iddia bulunmayan
> cevaplarda 0/0/0 yerine "somut iddia yok" açıklaması. (5) Site kontrolü: marka adı başlıkta yazım farklarıyla da bulunur
> (KafeMavi ↔ Kafe Mavi, İŞ BANKASI, Enpara.com ↔ Enpara, &amp;). Perplexity kaynak sayımı: aşağıdaki karar A ile çözüldü.

> **18 Kasım (haftalık denetim):** Google Shopping eşleştirmesi "Standard/Standart" geçen ilanları "stand" (aksesuar)
> sanıp eliyordu (kayıtlı 381 ilandan 1'i); düzeltildi + test. Metodoloji sayfası (TR+EN) "Perplexity'yi ölçmüyoruz"
> diyordu, oysa ücretli paketlerde ölçülüyor; tanım cümlesi, SSS tekrar sayısı ve hoş geldin e-postası Perplexity'yi
> içerecek şekilde düzeltildi. `docs/PRICING.md` tablosu `npm run pricing` çıktısıyla yenilendi, güncel fiyat notu
> (29/149/449 $) eklendi; Free satırında "%-Infinity" yerine "—". Plus tavanı 9 $ < 4 motorlu tipik maliyet 10,8 $; **karar (sahip, 18 Kasım): tavan şimdilik 9 $ kalıyor** (ay sonuna doğru ölçüm durabilir).
> Google AI ölçümü ileride (sahip kararı); şimdilik sitede yazılmıyor. Instagram (vidIQ kayıtları, 0 kredi): 17 Kasım'da akıllı saat
> seti TR Reels → EN Reels arasına prezervatif TR+EN Reels girdi, prezervatif setinin ayrı gönderisi yok (set yarım);
> 14 Kasım'da 4 Reels aynı dakikada atıldı ve saç ekimi TR/EN Reels 2'şer kez görünüyor (silindi mi bilinmiyor).

> **18 Kasım (TruthGuard dil):** Model "Never translate" kuralına rağmen İngilizce cevaptan Çince/İspanyolca/Almanca
> iddia yazabiliyordu (Trojan ölçümü). Artık iddianın dili cevaptakinden farklıysa cevaptaki alıntı gösterilir; bilgi
> kartından farklı dilde yazılmış "resmî bilgi" boş bırakılır (`guessLang`, kural tabanlı, API yok).

> **18 Kasım (site örneği):** Ana sayfa (TR+EN) örnek cevap kartı akıllı saat ölçümüne geçti (gerçek sayılarla).
> "Bugünün ölçümü" hassas/araştırma alanlarını göstermez: `workspaces.hide_from_examples` (0047); Growth Lab 3
> (ABD prezervatif araştırması) gizli.

> **18 Kasım (içgörü kartları + site metni):** (1) Kendi site payı panelinde "Siteniz kaynak gösterildi, rakip de
> önerildi" kartı (`ownCitedRivals`). (2) Ürünler sekmesinde Google Shopping altında "Yapay zekâ ↔ Google Shopping"
> kartı: yapay zekânın en çok önerdiği marka, Shopping'in 1. sırası, sizin iki taraftaki sıranız (`aiVsShopping`).
> İkisi de mevcut veriden; ek API yok. Ana sayfaya (TR+EN) "Raporda neler var?" bölümü: motor farkı, kanıt kartları,
> kaynak etkisi, TruthGuard, yapay zekâ ↔ Shopping, aynı şirket birleştirme. Hero motor listesi güncellendi.

> **17 Kasım (PDF temizliği):** Marka sayfası PDF'e kaydedilirken paylaşım paneli, Google soruları paneli,
> düğmeler ve formlar artık çıkmıyor (`no-print`); "Cevaplarda geçen diğer adlar" PDF'te düz liste olarak kalıyor. Playwright yerleşim testi PDF görünümünü de denetliyor.

> **17 Kasım (rakip birleştirme):** "Cevaplarda geçen diğer adlar" bölümüne "Bir rakibin diğer adı / alt markası"
> seçeneği eklendi. Cevap bir adı bilinen bir rakibin alt markası gibi anlatıyorsa ("premium version of MACFit") panel
> "… ile birleştir" önerir (`relatedBrand`, kural tabanlı, API yok). Kullanıcı onaylamadan birleştirme yapılmaz;
> geçmiş ölçümler ücretsiz yeniden hesaplanır.

> **17 Kasım:** Strateji notlarının kodla eşleştirmesi, iş bölümü (marka/ürün ↔ kamu) ve iki oturumun çakışmama
> kuralları: [`docs/OZELLIK-HARITASI.md`](OZELLIK-HARITASI.md). Yeni özellik önermeden önce okuyun.


## 21 Kasım — GEO otopilot düzeltmeleri
- 148 ölçüm/kurucu sayfası "az metin" uyarısı aldı: ölçüm şablonuna (`measurements.mjs`) "Bu tablo nasıl okunur?", "Markanız bu listede yoksa" ve aynı sektörden "Benzer ölçümler" bölümleri eklendi (yalnız tanım + sayfanın kendi sayıları). Kurucu sayfalarına "Neler yayımlıyor?" bölümü.
- Uzun açıklamalar kısaltıldı: ana sayfa (TR/EN, `DEF`), /methodology/, /tutorials/.
- Yeni rehber (TR+EN): Türkiye'de yapay zekâ görünürlüğü analizi (`guides-more.mjs`). Toplam 14 TR + 14 EN rehber.

## 20 Kasım — ölçüm mantığı denetimi
- Öneri algılama (engine/src/metrics.ts): olumsuzluk yalnız markanın geçtiği cümle parçasında sayılır; "kapalı havuz", "şikayet oranı düşük", "avoids hidden fees" artık olumsuz değil; "kaçınmanız gerekenler" başlığı altındaki maddeler ve "X yerine Y"deki X önerilmiş sayılmaz; ayrı numaralı listelerde sıra kendi listesinde; gündelik kelime olan marka adları ("garanti", "getir") yalnız büyük harfle ve -li eki olmadan sayılır. Test: engine/test/detection-audit.test.ts.
- Öneri ilerleme metni (recommendations.ts): kazanılan ve kaybedilen sorular ayrı yazılır, net değişim doğru.
- Soru havuzu (web/src/lib/sectors.ts `classifyPoolQuestion`): meslek/iş kurma/tanım soruları çıkarıldı (376 → 351); "en iyi … nedir?" soruları karşılaştırma sayılır, otomatik başlangıç sorularına girebilir. Test: engine/test/question-pool.test.ts.

## Ana sayfa yeni tasarım (18 Kasım 2026)
- `/` ve `/tr/`: koyu üst bant, gerçek akıllı saat ölçümünün çubuk grafiği (17 Kasım, 48 cevap), 3 soru kartı, "Nasıl çalışır" adımları, rapor özellikleri simgeli kartlar, şeffaflık kutusu sayı kutularıyla, Plus'ta "Önerilen" etiketi, sonda çağrı bandı.
- Ana butonlar artık üye olmadan kontrol sayfasına gider (`/tr/kontrol/`, `/check/`); ikinci buton hesap açma.
- "Şu an neler kullanılabilir" listesi ana sayfadan kaldırıldı; bilgi rapor bölümü notunda ve `/durum` sayfasında.
- Kontrol: 252 sayfa 360 px'te tarandı (yana taşma, kutudan taşan yazı, görünen kod yok); ana sayfalar 360/412/980/1180/1366 px'te.

## v1.34 (17 Kasım 2026): Google Shopping düzeltmeleri ve müşteri kuralı
- Eşleştirme: saat ilanındaki "Case" (kasa) kılıf sayılmıyor; "for ..." ilanları aksesuar (Apple Watch 11 $ hatası).
- Rakip ürünler kendi adıyla aranabilir (0045) — **yalnız Growth Lab'de** (video/araştırma).
- **Karar (sahip, 17 Kasım):** müşteri yalnız kendi ürünlerini, haftada bir otomatik görür; "Şimdi kontrol et" ve rakip araması
  müşteride kapalı (0046). Sebep: SerpApi hakkı ortak. Paket bazında kota sonra kararlaştırılacak.
- Hizmet sektörü (spor salonu, hastane vb.) Google Shopping'de yer almaz; karşılığı ileride Google Haritalar sırası olabilir (fikir).
- TruthGuard: iddialar cevabın dilinde yazılır (İngilizce cevaptan Rusça iddia çıkıyordu).

## v1.33 (17 Kasım 2026): temkinli yorum dili (Paket 1)
- Nedensellik iddia eden ifadeler düzeltildi: "görünürlüğü artırır", "birden fazla motoru etkiler", "oynaklıkla açıklanamaz", "en doğrudan yol". Birlikte görülmenin neden kanıtı olmadığı yazılıyor.
- "Kayıp nedeni" → "Önerilmediğiniz soru: kanıtlar"; "rakip kalesi / sizin kaleniz" → "yalnız rakip önerildi / siz önerildiniz".
- Kaynak listeleri artık her motoru "ChatGPT" diye anmıyor; sayının bağlantı sayısı olduğu (cevap değil) yazılıyor.
- Aramasız ölçümde "haftalar/aylar içinde yansır" ima eden cümle kaldırıldı.
- Ana sayfa "Bugün ne çalışıyor" listesi düzeltildi (TR/EN): "Perplexity henüz yok" yazıyordu.
- Sıradaki düzeltmeler (Perplexity notundan, 17 Kasım incelemesi): marka adayı filtresi (RAM/GB/GPU), site kontrolü (başlıkta marka varyasyonu, ülke/dil seçici sayfası, "bu sayfada bulunamadı"), TruthGuard durumları (başarısız/kontrol edilmedi/bulgu yok), sayım tutarlılığı, skor yöntem sürümü ve aralık metni, Perplexity kaynak sayımı (atıf yoksa arama sonuçlarını kaynak sayıyor), soru kaynağı etiketi (DB değişikliği), paylaşılan raporda bütçe olmadığını doğrulayan test, `docs/PRICING.md` güncel fiyatlar ($29/$149/$449).

## v1.32 (15 Kasım 2026): başarısız ölçüm telafisi
- Müşteri ölçümü geçici hatayla (kota, sağlayıcı hatası) hiç sonuç almadan biterse işçi 30 dk sonra aynı ölçümü yeniden sıraya koyar (`schedule_recovery_runs`, 0044). En çok 3 deneme, 7 gün içinde; kalıcı hatalarda (anahtar, geçersiz istek) denemez.
- Telafi ölçümü başarıyla bitince ekip sahibine/yöneticisine bir kez "sonuçlarınız hazır" e-postası gider (TR/EN, motor bazında gerçek anılma/önerilme sayıları). `engine/src/recovery.ts`.
- Telafi ölçümleri Free pakette aylık ölçüm hakkından düşmez.
- Neden: ilk dış kullanıcının (11 Kasım) ölçümü Gemini geçici hatası yüzünden sonuçsuz kalmış, kullanıcı geri dönmemişti.

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

## v0.9 (11 Kasım 2026, beşinci paket)

- **Ürün Doğruluğu (pilot, 0015):** marka başına en fazla 10 ürün; kullanıcı doğru bilgileri girer. Ücretli alanlarda "Doğruluğu kontrol et": 1 canlı aramalı ChatGPT cevabı + 1 karşılaştırma çağrısı (yaklaşık 0,02 $), ürün başına günde bir. Sonuç: doğru / yanlış / doğrulanamadı. Karşılaştırmanın doğruluğu henüz ölçülmedi; tek cevaba dayanır.

- **"Önerildi mi" kontrolünün canlı denemesi (11 Kasım):** 20/20 ChatGPT cevabı başarılı (0,37 $). Marka geçen 9 cevap sınıflandırıldı, toplam 0,001 $ (cevap başına yaklaşık 0,0001 $). "X'e alternatif" sorularında X'in kendisini doğru biçimde "önerilmedi" saydı. Elle etiketli geniş bir karşılaştırma henüz yapılmadı.

## v1.0 (11 Kasım 2026, altıncı paket)

- **Claude müşteri paketlerinde (0017):** canlı ölçümde ChatGPT (2 tekrar) + Claude (1 tekrar). Ücretli tavanlar aynı (9 / 50 / 150 $); sorgu kotaları 620 / 3.600 / 10.800. Tipik brüt marj: Plus %51, Pro %51, Business %44 (`npm run pricing`).
- Canlı deneme (Growth Lab, 11 Kasım): ChatGPT 20/20, Claude 20/20, toplam 0,80 $. Claude cevap başına 0,0192 $.
- Ürün doğruluğu canlı denemesi: ChatGPT "AI SaaSavran Plus" sorusunda markayı savran.ai ile karıştırdı; sistem "farklı ürün" olarak işaretledi.
- Growth Lab toplam deneme tavanı 3 $ → 6 $ (app_settings).

## v1.1 (11 Kasım 2026, yedinci paket)

- **Ürün görünürlüğü ve ürün önerilme oranı:** Ürünler sekmesinde her ürün için, son ölçüm cevaplarında ürün adının geçtiği ve önerildiği cevap sayısı (motor bazında, güven aralığıyla). Ek API çağrısı yok. Ürünün önerilmediği sorularda yerine önerilen rakip markalar ve kaynaklar. Rakipler marka düzeyindedir; rakip ürün karşılaştırması henüz yok.
- **İsim karışıklığına karşı site:** SSS'ye "benzer adlı şirketlerle ilgimiz var mı?" sorusu, yapısal veriye alternatif adlar ve bağımsızlık açıklaması (başka şirketin adı yazılmadan).
- **Markalı / markasız soru ayrımı (soru şablonu araştırması, B seçeneği):** soruda markanın kendi adı geçiyorsa "markalı" sayılır; raporda markasız ve markalı oranlar ayrı gösterilir, Sorular sekmesinde markalı oran %30'u aşarsa uyarı çıkar. Sektör soru kütüphanesi (43 sektör, Türkçe ve İngilizce) ve niyet etiketi zaten vardı. Ek API maliyeti yok.
- Uçtan uca testte düz çizgi grafiğin "görünmez" sayılması düzeltildi.

## v1.2 (12 Kasım 2026)

- **Rakip ürün karşılaştırması (0018):** kendi ürününe en fazla 5 rakip ürün bağlanır; son ölçüm cevaplarında yan yana, motor bazında anılma/önerilme ve "ikisi birlikte geçtiğinde kim önerildi" sayımı. Ek API maliyeti yok. Rakip üründe doğruluk kontrolü yok.
- **AI Shopping (araştırma):** ChatGPT'nin alışveriş kartları (ürün karuseli) API cevabında yer almıyor; bu yüzden ölçülmüyor. Ölçülen, metin cevaplarındaki ürün anılmasıdır.

## v1.13 (12 Kasım 2026): motor karşılaştırması ve öneri payı

- Raporda (birden çok motorlu canlı ölçümde) **Motor karşılaştırması**: aynı ölçümde her motorun her markayı kaç cevapta önerdiği, motorlar arası fark (puan).
- **Motorlar arası tutarsızlık**: bir motor markayı hiç anmazken diğeri öneriyorsa ayrıca yazılır. "Anlamlı" ancak Wilson aralıkları ayrışınca denir; küçük örneklemde "fark büyük, örneklem küçük".
- **Öneri payı (AI Market Share)**: her motorun yaptığı tüm marka önerileri içinde takip edilen markaların payı. Pazar payı değildir.
- **Motorların baktığı siteler**: motor başına en çok kaynak gösterilen siteler; yalnız o motorun baktığı siteler işaretli.
- Ek API maliyeti yok. Kulaklık pilot verisiyle test edildi (Marka E: ChatGPT 0/8, Claude 5/8 → "fark büyük, örneklem küçük").
- Google Shopping: kılavuz/kitap/kılıf/yastık/"uyumlu" aksesuar ilanları ürün sayılmaz; model kodu markasız eşleşir (PR #25).

## v1.14 (12 Kasım 2026): iyileştirme rehberi

- "Yapılacaklar" sekmesi **İyileştirme rehberi** oldu: her maddede kanıt, ne yapılmalı, öncelik ve **başarı ölçütü** (sonraki ölçümde neye bakılacak).
- Yeni kanıta dayalı maddeler: bir motor sizi hiç anmıyor (motor karşılaştırmasından), rakibi öneren üçüncü taraf siteler, ürün doğruluğunda yanlış bilgi, Google Shopping'de rakip ürün önde.
- **Önceki ölçüme göre ilerleme**: anılmadığınız sorularda iyileşti / kötüleşti / aynı.
- Kural tabanlı; yapay zekâ üretmez, ek API maliyeti yok.

## v1.15 (12 Kasım 2026): görünürlük tahmini

- "Zaman içinde" grafiğinin altında **Tahmin** kutusu (kesik çerçeve, "gerçek ölçüm değildir"): eğilim sürerse 30 gün sonraki önerilme oranı ve aralığı.
- Ağırlıklı doğrusal eğilim (ağırlık = cevap sayısı); aralık = model belirsizliği + son ölçümün örneklem belirsizliği. Eğim aralığı sıfırı içeriyorsa "belirgin eğilim yok".
- En az 4 ölçüm ve 14 gün yoksa tahmin gösterilmez. Simülasyonda gösterilmez. Ek API maliyeti yok.

## v1.31 (14 Kasım 2026): yapay zekâ kaynak ağı

- Raporda (canlı arama) "Yapay zekâ kaynak ağı": en çok kaynak gösterilen 8 site ↔ o sitelerin cevaplarında önerilen markalar (SVG ağ, çizgi kalınlığı = birlikte geçtiği cevap sayısı) ve liste.
- Roller: ortak kaynak (≥2 motor), rakip kalesi (cevaplarında rakip öneriliyor, siz hiç), sizin kaleniz; rakip kaleleri için uyarı. Ek maliyet yok. Test: `engine/test/network.test.ts`.

## v1.30 (14 Kasım 2026): içerik planları

- Öneriler sekmesinde "İçerik planları": markanın önerilmediği her soru için "İçerik planı oluştur". İşçi, o sorunun son 30 gündeki en güncel 4 gerçek cevabından ve kaynak sitelerinden küçük LLM ile plan çıkarır: sayfa başlığı, neden kazanabilir, bölümler, mutlaka yazılacaklar ("doğrulayın" işaretiyle; bilgi kartında olmayan sayı/iddia uydurulmaz), SSS, yapay zekânın baktığı siteler, önerilen rakipler.
- Yalnız ücretli paketler; marka başına 30 günde 20 plan, aynı soru için 7 günde bir; maliyet (~0,001 $/plan) çalışma alanının ücretli harcamasına yazılır. Migration 0041. Testler: `engine/test/brief.test.ts`, ekran testi.

## v1.29 (14 Kasım 2026): gerçek soru keşfi (Google)

- Sorular sekmesinde "Gerçek sorular (Google)": markanın sektörü/şehri için 3 Google araması (SerpApi), "Diğer kişiler şunları da sordu" ve ilgili aramalar; tek tıkla soru listesine ekleme (amaç etiketi tahmini), gizleme.
- Yalnız ücretli paketler ve Growth Lab; marka başına 30 günde 2 keşif; SerpApi'de 50'den az hak kaldıysa keşif bekler (Shopping'e kalır). Migration 0040 (`prompt_suggestions`, `discovery_runs`). Yapay zekâ kullanılmaz.
- Testler: `engine/test/discovery.test.ts`, ekran testi genişletildi.

## v1.28 (14 Kasım 2026): ücretsiz kontrolü kim kullanıyor

- Her ücretsiz kontrolde istemci türü (tarayıcı / bot / otomatik araç / bizim testimiz) ve ülke kaydedilir (migration 0039). Tür kullanıcı aracısından tahmin edilir, taklit edilebilir. Canlı denetim betiği `x-aisv-test` başlığıyla kendini "test" olarak işaretler.
- Müşteriler sayfasında (yönetici) "Ücretsiz kontrol kullanımı": son 60 gün, türe göre sayılar, marka/kategori/şehir, ülke, tekrar gelen, sonuç. IP karması gösterilmez.
- 14 Kasım itibarıyla 7 kontrolün 6'sı "AI SaaSavran" (kendi testlerimiz), 1'i "Peec AI" (EN); tamamı tür kaydı başlamadan önce.

## v1.27 (14 Kasım 2026): gerçek Gemini testleri geceye alındı

- Ücretsiz Gemini kotası canlıdaki Free paket ve ücretsiz kontrolle ortak. Her PR'da çalışan iki bilgi amaçlı gerçek Gemini testi kotayı tüketiyordu ("quota_exceeded"). Artık `.github/workflows/gemini-nightly.yml` ile her gece 05:17'de (TR) ve elle istenince çalışıyorlar; diğer testler her PR'da aynen sürüyor.

## v1.26 (14 Kasım 2026): görünürlük × ziyaretçi

- Ücretli paketlerde "Yapay zekâdan gelen ziyaretçi" bölümünde motor seçmeli grafik: son 8 haftada o motordaki haftalık önerilme oranı ve o motordan gelen ziyaret yan yana. Ölçüm olmayan hafta "–".
- En az 4 haftada ikisi de varsa "hafta hafta değişimlerin %X'inde aynı yönde" notu; neden-sonuç iddiası yok. Ek maliyet yok. Test: `engine/test/traffic.test.ts`.
- Bot ölçümü canlıda doğrulandı: kendi sitemizde ilk gün OAI-SearchBot (IP doğrulandı), Applebot ve Bingbot kayıtları.

## v1.25 (13 Kasım 2026): yapay zekâ botları (bot ölçümü)

- 18 bot tanınıyor (OAI-SearchBot, ChatGPT-User, GPTBot, Claude-SearchBot, Claude-User, ClaudeBot, PerplexityBot, Perplexity-User…), türüne göre: arama / kullanıcı isteği / eğitim. OpenAI ve Perplexity botları yayımlanan IP listeleriyle doğrulanır; IP saklanmaz.
- Kendi sitemiz: `functions/_middleware.js` (statik dosyalar `_routes.json` ile hariç), sayım cevabı geciktirmez.
- Müşteriler: `/api/ai-bot` + WordPress eklentisi (`integrations/wordpress`, derlemede `/downloads/ai-saasavran-bot-sayaci.zip`; ziyaretçi sayacını da kurar) ve Cloudflare Worker kodu (raporda kopyalanır).
- Migration 0038 (`ai_bot_hits`, `record_ai_bot`): gün × bot × sayfa; doğrulanan ve hata (4xx/5xx) alan istek sayısı; günlük sınırlar.
- Raporda "Yapay zekâ botları": Free'de toplam; ücretli paketlerde bot türleri, doğrulama, hata uyarısı, 30 gündür gelmeyen önemli arama botu uyarısı, en çok okunan sayfalar, kurulum. Testler: `engine/test/bots.test.ts` (PHP eklentisi dahil).

## v1.24 (13 Kasım 2026): yapay zekâdan gelen ziyaretçi (1. aşama)

- Müşteri sitesine tek satır kod: `<script async src="https://aisaasavran.com/t.js" data-site="…">`. Kod yalnız ziyaretçi ChatGPT, Gemini, Claude, Perplexity, Copilot, DeepSeek, Grok veya Meta AI'dan geldiyse (referrer veya utm_source) ve oturumda bir kez bildirir.
- `/api/ai-visit` → `record_ai_visit` (migration 0037): IP, çerez, tarayıcı bilgisi yok; gün × kaynak × sayfa sayacı. Kaynak site markanın sitesiyle eşleşmezse sayılmaz; marka başına günde 20.000 ziyaret ve 300 farklı sayfa sınırı; sayfa yolunda e-posta ve uzun sayılar maskelenir.
- Raporda "Yapay zekâdan gelen ziyaretçi": son 30 gün / önceki 30 gün. Ücretli paketlerde kaynak dağılımı (motorun güncel önerilme oranıyla yan yana), 8 haftalık grafik, gelinen sayfalar. Kod parçası kopyalanabilir. Gizlilik metnine paragraf eklendi.
- Testler: `engine/test/traffic.test.ts` (t.js tespiti dahil), ekran testi genişletildi. Sonraki aşama: bot ölçümü (Cloudflare kodu, WordPress eklentisi).

## v1.23 (13 Kasım 2026): TruthGuard 3. aşama

- **Motorlar arası çelişki:** aynı soruya en az iki motorun markayı andığı en güncel cevapları karşılaştırılır (soru başına haftada bir, bilgi kartı gerekmez). Her taraf kendi cevabından birebir alıntıyla; tek taraflı veya uydurma alıntılı çelişki atılır. Migration 0036 (`engine_conflicts`). Maliyet soru başına ~0,0003 $, çalışma alanının ücretli harcamasına yazılır.
- **Yeni yanlış bilgi e-postası:** TruthGuard, markanın son 60 günde görülmemiş yanlış bir iddiasını bulursa marka başına tek e-posta (TR/EN). Uyarı tercihi düşüş uyarısıyla ortak ("Uyarılar"), tek tıkla kapatılır. Growth Lab'e gönderilmez.
- Testler: `engine/test/truth.test.ts`, `engine/test/truth-worker.test.ts`.

## v1.22 (13 Kasım 2026): TruthGuard 2. aşama

- **Kaynaksız istatistik:** markanın geçtiği cümlelerde yüzde, milyon/milyar, kullanıcı sayısı, "lider / pazar payı" gibi iddialar; cevap hiç kaynak göstermediyse işaretlenir. Fiyat, saat ve teknik özellikler (MP, mAh, W, inç) sayılmaz.
- **Eski bilgi:** "güncel / şu an / en yeni / itibarıyla" bağlamında 3 yıldan eski yıl. "2009'da kuruldu" gibi tarihsel bilgi işaretlenmez.
- Tamamen kural tabanlı, API maliyeti yok; ücretli paketlerde TruthGuard bölümünde, cevaptan alıntıyla. Ücretli paket koşulu düzeltildi (plan ≠ free). Ekran testi: `e2e/truthguard.e2e.ts`.

## v1.21 (13 Kasım 2026): TruthGuard (1. aşama)

- Yalnız ücretli paketler (ve Growth Lab). Free'de kısa tanıtım ve paket bağlantısı.
- **Doğru bilgi kartı:** marka düzenleme formunda (en fazla 3.000 karakter). Kart değişince kontroller yeni kartla yeniden yapılır.
- **Yanlış bilgi kontrolü:** işçi, markanın geçtiği en güncel cevabı (soru × motor başına haftada bir) kartla karşılaştırır: doğru / yanlış / doğrulanamadı, doğrusu ve cevaptan birebir alıntı. Alıntı cevapta yoksa iddia atılır. Maliyet çalışma alanının ücretli harcamasına yazılır (~0,0003 $/kontrol). Migration 0035.
- **Kaynak türleri (kural tabanlı, ücretsiz):** sizin siteniz, rakip, resmî/kamu/eğitim, ansiklopedi, haber, inceleme, forum, sosyal medya, pazar yeri, diğer; tüm cevaplar ve rakibin öne geçtiği cevaplar ayrı. Forum + sosyal ≥%40 ise uyarı.
- İyileştirme rehberinde "Yapay zekâ markanız hakkında N yanlış bilgi veriyor" maddesi ve kampanya görevleri. Testler: `engine/test/truth.test.ts`.
- Sıradaki aşamalar: kaynaksız istatistik ve eski bilgi (kural tabanlı), motorlar arası çelişki ve yeni yanlış bilgi uyarısı.

## v1.20 (13 Kasım 2026): marka algısı

- "Önerildi mi?" kontrolü aynı çağrıda hedef markanın algısını çıkarır: duygu (olumlu/karışık/nötr/olumsuz) ve sabit listeden en fazla 5 nitelik (premium, uygun fiyatlı, güvenilir…). Migration 0034: `mentions.perception`.
- Her nitelik cevaptan birebir alıntı ister; cevapta geçmeyen alıntı ve listede olmayan nitelik atılır (uydurma gösterilmez).
- Yalnız ücretli paketler (ve Growth Lab), canlı aramalı ölçüm. Ek maliyet cevap başına ~0,0001 $ (gerçek sınıflandırma kaydı: 530 girdi / 66 çıktı token, 0,00009 $).
- Eski cevaplar için işçi geriye dönük doldurur (ayrı çağrı, toplam tavan `PERCEPTION_BACKFILL_MAX_USD`, varsayılan 0,10 $). Raporda "Marka algısı" bölümü. Testler: `engine/test/perception.test.ts`.

## v1.19 (13 Kasım 2026): kazanma kampanyası

- İyileştirme rehberindeki veri maddelerinde (anılmadığınız sorular, anılıp önerilmediğiniz sorular, motor farkı, kaynak siteleri, yanlış ürün bilgisi, Shopping, kendi site payı, site kontrolü maddeleri) "Kampanya başlat" düğmesi.
- Görevler ölçüm verisinden üretilir (soru metni, site adı, yanlış iddia ve doğrusu); en fazla 8 görev. Ayar maddeleri (soru ekle, haftalık ölçüm…) kampanya değildir.
- Kampanya bir aksiyon kaydıdır (migration 0033: `brand_actions.rec_id`, `tasks`): görevler işaretlenir, ilerleme çubuğu, önce/sonra karşılaştırması mevcut aksiyon takibiyle motor bazında.
- Aynı madde için süren kampanya varken düğme yerine "kampanya sürüyor" yazar. Testler: `engine/test/campaign.test.ts`.

## v1.18 (13 Kasım 2026): düşüş uyarısı

- Biten her ölçüm, aynı markanın aynı türdeki önceki ölçümüyle motor bazında karşılaştırılır (işçi, ek API yok, migration 0032).
- Yalnız iki ölçümde de sorulan sorular sayılır. Uyarı için düşüş ≥10 puan, her iki ölçümde ≥10 cevap ve iki oran z-testinde %95 belirginlik gerekir.
- E-posta (TR/EN): hangi motorda, önceki → yeni oran, kaybedilen sorular ve yerine önerilen rakip. Tek tıkla kapatma (`/api/unsubscribe?k=drop`), hesap sayfasında aç/kapat.
- Yalnız müşteri çalışma alanları (Growth Lab hariç). Her ölçüm bir kez kontrol edilir (`drop_alerts` tablosu). Testler: `engine/test/drop-alert.test.ts`.

## v1.17 (13 Kasım 2026): AI Görünürlük Skoru

- Raporun en üstünde 0–100 arası tek skor: önerilme %45, anılma %20, önerilerdeki pay %20, sitenin kaynak gösterilmesi %15.
- Aramasız ölçümde kaynak bileşeni sıfır sayılmaz; ağırlığı diğerlerine oransal dağıtılır ve bu açıkça yazılır.
- Skorun aralığı oranların %95 güven aralığından hesaplanır; 20 cevabın altında "kesin değil" uyarısı.
- Önceki ölçümle fark, farkı en çok etkileyen bileşen ve fark oynaklık içindeyse uyarı. Birden çok motorda en büyük artış/düşüş gösteren motor.
- "Skor nasıl hesaplandı?" bağlantısı her bileşenin puanını gösterir. Ek API maliyeti yok. Testler: `engine/test/score.test.ts`.

## v1.16 (13 Kasım 2026): kendi site payı ve kanal/profil adresleri

- Raporda **Kendi site payı**: yapay zekânın gösterdiği kaynakların ne kadarı sizin siteniz/kanalınız, rakip siteleri, üçüncü taraf siteler; motor bazında. Aramasız ölçümde "veri yok (canlı arama gerekir)".
- Kaynak anahtarı (siteKey): YouTube/Instagram/TikTok/X/Facebook/LinkedIn'de alan adı + kanal/profil. youtube.com/@ad, /c/ad, /user/ad aynı kanal; video adresi (watch) kimseye ait sayılmaz. Kaynak egemenliği ve motor kaynakları da bunu kullanır.
- İyileştirme rehberine "kendi sitenizi neredeyse hiç kaynak göstermiyor" maddesi (≥5 kaynak ve %10 altı).
- Günlük sahte müşteri testi (PR #29): canlı sitede yapay zekâsız akış testi, hata olursa issue.
- Site denetiminde llms.txt kontrolü zaten vardı (bilgi düzeyinde).

## Yol haritası (12 Kasım 2026)

1. Motor karşılaştırması ve öneri payı ✅ (v1.13)
2. İyileştirme rehberi ✅ (v1.14)
3. Görünürlük tahmini ✅ (v1.15)
4. Marka algısı: yapay zekânın markaya atfettiği özellikler (premium, ucuz, güvenilir…) ve kaynakları (küçük API maliyeti)
5. TruthGuard: yanlış bilgi, sahte istatistik, kaynak güvenilirliği denetimi (ayrı plan)
6. Sonraki aşama: AI crawler analitiği, AI trafik ve dönüşüm, soru talebi (hacim), içerik iyileştirme, YouTube/Reddit kaynak ağı; global karşılaştırma (Global / yerel / ülkeler arası)

## v1.12 (12 Kasım 2026): hoş geldin e-postası

- 0031: e-postasını doğrulayan yeni kullanıcıya bir kez hoş geldin e-postası (işçi, Resend, report@aisaasavran.com; kayıt dilinde TR/EN): 3 başlangıç adımı, raporda neler var, ücretli paketlerde neler var. 12 Kasım 2026 öncesi kayıtlara gönderilmez.
- Kayıtta arayüz dili kullanıcı bilgisine yazılır.

## v1.11 (12 Kasım 2026): API ve MCP

- 0030: Pro/Business çalışma alanlarında API anahtarı (en fazla 5; yalnız SHA-256 özeti saklanır; sahip/yönetici oluşturur; günlük 1000 istek; iptal edilebilir).
- REST: `GET /api/v1/brands`, `GET /api/v1/brands/<id>` (Bearer aisv_…). MCP: `POST /api/mcp` (durumsuz Streamable HTTP, JSON), araçlar `list_brands`, `get_brand_report`; salt okunur.
- Rapor içeriği paylaşılan raporla aynı ortak fonksiyondan (`brand_report_json`); cevap metni yok.

## v1.10 (12 Kasım 2026): Growth Lab video konuları

- 0029: markaya göre ölçüm aralığı (`measure_every_days`) ve yalnız Growth Lab'de otomatik canlı aralık (`live_every_days`).
- Growth Lab: AI SaaSavran 10 günde bir ücretsiz ölçülür, otomatik canlı (ücretli) ölçümde yer almaz. Video/içerik konuları (banka, akıllı telefon, e-ticaret, havayolu): haftada bir ücretsiz Gemini, ayda bir canlı aramalı (ChatGPT + Claude). Tahmini canlı tur maliyeti ~1,3 $; toplam ücretli tavan (6 $) dolunca durur.
- Bu veriler ana sayfadaki "bugünün ölçümü"ne de girer (marka adları harfle gizli).

## v1.9 (12 Kasım 2026): yapay zekâyla soru önerisi

- 0027 + `/api/suggest`: Sorular sekmesinde "Bana soru öner": ücretsiz Gemini, sektör/şehir/rakip/mevcut sorulara göre 8 markasız soru taslağı; marka/rakip adı geçen, tekrar eden, çok kısa/uzun öneriler atılır. Editör ve üstü; çalışma alanı başına günde 5; ortak Gemini günlük sayacından düşer (440 tavan); AEA/İsviçre/Birleşik Krallık'ta kapalı.

## v1.8 (12 Kasım 2026): ekip

- 0026: ekip daveti (e-postayla; davetli aynı e-postayla giriş yapınca panelde görür ya da `/davet/<anahtar>` bağlantısıyla kabul eder; 14 gün). Roller: sahip, yönetici, düzenleyici, izleyici. Kişi sınırı (sahip dahil): Free ve Plus yalnız sahip, Pro 3, Business 15. Hesap sayfasında Ekip bölümü: rol değiştirme, çıkarma, ayrılma, davet iptali.

## v1.7 (12 Kasım 2026): paylaşılabilir rapor

- 0025: marka sahibi raporu salt okunur bağlantıyla paylaşır (7/30/90 gün, iptal edilebilir, marka başına en fazla 10 etkin bağlantı). `/rapor/<anahtar>` giriş istemez, arama motorlarına kapalı; cevap metni yok (sayılar, rakipler, sorular, kaynak alan adları). "PDF olarak kaydet" logolu yazdırma görünümü.
- `/yonetim` ve `/rapor/*` uygulama adreslerine eklendi (doğrudan açılınca 404 vermez).

## v1.6 (12 Kasım 2026): yönetim ve günlük örnek

- Marka silme: marka adı yazılarak onaylanır; soruları, rakipleri, ürünleri ve ölçümleriyle silinir (harcama kaydı kalır).
- 0023: platform yöneticisi müşterilere ücretsiz paket verir (Müşteriler sayfası, `/yonetim`), süreli ya da süresiz; süre dolunca işçi Free'ye döndürür; Paddle aboneliği olan alana dokunulmaz; her işlem `admin_log`'da.
- 0024: ana sayfada "bugünün ölçümü": her gün Growth Lab'den başka bir gerçek soru (`/api/example`), marka adları harf, cevap metni ve adres yok, markalı soru yok. Gelmezse sabit örnek kalır.

## v1.5 (12 Kasım 2026): güvenlik

- 0022: giriş yapmamış ziyaretçinin çağırabildiği oturumlu SECURITY DEFINER fonksiyonlar kapatıldı (yalnız RLS yardımcıları `is_member`, `is_platform_admin` açık); tetikleyici fonksiyonları API'den çağrılamaz; iki fonksiyona sabit `search_path`.
- Her yayında `scripts/security-audit.mjs`: RLS kapalı tablo, ziyaretçiye açık fonksiyon, sabit olmayan arama yolu varsa yayın durur.
- Entegrasyon testi: ziyaretçi oturumlu fonksiyonları çağıramaz, tablolardan veri alamaz.
- Yedek: henüz yok. Herkese açık depoda (şifreli bile olsa) veritabanı dökümü yayınlanmaz; yöntem sahibiyle kararlaştırılacak.
- Bilinen: Supabase "sızdırılmış şifre koruması" kapalı.

## v1.4 (12 Kasım 2026): Google Shopping

- Ücretli alanlarda kendi ürünleri haftada bir (ya da "Şimdi kontrol et" ile günde en fazla bir) Google Shopping'de aranır (SerpApi, `SERPAPI_KEY`).
- Kayıt: ürünün sırası, fiyatı, satıcısı, kaç ilanda geçtiği, rakip ürünlerin sırası ve ilk 20 ilan (`shopping_checks`, 0020).
- İsteğe bağlı "alışveriş araması" (örn. "erkek koşu ayakkabısı"); boşsa marka + ürün adı aranır. Ülke markanın ülkesinden.
- Bütçe: SerpApi ücretsiz paket ayda 250 arama. İşçi her çalıştırmada en fazla 5 arama yapar; kalan hak 10'un altına inince durur; anahtar/kota hatasında hemen durur; bir ürün 20 saatte en fazla bir kez denenir.
- Sınır: Google'ın resmi Shopping okuma API'si yok; sonuçlar konuma ve kişiye göre değişebilir. ChatGPT'nin uygulama içi alışveriş karuseli hâlâ ölçülmüyor.

## v1.3 (12 Kasım 2026)

- **Fiyatlar (0019):** Plus 29 $, Pro 149 $, Business 449 $ (tipik maliyetin yaklaşık 3 katı). Limitler ve tavanlar aynı. Paddle'da yeni fiyatlar yayın sırasında otomatik oluşur; site ödeme düğmeleri kurulumun ürettiği güncel kataloğu kullanır.
- **Fiyatlar (0060, 21 Kasım):** Plus 60 $, Pro 300 $, Business 876 $ (maliyet×5, Paddle %5 + 0,50 $ dahil). Paddle yeni fiyat kimlikleri `paddle-setup.mjs` ile yayın sırasında oluşur. Site metinleri, SSS, JSON-LD ve karşılaştırma sayfaları aynı rakamlara çekildi; Otterly.AI'nin kendi $29 fiyatı değişmedi.
- **AI alışveriş:** ürün için "nereden satın alınır" (cevaplarda kaynak gösterilen satış siteleri ve kendi sitenin payı) ve site denetiminde ürün yapılandırılmış verisi (Product + Offer) kontrolü. ChatGPT uygulamasındaki ürün karuseli ölçülmüyor.

## Bilinen açık konular

- Bölge kısıtı uygulama içinde markanın ülke koduna dayanır; kullanıcı kodu değiştirebilir. Kesin uygulama için sunucu tarafında kullanıcı ülkesi gerekir.

- Ücretsiz (Gemini) ölçümlerde "önerildi" tespiti kural tabanlıdır; listede geçen marka önerilmiş sayılır (olumsuz ifade yoksa). LLM kontrolü yalnız ücretli ölçümlerdedir ve doğruluğu elle etiketlenmiş cevaplarla henüz ölçülmedi.
- Ürün SKU/varyant ölçümü yok (Perplexity 0043 ve ekip daveti 0026 ile eklendi).
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

## v1.32 (14 Kasım 2026): ilk 5 dakika rehberi ve hemen başlayan ölçüm

- **Başlangıç rehberi:** marka sayfasının üstünde 5 adım (marka → en az 3 soru → rakip → ilk ölçüm → rapor), ilerleme çubuğu, tek dokunuşla hazır soru ekleme. Adımlar gerçek veriden okunur; iki tamamlanmış ölçümden sonra ya da "Rehberi kapat" ile kaybolur. Demo Lab ve Growth Lab'de gösterilmez.
- **Sayfa kendiliğinden güncellenir:** bekleyen ölçüm varken 20 saniyede bir yeniden bakılır (önceden yalnız "Yenile" ile).
- **Ölçümü hemen başlat (`/api/kick`):** kullanıcının sırada ölçümü varsa ölçüm işçisi hemen tetiklenir. `WORKER_DISPATCH_TOKEN` GitHub Secret'ı tanımlı değilse hiçbir şey yapmaz; ölçüm eskisi gibi saatlik sırada (08:17–23:17) işlenir ve rehber bunu açıkça söyler. **Anahtar henüz tanımlı değil.**
- Doğrulama: `engine/test/kick.test.ts` (4 test), `e2e/app.e2e.ts` müşteri akışında rehberin her adımı.

## v1.33 (14 Kasım 2026): bot koruması ve eğitim sayfası

- **Ücretsiz kontrolde bot koruması (Cloudflare Turnstile):** `TURNSTILE_SITE_KEY` ve `TURNSTILE_SECRET` GitHub Secret'ları tanımlıysa form doğrulama kutusu gösterir ve sunucu doğrulamayan isteği 403 ile reddeder. **Anahtarlar henüz tanımlı değil; koruma kapalı, form eskisi gibi çalışıyor.**
- **Eğitim sayfası:** `/tutorials/` ve `/tr/egitim/`: 10 dersin yazılı adımları. YouTube kimliği `web/site/tutorials.mjs` içinde ders başına girilir; kimlik yoksa bağlantı uydurulmaz, yalnız kanal bağlantısı görünür. **19 Kasım:** 10 eğitimin TR+EN videoları (20; Eğitim 9 Ürünler, 10 Paylaşım ve haftalık ölçüm 20 Kasım'da eklendi) YouTube'da liste dışı (sitede oynar; kanal akışında ve aramada görünmez, 19 Kasım akşam kararı); kimlikler `web/src/lib/tutorial-videos.json`'da (`public: true`), eğitim sayfasında ve kayıt sayfasında (Eğitim 2) oynatıcılar görünür.

## v1.34 (14 Kasım 2026): üst menü taşması düzeltildi

- **Hata:** telefonda "masaüstü sitesi" modunda (yaklaşık 980 px) ve dar dizüstünde üst menü yazıları alt satıra kayıyordu ("Pan el", "SaaSavr an"). Üst menü artık yalnız sığdığı genişlikte (1180 px ve üzeri) açılır; altında alt menü kullanılır. Menü yazıları ve logo artık bölünmez. Yönetici için alt menüye "Müşteri" eklendi.
- **Test:** `e2e/layout.e2e.ts` yönetici hesabı ve uzun adlarla 5 genişlikte (360, 412, 980, 1180, 1366) 7 sayfayı dener: menü yazısı bölünmemeli, sayfa yana taşmamalı. Eski stille test kırılıyor, yenisiyle geçiyor.
- **Ürün doğruluğu ve Google Shopping:** ücretli paketlerde (aktif abonelik) zaten açık; "yalnız Growth Lab" notu yanlıştı. `scripts/check-migrations.mjs` artık abone alanında ürün doğruluğu isteğinin sıraya girdiğini de doğruluyor.

## v1.35 (14 Kasım 2026): ajans özellikleri, white-label rapor ve CSV

- **Koddan denetim:** çok marka, ekip rolleri, paylaşım linki, PDF ve trend vardı; white-label, CSV, ajans panosu ve müşteri bazlı erişim yoktu. API yalnız marka listesi veriyordu.
- **White-label (0042):** Business aboneliğindeki alan yöneticisi ajans adı, logo (PNG/JPEG/WebP, en fazla 256 px) ve renk kaydeder (`set_report_branding`, sunucuda doğrulanır; SVG ve dış adres kabul edilmez). Paylaşılan rapor ve PDF bu markayla çıkar, "AI SaaSavran" bağlantısı gizlenir. Abonelik bitince görünmez.
- **CSV:** Rapor sekmesinden Excel'de açılan dosya (UTF-8, Türkçede `;`): motor ve marka bazında tüm ölçümler ve son ölçümün soru bazında sonucu. Formül gibi başlayan hücreler etkisizleştirilir.
- **Testler:** `check-migrations.mjs` (yetki, doğrulama, rapor çıktısı, abonelik bitince gizlenme), `engine/test/csv.test.ts`.
- **Sıradaki ajans işleri:** ajans panosu (tüm markalar tek listede), API'den ölçüm sonuçları, müşteri bazlı erişim (en büyük iş), müşteriye aylık markalı rapor e-postası.

## v1.36 (14 Kasım 2026): ajans panosu ("Genel bakış")

- **Ne:** panoda 2 ve daha çok marka varsa "Genel bakış" listesi çıkar: her markanın son önerilme oranı, bir önceki ölçüme göre değişim (puan) ve durum. Anlamlı düşüş en üstte; üstte tek cümlelik özet ("N markada düşüş var: ...") ve CSV indirme.
- **Durum kuralı** (`engine/src/portfolio.ts`): "Düştü/Yükseldi" yalnız güven aralıkları örtüşmüyorsa; 20'den az cevapta karar yok ("Örnek az"); önceki ölçüm yoksa "İlk ölçüm". Canlı aramalı ve aramasız ölçümler karıştırılmaz: markanın canlı aramalı ölçümü varsa o, yoksa aramasız gösterilir.
- **Testler:** `engine/test/portfolio.test.ts`; `e2e/layout.e2e.ts` artık ikinci uzun adlı markayla "Genel bakış"ın 5 genişlikte taşmadığını da dener.
- **Sıradaki ajans işleri:** API'den ölçüm sonuçları, müşteri bazlı erişim, müşteriye aylık markalı rapor e-postası.

## v1.37 (14 Kasım 2026): Perplexity motoru (hazır, anahtar gelene kadar kapalı)

- **Ne:** `engine/src/providers/perplexity.ts` artık gerçek bir adaptör: Perplexity Agent API (`POST /v1/agent`), web araması her soruda zorunlu, konum ülkeye göre. Cevaptaki alıntılar kaynak sayılır; maliyet cevabın `usage.cost.total_cost` alanından alınır (yoksa fiyat kartından tahmin).
- **Doğrulama durumu:** istek/cevap biçimi resmî API dokümanından okundu; ama **gerçek anahtarla henüz denenmedi**. Birim testi elle yazılmış örnek cevapla çalışır. Model adı ve token fiyatı Agent API "Models" sayfasından teyit edilemedi (`PERPLEXITY_MODEL` ile değişir; fiyat kartı yalnız en kötü durum tavanı için ve bilinçli yüksek).
- **Açma adımları:** (1) Perplexity hesabına kredi + `PERPLEXITY_API_KEY` GitHub Secret, (2) "Perplexity bağlantı testi" akışı (biçim ve model adı gerçek cevapla doğrulanır; en fazla 0,05 $), (3) test geçince canlı sıraya `LIVE_ENGINES=openai,claude,perplexity` (ya da varsayılan sıra) ve kota/maliyet kontrolü. Varsayılan sıra şimdilik değişmedi, bu yüzden hiçbir müşteri ölçümü etkilenmez.
- **Müşteri paketlerinde** Perplexity Claude gibi her soruyu 1 kez sorar; Growth Lab'de 2 tekrar.
- **Sitede hâlâ "Perplexity yok" yazan yerler** (durum sayfası, ürün içi not) motor açılınca güncellenecek.


## v1.38 — Perplexity tüm paketlerde (canlı ölçüm)
- Müşteri yok, bu yüzden Perplexity Plus/Pro/Business paketlerine ve Growth Lab'e birlikte açıldı (`engineAllowed` kapısı kaldırıldı). Her soruyu 1 kez sorar (Claude gibi).
- Migration 0043: aylık motor çağrısı kotaları Plus 620→760, Pro 3600→4200, Business 10800→12600. Harcama tavanları aynı (9 / 50 / 150 $).
- Maliyet (gerçek ölçüm 0,004 $/çağrı): tipik aylık Perplexity Plus 0,51 $, Pro 3,06 $, Business 9,16 $. Kötü durumda 1,73 / 10,4 / 31,2 $. Tipik brüt kâr %63–64, kötü durumda %35–37.
- Siteler, yöntem sayfası, paket metinleri, e-posta ve SSS "ChatGPT, Claude ve Perplexity" diyecek şekilde güncellendi. Eski blog yazıları (o günkü ölçümü anlatır) değişmedi.

- 2026-11-22: Altın paketi eklendi (250 $/ay; 3 marka, marka başı 30 soru, 6 rakip, 2.340 çağrı/ay, ChatGPT + Claude + Perplexity + Gemini; migration 0063). Ücretli aylık tavanlar sahip onayıyla: Gümüş 45 $, Altın 100 $, Platin 250 $, Elmas 750 $. Eski paket adları site ve uygulama metinlerinde Gümüş / Altın / Platin / Elmas (EN: Silver / Gold / Platinum / Diamond) olarak değiştirildi. Altın için Paddle fiyat kimliği henüz yok; satın alma düğmesi yalnız fiyat kimliği tanımlı paketlerde görünür. Ajans paneli (çok müşterili) bu PR kapsamında değil; ayrı tasarım onayı bekliyor.
- 2026-11-22: Altın takım sınırı 1 kişi (migration 0064). Paddle: apply_subscription Altın'ı kabul ediyor; scripts/paddle-setup.mjs yeni fiyatlarla (Gümüş 130, Altın 250, Platin 400, Elmas 1500 $) ve Altın ürünü. Katalog oluşturma için PADDLE_API_KEY gerekir (sahibin işlemi).
- 2026-11-22: Paddle canlı: Gümüş/Altın/Platin/Elmas fiyatları Paddle'da oluştu, site dört paketi satıyor. Sahip kararı: ödemeler canlı kalır (ilk gerçek ödeme uçtan uca test sayılır).
- 2026-11-22 (denetim): "Önerilen" rozeti Gümüş yerine Altın'da (sahibin isteği); Türkçe ekler düzeltildi (Gümüş'ü seç / Gümüş'e geç…); Paddle'daki eski ürün adları (Plus/Pro/Business) paddle-setup ile Gümüş/Platin/Elmas olarak güncellenir; Altın kotası 2.520 (0065, %8 pay); maliyet modeli ve testi güncel 4 paket ve yeni tavanlarla.
- 2026-11-22: Güven puanı (Confidence Score): migration 0066 run_confidence() + paylaşılan raporda "confidence"; puan engine/src/metrics.ts confidenceScore() (örneklem 50 + tekrar tutarlılığı 50; 70+ yüksek, 40–69 orta). Panel raporu ve paylaşılan rapor/PDF'te kart; yöntem sayfası (TR/EN), ana sayfa ve özellik listesi güncellendi. API/MCP çıktısına henüz eklenmedi.
- 2026-11-22: Ajans paneli: markaya müşteri adı (migration 0067, yalnız gruplama, yetki vermez); ajans alanında marka listesi müşteriye göre gruplanır/süzülür; genel bakışta müşteri, güven puanı ve CSV'de müşteri + güven sütunu. Müşteri erişimi: salt okunur paylaşılan rapor bağlantısı. Müşteri kullanıcısının yalnız kendi markasını gördüğü girişli erişim yapılmadı (20+ tablonun RLS kuralı değişir; ayrı iş).
- 2026-11-22: API/MCP rapor çıktısına güven puanı (migration 0068 brand_report_json "confidence"; summarize() panelle aynı formülle score, level, reasons döner).
- 2026-11-22: Google Shopping eşleşme düzeltmesi (airfryer testinde bulundu): model kodu olan üründe yalnız model kodu aranır; "aparat/kalıp/kağıt" aksesuar sayılır; ikinci el ilanlar (letgo, dolap, "2. el", "yenilenmiş") eşleşmez.
