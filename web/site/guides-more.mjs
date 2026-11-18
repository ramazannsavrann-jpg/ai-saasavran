// Rehber genişletmeleri ve yeni rehberler (18 Kasım). Kural: her sayı gerçek ölçümden (web/site/data/measurements.json,
// 12–18 Kasım 2026, Growth Lab) veya adı verilen kaynaktan. Mevcut rehberlere EKLENİR (eski metin korunur).

// ---------- Mevcut rehberlere ek bölümler ----------
export const EXTRA_TR = {
  "geo-nedir": {
    body: `
<h2>GEO, AEO, LLMO: aynı şey mi?</h2>
<p>Büyük ölçüde evet. GEO (Generative Engine Optimization) üretken yapay zekâ cevaplarını, AEO (Answer Engine Optimization) cevap motorlarını, LLMO (Large Language Model Optimization) büyük dil modellerini vurgular. Hepsi aynı hedefi anlatır: müşteri bir yapay zekâ asistanına sorduğunda markanızın cevabın içinde, doğru bilgiyle ve mümkünse öneri olarak yer alması. Terimlerin tamamı için: <a href="/rehber/geo-aeo-sozlugu/">GEO ve AEO sözlüğü</a>.</p>

<h2>İki farklı yapay zekâ cevabı: canlı arama ve model bilgisi</h2>
<p>GEO'yu anlamanın anahtarı, yapay zekânın cevabı nereden ürettiğini bilmektir:</p>
<ul>
<li><b>Canlı web araması:</b> ChatGPT, Claude ve Perplexity soruyu cevaplarken internette arar, birkaç sayfa okur ve bunları kaynak olarak gösterebilir. Bu cevaplar bugünkü interneti yansıtır; sitenizde ve sizden bahseden sitelerde yaptığınız değişiklik haftalar içinde görülebilir.</li>
<li><b>Model bilgisi:</b> Asistan internete bakmadan, eğitildiği verideki bilgiyle cevap verir. Bu bilgi aylar öncesine aittir ve ancak yeni bir model eğitildiğinde değişir.</li>
</ul>
<p>Aynı soruda iki cevap farklı çıkabilir. Kendi ölçümümüzde "Türkiye'de en iyi mobil bankacılık uygulaması hangisi?" sorusunda ChatGPT canlı aramayla iki cevabın ikisinde de İş Bankası'nı önerdi; Gemini model bilgisiyle beş bankayı birden saydı. Bu yüzden ölçümde ikisi ayrı tutulmalıdır.</p>

<h2>Gerçek verilerden: yapay zekâ kaç marka sayıyor?</h2>
<p>Ölçtüğümüz 31 sektörde (194 soru, 736 canlı aramalı cevap) yapay zekâ çoğu cevapta bir avuç marka saydı ve bazı sektörlerde tek bir marka açık ara öne çıktı: Türkçe sorularda kahve makinelerinde Philips (%95), online alışverişte Amazon (%94), televizyonda LG (%86). Bu, GEO'nun neden önemli olduğunu gösteriyor: listede olmayan marka, o müşterinin gözünde yoktur. Sektör sektör sonuçlar: <a href="/tr/yapay-zeka-gorunurluk-endeksi/">Yapay Zekâ Görünürlük Endeksi</a>.</p>

<h2>GEO'da en sık yapılan 5 hata</h2>
<ol>
<li><b>Markalı soruyla ölçmek.</b> "X iyi mi?" sorusu X'ten mutlaka bahsettirir. Müşteri markayı bilmeden sorar; ölçüm de markasız sorularla yapılmalı.</li>
<li><b>Tek ekran görüntüsüne güvenmek.</b> Yapay zekâ aynı soruya her seferinde farklı cevap verebilir. Soruyu birkaç kez sorun.</li>
<li><b>Yapay zekâ botlarını farkında olmadan engellemek.</b> Bazı güvenlik ayarları ve hazır robots.txt dosyaları GPTBot, OAI-SearchBot, ClaudeBot, Claude-SearchBot veya PerplexityBot'u engeller. Engellenen site canlı aramada okunamaz.</li>
<li><b>Yalnız kendi sitesine odaklanmak.</b> Yapay zekâ çoğu zaman karşılaştırma yazılarını, inceleme sitelerini ve rehberleri kaynak gösterir. Bu sitelerde yer almak, kendi sitenizi düzeltmek kadar önemlidir.</li>
<li><b>Sonucu hemen beklemek.</b> Canlı aramada değişim haftalar, model bilgisinde aylar sürebilir. Değişiklik tarihini not edip düzenli ölçün.</li>
</ol>
`,
    faq: [
      ["GEO ile AEO arasındaki fark nedir?", "Pratikte aynı işi anlatırlar. GEO üretken yapay zekâ cevaplarına, AEO cevap motorlarına vurgu yapar; ikisinin de hedefi markanın yapay zekâ cevabında doğru bilgiyle yer almasıdır."],
      ["GEO için hangi yapay zekâ botlarına izin vermeliyim?", "Canlı aramada okunmak için en azından OAI-SearchBot ve ChatGPT-User (ChatGPT), Claude-SearchBot ve Claude-User (Claude) ve PerplexityBot (Perplexity) engellenmemelidir. Eğitim botları (GPTBot, ClaudeBot, Google-Extended) ayrı bir karardır."],
    ],
  },
  "yerel-isletme-yapay-zeka": {
    body: `
<h2>Gerçek bir örnek: Antalya'da özel hastane</h2>
<p>14 Kasım 2026'da "Antalya'da hangi özel hastaneyi önerirsin?" sorusunu yapay zekâ motorlarına ikişer kez sorduk. Claude canlı aramayla iki cevabın ikisinde Medical Park'ı, birinde Memorial'ı önerdi. ChatGPT canlı aramayla iki cevabın ikisinde Memorial'ı, birinde Medical Park'ı önerdi. Gemini (internete bakmadan, model bilgisiyle) bunlara ek olarak Liv Hospital ve Medicana'yı da andı. Aynı şehirde, aynı soruda motorlar farklı sırayla farklı adlar verdi. Yerel işletme için ders: tek bir motora bakıp karar vermeyin.</p>
<p>Bu tek bir soru ve az sayıda cevaptır; bir sıralama değil, yapay zekânın nasıl davrandığına dair bir örnektir. Sorunun tüm sonuçları: <a href="/tr/olcumler/antalyada-hangi-ozel-hastaneyi-onerirsin/">ölçüm sayfası</a>.</p>

<h2>Yapay zekâ yerel işletmeyi nereden tanıyor?</h2>
<ul>
<li><b>Harita ve işletme profilleri:</b> Google İşletme Profili, Apple Haritalar, Yandex Haritalar. Ad, adres, telefon ve kategori burada tutarlı olmalı.</li>
<li><b>Yorum ve şikâyet siteleri:</b> Google yorumları, Şikayetvar, TripAdvisor, sektörünüzdeki randevu ve inceleme siteleri. Yapay zekâ "müşteri yorumları olumlu" gibi gerekçeleri buralardan çıkarır.</li>
<li><b>Yerel haberler ve rehber yazıları:</b> "Antalya'nın en iyi …" türü listeler canlı aramada sık okunur. Bu listelerde yer almak doğrudan etki eder.</li>
<li><b>Kendi siteniz:</b> Hangi ilçede, hangi hizmeti, hangi fiyat aralığında verdiğinizi düz cümlelerle yazan sayfalar.</li>
</ul>

<h2>Ölçmek için doğru sorular</h2>
<p>Yerel işletmenin soruları şehir ve ilçe içermeli; müşterinin gerçekten kullandığı kelimelerle yazılmalı:</p>
<ul>
<li>"Muratpaşa'da çocuklar için iyi bir diş kliniği önerir misin?"</li>
<li>"Lara'da deniz manzaralı, fiyatı makul bir restoran hangisi?"</li>
<li>"Konyaaltı'nda güvenilir bir oto servis var mı?"</li>
</ul>
<p>AI SaaSavran'da her soru için ülke ve dil seçilir; ücretli paketlerde ChatGPT, Claude ve Perplexity Türkiye'den canlı aramayla sorar. Rakip olarak aynı ilçedeki 3–5 işletmeyi ekleyin.</p>

<h2>30 günlük plan</h2>
<ol>
<li><b>1. hafta:</b> 10 yerel soruyu ölçün; hangi rakibin, hangi kaynakla önerildiğini not edin.</li>
<li><b>2. hafta:</b> İşletme profillerinizi ve sitenizdeki ad, adres, telefon bilgisini eşitleyin; sitenize LocalBusiness şeması ve sık sorulan sorular ekleyin.</li>
<li><b>3. hafta:</b> Yapay zekânın rakibiniz için gösterdiği yerel liste ve rehber sitelerine başvurun; memnun müşterilerden yorum isteyin.</li>
<li><b>4. hafta:</b> Aynı soruları yeniden ölçün ve farkı karşılaştırın. Değişim yoksa kaynak listesine dönün.</li>
</ol>
`,
    faq: [
      ["Yapay zekâ yerel işletme önerirken neye bakıyor?", "Canlı aramada harita ve işletme profillerine, yorum sitelerine, yerel rehber yazılarına ve işletmenin kendi sitesine bakar. Bu kaynaklarda bilgilerin tutarlı ve güncel olması önerilme şansını artırır."],
      ["Farklı yapay zekâlar aynı işletmeyi mi önerir?", "Her zaman değil. Antalya özel hastane sorusunda Claude ve ChatGPT aynı iki hastaneyi farklı sırayla önerdi; Gemini model bilgisiyle başka hastaneleri de andı."],
    ],
  },
  "rakip-neden-oneriliyor": {
    body: `
<h2>Motorlar aynı rakibi önermeyebilir</h2>
<p>"Rakibim yapay zekâda öne çıkıyor" cümlesi çoğu zaman eksiktir: hangi motorda? Türkçe sorularla yaptığımız ölçümlerde televizyon sektöründe LG, canlı aramalı 22 cevabın 19'unda önerildi; ama Claude'da en çok önerilen marka Samsung oldu. Teknoloji YouTube kanallarında ChatGPT'nin lideri Webtekno, Claude'un lideri Technopat oldu; Gemini ise model bilgisiyle ShiftDelete.Net'i öne çıkardı. Rakibin neden önerildiğini anlamak için önce hangi motorda önerildiğini görmek gerekir. Sektör sektör motor liderleri: <a href="/tr/yapay-zeka-gorunurluk-endeksi/">Yapay Zekâ Görünürlük Endeksi</a>.</p>

<h2>Rakibin önerilmesinin 6 yaygın nedeni</h2>
<ol>
<li><b>Karşılaştırma ve "en iyi" listelerinde yer alıyor.</b> Canlı arama yapan asistanlar bu listeleri sık okur. Siz listede yoksanız, cevapta da yoksunuz.</li>
<li><b>Kendi sitesi soruya doğrudan cevap veriyor.</b> "Hangi … en iyisi?" sorusuna cevap veren, başlığı soruyla örtüşen bir sayfası var.</li>
<li><b>Doğrulanabilir kanıt sunuyor.</b> Ödül, bağımsız test, resmî veri, müşteri sayısı gibi somut iddialar yapay zekânın gerekçe cümlesine dönüşür.</li>
<li><b>Hakkında çok ve tutarlı yazılmış.</b> Haber, forum ve inceleme sitelerinde aynı şekilde anlatılan marka, model bilgisinde de güçlüdür.</li>
<li><b>Fiyat ve özellik bilgisi açık.</b> Yapay zekâ "bütçe dostu" veya "en uzun pil ömrü" gibi gerekçeler kurarken açıkça yazılmış bilgiyi kullanır.</li>
<li><b>Sizin siteniz okunamıyor.</b> Yapay zekâ botları engelliyse veya içerik yalnız JavaScript ile yükleniyorsa, canlı aramada sizin sayfanız hiç okunmaz.</li>
</ol>

<h2>Kanıtı rapora dökmek</h2>
<p>AI SaaSavran ücretli paketlerde her canlı aramalı cevabın kaynak sitelerini kaydeder ve "kaybedilen sorular" listesinde, sizin yerinize hangi rakibin önerildiğini ve yapay zekânın bu rakibi hangi cümleyle anlattığını gösterir. Kaynakları kendi siteniz, rakip siteler ve üçüncü taraf siteler olarak ayırır. İş planı bu listeden çıkar: hangi karşılaştırma sitesine girmeniz, hangi sayfanızı netleştirmeniz gerektiği.</p>
`,
    faq: [
      ["Rakibim neden ChatGPT'de öneriliyor da ben önerilmiyorum?", "En yaygın nedenler: rakip karşılaştırma ve 'en iyi' listelerinde yer alıyor, sitesi soruya doğrudan cevap veriyor ve doğrulanabilir kanıt (ödül, test, resmî veri) sunuyor. Cevaptaki kaynak sitelere bakmak nedeni en hızlı gösterir."],
      ["Bir motorda önde olan rakip diğerlerinde de önde mi?", "Her zaman değil. Ölçümlerimizde televizyon sektöründe genel lider LG iken Claude'da Samsung en çok önerildi."],
    ],
  },
  "youtuber-yapay-zeka-gorunurlugu": {
    body: `
<h2>Gerçek veri: yapay zekâ hangi Türk teknoloji kanallarını öneriyor?</h2>
<p>13 Kasım 2026'da "Türkiye'de en iyi teknoloji inceleme YouTube kanalı hangisi?" gibi 7 soruyu yapay zekâ motorlarına sorduk. Canlı aramalı 16 cevapta Webtekno ve Technopat 8'er kez, ShiftDelete.Net 5 kez önerildi. Motorlar ayrıştı: ChatGPT'de lider Webtekno, Claude'da Technopat oldu. Gemini ise internete bakmadan (model bilgisiyle) 12 cevabın 12'sinde ShiftDelete.Net'i önerdi. Sonuçlar: <a href="/tr/yapay-zeka-gorunurluk-endeksi/#tr-youtube">endeksteki YouTube bölümü</a>.</p>
<p>Dikkat çekici nokta: öne çıkan kanalların hepsinin aynı zamanda güçlü bir web sitesi var. Yapay zekâ canlı aramada video değil, yazı okur. Kanalınızın adı, konusu ve öne çıkan içerikleri yazılı olarak internette ne kadar netse, önerilme şansı o kadar artar.</p>

<h2>İçerik üreticileri için kontrol listesi</h2>
<ol>
<li><b>Kanal açıklaması:</b> Ne anlattığınızı tek cümleyle yazın: "Telefon ve laptop incelemeleri, Türkçe, haftada iki video".</li>
<li><b>Video açıklamaları ve başlıklar:</b> Müşterinin yapay zekâya sorduğu kelimeleri kullanın: "öğrenci için laptop", "bütçe telefon önerisi".</li>
<li><b>Bir web sayfası:</b> Kanalı ve öne çıkan videoları anlatan basit bir site veya sayfa, canlı aramada okunabilen yazılı kaynaktır.</li>
<li><b>Başka sitelerde anılma:</b> "En iyi teknoloji kanalları" listeleri, forumlar ve röportajlar yapay zekânın baktığı kaynaklar arasında.</li>
<li><b>Tutarlı ad:</b> Kanal adınız her platformda aynı yazılsın; yapay zekâ farklı yazımları farklı kişi sanabilir.</li>
</ol>
`,
    faq: [
      ["Yapay zekâ YouTube videolarını izleyip mi öneriyor?", "Çoğunlukla hayır. Canlı aramada web sayfalarını, kanal açıklamalarını ve kanaldan bahseden yazıları okur. Yazılı izi güçlü kanallar daha sık önerilir."],
    ],
  },
};

