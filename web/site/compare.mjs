// Rakip karşılaştırma rehberleri (18 Kasım, sahip kararı: gerçek adlarla).
// Kurallar: rakip bilgisi yalnız kendi resmî sayfalarından (18 Kasım 2026'da kontrol edildi) veya kamuya açık şirket bilgisinden;
// doğrulanamayan fiyat yazılmaz, "resmî sayfada" denir. Kötüleme yok. Kendi ölçümümüz (42 cevapta 0) dürüstçe yazılır.
// Fiyatlar sık değişir: bu dosyayı en geç 3 ayda bir kontrol et (sonraki kontrol: Şubat 2027).

const CHECKED_TR = "18 Kasım 2026";
const CHECKED_EN = "18 November 2026";

import { SELF, selfRows as rows, selfDate } from "./self.mjs";
const selfDateTr = selfDate(true), selfDateEn = selfDate(false);
const selfRows = rows();
const SELFN = SELF.answers;

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
<p>Türkiye merkezli, 2026'da erken erişimle açıldı. Ücretsiz paket: 1 marka, 15 soru, ayda 4 ölçüm; Gemini ile, canlı web araması olmadan (model bilgisi) ve bu raporda açıkça yazar. Plus (29 $/ay): 25 soru, 5 rakip, ChatGPT, Claude ve Perplexity canlı web aramasıyla + Gemini, haftalık otomatik ölçüm, yapay zekânın baktığı kaynak siteler, ürünlerde doğruluk kontrolü ve Google Shopping sırası. Pro 149 $ (5 marka, API ve MCP), Business 449 $ (15 marka, ajanslar için). Sorular Türkçe veya İngilizce, Türkiye'den veya başka ülkeden sorulabilir. Sınırlar: Ölçüm haftalıktır, günlük değil. Google AI Overviews, AI Mode ve Microsoft Copilot henüz ölçülmüyor.</p>
<h3>Peec AI</h3>
<p>Berlin merkezli. Marka paketlerinde seçilen yapay zekâ modellerinde günlük takip yapar; ek modeller ek ücretlidir. Ajans paketleri resmî sayfada aylık 245 $'dan başlıyor ve ChatGPT, Perplexity, Google AI Overviews, AI Mode, Gemini gibi modelleri kapsıyor; en büyük ajans paketine Claude gibi API modelleri ekleniyor. Marka paketi fiyatları: peec.ai/pricing. Birçok ülke ve dilde takip isteyen ekipler ve ajanslar için güçlü bir seçenek.</p>
<h3>Otterly.AI</h3>
<p>Avusturya merkezli, 2024'te kuruldu. Resmî fiyat sayfasında en küçük paket Lite: aylık 29 $, 15 soru; Google AI Overviews, ChatGPT, Perplexity ve Microsoft Copilot dahil. Gemini ve Google AI Mode ek ücretle ekleniyor. Standard 189 $ (100 soru), Premium 489 $ (400 soru). Ücretsiz deneme var. Düşük bütçeyle Google AI Overviews ve Copilot takibi isteyenler için uygun.</p>
<h3>Profound</h3>
<p>New York merkezli, kurumsal odaklı. Resmî sayfaya göre 7 günlük ücretsiz deneme (ChatGPT, Gemini, Google AI Overviews; 50 soru) ve teklifle fiyatlanan kurumsal paket (10'a kadar motor) var; self-servis Starter ve Growth paketleri Eylül 2026'dan beri yeni aboneliğe kapalı. İçerik üreten yapay zekâ ajanları da sunuyor. Büyük bütçeli kurumsal ekipler için.</p>
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
    description: "Türkiye pazarı için Peec AI, Otterly.AI ve Profound alternatifi: Türkçe sorular, Türkiye'den canlı arama, ücretsiz paket ve 29 $'dan başlayan fiyat.",
    body: `
<p class="lede">Kısa cevap: Markanızın ChatGPT, Claude, Perplexity ve Gemini'deki görünürlüğünü <b>Türkçe sorularla</b> ve <b>Türkiye'den canlı web aramasıyla</b> ölçmek istiyorsanız AI SaaSavran, Peec AI, Otterly.AI ve Profound'a bir alternatiftir. Ücretsiz paketle başlanır; canlı aramalı ChatGPT, Claude ve Perplexity ölçümü aylık 29 $'dan başlar. Arayüz, raporlar, e-postalar ve soru şablonları Türkçedir.</p>

<h2>Ne zaman AI SaaSavran mantıklı?</h2>
<ul>
<li><b>Müşterileriniz Türkiye'de ve Türkçe soruyorsa.</b> Yapay zekâ cevabı sorunun diline ve sorulduğu ülkeye göre değişir. Türkçe sorular ve Türkiye konumu ayarlanır.</li>
<li><b>Claude da önemliyse.</b> Ücretli paketlerde ChatGPT, Claude ve Perplexity canlı web aramasıyla ölçülür ve her motor ayrı raporlanır.</li>
<li><b>Bütçeniz küçükse.</b> Ücretsiz paket (1 marka, 15 soru, ayda 4 ölçüm) ve Plus 29 $/ay. Ajanslar için Business 449 $/ay ile 15 marka.</li>
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
      ["Peec AI'nin Türkçe alternatifi var mı?", "Evet. AI SaaSavran Türkçe arayüz ve raporlarla, Türkçe soruları Türkiye'den canlı web aramasıyla ChatGPT, Claude ve Perplexity'de ölçer; ücretsiz paketle başlanır, ücretli paketler aylık 29 $'dan başlar."],
      ["AI SaaSavran ile Peec AI arasındaki fark nedir?", "AI SaaSavran Türkiye merkezlidir, Türkçe sorulara ve Türkiye'den canlı aramaya odaklanır, ücretsiz paketi vardır ve haftalık ölçer. Peec AI Berlin merkezlidir, günlük takip yapar ve çok ülkeli takipte güçlüdür."],
      ["Otterly.AI yerine ne kullanılabilir?", "Türkçe sorular, Claude ölçümü ve ürün bilgisi doğruluğu kontrolü önemliyse AI SaaSavran. Google AI Overviews ve Copilot takibi önemliyse Otterly.AI daha uygundur."],
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
<p>Based in Turkey, launched in 2026 (early access). Free plan: 1 brand, 15 questions, 4 measurements a month, using Gemini without live web search (model knowledge), clearly labelled. Plus ($29/month): 25 questions, 5 competitors, ChatGPT, Claude and Perplexity with live web search plus Gemini, weekly automatic measurement, cited sources, product accuracy checks and Google Shopping position. Pro $149 (5 brands, API and MCP), Business $449 (15 brands, for agencies). Questions in Turkish or English, asked from Turkey or another country. Limits: measurement is weekly, not daily; Google AI Overviews, AI Mode and Microsoft Copilot are not measured yet.</p>
<h3>Peec AI</h3>
<p>Based in Berlin. Brand plans track selected AI models daily, with extra models for an extra fee. Agency plans start at $245 a month on the official page and cover models such as ChatGPT, Perplexity, Google AI Overviews, AI Mode and Gemini; the largest agency plan adds API models such as Claude. Brand plan prices: peec.ai/pricing. A strong choice for teams and agencies tracking many countries and languages.</p>
<h3>Otterly.AI</h3>
<p>Based in Austria, founded in 2024. Its official pricing page lists Lite at $29 a month with 15 prompts, covering Google AI Overviews, ChatGPT, Perplexity and Microsoft Copilot; Gemini and Google AI Mode are paid add-ons. Standard is $189 (100 prompts) and Premium $489 (400 prompts). Free trial available. A good fit for low-budget tracking of Google AI Overviews and Copilot.</p>
<h3>Profound</h3>
<p>Based in New York, enterprise-focused. Its official page lists a 7-day free trial (ChatGPT, Gemini, Google AI Overviews; 50 prompts) and a custom-priced Enterprise plan (up to 10 engines); the self-serve Starter and Growth plans closed to new subscriptions in September 2026. It also offers AI agents for content work. Built for well-funded enterprise teams.</p>
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
    description: "An alternative to Peec AI, Otterly.AI and Profound: a free plan, live-search ChatGPT, Claude and Perplexity from $29 a month, and questions in Turkish or English.",
    body: `
<p class="lede">Short answer: if you want to measure your brand in ChatGPT, Claude, Perplexity and Gemini on a small budget, or need questions asked <b>in Turkish from Turkey</b>, AI SaaSavran is an alternative to Peec AI, Otterly.AI and Profound. You can start on a free plan; live-search ChatGPT, Claude and Perplexity start at $29 a month.</p>

<h2>When AI SaaSavran makes sense</h2>
<ul>
<li><b>Your customers are in Turkey, or you sell into Turkey.</b> AI answers change with the language and country of the question. Turkish questions and a Turkish search location are built in, alongside English and other countries.</li>
<li><b>Claude matters to you.</b> Paid plans measure ChatGPT, Claude and Perplexity with live web search and report each engine separately.</li>
<li><b>Small budget.</b> Free plan (1 brand, 15 questions, 4 measurements a month) and Plus at $29 a month. Agencies: Business at $449 a month for 15 brands.</li>
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
      ["What is a cheaper alternative to Peec AI?", "AI SaaSavran has a free plan, and its paid plans with live-search ChatGPT, Claude and Perplexity start at $29 a month. Otterly.AI's Lite plan is also $29 a month and covers Google AI Overviews, ChatGPT, Perplexity and Copilot."],
      ["How is AI SaaSavran different from Peec AI?", "AI SaaSavran is based in Turkey, supports Turkish and English questions asked from Turkey or other countries, has a free plan and measures weekly. Peec AI is based in Berlin, tracks daily and is strong at multi-country tracking."],
      ["Does AI SaaSavran track Claude?", "Yes. Paid plans measure Claude with live web search, alongside ChatGPT and Perplexity, and report each engine separately."],
    ],
  },
];
