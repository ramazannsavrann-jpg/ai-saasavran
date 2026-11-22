// Rakip karşılaştırma rehberleri (18 Kasım, sahip kararı: gerçek adlarla).
// Kurallar: rakip bilgisi yalnız kendi resmî sayfalarından (18 Kasım 2026'da kontrol edildi) veya kamuya açık şirket bilgisinden;
// AthenaHQ bilgileri athenahq.ai/plans sayfasından 21 Kasım 2026'da kontrol edildi; Profound bilgileri tryprofound.com/pricing sayfasından 22 Kasım 2026'da (sayfanın SSS'si 16 Kasım 2026 güncel); Bloomreach satın alması (16 Kasım 2026) CMSWire haberinden.
// doğrulanamayan fiyat yazılmaz, "resmî sayfada" denir. Kötüleme yok. Kendi ölçümümüz (42 cevapta 0) dürüstçe yazılır.
// Fiyatlar sık değişir: bu dosyayı en geç 3 ayda bir kontrol et (sonraki kontrol: Şubat 2027).

const CHECKED_TR = "18 Kasım 2026";
const CHECKED_EN = "18 November 2026";

import { SELF, selfRows as rows, selfDate } from "./self.mjs";
const selfDateTr = selfDate(true), selfDateEn = selfDate(false);
const selfRows = rows();
const SELFN = SELF.answers;
// Profound'un kendi ölçümümüzdeki önerilme sayısı (self.json'dan; listede yoksa cümle yazılmaz)
const PROF = SELF.brands.find((b) => b[0] === "Profound");