export const EXTRA_EN = {
  "what-is-geo": {
    body: `
<h2>GEO, AEO, LLMO: the same thing?</h2>
<p>Mostly, yes. GEO (generative engine optimization) stresses generative AI answers, AEO (answer engine optimization) answer engines, LLMO large language models. All describe the same goal: when a customer asks an AI assistant, your brand appears in the answer, described correctly and ideally recommended. Full glossary: <a href="/guides/geo-aeo-glossary/">GEO and AEO glossary</a>.</p>

<h2>Two kinds of AI answer: live search and model knowledge</h2>
<ul>
<li><b>Live web search:</b> ChatGPT, Claude and Perplexity search the web, read a few pages and can cite them. These answers reflect today's web; changes to your site and to sites that mention you can show within weeks.</li>
<li><b>Model knowledge:</b> the assistant answers from its training data without looking anything up. That knowledge is months old and only changes with a new model.</li>
</ul>
<p>The two can differ for the same question. In our measurement of "which is the best mobile banking app in Turkey?", ChatGPT with live search recommended İş Bankası in both answers, while Gemini from model knowledge listed five banks at once. Keep them apart when you measure.</p>

<h2>From real data: how many brands does AI name?</h2>
<p>Across the 31 sectors we measure (194 questions, 736 live-search answers), AI named only a handful of brands per answer, and in some sectors one brand clearly dominated: Roborock in robot vacuums (100% of English-language answers), Best Buy among retailers (87%), LG in TVs (81%). If you are not on that short list, you are invisible to that customer. Sector by sector: <a href="/ai-visibility-index/">AI Visibility Index</a>.</p>

<h2>Five common GEO mistakes</h2>
<ol>
<li><b>Measuring with branded questions.</b> "Is X good?" always mentions X. Customers ask without knowing your brand; measure with unbranded questions.</li>
<li><b>Trusting one screenshot.</b> AI answers vary between runs. Ask each question several times.</li>
<li><b>Blocking AI bots without knowing it.</b> Some security settings and template robots.txt files block GPTBot, OAI-SearchBot, ClaudeBot, Claude-SearchBot or PerplexityBot. A blocked site cannot be read in live search.</li>
<li><b>Only fixing your own site.</b> AI often cites comparison articles, review sites and guides. Being on them matters as much as your own pages.</li>
<li><b>Expecting instant results.</b> Live search can change in weeks, model knowledge in months. Note the date of each change and measure regularly.</li>
</ol>
`,
    faq: [
      ["What is the difference between GEO and AEO?", "In practice they describe the same work. GEO stresses generative AI answers, AEO answer engines; both aim for the brand to appear correctly in AI answers."],
      ["Which AI bots should I allow for GEO?", "To be read in live search, don't block OAI-SearchBot and ChatGPT-User (ChatGPT), Claude-SearchBot and Claude-User (Claude) and PerplexityBot (Perplexity). Training bots (GPTBot, ClaudeBot, Google-Extended) are a separate decision."],
    ],
  },
  "local-business-ai-recommendations": {
    body: `
<h2>A real example: private hospitals in Antalya</h2>
<p>On 14 November 2026 we asked "Which private hospital in Antalya do you recommend?" (in Turkish) twice per engine. Claude with live search recommended Medical Park in both answers and Memorial in one; ChatGPT with live search recommended Memorial in both and Medical Park in one. Gemini, from model knowledge, also mentioned Liv Hospital and Medicana. Same city, same question, different order and names. For a local business: don't judge by one engine. This is one question and few answers, an example of behaviour rather than a ranking.</p>

<h2>Where AI learns about local businesses</h2>
<ul>
<li><b>Maps and business profiles:</b> Google Business Profile, Apple Maps, Bing Places. Name, address, phone and category must match.</li>
<li><b>Review sites:</b> Google reviews, Yelp, TripAdvisor and booking sites in your sector. Reasons such as "well reviewed" come from here.</li>
<li><b>Local news and "best of" lists:</b> often read in live search; being on them has a direct effect.</li>
<li><b>Your own site:</b> plain sentences on which area you serve, what you offer and your price range.</li>
</ul>

<h2>The right questions to measure</h2>
<p>Local questions should include the city or neighbourhood and the words customers actually use: "Can you recommend a good kids' dentist in Brooklyn?", "Which restaurant in Lara has a sea view and fair prices?". In AI SaaSavran you set the country and language per question; paid plans ask ChatGPT, Claude and Perplexity with live search from that country. Add 3 to 5 nearby businesses as competitors.</p>

<h2>A 30-day plan</h2>
<ol>
<li><b>Week 1:</b> measure 10 local questions; note which competitor is recommended and which sources are cited.</li>
<li><b>Week 2:</b> align name, address and phone across profiles and your site; add LocalBusiness schema and an FAQ.</li>
<li><b>Week 3:</b> apply to the local lists and guides the AI cited for competitors; ask happy customers for reviews.</li>
<li><b>Week 4:</b> measure the same questions again and compare. No change? Go back to the source list.</li>
</ol>
`,
    faq: [
      ["What does AI look at when recommending a local business?", "In live search it reads maps and business profiles, review sites, local guides and the business's own site. Consistent, current information raises the chance of being recommended."],
    ],
  },
  "why-chatgpt-recommends-your-competitor": {
    body: `
<h2>Engines may not favour the same competitor</h2>
<p>"My competitor wins in AI" is usually incomplete: in which engine? In our Turkish-language measurements, LG was recommended in 19 of 22 live-search TV answers overall, yet Claude recommended Samsung most. Among tech YouTube channels, ChatGPT's leader was Webtekno and Claude's was Technopat, while Gemini from model knowledge favoured ShiftDelete.Net. See leaders by engine for each sector in the <a href="/ai-visibility-index/">AI Visibility Index</a>.</p>

<h2>Six common reasons a competitor gets recommended</h2>
<ol>
<li><b>It is on comparison and "best of" lists</b> that live-search assistants read.</li>
<li><b>Its site answers the question directly,</b> with a page whose heading matches the question.</li>
<li><b>It offers verifiable proof:</b> awards, independent tests, official data, customer numbers. These become the AI's reasons.</li>
<li><b>It is written about widely and consistently,</b> which also strengthens model knowledge.</li>
<li><b>Its prices and specifications are clear,</b> so the AI can build reasons like "budget-friendly" or "longest battery life".</li>
<li><b>Your site can't be read:</b> AI bots are blocked, or content only loads with JavaScript.</li>
</ol>

<h2>Turning evidence into a report</h2>
<p>On paid plans AI SaaSavran records the sources of every live-search answer and lists the questions you lost, the competitor recommended instead and the sentence the AI used about it. Sources are split into your site, competitor sites and third-party sites. That list is your work plan.</p>
`,
    faq: [
      ["Is a competitor that leads in one engine leading in all of them?", "Not always. In our measurements LG led TVs overall while Claude recommended Samsung most."],
    ],
  },
  "youtuber-ai-visibility": {
    body: `
<h2>Real data: which tech channels does AI recommend?</h2>
<p>On 13 November 2026 we asked AI engines 5 English questions such as "What is the best tech review YouTube channel?". Across live-search answers Marques Brownlee was recommended most often, and he led in both ChatGPT and Claude. In Turkish questions the engines split: ChatGPT favoured Webtekno, Claude Technopat, and Gemini from model knowledge ShiftDelete.Net. See the <a href="/ai-visibility-index/#en-youtube">YouTube section of the index</a>.</p>
<p>Notice that the channels AI picks have a strong written footprint: websites, articles and lists that mention them. In live search AI reads text, not video.</p>

<h2>Checklist for creators</h2>
<ol>
<li><b>Channel description:</b> one sentence on what you cover, in which language and how often.</li>
<li><b>Titles and descriptions:</b> use the words viewers type into AI: "laptop for students", "budget phone".</li>
<li><b>A web page:</b> a simple page about the channel and its best videos is a written source live search can read.</li>
<li><b>Mentions elsewhere:</b> "best tech channels" lists, forums and interviews are among the sources AI reads.</li>
<li><b>One consistent name</b> on every platform, so the AI doesn't treat variants as different people.</li>
</ol>
`,
    faq: [
      ["Does AI watch YouTube videos before recommending a channel?", "Mostly no. In live search it reads web pages, channel descriptions and articles about the channel. Channels with a strong written footprint get recommended more often."],
    ],
  },
};

