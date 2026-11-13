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
- **AI alışveriş:** ürün için "nereden satın alınır" (cevaplarda kaynak gösterilen satış siteleri ve kendi sitenin payı) ve site denetiminde ürün yapılandırılmış verisi (Product + Offer) kontrolü. ChatGPT uygulamasındaki ürün karuseli ölçülmüyor.

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