export const COMPARE_TR = [
  {
    slug: "yapay-zeka-gorunurluk-araclari",
    title: "En iyi yapay zekâ görünürlük (GEO) araçları 2026: AI SaaSavran, Peec AI, Otterly.AI, Profound, Semrush, Ahrefs",
    short: "Yapay zekâ görünürlük araçları karşılaştırması",
    description: "Markanızı ChatGPT, Gemini, Claude ve Perplexity'de takip eden araçların karşılaştırması: motorlar, fiyat, ücretsiz paket, Türkçe destek ve kime uygun oldukları.",
    body: `
<p class="lede">Kısa cevap: Markanızın yapay zekâ cevaplarında görünürlüğünü takip etmek için bugün en çok anılan araçlar <b>Peec AI</b>, <b>Otterly.AI</b>, <b>Profound</b>, <b>Semrush AI Visibility Toolkit</b> ve <b>Ahrefs Brand Radar</b>'dır. Büyük bütçeli kurumsal ekipler için Profound, Avrupa'da çok ülkeli takip ve ajanslar için Peec AI, düşük bütçeyle Google AI Overviews ve Copilot takibi için Otterly.AI, zaten Semrush veya Ahrefs kullananlar için kendi modülleri öne çıkar. <b>AI SaaSavran</b> ise Türkçe soruları Türkiye'den canlı aramayla ölçmek, ücretsiz başlamak ve Claude dahil motorları ayrı görmek isteyen işletme ve ajanslar için tasarlandı.</p>
<p>Bu sayfayı bir rakip olarak yazıyoruz, bunu baştan söyleyelim. Bu yüzden rakipler hakkında yalnız kendi resmî sayfalarında yazanları aktarıyoruz (kontrol tarihi: ${CHECKED_TR}). Doğrulayamadığımız rakamı yazmıyoruz. Fiyatlar sık değişir; satın almadan önce her aracın kendi sayfasına bakın.</p>

<h2>Yapay zekâ bu araçlardan hangisini öneriyor? (kendi ölçümümüz)</h2>
<p>${selfDateTr} tarihinde bu kategorideki ${SELF.questions} markasız soruyu ("yapay zekâ cevaplarında marka görünürlüğünü ölçen araçlar hangileri?" gibi) ${SELF.engines.join(", ")} motorlarına Türkiye'den canlı web aramasıyla sorduk. ${SELFN} cevapta araçların önerilme sayıları (iki haftada bir kendiliğinden güncellenir):</p>
<table class="mtable"><thead><tr><th>Araç</th><th>Önerildi</th></tr></thead><tbody>${selfRows}</tbody></table>
<p>${SELF.ours === 0 ? "Yeni bir marka olarak biz hiçbir cevapta önerilmedik." : `Biz ${SELFN} cevabın ${SELF.ours} tanesinde önerildik.`} Bunu saklamıyoruz, çünkü ölçümün neden önemli olduğunu gösteriyor: yapay zekâ, internette hakkında çok yazılmış markaları öneriyor. Haftalık güncel sayılar: <a href="/tr/yapay-zeka-gorunurluk-endeksi/#tr-ai-visibility">Yapay Zekâ Görünürlük Endeksi</a>.</p>

<h2>Araçlar tek tek</h2>
<h3>AI SaaSavran</h3>
<p>Türkiye merkezli, 2026'da erken erişimle açıldı. Ücretsiz paket: 1 marka, 15 soru, ayda 4 ölçüm; Gemini ile, canlı web araması olmadan (model bilgisi) ve bu raporda açıkça yazar. Plus (60 $/ay): 25 soru, 5 rakip, ChatGPT, Claude ve Perplexity canlı web aramasıyla + Gemini, haftalık otomatik ölçüm, yapay zekânın baktığı kaynak siteler, ürünlerde doğruluk kontrolü ve Google Shopping sırası. Pro 300 $ (5 marka, API ve MCP), Business 876 $ (15 marka, ajanslar için). Sorular Türkçe veya İngilizce, Türkiye'den veya başka ülkeden sorulabilir. Sınırlar: Ölçüm haftalıktır, günlük değil. Google AI Overviews, AI Mode ve Microsoft Copilot henüz ölçülmüyor.</p>
<h3>Peec AI</h3>
<p>Berlin merkezli. Marka paketlerinde seçilen yapay zekâ modellerinde günlük takip yapar; ek modeller ek ücretlidir. Ajans paketleri resmî sayfada aylık 245 $'dan başlıyor ve ChatGPT, Perplexity, Google AI Overviews, AI Mode, Gemini gibi modelleri kapsıyor; en büyük ajans paketine Claude gibi API modelleri ekleniyor. Marka paketi fiyatları: peec.ai/pricing. Birçok ülke ve dilde takip isteyen ekipler ve ajanslar için güçlü bir seçenek.</p>
<h3>Otterly.AI</h3>
<p>Avusturya merkezli, 2024'te kuruldu. Resmî fiyat sayfasında en küçük paket Lite: aylık 29 $, 15 soru; Google AI Overviews, ChatGPT, Perplexity ve Microsoft Copilot dahil. Gemini ve Google AI Mode ek ücretle ekleniyor. Standard 189 $ (100 soru), Premium 489 $ (400 soru). Ücretsiz deneme var. Düşük bütçeyle Google AI Overviews ve Copilot takibi isteyenler için uygun.</p>
<h3>Profound</h3>
<p>New York merkezli, kurumsal odaklı. Resmî sayfaya göre 7 günlük ücretsiz deneme (ChatGPT, Gemini, Google AI Overviews; 50 soru) ve teklifle fiyatlanan kurumsal paket (10'a kadar motor) var; self-servis Starter ve Growth paketleri Eylül 2026'dan beri yeni aboneliğe kapalı. İçerik üreten yapay zekâ ajanları da sunuyor. Büyük bütçeli kurumsal ekipler için.</p>
<h3>AthenaHQ</h3>
<p>Y Combinator destekli; Bloomreach 16 Kasım 2026'da satın aldığını duyurdu. Resmî sayfaya göre ücretsiz Essential paketi (300 kredi, 5 motor) ve aylık 295 $'lık Starter paketi var (3.600 kredi, 1 kredi = 1 yapay zekâ cevabı, Claude dahil 11 model). İçerik iyileştirme ajanı sunuyor. Ayrıntı: <a href="/rehber/athenahq-alternatifi/">AthenaHQ alternatifi</a>.</p>
<h3>Semrush AI Visibility Toolkit</h3>
<p>Semrush'ın yapay zekâ görünürlük modülü. Semrush yardım sayfasına göre aylık 99 $, alan adı başına; 25 takip sorusu, ChatGPT ve Google AI gibi motorlar; ücretsiz deneme yok. Zaten Semrush ile SEO yapan ekipler için doğal bir ek.</p>
<h3>Ahrefs Brand Radar</h3>
<p>Ahrefs'in ek modülü. Ahrefs'in kendi soru veritabanında markaların yapay zekâ cevaplarındaki payını gösterir, özel sorular da eklenebilir. Ahrefs ücretli paketiyle birlikte kullanılır; fiyat Ahrefs'in sayfasında. Zaten Ahrefs kullananlar ve geniş pazar araştırması isteyenler için.</p>

<h2>Nasıl seçmeli?</h2>
<ul>
<li><b>Müşterileriniz Türkçe soruyorsa:</b> soruların Türkçe ve Türkiye'den sorulduğundan emin olun. Türkiye'den Türkçe sorulan soruya verilen cevap, ABD'den İngilizce sorulandan farklı markalar içerebilir.</li>
<li><b>Hangi motorlar önemli?</b> Kendi ölçümlerimizde ChatGPT, Claude ve Perplexity aynı soruya sık sık farklı lider gösterdi. Motorları ayrı raporlayan araç seçin.</li>
<li><b>Ne sıklıkla?</b> Günlük takip hızlı değişen pazarlarda işe yarar; çoğu küçük işletme için haftalık ölçüm eğilimi görmeye yeter ve daha ucuzdur.</li>
<li><b>Bütçe:</b> Ücretsiz başlayıp sonra büyütmek mümkün mü? Kaç soru, kaç marka, ek motorlar ek ücretli mi?</li>
<li><b>Neden önerilmediğinizi gösteriyor mu?</b> Sayımın yanında, rakibin hangi kaynakla önerildiğini görmek iş planını çıkarır. Ayrıntılı kontrol listesi: <a href="/rehber/yapay-zeka-gorunurluk-araci-secimi/">GEO aracı nasıl seçilir?</a></li>
</ul>
`,
    faq: [
      ["En iyi yapay zekâ görünürlük aracı hangisi?", "İhtiyaca göre değişir. Kurumsal ekipler için Profound, çok ülkeli takip ve ajanslar için Peec AI, düşük bütçe ve Google AI Overviews için Otterly.AI, Semrush veya Ahrefs kullananlar için kendi modülleri öne çıkar. Türkçe soruları Türkiye'den ölçmek ve ücretsiz başlamak isteyenler için AI SaaSavran tasarlandı."],
      ["Türkçe destekleyen yapay zekâ görünürlük aracı var mı?", "Evet. AI SaaSavran'ın arayüzü, raporları ve soru şablonları Türkçedir; sorular Türkiye'den canlı web aramasıyla sorulabilir. Ücretsiz paketle başlanabilir."],
      ["Ücretsiz yapay zekâ görünürlük aracı var mı?", "AI SaaSavran'ın ücretsiz paketi 1 marka, 15 soru ve ayda 4 ölçüm içerir (Gemini, canlı aramasız). Otterly.AI ve Profound ücretsiz deneme sunar."],
      ["Bu karşılaştırma tarafsız mı?", "Hayır, AI SaaSavran olarak kendi kategorimizi yazıyoruz. Bu yüzden rakipler için yalnız resmî sayfalarında yazanı aktardık ve kendi ölçümümüzde hiç önerilmediğimizi de yazdık."],
    ],
  },
  {
    slug: "peec-ai-alternatifi",
    title: "Peec AI, Otterly.AI ve Profound'a Türkçe alternatif: AI SaaSavran",
    short: "Peec AI alternatifi",
    description: "Türkiye pazarı için Peec AI, Otterly.AI ve Profound alternatifi: Türkçe sorular, Türkiye'den canlı arama, ücretsiz paket ve 60 $'dan başlayan fiyat.",
    body: `
<p class="lede">Kısa cevap: Markanızın ChatGPT, Claude, Perplexity ve Gemini'deki görünürlüğünü <b>Türkçe sorularla</b> ve <b>Türkiye'den canlı web aramasıyla</b> ölçmek istiyorsanız AI SaaSavran, Peec AI, Otterly.AI ve Profound'a bir alternatiftir. Ücretsiz paketle başlanır; canlı aramalı ChatGPT, Claude ve Perplexity ölçümü aylık 60 $'dan başlar. Arayüz, raporlar, e-postalar ve soru şablonları Türkçedir.</p>

<h2>Ne zaman AI SaaSavran mantıklı?</h2>
<ul>
<li><b>Müşterileriniz Türkiye'de ve Türkçe soruyorsa.</b> Yapay zekâ cevabı sorunun diline ve sorulduğu ülkeye göre değişir. Türkçe sorular ve Türkiye konumu ayarlanır.</li>
<li><b>Claude da önemliyse.</b> Ücretli paketlerde ChatGPT, Claude ve Perplexity canlı web aramasıyla ölçülür ve her motor ayrı raporlanır.</li>
<li><b>Bütçeniz küçükse.</b> Ücretsiz paket (1 marka, 15 soru, ayda 4 ölçüm) ve Plus 60 $/ay. Ajanslar için Business 876 $/ay ile 15 marka.</li>
<li><b>Ürün satıyorsanız.</b> Yapay zekânın ürününüz hakkında söylediği fiyat ve özellikler resmî bilgilerle karşılaştırılır; haftalık Google Shopping sırası gösterilir.</li>
<li><b>"Neden rakip?" sorusuna kanıt istiyorsanız.</b> Kaybettiğiniz sorular, yerinize önerilen rakip ve yapay zekânın baktığı kaynak siteler raporda yer alır.</li>
</ul>

<h2>Ne zaman başka bir araç daha uygun?</h2>
<ul>
<li><b>Günlük takip</b> gerekiyorsa: AI SaaSavran haftalık ölçer; Peec AI, Otterly.AI ve Profound günlük takip sunar.</li>
<li><b>Google AI Overviews, AI Mode veya Microsoft Copilot</b> şart ise: bunları henüz ölçmüyoruz. Otterly.AI ve Peec AI bunları kapsıyor.</li>
<li><b>Kurumsal ölçekte</b> çok motor, güvenlik sertifikası ve içerik ajanları istiyorsanız: Profound kurumsal ekipler için tasarlandı.</li>
</ul>

<h2>Dürüst bir not</h2>
<p>AI SaaSavran yeni bir ürün. İlk kez kendi kategorimizde ölçüm yaptığımızda (18 Kasım 2026, 42 canlı aramalı cevap) yapay zekâ Peec AI'yi 33, Otterly.AI'yi 32, Semrush'ı 32, Profound'u 23 cevapta önerdi; bizi hiç önermedi. Bu sayıyı ana sayfamızda da yayımlıyoruz ve her iki haftada bir yeniden ölçüyoruz. Tüm araçların karşılaştırması: <a href="/rehber/yapay-zeka-gorunurluk-araclari/">yapay zekâ görünürlük araçları</a>.</p>

<h2>Nasıl denenir?</h2>
<ol>
<li><a href="/tr/kontrol/">Ücretsiz kontrol</a> ile üye olmadan işletmenizin Gemini'de geçip geçmediğine bakın.</li>
<li>Ücretsiz hesap açın, markanızı ve 3 rakibinizi ekleyin; sektörünüze hazır Türkçe soru şablonlarından seçin.</li>
<li>İlk ölçümü başlatın; rapor motor bazında, anılma, önerilme ve kaynak ayrımıyla gelir.</li>
<li>Canlı aramalı ChatGPT, Claude ve Perplexity için Plus pakete geçin. 14 gün içinde iptal ederseniz ücret iade edilir.</li>
</ol>
`,
    faq: [
      ["Peec AI'nin Türkçe alternatifi var mı?", "Evet. AI SaaSavran Türkçe arayüz ve raporlarla, Türkçe soruları Türkiye'den canlı web aramasıyla ChatGPT, Claude ve Perplexity'de ölçer; ücretsiz paketle başlanır, ücretli paketler aylık 60 $'dan başlar."],
      ["AI SaaSavran ile Peec AI arasındaki fark nedir?", "AI SaaSavran Türkiye merkezlidir, Türkçe sorulara ve Türkiye'den canlı aramaya odaklanır, ücretsiz paketi vardır ve haftalık ölçer. Peec AI Berlin merkezlidir, günlük takip yapar ve çok ülkeli takipte güçlüdür."],
      ["Otterly.AI yerine ne kullanılabilir?", "Türkçe sorular, Claude ölçümü ve ürün bilgisi doğruluğu kontrolü önemliyse AI SaaSavran. Google AI Overviews ve Copilot takibi önemliyse Otterly.AI daha uygundur."],
    ],
  },
  {
    slug: "athenahq-alternatifi",
    title: "AthenaHQ alternatifi: Türkçe sorular ve küçük bütçe için AI SaaSavran",
    short: "AthenaHQ alternatifi",
    description: "AthenaHQ ile AI SaaSavran karşılaştırması: motorlar, fiyat, ücretsiz paket, Türkçe sorular ve kime hangisinin uygun olduğu. Rakip bilgisi yalnız resmî sayfadan.",
    body: `
<p class="lede">Kısa cevap: <b>AthenaHQ</b>, çok sayıda yapay zekâ motorunu (11 model) takip eden ve içerik iyileştirme ajanları sunan bir yapay zekâ görünürlük (AEO/GEO) platformudur; ücretli paketi resmî sayfasında aylık 295 $'dan başlar. Markanızı <b>Türkçe sorularla</b>, <b>Türkiye'den canlı web aramasıyla</b> ve daha küçük bir bütçeyle ölçmek istiyorsanız <b>AI SaaSavran</b> bir alternatiftir: ücretsiz paketle başlanır, canlı aramalı ChatGPT, Claude ve Perplexity ölçümü aylık 60 $'dır.</p>
<p>Bu sayfayı bir rakip olarak yazıyoruz. AthenaHQ hakkında yalnız kendi resmî fiyat sayfasında yazanları ve kamuya açık şirket haberlerini aktarıyoruz (kontrol tarihi: 21 Kasım 2026). Fiyatlar değişebilir; satın almadan önce athenahq.ai/plans sayfasına bakın.</p>

<h2>AthenaHQ hakkında bilinenler</h2>
<ul>
<li><b>Sahiplik:</b> Bloomreach, 16 Kasım 2026'da AthenaHQ'yu satın aldığını duyurdu. AthenaHQ, Bloomreach'in Loomi yapay zekâ ürünüyle birleştirilecek.</li>
<li><b>Ücretsiz paket (Essential):</b> 300 kredi; ChatGPT, Perplexity, Google AI Overviews, Gemini ve Copilot.</li>
<li><b>Starter:</b> aylık 295 $, ayda 3.600 kredi. Resmî sayfaya göre 1 kredi = 1 yapay zekâ cevabı. Claude, Google AI Mode, Grok, DeepSeek, Meta AI ve Mistral dahil 11 model. API ve ek kredi ayrıca ücretli.</li>
<li><b>Ülke ve dil:</b> Starter paketinde tek ülke ve tek dil; çok ülke ve çok dil kurumsal (Enterprise) pakette, fiyat teklifle.</li>
<li><b>Ek özellikler:</b> içerik iyileştirme ajanı, sayfa içi ve dışı öneriler; kurumsal pakette kaynak gösterilme tahmini (Athena Citation Engine) ve SSO.</li>
</ul>

<h2>Yan yana</h2>
<table class="mtable"><thead><tr><th></th><th>AI SaaSavran</th><th>AthenaHQ</th></tr></thead><tbody>
<tr><td>Ücretsiz paket</td><td>1 marka, 15 soru, ayda 4 ölçüm (Gemini, canlı aramasız)</td><td>300 kredi, 5 motor</td></tr>
<tr><td>İlk ücretli paket</td><td>Plus, 60 $/ay</td><td>Starter, 295 $/ay</td></tr>
<tr><td>Motorlar (ücretli)</td><td>ChatGPT, Claude, Perplexity (canlı arama) + Gemini</td><td>11 model (Google AI Overviews, AI Mode, Copilot dahil)</td></tr>
<tr><td>Ölçüm sıklığı</td><td>Haftalık</td><td>Resmî sayfada yazmıyor</td></tr>
<tr><td>Türkçe arayüz ve rapor</td><td>Var</td><td>Resmî sayfada yazmıyor</td></tr>
<tr><td>Ajans paketi</td><td>Business 876 $/ay, 15 marka</td><td>Enterprise, teklifle</td></tr>
</tbody></table>

<h2>Ne zaman AI SaaSavran mantıklı?</h2>
<ul>
<li><b>Müşterileriniz Türkiye'de ve Türkçe soruyorsa.</b> Sorular Türkçe ve Türkiye konumundan sorulur; arayüz, rapor ve e-postalar Türkçedir.</li>
<li><b>Bütçeniz küçükse.</b> Ücretsiz başlanır; canlı aramalı ChatGPT, Claude ve Perplexity 60 $/ay.</li>
<li><b>Ürün satıyorsanız.</b> Yapay zekânın ürününüz hakkında söylediği fiyat ve özellikler resmî bilgilerle karşılaştırılır.</li>
<li><b>"Neden rakip?" sorusuna kanıt istiyorsanız.</b> Kaybettiğiniz sorular, yerinize önerilen rakip ve yapay zekânın baktığı kaynak siteler raporda yer alır.</li>
</ul>

<h2>Ne zaman AthenaHQ daha uygun?</h2>
<ul>
<li><b>Çok sayıda motor</b> şart ise: Google AI Overviews, AI Mode, Copilot, Grok gibi motorları biz henüz ölçmüyoruz.</li>
<li><b>Ölçümün yanında içerik ajanı</b> istiyorsanız: AthenaHQ içerik iyileştirme ajanı sunuyor.</li>
<li><b>Zaten Bloomreach kullanıyorsanız:</b> satın almadan sonra iki ürünün birlikte çalışması bekleniyor.</li>
</ul>

<h2>Nasıl denenir?</h2>
<ol>
<li><a href="/tr/kontrol/">Ücretsiz kontrol</a> ile üye olmadan işletmenizin Gemini'de geçip geçmediğine bakın.</li>
<li>Ücretsiz hesap açın, markanızı ve 3 rakibinizi ekleyin; sektörünüze hazır Türkçe soru şablonlarından seçin.</li>
<li>Canlı aramalı ChatGPT, Claude ve Perplexity için Plus pakete geçin. 14 gün içinde iptal ederseniz ücret iade edilir.</li>
</ol>
<p>Diğer araçlarla karşılaştırma: <a href="/rehber/yapay-zeka-gorunurluk-araclari/">yapay zekâ görünürlük araçları</a>.</p>
`,
    faq: [
      ["AthenaHQ'nun Türkçe alternatifi var mı?", "Evet. AI SaaSavran Türkçe arayüz ve raporlarla, Türkçe soruları Türkiye'den canlı web aramasıyla ChatGPT, Claude ve Perplexity'de ölçer. Ücretsiz paketle başlanır, ücretli paket aylık 60 $'dır."],
      ["AthenaHQ ne kadar?", "Resmî fiyat sayfasına göre (21 Kasım 2026) ücretsiz Essential paketi var; Starter aylık 295 $ ve ayda 3.600 kredi içerir (1 kredi = 1 yapay zekâ cevabı). Kurumsal paket teklifle fiyatlanır."],
      ["AthenaHQ'yu kim satın aldı?", "Bloomreach, 16 Kasım 2026'da AthenaHQ'yu satın aldığını duyurdu."],
      ["AI SaaSavran ile AthenaHQ arasındaki fark nedir?", "AI SaaSavran Türkiye merkezlidir, Türkçe sorulara ve küçük bütçeye odaklanır ve haftalık ölçer. AthenaHQ daha çok motoru (11 model) takip eder ve içerik ajanları sunar; ücretli paketi 295 $'dan başlar."],
    ],
  },
  {
    slug: "profound-alternatifi",
    title: "Profound alternatifleri: uygun fiyatlı 5 seçenek (2026)",
    short: "Profound alternatifleri",
    description: "Profound'un uygun fiyatlı alternatifleri: AI SaaSavran, Otterly.AI, Peec AI, AthenaHQ ve Semrush. Fiyatlar resmî sayfalardan, kontrol tarihiyle.",
    body: `
<p class="lede">Kısa cevap: <b>Profound</b> Eylül 2026'da 399 $ ve 499 $'lık self-servis Starter ve Growth paketlerini yeni abonelere kapattı; resmî fiyat sayfasında yalnız teklifle fiyatlanan kurumsal (Enterprise) paket kaldı. Daha uygun fiyatlı alternatifler: ücretsiz paketi olan ve canlı aramalı ChatGPT, Claude ve Perplexity ölçümü aylık 60 $ olan <b>AI SaaSavran</b>; aylık 29 $'dan başlayan <b>Otterly.AI</b>; ücretsiz paketi ve aylık 295 $'lık Starter'ı olan <b>AthenaHQ</b>; alan adı başına aylık 99 $ olan <b>Semrush AI Visibility Toolkit</b>; ajans paketleri aylık 245 $'dan başlayan <b>Peec AI</b>.</p>
<p>Bu sayfayı bir rakip olarak yazıyoruz. Profound ve diğer araçlar hakkında yalnız kendi resmî sayfalarında yazanları aktarıyoruz; her fiyatın yanında kontrol tarihini veriyoruz. Fiyatlar değişebilir; satın almadan önce aracın kendi sayfasına bakın.</p>

<h2>Profound hakkında bilinenler (tryprofound.com/pricing, 22 Kasım 2026)</h2>
<ul>
<li><b>Paket:</b> yalnız Enterprise; fiyat "Custom" (teklifle). Satın almak için demo istenir.</li>
<li><b>Eski paketler:</b> resmî SSS'ye göre Starter ve Growth paketleri Eylül 2026'da kaldırıldı; 399 $ ve 499 $ fiyatları yeni abonelikte geçerli değil.</li>
<li><b>Motorlar:</b> en fazla 10 motor; ChatGPT, Perplexity, Google AI Mode, Gemini, Google AI Overviews, Claude, DeepSeek, Qwen ve diğerleri.</li>
<li><b>Sıklık ve kapsam:</b> günlük takip; soru sayısı, dil ve bölge pakete göre belirleniyor. API, SSO ve SOC 2 uyumu var; içerik üreten yapay zekâ ajanları da sunuyor.</li>
</ul>
<p>Yani Profound büyük bütçeli kurumsal ekipler için tasarlanmış bir ürün. Küçük işletme, tek marka veya küçük ajanssanız aşağıdaki seçenekler fiyat olarak daha erişilebilir.</p>

<h2>Uygun fiyatlı alternatifler</h2>
<table class="mtable"><thead><tr><th>Araç</th><th>Ücretsiz</th><th>İlk ücretli paket</th><th>Kontrol</th></tr></thead><tbody>
<tr><td>AI SaaSavran</td><td>Var (1 marka, 15 soru, Gemini)</td><td>Plus, 60 $/ay</td><td>Kendi fiyatımız</td></tr>
<tr><td>Otterly.AI</td><td>Ücretsiz deneme</td><td>Lite, 29 $/ay (15 soru)</td><td>18 Kasım 2026</td></tr>
<tr><td>Semrush AI Visibility Toolkit</td><td>Deneme yok</td><td>99 $/ay, alan adı başına</td><td>18 Kasım 2026</td></tr>
<tr><td>AthenaHQ</td><td>Var (Essential, 300 kredi)</td><td>Starter, 295 $/ay</td><td>21 Kasım 2026</td></tr>
<tr><td>Peec AI</td><td>Resmî sayfaya bakın</td><td>Ajans paketleri 245 $/ay'dan</td><td>18 Kasım 2026</td></tr>
</tbody></table>

<h3>AI SaaSavran</h3>
<p>Türkiye merkezli. Ücretsiz paketle başlanır. Plus (60 $/ay): 25 soru, 5 rakip, ChatGPT, Claude ve Perplexity canlı web aramasıyla + Gemini, haftalık otomatik ölçüm, yapay zekânın baktığı kaynak siteler ve ürünlerde doğruluk kontrolü. Sorular Türkçe veya İngilizce, Türkiye'den veya başka ülkeden sorulur. Ajanslar için Business (876 $/ay, 15 marka). Sınırlar: ölçüm haftalıktır; Google AI Overviews, AI Mode ve Copilot henüz ölçülmüyor.</p>
<h3>Otterly.AI</h3>
<p>En düşük başlangıç fiyatı: Lite aylık 29 $, 15 soru; Google AI Overviews, ChatGPT, Perplexity ve Microsoft Copilot dahil. Gemini ve Google AI Mode ek ücretli. Google AI Overviews ve Copilot takibi önemliyse uygun.</p>
<h3>Semrush AI Visibility Toolkit</h3>
<p>Semrush yardım sayfasına göre aylık 99 $, alan adı başına, 25 takip sorusu. Zaten Semrush ile SEO yapan ekipler için doğal bir ek.</p>
<h3>AthenaHQ</h3>
<p>Ücretsiz Essential paketi (300 kredi, 5 motor) ve aylık 295 $'lık Starter (3.600 kredi, Claude dahil 11 model). Bloomreach 16 Kasım 2026'da satın aldığını duyurdu. Ayrıntı: <a href="/rehber/athenahq-alternatifi/">AthenaHQ alternatifi</a>.</p>
<h3>Peec AI</h3>
<p>Berlin merkezli; günlük takip, birçok ülke ve dil. Ajans paketleri aylık 245 $'dan başlıyor; marka paketi fiyatları peec.ai/pricing sayfasında. Ayrıntı: <a href="/rehber/peec-ai-alternatifi/">Peec AI alternatifi</a>.</p>

<h2>Yapay zekâ Profound'u ne kadar öneriyor? (kendi ölçümümüz)</h2>
<p>${selfDateTr} tarihinde bu kategorideki ${SELF.questions} markasız soruyu ${SELF.engines.join(", ")} motorlarına Türkiye'den canlı web aramasıyla sorduk. ${PROF ? `${SELFN} cevabın ${PROF[1]} tanesinde Profound önerildi.` : `Profound bu ölçümde ilk beşte yer almadı.`} ${SELF.ours === 0 ? "Biz yeni bir marka olarak hiçbir cevapta önerilmedik." : `Biz ${SELFN} cevabın ${SELF.ours} tanesinde önerildik.`} Tüm sayılar: <a href="/rehber/yapay-zeka-gorunurluk-araclari/">yapay zekâ görünürlük araçları</a>.</p>

<h2>Nasıl seçmeli?</h2>
<ul>
<li><b>Bütçe:</b> Ücretsiz başlamak istiyorsanız AI SaaSavran veya AthenaHQ'nun ücretsiz paketi; en düşük ücretli giriş Otterly.AI.</li>
<li><b>Müşterileriniz Türkçe soruyorsa:</b> soruların Türkçe ve Türkiye'den sorulduğu bir araç seçin; cevaplardaki markalar ülkeye ve dile göre değişebiliyor.</li>
<li><b>Motorlar:</b> Google AI Overviews ve Copilot şartsa Otterly.AI; Claude'u ayrı görmek istiyorsanız AI SaaSavran veya AthenaHQ.</li>
<li><b>Sıklık:</b> günlük takip gerekiyorsa Peec AI veya Otterly.AI; çoğu küçük işletme için haftalık ölçüm eğilimi görmeye yeter.</li>
</ul>
<p>Ayrıntılı kontrol listesi: <a href="/rehber/yapay-zeka-gorunurluk-araci-secimi/">GEO aracı nasıl seçilir?</a> · Üye olmadan deneyin: <a href="/tr/kontrol/">ücretsiz kontrol</a>.</p>
`,
    faq: [
      ["Profound'un uygun fiyatlı alternatifleri neler?", "AI SaaSavran (ücretsiz paket, canlı aramalı ChatGPT, Claude ve Perplexity 60 $/ay), Otterly.AI (29 $/ay'dan), Semrush AI Visibility Toolkit (99 $/ay, alan adı başına), AthenaHQ (ücretsiz paket, Starter 295 $/ay) ve Peec AI (ajans paketleri 245 $/ay'dan). Fiyatlar 18–22 Kasım 2026'da resmî sayfalardan kontrol edildi."],
      ["Profound ne kadar?", "Resmî fiyat sayfasına göre (22 Kasım 2026) Profound yalnız teklifle fiyatlanan Enterprise paketi sunuyor. 399 $ ve 499 $'lık Starter ve Growth paketleri Eylül 2026'da yeni abonelere kapatıldı."],
      ["Profound'un ücretsiz alternatifi var mı?", "Evet. AI SaaSavran'ın ücretsiz paketi 1 marka, 15 soru ve ayda 4 ölçüm içerir (Gemini, canlı aramasız). AthenaHQ'nun ücretsiz Essential paketi 300 kredi içerir."],
      ["Profound'un Türkçe alternatifi var mı?", "AI SaaSavran Türkçe arayüz ve raporlarla, Türkçe soruları Türkiye'den canlı web aramasıyla ChatGPT, Claude ve Perplexity'de ölçer."],
    ],
  },
];