// ---------- Yeni rehberler ----------
export const NEW_TR = [
  {
    slug: "markam-chatgptde-neden-cikmiyor",
    title: "Markam ChatGPT'de neden çıkmıyor? 8 neden ve çözümü",
    short: "Markam ChatGPT'de neden çıkmıyor?",
    description: "ChatGPT markanızı önermiyor ya da yanlış anlatıyorsa en yaygın 8 neden ve her biri için yapılacaklar. Kendi markamızdan gerçek örnekle.",
    body: `
<p class="lede">Kısa cevap: ChatGPT bir markayı genellikle şu nedenlerle önermez: internette hakkında yeterince yazı yoktur, sitesi soruya doğrudan cevap vermez, yapay zekâ botları siteyi okuyamaz, marka başka bir adla karıştırılır ya da yer alması gereken karşılaştırma listelerinde yoktur. Çözüm, önce hangi soruda ve hangi motorda kaybettiğinizi ölçmek, sonra yapay zekânın baktığı kaynakları düzeltmektir.</p>

<h2>Kendi markamızdan gerçek bir örnek</h2>
<p>18 Kasım 2026'da kendi markamızı ölçtük. Yapay zekâ görünürlük araçlarıyla ilgili 7 markasız soruyu ChatGPT, Claude ve Perplexity'ye Türkiye'den canlı web aramasıyla ikişer kez sorduk: 42 cevabın hiçbirinde önerilmedik. Rakiplerimiz 22 ile 33 cevap arasında önerildi. Adımızı doğrudan sorduğumuzda ise üç motor üç farklı tepki verdi: Perplexity sitemizi buldu ve doğru anlattı, Claude yalnız GitHub depomuzu buldu, ChatGPT ise bizi benzer adlı başka bir şirketle (Savran AI) karıştırdı. Aşağıdaki nedenlerin birkaçı bizim için de geçerliydi; neler yaptığımızı da yazıyoruz.</p>

<h2>8 neden ve yapılacaklar</h2>
<h3>1. Hakkınızda yeterince yazı yok</h3>
<p>Yapay zekâ, internette sık ve tutarlı anlatılan markaları önerir. Yeni ya da küçük bir markanın en büyük engeli budur. <b>Yapılacak:</b> sektör listelerine, dizinlere, karşılaştırma sitelerine ve yerel haberlere girin; müşterilerden yorum isteyin.</p>
<h3>2. Siteniz soruya doğrudan cevap vermiyor</h3>
<p>Müşteri "Antalya'da çocuk dişçisi" diye soruyorsa ve sitenizde bunu düz cümleyle söyleyen bir sayfa yoksa, yapay zekâ başka bir siteyi gösterir. <b>Yapılacak:</b> müşteri sorularını başlık yapan sayfalar ve sık sorulan sorular yazın; ilk paragrafta kısa ve net cevap verin.</p>
<h3>3. Yapay zekâ botları sitenizi okuyamıyor</h3>
<p>robots.txt dosyanız OAI-SearchBot veya ChatGPT-User'ı engelliyorsa ya da içerik yalnız JavaScript ile yükleniyorsa, ChatGPT canlı aramada sayfanızı okuyamaz. <b>Yapılacak:</b> robots.txt'i kontrol edin; önemli metinleri sayfanın HTML'inde sunun.</p>
<h3>4. Markanız başka bir adla karışıyor</h3>
<p>Bizim yaşadığımız durum: benzer adlı başka bir şirket var ve ChatGPT bizi onunla karıştırdı. <b>Yapılacak:</b> sitenizde "X ile Y aynı mı?" sorusunu açıkça cevaplayın; Organization şemasında resmî adınızı, adresinizi ve kurucunuzu yazın; her platformda adınızı aynı yazın. Biz bunun için SSS'ye bir soru, kurucu sayfası ve şemaya açıklama ekledik.</p>
<h3>5. Karşılaştırma listelerinde yoksunuz</h3>
<p>"En iyi X" sorularında ChatGPT sık sık karşılaştırma yazılarını okur. Rakipleriniz oradaysa ve siz yoksanız, cevapta da olmazsınız. <b>Yapılacak:</b> rakibinizin önerildiği cevaplardaki kaynak listesini çıkarın ve bu sitelere ulaşın.</p>
<h3>6. Ne yaptığınız belirsiz</h3>
<p>"Yenilikçi çözümler" gibi genel cümleler yapay zekâya bir şey anlatmaz. <b>Yapılacak:</b> ne sattığınızı, kime, hangi bölgede ve hangi fiyat aralığında sattığınızı tek cümleyle yazın.</p>
<h3>7. Yanlış soruya bakıyorsunuz</h3>
<p>"X markası iyi mi?" sorusunda mutlaka anılırsınız; asıl önemli olan markasız sorulardır. <b>Yapılacak:</b> müşterinin markanızı bilmeden soracağı 10–20 soruyla ölçün.</p>
<h3>8. Model bilginiz eski</h3>
<p>ChatGPT bazen internete bakmadan, eğitim verisiyle cevap verir. Bu bilgi aylar öncesinden kalmadır. <b>Yapılacak:</b> canlı aramadaki görünürlüğünüzü düzeltin; model bilgisi yeni eğitimlerle zamanla gelir.</p>

<h2>Nereden başlamalı?</h2>
<ol>
<li>Markasız sorularla bugünkü durumunuzu ölçün (<a href="/tr/kontrol/">ücretsiz kontrol</a>).</li>
<li>Adınızı doğrudan sorup yapay zekânın sizi doğru tanıyıp tanımadığına bakın.</li>
<li>Rakibin önerildiği cevaplardaki kaynakları listeleyin (<a href="/rehber/rakip-neden-oneriliyor/">rakip neden öneriliyor?</a>).</li>
<li>Yukarıdaki 8 maddeden size uyanları düzeltin, tarihini not edin, 2–4 hafta sonra yeniden ölçün.</li>
</ol>
`,
    faq: [
      ["ChatGPT markamı neden önermiyor?", "En yaygın nedenler: internette hakkınızda yeterince yazı olmaması, sitenizin müşteri sorusuna doğrudan cevap vermemesi, yapay zekâ botlarının siteyi okuyamaması, markanın başka bir adla karışması ve karşılaştırma listelerinde yer almamak."],
      ["ChatGPT markamı başka bir şirketle karıştırıyor, ne yapmalıyım?", "Sitenizde iki markanın farklı olduğunu açıkça yazan bir soru-cevap ekleyin, Organization şemasında resmî ad, adres ve kurucu bilgisini verin ve adınızı her platformda aynı yazın."],
      ["Değişiklikler ne kadar sürede etkisini gösterir?", "Canlı web aramasında birkaç hafta içinde görülebilir; internete bakmayan model bilgisinde ise yeni model eğitimlerini beklemek gerekir."],
    ],
  },
  {
    slug: "perplexityde-gorunmek",
    title: "Perplexity'de nasıl görünülür? Markanızın kaynak gösterilmesi için rehber",
    short: "Perplexity'de görünmek",
    description: "Perplexity her cevapta internette arar ve kaynak gösterir. Markanızın Perplexity cevaplarında anılması ve kaynak olarak gösterilmesi için yapılacaklar.",
    body: `
<p class="lede">Kısa cevap: Perplexity her soruda internette arar, birkaç sayfa okur ve cevabın içinde bu sayfaları numaralı kaynak olarak gösterir. Bu yüzden Perplexity'de görünmenin yolu, soruya açık ve güncel cevap veren, botların okuyabildiği sayfalara sahip olmak ve Perplexity'nin okuduğu üçüncü taraf sitelerde yer almaktır. İyi haber: değişiklikler model bilgisine göre çok daha hızlı yansır.</p>

<h2>Perplexity'nin farkı</h2>
<ul>
<li><b>Her zaman canlı arama:</b> ChatGPT ve Claude bazen internete bakmadan cevap verir; Perplexity'nin varsayılan davranışı aramaktır.</li>
<li><b>Kaynak her zaman görünür:</b> Kullanıcı hangi sitenin okunduğunu görür ve tıklayabilir. Kaynak olmak doğrudan ziyaretçi demektir.</li>
<li><b>Güncellik ağırlıklı:</b> Yeni ve güncellenmiş sayfalar sık okunur.</li>
</ul>

<h2>Gerçek bir gözlem</h2>
<p>Kendi markamızı ölçtüğümüzde (18 Kasım 2026) adımızı doğrudan sorduğumuzda Perplexity sitemizi buldu ve ne yaptığımızı doğru anlattı; aynı soruda ChatGPT bizi başka bir şirketle karıştırdı. Sitemizin açık bir "hakkımızda" sayfası, sık sorulan sorular ve yapılandırılmış verisi olması, Perplexity'nin her soruda canlı arama yapmasıyla birleşince doğru sonuç çıktı. Markasız sorularda ise Perplexity de rakiplerimizi önerdi: tanınmak, önerilmek için yetmiyor.</p>

<h2>Yapılacaklar</h2>
<ol>
<li><b>PerplexityBot'a izin verin.</b> robots.txt dosyanız PerplexityBot'u engellememeli.</li>
<li><b>Soruyu başlık yapın, cevabı ilk paragrafa koyun.</b> Perplexity cevap cümlelerini sayfadaki net ifadelerden kurar.</li>
<li><b>Tarih ve güncellik gösterin.</b> Sayfada güncelleme tarihi olsun; site haritanızda lastmod doğru olsun.</li>
<li><b>Sayı ve kanıt verin.</b> Fiyat aralığı, ölçüm sonucu, test verisi gibi somut bilgiler kaynak gösterilme şansını artırır.</li>
<li><b>Üçüncü taraf siteler.</b> Perplexity'nin rakipleriniz için gösterdiği karşılaştırma, inceleme ve forum sayfalarını listeleyin; oralarda yer alın.</li>
<li><b>Bing'e bildirin.</b> Değişen sayfalarınızı IndexNow ile bildirmek, arama motorlarının yeni içeriği hızlı bulmasına yardım eder.</li>
</ol>

<h2>Nasıl ölçülür?</h2>
<p>Perplexity'yi diğer motorlardan ayrı ölçün; aynı soruda diğerlerinden farklı marka önerebilir. Ölçtüğümüz sektörlerde motorların farklı lider gösterdiği örnekler: <a href="/tr/yapay-zeka-gorunurluk-endeksi/">endeks</a>. AI SaaSavran ücretli paketlerde Perplexity'yi canlı aramayla ayrı bir motor olarak ölçer, gösterdiği kaynakları kaydeder ve kendi sitenizin bunlar içindeki payını gösterir.</p>
`,
    faq: [
      ["Perplexity hangi siteleri kaynak gösteriyor?", "Soruya en açık ve güncel cevabı veren, botların okuyabildiği sayfaları; çoğu zaman karşılaştırma ve inceleme siteleri, markaların kendi sayfaları ve haber siteleri."],
      ["Perplexity'de görünmek ChatGPT'den daha mı hızlı?", "Genellikle evet. Perplexity her soruda canlı arama yaptığı için sitenizdeki ve sizden bahseden sitelerdeki değişiklikler daha hızlı yansır."],
    ],
  },
  {
    slug: "geo-aeo-sozlugu",
    title: "GEO ve AEO sözlüğü: yapay zekâ görünürlüğünün 20 temel terimi",
    short: "GEO ve AEO sözlüğü",
    description: "GEO, AEO, LLMO, canlı arama, model bilgisi, anılma, önerilme, kaynak gösterilme, llms.txt, AI Overviews ve yapay zekâ görünürlüğünün diğer terimleri, kısa ve net.",
    body: `
<p class="lede">Yapay zekâ görünürlüğü yeni bir alan ve terimleri hızla çoğalıyor. Bu sözlük, markanızın ChatGPT, Claude, Perplexity ve Gemini cevaplarındaki durumunu konuşurken en sık geçen 20 terimi kısa ve net anlatır.</p>

<h2>Temel kavramlar</h2>
<dl>
<dt><b>GEO (Generative Engine Optimization)</b></dt><dd>Markanın üretken yapay zekâ cevaplarında anılması ve önerilmesi için yapılan çalışmalar. Ayrıntı: <a href="/rehber/geo-nedir/">GEO nedir?</a></dd>
<dt><b>AEO (Answer Engine Optimization)</b></dt><dd>GEO ile büyük ölçüde aynı; "cevap motorları" vurgusu yapar.</dd>
<dt><b>LLMO (Large Language Model Optimization)</b></dt><dd>Aynı hedefin büyük dil modelleri üzerinden anlatımı.</dd>
<dt><b>Yapay zekâ görünürlüğü</b></dt><dd>Bir markanın yapay zekâ cevaplarında ne sıklıkla anıldığı, önerildiği ve kaynak gösterildiği.</dd>
<dt><b>Markasız soru</b></dt><dd>Markanın adı geçmeyen müşteri sorusu ("en iyi robot süpürge hangisi?"). Görünürlük ölçümünün temeli.</dd>
</dl>

<h2>Ölçüm terimleri</h2>
<dl>
<dt><b>Anılma (mention)</b></dt><dd>Markanın cevapta adının geçmesi; olumlu, olumsuz ya da nötr olabilir.</dd>
<dt><b>Önerilme (recommendation)</b></dt><dd>Yapay zekânın markayı seçenek olarak önermesi. Anılmadan daha güçlü bir sinyaldir.</dd>
<dt><b>Kaynak gösterilme (citation)</b></dt><dd>Yapay zekânın cevabında bir sayfayı kaynak olarak göstermesi. Marka anılmadan da sitesi kaynak olabilir.</dd>
<dt><b>Önerilme oranı / görünürlük payı (share of voice)</b></dt><dd>Önerildiği cevap sayısının toplam cevaba oranı. Örnek: 42 cevabın 33'ünde önerilmek %79.</dd>
<dt><b>Canlı web araması</b></dt><dd>Yapay zekânın cevap vermeden önce internette arayıp sayfa okuması. Bugünkü interneti yansıtır.</dd>
<dt><b>Model bilgisi</b></dt><dd>Yapay zekânın internete bakmadan, eğitim verisiyle cevap vermesi. Aylar öncesinin bilgisidir.</dd>
<dt><b>Başa baş</b></dt><dd>Az sayıda cevapla küçük farklar şans olabilir. Biz 10 puandan küçük farkları başa baş sayarız.</dd>
<dt><b>Halüsinasyon</b></dt><dd>Yapay zekânın yanlış bilgiyi doğruymuş gibi söylemesi; örneğin yanlış fiyat ya da var olmayan özellik.</dd>
</dl>

<h2>Teknik terimler</h2>
<dl>
<dt><b>Yapay zekâ botları</b></dt><dd>Siteleri okuyan tarayıcılar: OpenAI için GPTBot, OAI-SearchBot, ChatGPT-User; Anthropic için ClaudeBot, Claude-SearchBot, Claude-User; Perplexity için PerplexityBot. robots.txt ile izin verilir veya engellenir.</dd>
<dt><b>robots.txt</b></dt><dd>Sitenin hangi botlara açık olduğunu söyleyen dosya. Canlı arama botlarını engellemek görünürlüğü düşürür.</dd>
<dt><b>Yapılandırılmış veri (schema.org)</b></dt><dd>Sayfadaki bilgiyi (kurum, ürün, SSS, adres) makinelerin anlayacağı biçimde işaretleyen kod.</dd>
<dt><b>Varlık (entity)</b></dt><dd>Yapay zekânın "bu marka şu şirkettir" diye tanıdığı tekil kayıt. Tutarlı ad, şema ve kurucu bilgisi varlığı netleştirir.</dd>
<dt><b>llms.txt</b></dt><dd>Sitenin özetini yapay zekâ için listeleyen önerilmiş bir dosya; resmî standart değildir. Ayrıntı: <a href="/rehber/llms-txt-nedir/">llms.txt nedir?</a></dd>
<dt><b>Google AI Overviews ve AI Mode</b></dt><dd>Google aramasındaki yapay zekâ özetleri ve sohbet modu. Biz bunları henüz ölçmüyoruz; ölçmeye başladığımızda burada yazacağız.</dd>
<dt><b>IndexNow</b></dt><dd>Değişen sayfaları Bing ve Yandex gibi arama motorlarına anında bildiren protokol.</dd>
</dl>
`,
    faq: [
      ["Anılma ile önerilme arasındaki fark nedir?", "Anılma markanın adının geçmesidir ve olumsuz da olabilir. Önerilme, yapay zekânın markayı seçenek olarak önermesidir; görünürlük ölçümünde daha önemli sinyaldir."],
      ["Canlı arama ile model bilgisi neden ayrı ölçülür?", "Canlı arama bugünkü interneti, model bilgisi aylar önceki eğitim verisini yansıtır. Aynı soruda farklı markalar çıkabilir; karıştırılırsa sonuç yanıltıcı olur."],
    ],
  },
  {
    slug: "llms-txt-nedir",
    title: "llms.txt nedir? Yapay zekâ görünürlüğüne etkisi var mı? (2026)",
    short: "llms.txt nedir?",
    description: "llms.txt, sitenin özetini yapay zekâ için listeleyen önerilmiş bir dosyadır. Ne işe yarar, nasıl yazılır ve 2026 itibarıyla görünürlüğe gerçekten etkisi var mı?",
    body: `
<p class="lede">Kısa cevap: llms.txt, sitenizin kök dizinine konan ve sitenizin ne olduğunu, önemli sayfalarını yapay zekâ için Markdown biçiminde listeleyen bir dosyadır. Eylül 2024'te Answer.AI'den Jeremy Howard tarafından önerildi; resmî bir standart değildir. 2026 itibarıyla OpenAI, Anthropic veya Google, cevap üretirken üçüncü taraf sitelerin llms.txt dosyasını okuduğunu resmî olarak duyurmadı. Google, llms.txt'in arama görünürlüğünü artırmadığını ve azaltmadığını belgelerinde yazdı. Yani llms.txt bir sihirli düğme değildir; zararsız ve ucuz bir eklemedir.</p>

<h2>llms.txt ne işe yarar?</h2>
<p>Fikir basit: web sayfaları menüler, reklamlar ve kodla doludur; bir yapay zekânın sitenizi hızlı anlaması için temiz bir özet sunmak. Dosyada sitenin adı, tek cümlelik tanımı ve önemli sayfaların bağlantıları kısa açıklamalarla yer alır. Bazı siteler bütün içeriği tek dosyada sunan llms-full.txt de yayımlıyor.</p>

<h2>Gerçekten etkisi var mı?</h2>
<ul>
<li><b>Resmî destek yok:</b> Büyük sağlayıcıların hiçbiri, üretim cevaplarında llms.txt'i bir sinyal olarak kullandığını açıklamadı.</li>
<li><b>Google'ın tutumu açık:</b> Google, yapay zekâ arama rehberinde llms.txt'in görünürlüğe olumlu ya da olumsuz etkisi olmadığını belirtti.</li>
<li><b>Botlar nadiren istiyor:</b> Yayımlanan bağımsız çalışmalar, yapay zekâ botlarının bu dosyayı çok seyrek istediğini gösteriyor.</li>
</ul>
<p>Asıl etkiyi yapan şeyler başkadır: yapay zekâ botlarına robots.txt'te izin vermek, müşteri sorularına doğrudan cevap veren sayfalar, yapılandırılmış veri ve başka sitelerde anılmak.</p>

<h2>Peki biz neden kullanıyoruz?</h2>
<p>aisaasavran.com'da bir llms.txt var (<a href="/llms.txt">aisaasavran.com/llms.txt</a>). Nedenimiz dürüst: maliyeti neredeyse sıfır, sitemizin tek ve doğru bir özetini barındırıyor ve bir yapay zekâ ajanı ya da geliştirici aracı onu okursa doğru bilgiyi bulur. Ama görünürlüğümüzü llms.txt'e bağlamıyoruz; bunu ölçümle takip ediyoruz.</p>

<h2>Nasıl yazılır?</h2>
<ol>
<li>Kök dizine <code>/llms.txt</code> adıyla düz metin dosyası koyun.</li>
<li>İlk satır: <code># Site adı</code>. Ardından <code>&gt;</code> ile başlayan tek cümlelik tanım.</li>
<li>Bölümler (<code>## Ürün</code>, <code>## Rehberler</code>) ve altında <code>- [Sayfa adı](adres): kısa açıklama</code> satırları.</li>
<li>Yalnız gerçek ve güncel bilgi yazın; dosya, sitenizin geri kalanıyla çelişmesin.</li>
</ol>
`,
    faq: [
      ["llms.txt yapay zekâ görünürlüğünü artırır mı?", "2026 itibarıyla bunu gösteren bir kanıt yok. Büyük sağlayıcılar llms.txt'i sinyal olarak kullandığını açıklamadı; Google etkisi olmadığını yazdı. Zararsız ve ucuz bir eklemedir ama asıl etki robots.txt izinleri, net içerik ve başka sitelerde anılmaktan gelir."],
      ["llms.txt ile robots.txt arasındaki fark nedir?", "robots.txt botlara hangi sayfaları okuyabileceklerini söyler ve botlar buna uyar. llms.txt yalnız bir özet sunar; okunup okunmadığı garanti değildir."],
    ],
  },
];

