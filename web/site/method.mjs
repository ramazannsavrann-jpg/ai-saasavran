// Metodoloji, marka görünürlüğü ve ürün görünürlüğü sayfaları (TR + EN).
// Kaynak: engine/src/metrics.ts (anılma/öneri/sıra/kaynak, Wilson aralığı, MIN_SAMPLE=20), insights.ts (kendi site payı),
// product.ts (ürün doğruluğu), shopping.ts (Google Shopping), web/site/build.mjs PLAN_ROWS (tekrar sayıları).
// Kod değişirse bu sayfa da güncellenmeli. Ölçmediğimiz bir motoru (Perplexity, Google AI Overviews) yazmayın.

// Her yerde aynı kullanılan tanım cümlesi
export const DEF = {
  en: "AI SaaSavran measures how often ChatGPT, Gemini and Claude mention and recommend brands and products, in what position they appear, and which sources they rely on.",
  tr: "AI SaaSavran, markaların ve ürünlerin ChatGPT, Gemini ve Claude'da ne sıklıkla anıldığını, önerildiğini, kaçıncı sırada çıktığını ve hangi kaynaklara dayandığını ölçer.",
};

export const METHOD_PAGES = [
  {
    key: "method", lang: "en", path: "/methodology/", alt: "/tr/metodoloji/",
    title: "Methodology: how AI SaaSavran measures AI visibility",
    short: "Methodology",
    description: "How AI SaaSavran measures mention, recommendation, position and citation in ChatGPT, Gemini and Claude: questions, repetition, live search, confidence ranges, limits.",
    body: `
<p class="lede">${DEF.en} This page explains exactly how: which questions are asked, how often, how each metric is calculated and where the limits are.</p>

<h2>Two separate things we measure</h2>
<p><b>Brand visibility</b> asks whether the AI names and recommends your brand when customers ask about your category. <b>Product visibility</b> asks whether a specific product appears in buying recommendations, and whether what the AI says about it is correct. They answer different questions, so we never merge them into one score. See <a href="/brand-visibility/">brand visibility</a> and <a href="/product-visibility/">product visibility</a>.</p>

<h2>Question set</h2>
<ul>
<li>Questions are the ones your customers would ask: you write them or pick from suggestions. Each brand has its own set in Turkish or English, for a chosen country.</li>
<li>Set size by plan: Free 15 questions, Plus 25, Pro and Business 30 per brand.</li>
<li>The set stays fixed between runs so results are comparable week to week. If you change questions, the trend restarts from that point.</li>
</ul>

<h2>Run model</h2>
<ul>
<li>Measurements run automatically once a week.</li>
<li>Free plan: Gemini, each question once, without live web search (4 runs a month).</li>
<li>Paid plans: ChatGPT and Gemini ask each question twice per run, Claude once. ChatGPT and Claude use live web search.</li>
<li>Answers are requested through the official APIs, without a logged-in user, so there is no personal history or personalisation.</li>
</ul>

<h2>Live web search vs. model knowledge</h2>
<p>An answer with live web search reflects pages on the web today and comes with the sources used. An answer from model knowledge reflects the model's training data and has no sources. Both are useful, but they answer different questions, so every result is labelled with its type and they are never mixed in one number.</p>

<h2>Metric definitions</h2>
<table><thead><tr><th>Metric</th><th>Definition</th></tr></thead><tbody>
<tr><td>Mention rate</td><td>Share of answers in which the brand's name appears at least once. Whole-word matching only: Turkish suffixes ("Garanti'nin") and the brand's domain count; the start of another word ("Ada" in "Adalet") does not.</td></tr>
<tr><td>Recommendation rate</td><td>Share of answers that recommend the brand. Counted when the brand appears in a list (numbered, bulleted or heading) without negative wording, or in the same sentence as a recommendation phrase. Plain-text mentions that could be either are sent to a small AI classifier.</td></tr>
<tr><td>Position</td><td>In answers that recommend the brand, its place in the answer's list, counting untracked brands too. Reports show the best position per question.</td></tr>
<tr><td>Citation rate</td><td>Share of answers whose source list includes the brand's own domain. Only meaningful with live web search.</td></tr>
<tr><td>Share of recommendations</td><td>The brand's recommendations divided by all recommendations of the tracked brands (you plus competitors).</td></tr>
<tr><td>Owned-source share</td><td>Of all sources cited, the share that is your site, competitors' sites and third-party sites.</td></tr>
</tbody></table>

<h2>Confidence ranges and sample size</h2>
<p>AI assistants can answer the same question differently each time. Every rate comes with a 95% confidence range (Wilson interval), so 3 of 5 shows as roughly 23–88%, not as a precise 60%. When a result rests on fewer than 20 answers, the report marks it as low confidence.</p>

<h2>Product-level checks</h2>
<ul>
<li><b>Product accuracy:</b> we ask each engine about the product and compare up to 8 factual claims (price, specifications, use) with the facts the brand owner entered: correct, wrong or cannot be verified. The comparison is an AI step and can be wrong, so each result is marked "please check".</li>
<li><b>Google Shopping position:</b> where the product and competing products appear in Google Shopping results, with price and seller.</li>
</ul>

<h2>Limits</h2>
<ul>
<li>Results describe the answers on the measurement date. Engines and the web change constantly.</li>
<li>Real users may see different answers because of their account history, location or app version.</li>
<li>Recommendation detection is rule-based plus a small AI step; it is reliable for lists but can misread unusual wording.</li>
<li>We do not currently measure Perplexity or Google's AI answers in search.</li>
</ul>

<h2>Sample-data policy</h2>
<ul>
<li>Every number shown as a measurement comes from a real API answer. If a connection is missing, no result is shown as real.</li>
<li>Demo screens and examples are labelled as sample data and do not represent a real customer measurement.</li>
<li>Public posts and videos show measured brands as letters, list the brands measured, give the date and sample size, and say that these are the AI's answers.</li>
</ul>
`,
    faq: [
      ["How does AI SaaSavran calculate recommendation rate?", "Recommendation rate is the share of answers that recommend the brand: it appears in a list without negative wording, or next to a recommendation phrase. Ambiguous plain-text mentions are checked by a small AI classifier."],
      ["Does AI SaaSavran use live web search?", "Yes on paid plans: ChatGPT and Claude answer with live web search and their sources are recorded. The free plan uses Gemini without live search, labelled as model knowledge."],
      ["How many times is each question asked?", "Once a week. On paid plans ChatGPT and Gemini ask each question twice per run and Claude once; on the free plan Gemini asks once."],
    ],
  },
  {
    key: "method", lang: "tr", path: "/tr/metodoloji/", alt: "/methodology/",
    title: "Metodoloji: AI SaaSavran yapay zekâ görünürlüğünü nasıl ölçer?",
    short: "Metodoloji",
    description: "AI SaaSavran ChatGPT, Gemini ve Claude'da anılma, önerilme, sıra ve kaynak gösterilmeyi nasıl ölçer: sorular, tekrar, canlı arama, güven aralığı, sınırlar.",
    body: `
<p class="lede">${DEF.tr} Bu sayfa bunu tam olarak nasıl yaptığımızı anlatır: hangi sorular soruluyor, ne sıklıkla, her metrik nasıl hesaplanıyor ve sınırlar neler.</p>

<h2>Ayrı ölçtüğümüz iki şey</h2>
<p><b>Marka görünürlüğü</b>, müşteriler kategorinizi sorduğunda yapay zekânın markanızın adını verip önermediğini ölçer. <b>Ürün görünürlüğü</b> ise belirli bir ürünün satın alma önerilerinde çıkıp çıkmadığını ve yapay zekânın o ürün hakkında söylediklerinin doğru olup olmadığını ölçer. İkisi farklı sorulara cevap verir; bu yüzden asla tek bir puanda birleştirmeyiz. Bkz. <a href="/tr/marka-gorunurlugu/">marka görünürlüğü</a> ve <a href="/tr/urun-gorunurlugu/">ürün görünürlüğü</a>.</p>

<h2>Soru seti</h2>
<ul>
<li>Sorular, müşterilerinizin soracağı sorulardır: siz yazarsınız ya da önerilerden seçersiniz. Her markanın seçilen ülke için Türkçe veya İngilizce kendi soru seti vardır.</li>
<li>Paket başına soru sayısı: Ücretsiz 15, Plus 25, Pro ve Business marka başına 30.</li>
<li>Sonuçlar haftadan haftaya karşılaştırılabilsin diye soru seti ölçümler arasında sabit kalır. Soruları değiştirirseniz eğilim o noktadan yeniden başlar.</li>
</ul>

<h2>Çalıştırma modeli</h2>
<ul>
<li>Ölçümler haftada bir otomatik çalışır.</li>
<li>Ücretsiz paket: Gemini, her soru bir kez, canlı web araması olmadan (ayda 4 ölçüm).</li>
<li>Ücretli paketler: her ölçümde ChatGPT ve Gemini her soruyu iki kez, Claude bir kez sorar. ChatGPT ve Claude canlı web aramasıyla cevap verir.</li>
<li>Cevaplar resmî API'ler üzerinden, oturum açmış bir kullanıcı olmadan alınır; kişisel geçmiş veya kişiselleştirme yoktur.</li>
</ul>

<h2>Canlı web araması ve model bilgisi</h2>
<p>Canlı web aramalı cevap bugünkü internet sayfalarını yansıtır ve kullanılan kaynaklarla gelir. Model bilgisine dayalı cevap modelin eğitim verisini yansıtır ve kaynak içermez. İkisi de faydalıdır ama farklı sorulara cevap verir; bu yüzden her sonuç türüyle etiketlenir ve ikisi asla tek bir sayıda karıştırılmaz.</p>

<h2>Metrik tanımları</h2>
<table><thead><tr><th>Metrik</th><th>Tanım</th></tr></thead><tbody>
<tr><td>Anılma oranı</td><td>Markanın adının en az bir kez geçtiği cevapların oranı. Yalnız tam kelime eşleşmesi sayılır: Türkçe ekli hâli ("Garanti'nin") ve markanın alan adı sayılır; başka bir kelimenin başı ("Adalet" içindeki "Ada") sayılmaz.</td></tr>
<tr><td>Önerilme oranı</td><td>Markayı öneren cevapların oranı. Marka olumsuz bir ifade olmadan bir listede (numaralı, madde işaretli veya başlık) geçiyorsa ya da bir öneri ifadesiyle aynı cümlede geçiyorsa sayılır. Öneri mi bilgi mi olduğu belirsiz düz metin anılmaları küçük bir yapay zekâ sınıflandırıcısına gider.</td></tr>
<tr><td>Sıra</td><td>Markayı öneren cevaplarda, cevaptaki listede kaçıncı madde olduğu; takip edilmeyen markalar da sayılır. Raporda soru başına en iyi sıra gösterilir.</td></tr>
<tr><td>Kaynak gösterilme oranı</td><td>Kaynak listesinde markanın kendi alan adının bulunduğu cevapların oranı. Yalnız canlı web aramasında anlamlıdır.</td></tr>
<tr><td>Öneri payı</td><td>Markanın önerilerinin, takip edilen tüm markaların (siz + rakipler) önerilerine oranı.</td></tr>
<tr><td>Kendi site payı</td><td>Kaynak gösterilen tüm siteler içinde sizin sitenizin, rakip sitelerin ve üçüncü taraf sitelerin payı.</td></tr>
</tbody></table>

<h2>Güven aralığı ve örneklem</h2>
<p>Yapay zekâ aynı soruya her seferinde farklı cevap verebilir. Her oran %95 güven aralığıyla (Wilson aralığı) gösterilir; yani 5'te 3, kesin bir %60 olarak değil, yaklaşık %23–88 olarak görünür. Bir sonuç 20'den az cevaba dayanıyorsa raporda düşük güven olarak işaretlenir.</p>

<h2>Ürün düzeyindeki kontroller</h2>
<ul>
<li><b>Ürün doğruluğu:</b> her motora ürünü sorar, en fazla 8 somut iddiayı (fiyat, özellik, kullanım) marka sahibinin girdiği bilgilerle karşılaştırırız: doğru, yanlış veya doğrulanamadı. Karşılaştırma bir yapay zekâ adımıdır ve yanılabilir; bu yüzden her sonuç "kontrol edin" notuyla gösterilir.</li>
<li><b>Google Shopping sırası:</b> ürünün ve rakip ürünlerin Google Shopping sonuçlarında kaçıncı sırada, hangi fiyat ve satıcıyla çıktığı.</li>
</ul>

<h2>Sınırlar</h2>
<ul>
<li>Sonuçlar ölçüm tarihindeki cevapları anlatır. Motorlar ve internet sürekli değişir.</li>
<li>Gerçek kullanıcılar hesap geçmişi, konum veya uygulama sürümü yüzünden farklı cevaplar görebilir.</li>
<li>Öneri tespiti kural tabanlıdır, belirsiz durumlarda küçük bir yapay zekâ adımı kullanılır; listelerde güvenilirdir ama alışılmadık ifadeleri yanlış okuyabilir.</li>
<li>Şu an Perplexity'yi ve Google arama sonuçlarındaki yapay zekâ cevaplarını ölçmüyoruz.</li>
</ul>

<h2>Örnek veri politikası</h2>
<ul>
<li>Ölçüm olarak gösterilen her sayı gerçek bir API cevabından gelir. Bağlantı yoksa hiçbir sonuç gerçekmiş gibi gösterilmez.</li>
<li>Demo ekranları ve örnekler "örnek veri" olarak etiketlenir ve gerçek bir müşteri ölçümünü temsil etmez.</li>
<li>Herkese açık yazı ve videolarda ölçülen markalar harfle gösterilir, ölçülen markalar listelenir, tarih ve örneklem verilir ve bunların yapay zekânın cevapları olduğu yazılır.</li>
</ul>
`,
    faq: [
      ["AI SaaSavran önerilme oranını nasıl hesaplar?", "Önerilme oranı, markayı öneren cevapların oranıdır: marka olumsuz ifade olmadan bir listede veya bir öneri ifadesinin yanında geçer. Belirsiz düz metin anılmaları küçük bir yapay zekâ sınıflandırıcısıyla kontrol edilir."],
      ["AI SaaSavran canlı web araması kullanıyor mu?", "Ücretli paketlerde evet: ChatGPT ve Claude canlı web aramasıyla cevap verir ve kaynakları kaydedilir. Ücretsiz paket Gemini'yi canlı arama olmadan kullanır ve bu model bilgisi olarak etiketlenir."],
      ["Her soru kaç kez soruluyor?", "Haftada bir ölçüm yapılır. Ücretli paketlerde her ölçümde ChatGPT ve Gemini her soruyu iki kez, Claude bir kez sorar; ücretsiz pakette Gemini bir kez sorar."],
    ],
  },
  {
    key: "brand", lang: "en", path: "/brand-visibility/", alt: "/tr/marka-gorunurlugu/",
    title: "Brand visibility in ChatGPT, Gemini and Claude",
    short: "Brand visibility",
    description: "Does the AI name and recommend your brand when customers ask about your category? What AI SaaSavran measures for brand visibility and how to read it.",
    body: `
<p class="lede">Brand visibility answers one question: <b>when customers ask an AI assistant about your category, does it name and recommend your brand, and ahead of which competitors?</b> It is measured separately from <a href="/product-visibility/">product visibility</a>.</p>
<h2>Who it is for</h2>
<p>Local businesses, service companies, online shops, agencies and content creators: anyone whose customers ask questions like "best dentist in Antalya", "which bank for a home loan" or "which online store is reliable".</p>
<h2>What is measured</h2>
<ul>
<li>Mention rate, recommendation rate and position, per engine (ChatGPT, Gemini, Claude).</li>
<li>Share of recommendations against the competitors you track, and untracked brands the AI names instead of you.</li>
<li>Questions where you lose: the competitor named instead, and the reason or source given.</li>
<li>Sources the AI cited, and the share that is your site, competitors' sites and third-party sites.</li>
<li>Whether the AI's statements about your brand (address, hours, services, prices) match your fact card.</li>
</ul>
<h2>How to read it</h2>
<p>Start with recommendation rate per engine, not a total. A low rate with many third-party sources usually means the review and listing sites the AI reads don't cover you well. A brand that is mentioned but not recommended is usually described, not endorsed. Check the confidence range before acting on a change. Definitions and limits are on the <a href="/methodology/">methodology</a> page.</p>
`,
    faq: [
      ["What is AI brand visibility?", "How often AI assistants such as ChatGPT, Gemini and Claude name and recommend a brand when customers ask about its category, compared with competitors."],
      ["Is brand visibility the same as product visibility?", "No. Brand visibility is about the brand in category questions; product visibility is about a specific product in buying recommendations and whether the AI's facts about it are correct."],
      ["Why does my brand appear in one engine but not another?", "Engines use different search providers, sources and training data, so results are reported per engine."],
    ],
  },
  {
    key: "brand", lang: "tr", path: "/tr/marka-gorunurlugu/", alt: "/brand-visibility/",
    title: "ChatGPT, Gemini ve Claude'da marka görünürlüğü",
    short: "Marka görünürlüğü",
    description: "Müşteriler kategorinizi sorduğunda yapay zekâ markanızı söyleyip öneriyor mu? AI SaaSavran marka görünürlüğünde neyi ölçer, nasıl okunur?",
    body: `
<p class="lede">Marka görünürlüğü tek bir soruya cevap verir: <b>müşteriler kategorinizi bir yapay zekâ asistanına sorduğunda, markanızın adını verip öneriyor mu ve hangi rakiplerin önünde?</b> <a href="/tr/urun-gorunurlugu/">Ürün görünürlüğünden</a> ayrı ölçülür.</p>
<h2>Kimler için?</h2>
<p>Yerel işletmeler, hizmet şirketleri, online mağazalar, ajanslar ve içerik üreticileri: müşterisi "Antalya'da en iyi diş hekimi", "konut kredisi için hangi banka" veya "hangi alışveriş sitesi güvenilir" gibi sorular soran herkes.</p>
<h2>Neler ölçülür?</h2>
<ul>
<li>Motor bazında (ChatGPT, Gemini, Claude) anılma oranı, önerilme oranı ve sıra.</li>
<li>Takip ettiğiniz rakiplere karşı öneri payı ve yapay zekânın sizin yerinize andığı, takip edilmeyen markalar.</li>
<li>Kaybettiğiniz sorular: yerinize anılan rakip ve verilen gerekçe ya da kaynak.</li>
<li>Yapay zekânın gösterdiği kaynaklar ve bunlar içinde sizin sitenizin, rakip sitelerin ve üçüncü taraf sitelerin payı.</li>
<li>Yapay zekânın markanız hakkında söyledikleri (adres, saatler, hizmetler, fiyatlar) doğru bilgi kartınızla uyuşuyor mu.</li>
</ul>
<h2>Nasıl okunur?</h2>
<p>Toplamdan değil, motor bazında önerilme oranından başlayın. Düşük oran ve çok sayıda üçüncü taraf kaynak genellikle yapay zekânın okuduğu inceleme ve listeleme sitelerinin sizi iyi anlatmadığını gösterir. Anılan ama önerilmeyen bir marka genellikle tavsiye edilmiyor, sadece anlatılıyordur. Bir değişikliğe göre hareket etmeden önce güven aralığına bakın. Tanımlar ve sınırlar <a href="/tr/metodoloji/">metodoloji</a> sayfasında.</p>
`,
    faq: [
      ["Yapay zekâda marka görünürlüğü nedir?", "ChatGPT, Gemini ve Claude gibi yapay zekâ asistanlarının, müşteriler kategoriyi sorduğunda bir markayı rakiplerine göre ne sıklıkla andığı ve önerdiği."],
      ["Marka görünürlüğü ile ürün görünürlüğü aynı şey mi?", "Hayır. Marka görünürlüğü kategori sorularında markayla ilgilidir; ürün görünürlüğü belirli bir ürünün satın alma önerilerinde çıkıp çıkmadığı ve yapay zekânın onun hakkındaki bilgilerinin doğru olup olmadığıyla ilgilidir."],
      ["Markam neden bir motorda çıkıp diğerinde çıkmıyor?", "Motorlar farklı arama sağlayıcıları, kaynaklar ve eğitim verileri kullanır; bu yüzden sonuçlar motor bazında raporlanır."],
    ],
  },
  {
    key: "product", lang: "en", path: "/product-visibility/", alt: "/tr/urun-gorunurlugu/",
    title: "Product visibility in AI shopping answers",
    short: "Product visibility",
    description: "Does a specific product appear when buyers ask ChatGPT, Gemini or Claude what to buy, and are the AI's price and specs right? What AI SaaSavran measures.",
    body: `
<p class="lede">Product visibility answers a different question from brand visibility: <b>when buyers ask an AI assistant what to buy, does your specific product appear, against which competing products, and is what the AI says about it correct?</b></p>
<h2>Who it is for</h2>
<p>Product brands, manufacturers and online stores selling phones, headphones, appliances, cosmetics or any product people compare before buying.</p>
<h2>What is measured</h2>
<ul>
<li>How often the product is named and recommended in buying questions, per engine, and which competing models appear.</li>
<li>Product accuracy: up to 8 claims per answer (price, specifications, use) checked against the facts you enter, marked correct, wrong or cannot be verified.</li>
<li>Google Shopping position: where your product and competing products appear, with price and seller.</li>
<li>Which sources the AI used for its product recommendations.</li>
</ul>
<h2>How to read it</h2>
<p>A brand can be visible while its products are not, and the reverse. A wrong price or spec in AI answers is usually repeated from an outdated source; the cited sources show where to fix it. The accuracy check is an AI step and can be wrong, so confirm before acting. Definitions and limits are on the <a href="/methodology/">methodology</a> page.</p>
`,
    faq: [
      ["What is AI product visibility?", "How often a specific product is named and recommended when buyers ask AI assistants what to buy, and whether the AI's facts about it are correct."],
      ["How does AI SaaSavran check product accuracy?", "It asks each engine about the product and compares up to 8 factual claims with the facts the brand owner entered. The comparison is an AI step and can be wrong, so each result says to check it."],
      ["Does AI SaaSavran track Google Shopping?", "Yes. It records where your product and competing products appear in Google Shopping results, with price and seller."],
    ],
  },
  {
    key: "product", lang: "tr", path: "/tr/urun-gorunurlugu/", alt: "/product-visibility/",
    title: "Yapay zekâ alışveriş cevaplarında ürün görünürlüğü",
    short: "Ürün görünürlüğü",
    description: "Alıcılar ChatGPT, Gemini veya Claude'a ne alacaklarını sorduğunda ürününüz çıkıyor mu, fiyat ve özellikler doğru mu? AI SaaSavran neyi ölçer?",
    body: `
<p class="lede">Ürün görünürlüğü, marka görünürlüğünden farklı bir soruya cevap verir: <b>alıcılar bir yapay zekâ asistanına ne almaları gerektiğini sorduğunda, sizin ürününüz hangi rakip ürünlere karşı çıkıyor ve yapay zekânın onun hakkında söyledikleri doğru mu?</b></p>
<h2>Kimler için?</h2>
<p>Telefon, kulaklık, beyaz eşya, kozmetik ya da insanların almadan önce karşılaştırdığı her türlü ürünü satan ürün markaları, üreticiler ve online mağazalar.</p>
<h2>Neler ölçülür?</h2>
<ul>
<li>Satın alma sorularında ürünün motor bazında ne sıklıkla anıldığı ve önerildiği, hangi rakip modellerin çıktığı.</li>
<li>Ürün doğruluğu: cevap başına en fazla 8 iddia (fiyat, özellik, kullanım) girdiğiniz bilgilerle karşılaştırılır; doğru, yanlış veya doğrulanamadı olarak işaretlenir.</li>
<li>Google Shopping sırası: ürününüzün ve rakip ürünlerin hangi sırada, hangi fiyat ve satıcıyla çıktığı.</li>
<li>Yapay zekânın ürün önerilerinde kullandığı kaynaklar.</li>
</ul>
<h2>Nasıl okunur?</h2>
<p>Bir marka görünür olup ürünleri görünmez olabilir; tersi de olabilir. Yapay zekâ cevaplarındaki yanlış fiyat veya özellik genellikle eski bir kaynaktan tekrarlanır; kaynak gösterilen siteler nerede düzeltme gerektiğini gösterir. Doğruluk kontrolü bir yapay zekâ adımıdır ve yanılabilir; harekete geçmeden önce doğrulayın. Tanımlar ve sınırlar <a href="/tr/metodoloji/">metodoloji</a> sayfasında.</p>
`,
    faq: [
      ["Yapay zekâda ürün görünürlüğü nedir?", "Alıcılar yapay zekâ asistanlarına ne alacaklarını sorduğunda belirli bir ürünün ne sıklıkla anıldığı ve önerildiği, yapay zekânın o ürün hakkındaki bilgilerinin doğru olup olmadığı."],
      ["AI SaaSavran ürün doğruluğunu nasıl kontrol eder?", "Her motora ürünü sorar ve en fazla 8 somut iddiayı marka sahibinin girdiği bilgilerle karşılaştırır. Karşılaştırma bir yapay zekâ adımıdır ve yanılabilir; bu yüzden her sonuçta kontrol edin notu vardır."],
      ["AI SaaSavran Google Shopping'i takip ediyor mu?", "Evet. Ürününüzün ve rakip ürünlerin Google Shopping sonuçlarında hangi sırada, hangi fiyat ve satıcıyla çıktığını kaydeder."],
    ],
  },
];