export const COMPARE_EN = [
  {
    slug: "ai-visibility-tools-compared",
    tr: "yapay-zeka-gorunurluk-araclari",
    title: "Best AI visibility (GEO) tools in 2026: AI SaaSavran, Peec AI, Otterly.AI, Profound, Semrush, Ahrefs",
    short: "AI visibility tools compared",
    description: "A comparison of tools that track your brand in ChatGPT, Gemini, Claude and Perplexity: engines, pricing, free plans, language support and who each one fits.",
    body: `
<p class="lede">Short answer: the tools most often named for tracking brand visibility in AI answers are <b>Peec AI</b>, <b>Otterly.AI</b>, <b>Profound</b>, <b>Semrush AI Visibility Toolkit</b> and <b>Ahrefs Brand Radar</b>. Profound fits large enterprise teams, Peec AI multi-country tracking and agencies, Otterly.AI low-budget tracking of Google AI Overviews and Copilot, and the Semrush and Ahrefs modules teams already on those suites. <b>AI SaaSavran</b> is built for businesses and agencies that want to start free, see ChatGPT, Claude and Perplexity separately, and measure questions in Turkish or English from the country their customers are in.</p>
<p>We are a competitor in this category, so we say it up front. For other tools we only repeat what their own official pages say (checked ${CHECKED_EN}) and leave out figures we could not verify. Prices change often; check each vendor's page before you buy.</p>

<h2>Which of these tools does AI recommend? (our own measurement)</h2>
<p>On ${selfDateEn} we asked ${SELF.engines.join(", ")} ${SELF.questions} unbranded questions in this category (such as "which tools measure brand visibility in AI answers?") with live web search from Turkey. Recommendations in ${SELFN} answers (updated automatically every two weeks):</p>
<table class="mtable"><thead><tr><th>Tool</th><th>Recommended</th></tr></thead><tbody>${selfRows}</tbody></table>
<p>${SELF.ours === 0 ? "As a new brand, we were recommended in none." : `We were recommended in ${SELF.ours} of ${SELFN}.`} We publish that because it shows why measurement matters: AI recommends brands that are widely written about. Weekly numbers: <a href="/ai-visibility-index/#tr-ai-visibility">AI Visibility Index</a>.</p>

<h2>The tools one by one</h2>
<h3>AI SaaSavran</h3>
<p>Based in Turkey, launched in 2026 (early access). Free plan: 1 brand, 15 questions, 4 measurements a month, using Gemini without live web search (model knowledge), clearly labelled. Plus ($60/month): 25 questions, 5 competitors, ChatGPT, Claude and Perplexity with live web search plus Gemini, weekly automatic measurement, cited sources, product accuracy checks and Google Shopping position. Pro $300 (5 brands, API and MCP), Business $876 (15 brands, for agencies). Questions in Turkish or English, asked from Turkey or another country. Limits: measurement is weekly, not daily; Google AI Overviews, AI Mode and Microsoft Copilot are not measured yet.</p>
<h3>Peec AI</h3>
<p>Based in Berlin. Brand plans track selected AI models daily, with extra models for an extra fee. Agency plans start at $245 a month on the official page and cover models such as ChatGPT, Perplexity, Google AI Overviews, AI Mode and Gemini; the largest agency plan adds API models such as Claude. Brand plan prices: peec.ai/pricing. A strong choice for teams and agencies tracking many countries and languages.</p>
<h3>Otterly.AI</h3>
<p>Based in Austria, founded in 2024. Its official pricing page lists Lite at $29 a month with 15 prompts, covering Google AI Overviews, ChatGPT, Perplexity and Microsoft Copilot; Gemini and Google AI Mode are paid add-ons. Standard is $189 (100 prompts) and Premium $489 (400 prompts). Free trial available. A good fit for low-budget tracking of Google AI Overviews and Copilot.</p>
<h3>Profound</h3>
<p>Based in New York, enterprise-focused. Its official page lists a 7-day free trial (ChatGPT, Gemini, Google AI Overviews; 50 prompts) and a custom-priced Enterprise plan (up to 10 engines); the self-serve Starter and Growth plans closed to new subscriptions in September 2026. It also offers AI agents for content work. Built for well-funded enterprise teams.</p>
<h3>AthenaHQ</h3>
<p>Y Combinator-backed; Bloomreach announced on 16 November 2026 that it acquired AthenaHQ. Per its official page: a free Essential plan (300 credits, 5 engines) and a $295-a-month Starter plan (3,600 credits, 1 credit = 1 AI response, 11 models including Claude). It offers a content optimization agent. More: <a href="/guides/athenahq-alternative/">AthenaHQ alternative</a>.</p>
<h3>Semrush AI Visibility Toolkit</h3>
<p>Semrush's AI visibility module. Per Semrush's help page: $99 a month per domain, 25 tracked prompts, engines such as ChatGPT and Google AI, no free trial. A natural add-on for teams already doing SEO in Semrush.</p>
<h3>Ahrefs Brand Radar</h3>
<p>An Ahrefs add-on that shows brands' share of AI answers across Ahrefs' own prompt database, with custom prompts. Used alongside a paid Ahrefs plan; pricing on Ahrefs' site. For existing Ahrefs users and broad market research.</p>

<h2>How to choose</h2>
<ul>
<li><b>Language and country:</b> make sure questions are asked in your customers' language and from their country. Answers to a Turkish question asked from Turkey can name different brands than an English question asked from the US.</li>
<li><b>Engines:</b> in our measurements ChatGPT, Claude and Perplexity often named a different leader for the same question. Pick a tool that reports engines separately.</li>
<li><b>Frequency:</b> daily tracking helps in fast-moving markets; for most small businesses weekly measurement shows the trend at lower cost.</li>
<li><b>Budget:</b> can you start free and grow? How many questions and brands, and are extra engines paid add-ons?</li>
<li><b>Does it explain why you lose?</b> Beyond counts, seeing which source made the AI pick a competitor gives you a work plan. Full checklist: <a href="/guides/choose-ai-visibility-tool/">how to choose an AI visibility tool</a>.</li>
</ul>
`,
    faq: [
      ["What is the best AI visibility tool?", "It depends on the need. Profound for enterprise teams, Peec AI for multi-country tracking and agencies, Otterly.AI for low budgets and Google AI Overviews, the Semrush and Ahrefs modules for teams already on those suites. AI SaaSavran is built for starting free and measuring questions in Turkish or English from your customers' country."],
      ["Is there a free AI visibility tracker?", "AI SaaSavran's free plan includes 1 brand, 15 questions and 4 measurements a month (Gemini, no live search). Otterly.AI and Profound offer free trials."],
      ["Is this comparison neutral?", "No. We are AI SaaSavran writing about our own category. That is why we only repeat what competitors' official pages say and also publish that AI did not recommend us in our own measurement."],
    ],
  },
  {
    slug: "peec-ai-alternative",
    tr: "peec-ai-alternatifi",
    title: "A Peec AI, Otterly.AI and Profound alternative for Turkish and English questions: AI SaaSavran",
    short: "Peec AI alternative",
    description: "An alternative to Peec AI, Otterly.AI and Profound: a free plan, live-search ChatGPT, Claude and Perplexity from $60 a month, and questions in Turkish or English.",
    body: `
<p class="lede">Short answer: if you want to measure your brand in ChatGPT, Claude, Perplexity and Gemini on a small budget, or need questions asked <b>in Turkish from Turkey</b>, AI SaaSavran is an alternative to Peec AI, Otterly.AI and Profound. You can start on a free plan; live-search ChatGPT, Claude and Perplexity start at $60 a month.</p>

<h2>When AI SaaSavran makes sense</h2>
<ul>
<li><b>Your customers are in Turkey, or you sell into Turkey.</b> AI answers change with the language and country of the question. Turkish questions and a Turkish search location are built in, alongside English and other countries.</li>
<li><b>Claude matters to you.</b> Paid plans measure ChatGPT, Claude and Perplexity with live web search and report each engine separately.</li>
<li><b>Small budget.</b> Free plan (1 brand, 15 questions, 4 measurements a month) and Plus at $60 a month. Agencies: Business at $876 a month for 15 brands.</li>
<li><b>You sell products.</b> What the AI says about your product's price and specifications is checked against official data, with weekly Google Shopping position.</li>
<li><b>You need evidence for "why the competitor?".</b> Reports show the questions you lose, the competitor named instead and the sources the AI relied on.</li>
</ul>

<h2>When another tool fits better</h2>
<ul>
<li><b>Daily tracking:</b> AI SaaSavran measures weekly; Peec AI, Otterly.AI and Profound track daily.</li>
<li><b>Google AI Overviews, AI Mode or Microsoft Copilot:</b> we don't measure these yet. Otterly.AI and Peec AI cover them.</li>
<li><b>Enterprise scale</b> with many engines, security certifications and content agents: Profound is built for that.</li>
</ul>

<h2>An honest note</h2>
<p>AI SaaSavran is a new product. When we first measured our own category (18 November 2026, 42 live-search answers), AI recommended Peec AI in 33, Otterly.AI and Semrush in 32 each and Profound in 23; it did not recommend us once. We publish this on our home page and re-measure every two weeks. All tools compared: <a href="/guides/ai-visibility-tools-compared/">AI visibility tools compared</a>.</p>

<h2>How to try it</h2>
<ol>
<li>Run the <a href="/check/">free check</a> without signing up to see whether Gemini mentions your business.</li>
<li>Create a free account, add your brand and 3 competitors, and pick ready-made questions for your sector.</li>
<li>Run the first measurement; the report comes per engine, with mentions, recommendations and sources separated.</li>
<li>Upgrade to Plus for live-search ChatGPT, Claude and Perplexity. Cancel within 14 days for a refund.</li>
</ol>
`,
    faq: [
      ["What is a cheaper alternative to Peec AI?", "AI SaaSavran has a free plan, and its paid plans with live-search ChatGPT, Claude and Perplexity start at $60 a month. Otterly.AI's Lite plan is $29 a month and covers Google AI Overviews, ChatGPT, Perplexity and Copilot."],
      ["How is AI SaaSavran different from Peec AI?", "AI SaaSavran is based in Turkey, supports Turkish and English questions asked from Turkey or other countries, has a free plan and measures weekly. Peec AI is based in Berlin, tracks daily and is strong at multi-country tracking."],
      ["Does AI SaaSavran track Claude?", "Yes. Paid plans measure Claude with live web search, alongside ChatGPT and Perplexity, and report each engine separately."],
    ],
  },
  {
    slug: "athenahq-alternative",
    tr: "athenahq-alternatifi",
    title: "An AthenaHQ alternative for small budgets and Turkish or English questions: AI SaaSavran",
    short: "AthenaHQ alternative",
    description: "AthenaHQ vs AI SaaSavran: engines, price, free plan, Turkish and English questions, and who each fits. Competitor facts from AthenaHQ's official pages only.",
    body: `
<p class="lede">Short answer: <b>AthenaHQ</b> is an AI visibility (AEO/GEO) platform that tracks many AI engines (11 models) and offers content optimization agents; its paid plan starts at $295 a month on its official pricing page. If you want to measure your brand on a smaller budget, or need questions asked <b>in Turkish from Turkey</b>, <b>AI SaaSavran</b> is an alternative: start on a free plan, and live-search ChatGPT, Claude and Perplexity cost $60 a month.</p>
<p>We are a competitor, so we only repeat what AthenaHQ's own pricing page and public company news say (checked 21 November 2026). Prices change; check athenahq.ai/plans before buying.</p>

<h2>What is known about AthenaHQ</h2>
<ul>
<li><b>Ownership:</b> Bloomreach announced on 16 November 2026 that it acquired AthenaHQ, to pair it with its Loomi AI product.</li>
<li><b>Free plan (Essential):</b> 300 credits; ChatGPT, Perplexity, Google AI Overviews, Gemini and Copilot.</li>
<li><b>Starter:</b> $295 a month, 3,600 credits a month. Per the official page, 1 credit = 1 AI response. 11 models including Claude, Google AI Mode, Grok, DeepSeek, Meta AI and Mistral. API access and extra credits cost extra.</li>
<li><b>Countries and languages:</b> Starter covers a single country and language; multiple regions and languages are on the custom-priced Enterprise plan.</li>
<li><b>Other features:</b> a content optimization agent and on-page and off-page actions; Enterprise adds citation forecasting (Athena Citation Engine) and SSO.</li>
</ul>

<h2>Side by side</h2>
<table class="mtable"><thead><tr><th></th><th>AI SaaSavran</th><th>AthenaHQ</th></tr></thead><tbody>
<tr><td>Free plan</td><td>1 brand, 15 questions, 4 measurements a month (Gemini, no live search)</td><td>300 credits, 5 engines</td></tr>
<tr><td>First paid plan</td><td>Plus, $60/month</td><td>Starter, $295/month</td></tr>
<tr><td>Engines (paid)</td><td>ChatGPT, Claude, Perplexity (live search) + Gemini</td><td>11 models (incl. Google AI Overviews, AI Mode, Copilot)</td></tr>
<tr><td>Measurement frequency</td><td>Weekly</td><td>Not stated on the official page</td></tr>
<tr><td>Agency plan</td><td>Business $876/month, 15 brands</td><td>Enterprise, custom</td></tr>
</tbody></table>

<h2>When AI SaaSavran makes sense</h2>
<ul>
<li><b>Small budget.</b> Start free; live-search ChatGPT, Claude and Perplexity at $60 a month.</li>
<li><b>Customers ask in Turkish, or in a specific country.</b> Questions can be asked in Turkish or English from Turkey or another country.</li>
<li><b>You sell products.</b> What the AI says about your product's price and specifications is checked against official data.</li>
<li><b>You need evidence for "why the competitor?".</b> Reports show the questions you lose, the competitor named instead and the sources the AI relied on.</li>
</ul>

<h2>When AthenaHQ fits better</h2>
<ul>
<li><b>Many engines:</b> we don't measure Google AI Overviews, AI Mode, Copilot or Grok yet.</li>
<li><b>A content agent alongside tracking:</b> AthenaHQ offers a content optimization agent.</li>
<li><b>You already use Bloomreach:</b> the two products are expected to work together after the acquisition.</li>
</ul>

<h2>How to try it</h2>
<ol>
<li>Run the <a href="/check/">free check</a> without signing up to see whether Gemini mentions your business.</li>
<li>Create a free account, add your brand and 3 competitors, and pick ready-made questions for your sector.</li>
<li>Upgrade to Plus for live-search ChatGPT, Claude and Perplexity. Cancel within 14 days for a refund.</li>
</ol>
<p>All tools compared: <a href="/guides/ai-visibility-tools-compared/">AI visibility tools compared</a>.</p>
`,
    faq: [
      ["What is a cheaper alternative to AthenaHQ?", "AI SaaSavran has a free plan, and its paid plan with live-search ChatGPT, Claude and Perplexity is $60 a month. AthenaHQ's Starter plan is $295 a month on its official pricing page."],
      ["How much does AthenaHQ cost?", "Per its official pricing page (21 November 2026): a free Essential plan; Starter at $295 a month with 3,600 credits (1 credit = 1 AI response); Enterprise is custom-priced."],
      ["Who acquired AthenaHQ?", "Bloomreach announced on 16 November 2026 that it acquired AthenaHQ."],
      ["How is AI SaaSavran different from AthenaHQ?", "AI SaaSavran focuses on small budgets and on questions in Turkish or English from your customers' country, and measures weekly. AthenaHQ tracks more engines (11 models) and offers content agents; its paid plan starts at $295 a month."],
    ],
  },
  {
    slug: "profound-alternative",
    tr: "profound-alternatifi",
    title: "Profound alternatives: 5 affordable options (2026)",
    short: "Profound alternatives",
    description: "Affordable Profound alternatives: AI SaaSavran, Otterly.AI, Peec AI, AthenaHQ and Semrush. Prices from official pages, with the date checked.",
    body: `
<p class="lede">Short answer: in September 2026 <b>Profound</b> retired its self-serve Starter and Growth plans ($399 and $499) for new subscribers; its official pricing page now lists only a custom-priced Enterprise plan. More affordable alternatives: <b>AI SaaSavran</b>, with a free plan and live-search ChatGPT, Claude and Perplexity at $60 a month; <b>Otterly.AI</b> from $29 a month; <b>AthenaHQ</b>, with a free plan and a $295 Starter plan; <b>Semrush AI Visibility Toolkit</b> at $99 a month per domain; and <b>Peec AI</b>, whose agency plans start at $245 a month.</p>
<p>We are a competitor, so we only repeat what each tool's official pages say, with the date we checked them. Prices change; check each tool's own page before buying.</p>

<h2>What is known about Profound (tryprofound.com/pricing, 22 November 2026)</h2>
<ul>
<li><b>Plan:</b> Enterprise only, priced as "Custom"; you request a demo to buy.</li>
<li><b>Old plans:</b> per the official FAQ, the Starter and Growth plans were retired in September 2026 and the $399 and $499 prices are no longer available for new subscriptions.</li>
<li><b>Engines:</b> up to 10, including ChatGPT, Perplexity, Google AI Mode, Gemini, Google AI Overviews, Claude, DeepSeek and Qwen.</li>
<li><b>Frequency and scope:</b> daily tracking; prompts, languages and regions are set per package. API, SSO and SOC 2 compliance; AI agents that create content.</li>
</ul>
<p>Profound is built for enterprise teams with large budgets. If you are a small business, a single brand or a small agency, the options below are easier on the budget.</p>

<h2>Affordable alternatives</h2>
<table class="mtable"><thead><tr><th>Tool</th><th>Free</th><th>First paid plan</th><th>Checked</th></tr></thead><tbody>
<tr><td>AI SaaSavran</td><td>Yes (1 brand, 15 questions, Gemini)</td><td>Plus, $60/month</td><td>Our own pricing</td></tr>
<tr><td>Otterly.AI</td><td>Free trial</td><td>Lite, $29/month (15 prompts)</td><td>18 November 2026</td></tr>
<tr><td>Semrush AI Visibility Toolkit</td><td>No trial</td><td>$99/month per domain</td><td>18 November 2026</td></tr>
<tr><td>AthenaHQ</td><td>Yes (Essential, 300 credits)</td><td>Starter, $295/month</td><td>21 November 2026</td></tr>
<tr><td>Peec AI</td><td>See official page</td><td>Agency plans from $245/month</td><td>18 November 2026</td></tr>
</tbody></table>

<h3>AI SaaSavran</h3>
<p>Based in Turkey. Start on a free plan. Plus ($60/month): 25 questions, 5 competitors, live-search ChatGPT, Claude and Perplexity plus Gemini, weekly automatic measurement, the sources the AI relied on, and product fact checks. Questions in Turkish or English, asked from Turkey or another country. Business ($876/month, 15 brands) for agencies. Limits: measurement is weekly; Google AI Overviews, AI Mode and Copilot are not measured yet.</p>
<h3>Otterly.AI</h3>
<p>The lowest entry price: Lite at $29 a month, 15 prompts, covering Google AI Overviews, ChatGPT, Perplexity and Microsoft Copilot. Gemini and Google AI Mode cost extra. A good fit if Google AI Overviews and Copilot matter most.</p>
<h3>Semrush AI Visibility Toolkit</h3>
<p>Per Semrush's help page, $99 a month per domain with 25 tracked prompts. A natural add-on for teams already doing SEO in Semrush.</p>
<h3>AthenaHQ</h3>
<p>A free Essential plan (300 credits, 5 engines) and a $295 Starter plan (3,600 credits, 11 models including Claude). Bloomreach announced its acquisition on 16 November 2026. More: <a href="/guides/athenahq-alternative/">AthenaHQ alternative</a>.</p>
<h3>Peec AI</h3>
<p>Berlin-based; daily tracking across many countries and languages. Agency plans start at $245 a month; brand plan prices are on peec.ai/pricing. More: <a href="/guides/peec-ai-alternative/">Peec AI alternative</a>.</p>

<h2>How often does AI recommend Profound? (our own measurement)</h2>
<p>On ${selfDateEn} we asked ${SELF.questions} unbranded questions in this category to ${SELF.engines.join(", ")} with live web search from Turkey. ${PROF ? `Profound was recommended in ${PROF[1]} of ${SELFN} answers.` : `Profound was not in the top five in this measurement.`} ${SELF.ours === 0 ? "As a new brand, we were not recommended in any answer." : `We were recommended in ${SELF.ours} of ${SELFN} answers.`} All numbers: <a href="/guides/ai-visibility-tools-compared/">AI visibility tools compared</a>.</p>

<h2>How to choose</h2>
<ul>
<li><b>Budget:</b> to start free, AI SaaSavran or AthenaHQ's free plan; the lowest paid entry is Otterly.AI.</li>
<li><b>Customers in a specific country or language:</b> pick a tool that asks questions in that language from that country; the brands in AI answers can change by country and language.</li>
<li><b>Engines:</b> Otterly.AI if Google AI Overviews and Copilot are a must; AI SaaSavran or AthenaHQ to see Claude separately.</li>
<li><b>Frequency:</b> Peec AI or Otterly.AI for daily tracking; for most small businesses, weekly measurement is enough to see the trend.</li>
</ul>
<p>Detailed checklist: <a href="/guides/choose-ai-visibility-tool/">how to choose an AI visibility tool</a> · Try it without signing up: <a href="/check/">free check</a>.</p>
`,
    faq: [
      ["What are affordable alternatives to Profound?", "AI SaaSavran (free plan; live-search ChatGPT, Claude and Perplexity at $60/month), Otterly.AI (from $29/month), Semrush AI Visibility Toolkit ($99/month per domain), AthenaHQ (free plan; Starter $295/month) and Peec AI (agency plans from $245/month). Prices checked on official pages on 18–22 November 2026."],
      ["How much does Profound cost?", "Per its official pricing page (22 November 2026), Profound offers only a custom-priced Enterprise plan. The $399 Starter and $499 Growth plans were retired for new subscriptions in September 2026."],
      ["Is there a free alternative to Profound?", "Yes. AI SaaSavran's free plan includes 1 brand, 15 questions and 4 measurements a month (Gemini, no live search). AthenaHQ's free Essential plan includes 300 credits."],
      ["Does Profound still have a Starter plan?", "No. Per Profound's pricing FAQ, the Starter and Growth plans for brands were retired in September 2026; new customers are offered Enterprise plans with custom pricing."],
    ],
  },
];