export const NEW_EN = [
  {
    slug: "why-chatgpt-doesnt-mention-my-brand",
    tr: "markam-chatgptde-neden-cikmiyor",
    title: "Why doesn't ChatGPT mention my brand? 8 reasons and fixes",
    short: "Why ChatGPT doesn't mention my brand",
    description: "If ChatGPT doesn't recommend your brand or describes it wrongly, here are the 8 most common reasons and what to do about each, with a real example from our own brand.",
    body: `
<p class="lede">Short answer: ChatGPT usually skips a brand because there isn't enough written about it online, its site doesn't answer the customer's question directly, AI bots can't read the site, the brand is confused with a similar name, or it is missing from the comparison lists the AI reads. The fix is to measure which questions and engines you lose, then fix the sources the AI relies on.</p>

<h2>A real example: our own brand</h2>
<p>On 18 November 2026 we measured ourselves. We asked ChatGPT, Claude and Perplexity 7 unbranded questions about AI visibility tools, with live web search from Turkey, twice each: we were recommended in none of 42 answers, while competitors were recommended in 22 to 33. Asked about us by name, the three engines reacted differently: Perplexity found our site and described us correctly, Claude found only our GitHub repository, and ChatGPT confused us with a similarly named company (Savran AI). Several reasons below applied to us; we say what we did.</p>

<h2>8 reasons and what to do</h2>
<h3>1. Not enough is written about you</h3>
<p>AI recommends brands described often and consistently online. <b>Do:</b> get listed in sector lists, directories, comparison sites and local news; ask customers for reviews.</p>
<h3>2. Your site doesn't answer the question</h3>
<p>If customers ask "kids' dentist in Austin" and no page of yours says that plainly, AI cites another site. <b>Do:</b> write pages titled with customer questions, with a short clear answer in the first paragraph.</p>
<h3>3. AI bots can't read your site</h3>
<p>If robots.txt blocks OAI-SearchBot or ChatGPT-User, or content only loads with JavaScript, ChatGPT can't read your page in live search. <b>Do:</b> check robots.txt; serve key text in the page HTML.</p>
<h3>4. Your brand is confused with another name</h3>
<p>Our case: ChatGPT mixed us up with a similarly named company. <b>Do:</b> answer "Is X the same as Y?" on your site; put your official name, location and founder in Organization schema; use the same name everywhere. We added an FAQ, a founder page and a schema note.</p>
<h3>5. You're missing from comparison lists</h3>
<p>For "best X" questions ChatGPT often reads comparison articles. <b>Do:</b> list the sources cited when a competitor is recommended and reach out to them.</p>
<h3>6. What you do is vague</h3>
<p>"Innovative solutions" tells AI nothing. <b>Do:</b> state in one sentence what you sell, to whom, where and at what price range.</p>
<h3>7. You're checking the wrong question</h3>
<p>"Is brand X good?" always mentions you; unbranded questions are what matter. <b>Do:</b> measure 10 to 20 questions customers ask without knowing your name.</p>
<h3>8. The model's knowledge is old</h3>
<p>ChatGPT sometimes answers from training data, which is months old. <b>Do:</b> fix live-search visibility first; model knowledge follows with new training.</p>

<h2>Where to start</h2>
<ol>
<li>Measure today's position with unbranded questions (<a href="/check/">free check</a>).</li>
<li>Ask for your brand by name and see whether AI identifies you correctly.</li>
<li>List the sources cited when a competitor wins (<a href="/guides/why-chatgpt-recommends-your-competitor/">why ChatGPT recommends your competitor</a>).</li>
<li>Fix what applies, note the date, measure again in 2 to 4 weeks.</li>
</ol>
`,
    faq: [
      ["Why doesn't ChatGPT recommend my brand?", "Most often: not enough written about you online, your site doesn't answer the customer's question directly, AI bots can't read it, your brand is confused with another name, or you're missing from comparison lists."],
      ["ChatGPT confuses my brand with another company. What should I do?", "Add an FAQ that states clearly the two are different, include your official name, location and founder in Organization schema, and use the same name on every platform."],
    ],
  },
  {
    slug: "get-cited-by-perplexity",
    tr: "perplexityde-gorunmek",
    title: "How to show up in Perplexity: a guide to getting your brand cited",
    short: "Showing up in Perplexity",
    description: "Perplexity searches the web for every answer and cites its sources. What to do so your brand is mentioned and cited in Perplexity answers.",
    body: `
<p class="lede">Short answer: Perplexity searches the web for every question, reads a few pages and cites them as numbered sources. To show up, have pages that answer the question clearly and currently, that bots can read, and be present on the third-party sites Perplexity reads. Good news: changes show up much faster than in model knowledge.</p>

<h2>What makes Perplexity different</h2>
<ul>
<li><b>Always live search:</b> ChatGPT and Claude sometimes answer without searching; Perplexity searches by default.</li>
<li><b>Sources are always visible:</b> users see and click the pages read. Being cited means visitors.</li>
<li><b>Freshness matters:</b> new and updated pages are read often.</li>
</ul>

<h2>A real observation</h2>
<p>When we measured our own brand (18 November 2026) and asked for it by name, Perplexity found our site and described us correctly, while ChatGPT confused us with another company. A clear about page, an FAQ and structured data, combined with Perplexity always searching, gave the right result. For unbranded questions, though, Perplexity also recommended our competitors: being recognised is not the same as being recommended.</p>

<h2>What to do</h2>
<ol>
<li><b>Allow PerplexityBot</b> in robots.txt.</li>
<li><b>Make the question the heading and answer it in the first paragraph.</b></li>
<li><b>Show freshness:</b> an updated date on the page and accurate lastmod in your sitemap.</li>
<li><b>Give numbers and evidence:</b> price ranges, test data and measurements raise the chance of being cited.</li>
<li><b>Third-party sites:</b> list the comparison, review and forum pages Perplexity cites for competitors, and get on them.</li>
<li><b>Notify Bing:</b> submitting changed pages with IndexNow helps search engines find new content fast.</li>
</ol>

<h2>How to measure it</h2>
<p>Measure Perplexity separately; it can name different brands than other engines for the same question (see the <a href="/ai-visibility-index/">index</a>). On paid plans AI SaaSavran measures Perplexity with live search as its own engine, records its sources and shows your site's share of them.</p>
`,
    faq: [
      ["Which sites does Perplexity cite?", "Pages that answer the question most clearly and currently and that bots can read: often comparison and review sites, brands' own pages and news sites."],
      ["Is showing up in Perplexity faster than in ChatGPT?", "Usually yes. Because Perplexity searches live for every question, changes to your site and to sites about you show up faster."],
    ],
  },
  {
    slug: "geo-aeo-glossary",
    tr: "geo-aeo-sozlugu",
    title: "GEO and AEO glossary: 20 key terms in AI visibility",
    short: "GEO and AEO glossary",
    description: "GEO, AEO, LLMO, live search, model knowledge, mention, recommendation, citation, llms.txt, AI Overviews and other AI visibility terms, short and clear.",
    body: `
<p class="lede">AI visibility is a new field and its vocabulary grows fast. This glossary explains the 20 terms that come up most when talking about your brand in ChatGPT, Claude, Perplexity and Gemini answers.</p>

<h2>Core concepts</h2>
<dl>
<dt><b>GEO (generative engine optimization)</b></dt><dd>Work that helps a brand get mentioned and recommended in generative AI answers. More: <a href="/guides/what-is-geo/">what is GEO?</a></dd>
<dt><b>AEO (answer engine optimization)</b></dt><dd>Largely the same as GEO, stressing "answer engines".</dd>
<dt><b>LLMO (large language model optimization)</b></dt><dd>The same goal, framed around large language models.</dd>
<dt><b>AI visibility</b></dt><dd>How often a brand is mentioned, recommended and cited in AI answers.</dd>
<dt><b>Unbranded question</b></dt><dd>A customer question without the brand's name ("which robot vacuum is best?"). The basis of visibility measurement.</dd>
</dl>

<h2>Measurement terms</h2>
<dl>
<dt><b>Mention</b></dt><dd>The brand's name appears in the answer; positive, negative or neutral.</dd>
<dt><b>Recommendation</b></dt><dd>The AI suggests the brand as an option. A stronger signal than a mention.</dd>
<dt><b>Citation</b></dt><dd>The AI shows a page as a source. A site can be cited without the brand being mentioned.</dd>
<dt><b>Recommendation rate / share of voice</b></dt><dd>Answers recommending the brand divided by all answers. Example: 33 of 42 is 79%.</dd>
<dt><b>Live web search</b></dt><dd>The AI searches and reads pages before answering. Reflects today's web.</dd>
<dt><b>Model knowledge</b></dt><dd>The AI answers from training data without searching. Months old.</dd>
<dt><b>Tie</b></dt><dd>With few answers small gaps can be chance; we call gaps under 10 points a tie.</dd>
<dt><b>Hallucination</b></dt><dd>The AI states something false as fact, such as a wrong price or a feature that doesn't exist.</dd>
</dl>

<h2>Technical terms</h2>
<dl>
<dt><b>AI bots</b></dt><dd>Crawlers that read sites: GPTBot, OAI-SearchBot and ChatGPT-User (OpenAI); ClaudeBot, Claude-SearchBot and Claude-User (Anthropic); PerplexityBot (Perplexity). Allowed or blocked in robots.txt.</dd>
<dt><b>robots.txt</b></dt><dd>The file that tells bots what they may read. Blocking live-search bots lowers visibility.</dd>
<dt><b>Structured data (schema.org)</b></dt><dd>Code that marks up organisation, product, FAQ and address information so machines understand it.</dd>
<dt><b>Entity</b></dt><dd>The single record an AI recognises as "this brand is this company". Consistent names, schema and founder information make it clear.</dd>
<dt><b>llms.txt</b></dt><dd>A proposed file that summarises a site for AI; not an official standard. More: <a href="/guides/what-is-llms-txt/">what is llms.txt?</a></dd>
<dt><b>Google AI Overviews and AI Mode</b></dt><dd>AI summaries and chat mode in Google Search. We don't measure them yet and will say so here when we do.</dd>
<dt><b>IndexNow</b></dt><dd>A protocol that notifies search engines such as Bing and Yandex of changed pages instantly.</dd>
</dl>
`,
    faq: [
      ["What is the difference between a mention and a recommendation?", "A mention is the name appearing, possibly negatively. A recommendation is the AI suggesting the brand as an option; it is the more important signal."],
    ],
  },
  {
    slug: "what-is-llms-txt",
    tr: "llms-txt-nedir",
    title: "What is llms.txt? Does it affect AI visibility? (2026)",
    short: "What is llms.txt?",
    description: "llms.txt is a proposed file that summarises a site for AI. What it does, how to write one, and whether it actually affects visibility as of 2026.",
    body: `
<p class="lede">Short answer: llms.txt is a Markdown file at your site's root that tells AI what your site is and lists its key pages. It was proposed in September 2024 by Jeremy Howard of Answer.AI and is not an official standard. As of 2026, OpenAI, Anthropic and Google have not announced that they read third-party llms.txt files when generating answers, and Google's documentation says it neither helps nor hurts visibility in Search. It is not a magic switch; it is a cheap, harmless addition.</p>

<h2>What it is for</h2>
<p>Web pages are full of menus, ads and code; llms.txt offers a clean summary so an AI can understand your site quickly: site name, a one-sentence description and links to key pages with short notes. Some sites also publish llms-full.txt with all content in one file.</p>

<h2>Does it actually matter?</h2>
<ul>
<li><b>No official support:</b> no major provider has said it uses llms.txt as a signal in production answers.</li>
<li><b>Google is explicit:</b> its AI search guidance says llms.txt has no positive or negative effect on visibility.</li>
<li><b>Bots rarely ask for it:</b> independent studies show AI bots request the file very rarely.</li>
</ul>
<p>What does matter: allowing AI bots in robots.txt, pages that answer customer questions directly, structured data and being mentioned on other sites.</p>

<h2>Why we use one anyway</h2>
<p>aisaasavran.com has an llms.txt (<a href="/llms.txt">aisaasavran.com/llms.txt</a>). Honestly: it costs almost nothing, it holds one accurate summary of our site, and if an AI agent or developer tool reads it, it finds correct information. We don't tie our visibility to it; we track that with measurement.</p>

<h2>How to write one</h2>
<ol>
<li>Put a plain text file at <code>/llms.txt</code>.</li>
<li>First line <code># Site name</code>, then a one-sentence description starting with <code>&gt;</code>.</li>
<li>Sections (<code>## Product</code>, <code>## Guides</code>) with lines like <code>- [Page name](url): short note</code>.</li>
<li>Only accurate, current information that matches the rest of your site.</li>
</ol>
`,
    faq: [
      ["Does llms.txt improve AI visibility?", "As of 2026 there is no evidence it does. Major providers haven't said they use it as a signal and Google says it has no effect. It is cheap and harmless, but real impact comes from robots.txt access, clear content and mentions elsewhere."],
    ],
  },
];
