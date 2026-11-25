// Blog: haftada bir yazı. Kaynak: YouTube videoları için yaptığımız GERÇEK ölçümler (seslendirme dalı → video/sablon/*.json).
// Kurallar (kullanıcı kararları, 12–13 Kasım 2026):
//  - 18 Kasım kararından sonra yazılar gerçek marka adlarıyla (realNames: true). Eski yazılarda markalar harfle (Marka A/B…),
//    harfler rastgele; ölçülen markaların gerçek adları yazının sonunda alfabetik liste olarak verilir.
//  - "Bunlar yapay zekânın cevaplarıdır" notu, tarih, örneklem, "tüm pazarı temsil etmez".
//  - Uydurma sayı yok: her rakam ölçüm dosyasından gelir. AI SaaSavran'ın rakibi olan araçların adı geçmez.
// Her yazı Türkçe + İngilizce çift olarak eklenir (pair alanı aynı).

export const POSTS = [
  {
    pair: "telefon-2026-11",
    lang: "tr",
    slug: "yapay-zeka-hangi-telefonu-oneriyor",
    date: "2026-11-13",
    title: "Yapay zekâ Türkiye'de hangi telefonu öneriyor? 32 cevaptan 5 şaşırtıcı sonuç",
    short: "Yapay zekâ hangi telefonu öneriyor?",
    description: "ChatGPT, Claude ve Gemini'ye telefon alacak bir müşterinin sorularını sorduk. Motorlar aynı markayı önermiyor, kaynaklar ise çoğunlukla yabancı siteler.",
    cover: "/blog/telefon-tr.jpg",
    video: { id: "L5FWXmAxwHo", title: "Yapay zekâ Türkiye'de hangi telefonu öneriyor? (58 sn)" },
    names: "Apple, Huawei, Oppo, Samsung, Xiaomi",
    body: `
<p class="lede">Telefon almadan önce artık birçok kişi Google yerine ChatGPT'ye soruyor. Biz de Türkiye'deki bir müşterinin soracağı 8 soruyu ChatGPT, Claude ve Gemini'ye sorduk ve 5 büyük telefon markasının cevaplarda ne kadar önerildiğini saydık. Kısa cevap: <b>tek bir marka 32 cevabın 26'sında önerildi, en az önerilen marka ise sadece 4'ünde.</b></p>

<h2>Nasıl ölçtük?</h2>
<p>"Pil ömrü en uzun telefon hangisi?", "Fiyat performans en iyisi?", "Kamerası en iyi telefon?" gibi 8 gerçek müşteri sorusunu Türkçe sorduk. ChatGPT ve Claude canlı web aramasıyla cevap verdi (her biri 16 cevap, toplam 32). Gemini ücretsiz katmanda aramasız, yani yalnızca kendi bilgisiyle cevap verdi (10 cevap). Ölçüm tarihi: 13 Kasım 2026.</p>

<h2>1. Bir marka açık ara önde</h2>
<table><thead><tr><th>Marka</th><th>Önerildiği cevap (32 cevapta)</th></tr></thead><tbody>
<tr><td>Marka B</td><td><b>26</b></td></tr><tr><td>Marka D</td><td>22</td></tr><tr><td>Marka A</td><td>16</td></tr><tr><td>Marka E</td><td>7</td></tr><tr><td>Marka C</td><td>4</td></tr>
</tbody></table>
<p>Marka B, ChatGPT ve Claude cevaplarının yaklaşık beşte dördünde öneriliyor. Marka C ise neredeyse hiç geçmiyor. Bu iki marka da Türkiye'de bilinen, mağazalarda satılan markalar; aradaki fark ürün kalitesinden çok yapay zekânın baktığı kaynaklardan geliyor olabilir.</p>

<h2>2. Motorlar aynı düşünmüyor</h2>
<table><thead><tr><th>Marka</th><th>ChatGPT (/16)</th><th>Claude (/16)</th><th>Gemini (/10)</th></tr></thead><tbody>
<tr><td>Marka B</td><td>13</td><td>13</td><td>10</td></tr><tr><td>Marka D</td><td>8</td><td>14</td><td>9</td></tr><tr><td>Marka A</td><td>5</td><td>11</td><td>10</td></tr><tr><td>Marka E</td><td>2</td><td>5</td><td>0</td></tr><tr><td>Marka C</td><td><b>0</b></td><td>4</td><td>2</td></tr>
</tbody></table>
<p>En çarpıcı fark Marka D'de: Claude 16 cevabın 14'ünde öneriyor, ChatGPT yalnızca 8'inde. Marka C'yi ise ChatGPT hiç önermedi. Yani "yapay zekâda görünürlük" tek bir sayı değil; müşteriniz hangi asistanı kullanıyorsa sonuç ona göre değişiyor.</p>

<h2>3. Kayıp soru bazında oluyor</h2>
<ul>
<li><b>Pil ömrü:</b> Marka D 4 cevabın 3'ünde önerildi, genel lider Marka B ise 0'ında.</li>
<li><b>Fiyat performans:</b> Marka A 4/4 önerildi, Marka D 0/4.</li>
<li><b>Kamera:</b> Marka B ve Marka D ikisi de 4/4.</li>
</ul>
<p>Genel sıralamada lider olan bir marka, belirli bir soruda tamamen kaybolabiliyor. Bir marka için asıl önemli olan, kendi müşterisinin hangi soruyu sorduğu.</p>

<h2>4. Model düzeyinde: en çok önerilen telefonun bilgileri doğru mu?</h2>
<p>En sık adı geçen model (Model 1) ChatGPT'nin 16 cevabının 8'inde, Claude'un 16 cevabının 9'unda geçti. Yapay zekânın bu model hakkındaki 7 iddiasını resmî özelliklerle karşılaştırdık: <b>3'ü doğru, 0'ı yanlış, 4'ü doğrulanamadı</b>. Model 1, Google Shopping Türkiye'de de 1. sıradaydı.</p>

<h2>5. Türkçe sorulara yabancı kaynaklar</h2>
<p>Yapay zekânın en çok kaynak gösterdiği siteler (32 cevapta): techradar.com (6), tomsguide.com (5), apple.com (4), cep.org.tr (4), telefontavsiye.com (4). Sorular Türkçe olduğu hâlde ilk ikisi yabancı inceleme siteleri. Türkçe içerik üreten markalar ve inceleme siteleri için bu boşluk bir fırsat.</p>

<h2>Markanız için ne anlama geliyor?</h2>
<p>Yapay zekâ bir markayı önerirken reklamınıza değil, internette markanız hakkında yazılanlara bakıyor: inceleme siteleri, karşılaştırma yazıları, forumlar. Hangi sorularda kaybettiğinizi ve yapay zekânın hangi siteye baktığını bilmeden bunu düzeltmek zor. <a href="/tr/kontrol/">Ücretsiz kontrol</a> ile işletmenizin Gemini'de geçip geçmediğine bakabilir, <a href="/kayit">ücretsiz pakette</a> kendi sorularınızı ölçebilirsiniz.</p>`,
    faq: [
      ["Yapay zekâ en çok hangi telefon markasını öneriyor?", "13 Kasım 2026 ölçümümüzde bir marka ChatGPT ve Claude'un 32 cevabının 26'sında önerildi. Sonuçlar soruya ve motora göre değişiyor; ölçülen markalar yazının sonunda listeleniyor."],
      ["ChatGPT ve Claude aynı telefonları mı öneriyor?", "Hayır. Bir marka Claude'da 16 cevabın 14'ünde, ChatGPT'de 8'inde önerildi; başka bir markayı ChatGPT hiç önermedi."],
      ["Bu sonuçlar tüm pazarı temsil ediyor mu?", "Hayır. 8 soru ve 42 cevaplık küçük bir örneklem; yapay zekânın o günkü cevaplarını gösterir."],
    ],
  },
  {
    pair: "telefon-2026-11",
    lang: "en",
    slug: "which-phone-does-ai-recommend",
    date: "2026-11-13",
    title: "Which phone does AI recommend? 5 surprising findings from 32 answers",
    short: "Which phone does AI recommend?",
    description: "We asked ChatGPT, Claude and Gemini the questions a phone buyer asks. The engines disagree, and one review site appears in 13 of 32 answers.",
    cover: "/blog/telefon-en.jpg",
    video: { id: "BivrCJ0BBik", title: "Which phone does AI recommend? (49 s)" },
    names: "Apple, Google, OnePlus, Samsung, Xiaomi",
    body: `
<p class="lede">More and more buyers ask ChatGPT before they buy a phone. We asked ChatGPT, Claude and Gemini 8 real buyer questions in English and counted how often 5 major phone brands were recommended. Short answer: <b>two brands were recommended in 25–26 of 32 answers, while one was recommended in only 8.</b></p>

<h2>How we measured</h2>
<p>We asked 8 buyer questions such as "Which phone has the longest battery life?", "Best value for money?" and "Best camera?". ChatGPT and Claude answered with live web search (16 answers each, 32 in total). Gemini answered on the free tier without search, from its own knowledge (16 answers). Date: 13 November 2026.</p>

<h2>1. Two brands share the top</h2>
<table><thead><tr><th>Brand</th><th>Recommended in (of 32 answers)</th></tr></thead><tbody>
<tr><td>Brand B</td><td><b>26</b></td></tr><tr><td>Brand D</td><td>25</td></tr><tr><td>Brand E</td><td>19</td></tr><tr><td>Brand C</td><td>10</td></tr><tr><td>Brand A</td><td>8</td></tr>
</tbody></table>

<h2>2. The engines disagree</h2>
<table><thead><tr><th>Brand</th><th>ChatGPT (/16)</th><th>Claude (/16)</th><th>Gemini (/16)</th></tr></thead><tbody>
<tr><td>Brand B</td><td>12</td><td>14</td><td>15</td></tr><tr><td>Brand D</td><td>11</td><td>14</td><td>15</td></tr><tr><td>Brand E</td><td>7</td><td>12</td><td>12</td></tr><tr><td>Brand C</td><td><b>0</b></td><td>10</td><td>3</td></tr><tr><td>Brand A</td><td>1</td><td>7</td><td>8</td></tr>
</tbody></table>
<p>The biggest gap is Brand C: Claude recommended it in 10 of 16 answers, ChatGPT in none. "AI visibility" is not one number. It depends on which assistant your customer uses.</p>

<h2>3. Brands lose on specific questions</h2>
<ul>
<li><b>Battery life:</b> Brand A and Brand B 3 of 4 answers each; Brand D 0 of 4.</li>
<li><b>Value for money:</b> Brand E 4 of 4; Brand B only 1 of 4.</li>
<li><b>Camera:</b> Brand B and Brand D both 4 of 4.</li>
</ul>
<p>Brand A is last overall, yet it ties for first on the battery question. What matters for a brand is the question its own customers ask.</p>

<h2>4. Product level: is the AI right about the top model?</h2>
<p>The most-mentioned model (Model 1) came up in 7 of 16 ChatGPT answers and 9 of 16 Claude answers. We checked 8 of the AI's claims about it against official specs: <b>5 correct, 0 wrong, 3 could not be verified</b>. Model 1 was also #1 on Google Shopping (US).</p>

<h2>5. One review site dominates the sources</h2>
<p>Sites the AI cited most (of 32 answers): tomsguide.com (13), techradar.com (5), techadvisor.com (4), guidespot.com (4), stuff.tv (3). A single review site appeared in 13 of 32 answers. If that site doesn't cover your product well, AI assistants probably won't either.</p>

<h2>What it means for your brand</h2>
<p>AI assistants don't read your ads. They read what the web says about you: review sites, comparison articles, forums. You can't fix your visibility without knowing which questions you lose and which sites the AI trusts. Try the <a href="/check/">free check</a> or measure your own questions on the <a href="/kayit">free plan</a>.</p>`,
    faq: [
      ["Which phone brand does AI recommend most?", "In our 13 November 2026 measurement, two brands were recommended in 26 and 25 of 32 ChatGPT and Claude answers. Results vary by question and engine; the brands measured are listed at the end of the post."],
      ["Do ChatGPT and Claude recommend the same phones?", "No. One brand was recommended in 10 of 16 Claude answers and in none of ChatGPT's 16."],
      ["Are these results representative of the market?", "No. It is a small sample of 8 questions and 48 answers showing what the AI engines said that day."],
    ],
  },
  {
    pair: "kendi-olcum-2026-11",
    lang: "tr",
    slug: "kendi-markamizi-yapay-zekaya-sorduk",
    date: "2026-11-22",
    title: "Kendi markamızı yapay zekâya sorduk: 42 cevabın hiçbirinde önerilmedik",
    short: "Kendi markamızı yapay zekâya sorduk",
    description: "18 Kasım 2026'da AI SaaSavran'ı markasız 7 müşteri sorusuyla ChatGPT, Claude ve Perplexity'ye sorduk. Hiçbir cevapta önerilmedik. Sonucu nasıl okuduğumuzu ve iki hafta sonraki yeniden ölçümü anlatıyoruz.",
    cover: "/og.png",
    names: "",
    body: `
<p class="lede">Ürünümüzü satıyoruz, o yüzden kendimizi de yapay zekâda görünür olmalıyız. 18 Kasım 2026'da AI SaaSavran'ı hiç anmadan 7 müşteri sorusunu ChatGPT, Claude ve Perplexity'ye sorduk. <b>42 cevabın hiçbirinde bizi önermediler.</b> Aynı sorularda beş rakip aracın 22 ile 33 cevap arasında önerildiğini gördük.</p>

<h2>Nasıl ölçtük?</h2>
<p>Sorularda markamızın adı geçmiyor; sorular bir müşterinin kendi ihtiyacını anlatması gibi. ChatGPT, Claude ve Perplexity canlı web aramasıyla, Türkiye'den, her soruyu iki kez sordu: 7 soru × 3 motor × 2 tekrar = 42 cevap. Ölçüm 18 Kasım 2026'da yapıldı ve yaklaşık 0,59 $ tuttu.</p>

<h2>Sonuç</h2>
<p>Sonuç 0 / 42. Rakipler, aynı 42 cevapta, 22 ile 33 cevap arasında önerildi. Bu aracın adlarını bu yazıda yazmıyoruz; ölçümün tamamını <a href="/tr/olcumler/">ölçümler</a> sayfasında ve <a href="/rehber/yapay-zeka-gorunurluk-araclari/">araç karşılaştırma</a> rehberinde görebilirsiniz.</p>

<h2>Bu sonuç ne söylüyor, ne söylemiyor?</h2>
<p>Bu ölçüm bize nedenini söylemiyor. Yalnızca şunu gösteriyor: 18 Kasım'da, bu sorularda, yapay zekâ bizi bir öneri olarak göstermedi. Neden böyle olduğunu tahmin etmek yerine, yapay zekânın hangi siteleri okuduğuna ve hangi soruda kaybettiğimize bakacağız. Tek bir ölçüm de bir markayı sonsuza kadar ya da hiç öneremez; bu tablo bir anlık fotoğraf.</p>

<h2>Bundan sonra ne yapacağız?</h2>
<p>İki hafta sonra aynı sorularla yeniden ölçeceğiz ve sonucu, ne olursa olsun, bu sayfada yayınlayacağız. Kendi ürünümüzü kendi verisiyle gösteremiyorsak, müşterilerimize de gösteremeyiz.</p>`,
    faq: [
      ["AI SaaSavran ChatGPT, Claude ve Perplexity'de önerilir mi?", "18 Kasım 2026 ölçümünde 42 cevabın hiçbirinde önerilmedik. Bu tek bir ölçüm; iki hafta sonra yeniden ölçülecek."],
      ["Neden önerilmediniz?", "Bu ölçüm nedenini göstermiyor. Kaynak siteleri ve kayıp soruları ayrıca inceleyeceğiz."],
      ["Bu sonuç ürünün kalitesini gösterir mi?", "Hayır. Yapay zekânın cevapları değişkendir ve bu, 42 cevaplık küçük bir örneklemdir."],
    ],
  },
  {
    pair: "kendi-olcum-2026-11",
    lang: "en",
    slug: "we-asked-ai-about-our-own-brand",
    date: "2026-11-22",
    title: "We asked AI about our own brand: recommended in 0 of 42 answers",
    short: "We asked AI about our own brand",
    description: "On 18 November 2026 we asked ChatGPT, Claude and Perplexity 7 unbranded customer questions about AI SaaSavran. We were recommended in none of the answers. Here is how we read it and what we measure next.",
    cover: "/og.png",
    names: "",
    body: `
<p class="lede">We sell this product, so we need to be visible in AI answers ourselves. On 18 November 2026 we asked ChatGPT, Claude and Perplexity 7 customer questions that never mention AI SaaSavran. <b>We were recommended in none of the 42 answers.</b> In the same questions, five competing tools were recommended in between 22 and 33 answers.</p>

<h2>How we measured</h2>
<p>Our brand name is not in any question; each question describes a customer's own need. ChatGPT, Claude and Perplexity answered with live web search from Turkey, and each question was asked twice: 7 questions × 3 engines × 2 repeats = 42 answers. The measurement ran on 18 November 2026 and cost about $0.59.</p>

<h2>The result</h2>
<p>The result is 0 of 42. Over the same 42 answers, the competitors were recommended between 22 and 33 times. We do not name the tools in this post; the full measurements are on our <a href="/measurements/">measurements</a> page and the comparison is in our <a href="/guides/ai-visibility-tools-compared/">tools guide</a>.</p>

<h2>What this does and does not tell us</h2>
<p>This measurement does not tell us why. It shows only that on 18 November, for these questions, the assistants never recommended us. Rather than guess the reason, we will look at which sites the AI read and in which questions we lost. One measurement also cannot fix a brand's position forever; this table is a snapshot.</p>

<h2>What we will do next</h2>
<p>We will measure the same questions again in two weeks and publish the result on this page, whatever it shows. If we cannot show our own product's results with our own data, we cannot expect customers to trust it.</p>`,
    faq: [
      ["Does AI SaaSavran get recommended by ChatGPT, Claude or Perplexity?", "In the 18 November 2026 measurement, we were recommended in none of 42 answers. It is one measurement; we will measure again in two weeks."],
      ["Why were you not recommended?", "This measurement does not show the reason. We will review the sites the AI cited and the questions we lost."],
      ["Does this result show the quality of the product?", "No. AI answers vary, and 42 answers is a small sample."],
    ],
  },
  {
    pair: "ozel-hastane-2026-11",
    lang: "tr",
    slug: "yapay-zeka-hangi-ozel-hastaneyi-oneriyor",
    date: "2026-11-25",
    realNames: true,
    title: "Yapay zekâ Türkiye'de hangi özel hastaneyi öneriyor? 46 cevabın sonucu",
    short: "Yapay zekâ hangi özel hastaneyi öneriyor?",
    description: "14 Kasım 2026'da 8 özel hastane sorusunu ChatGPT, Claude ve Gemini'ye sorduk. Canlı aramalı 30 cevapta Acıbadem 22, Memorial 17, Medical Park 14 cevapta önerildi; motorlar arasında büyük farklar var.",
    cover: "/og.png",
    names: "Acıbadem, Florence Nightingale, Liv Hospital, Medical Park, Medicana, Medipol, Memorial",
    body: `
<p class="lede">Türkiye'de hastane seçmeden önce artık birçok kişi yapay zekâya soruyor; yurt dışından gelen hastalar da öyle. 14 Kasım 2026'da bir hastanın soracağı 8 soruyu ChatGPT, Claude ve Gemini'ye Türkçe sorduk ve yedi özel hastane grubunun kaç cevapta önerildiğini saydık. Kısa cevap: <b>canlı web aramalı 30 cevabın 22'sinde Acıbadem önerildi; ama ikinci ve üçüncü sıra, hangi yapay zekâya sorduğunuza göre değişiyor.</b></p>

<h2>Nasıl ölçtük?</h2>
<p>"Türkiye'de en iyi özel hastane hangisi?", "İstanbul'da en iyi özel hastane hangisi?", "Antalya'da hangi özel hastaneyi önerirsin?", "Yabancı hastalar için…", "Fiyat performans açısından…", "Kanser tedavisi için…", "Kalp ameliyatı için…" ve "Doğum için…" diye 8 soru sorduk. Her motor her soruyu iki kez cevapladı. ChatGPT ve Claude canlı web aramasıyla cevap verdi: Claude 16, ChatGPT 14 cevap (doğum sorusunda ChatGPT cevabı kayıtlı değil), toplam 30. Gemini ücretsiz katmanda internete bakmadan, yalnız kendi bilgisiyle 16 cevap verdi. Toplam 46 cevap. Perplexity bu ölçümde yoktu.</p>

<h2>1. Canlı aramada sıralama</h2>
<table><thead><tr><th>Hastane</th><th>Önerildiği cevap (30 canlı cevapta)</th><th>Oran</th></tr></thead><tbody>
<tr><td>Acıbadem</td><td><b>22</b></td><td>%73</td></tr><tr><td>Memorial</td><td>17</td><td>%57</td></tr><tr><td>Medical Park</td><td>14</td><td>%47</td></tr><tr><td>Medipol</td><td>12</td><td>%40</td></tr><tr><td>Florence Nightingale</td><td>8</td><td>%27</td></tr><tr><td>Liv Hospital</td><td>7</td><td>%23</td></tr><tr><td>Medicana</td><td>4</td><td>%13</td></tr>
</tbody></table>
<p>Acıbadem ile Memorial arasında 5 cevaplık (yaklaşık 17 puan) fark var. Medical Park ile Medipol (2 cevap) ve Florence Nightingale ile Liv Hospital (1 cevap) ise başa baş; bu kadar küçük farklar başka bir günde yer değiştirebilir.</p>

<h2>2. Motorlar aynı hastaneleri önermiyor</h2>
<table><thead><tr><th>Hastane</th><th>Claude (/16)</th><th>ChatGPT (/14)</th><th>Gemini, aramasız (/16)</th></tr></thead><tbody>
<tr><td>Acıbadem</td><td>13</td><td>9</td><td>14</td></tr><tr><td>Memorial</td><td>9</td><td>8</td><td>15</td></tr><tr><td>Medical Park</td><td>11</td><td><b>3</b></td><td>11</td></tr><tr><td>Medipol</td><td>8</td><td>4</td><td>4</td></tr><tr><td>Florence Nightingale</td><td>5</td><td>3</td><td>5</td></tr><tr><td>Liv Hospital</td><td>7</td><td><b>0</b></td><td>9</td></tr><tr><td>Medicana</td><td>4</td><td><b>0</b></td><td>10</td></tr>
</tbody></table>
<p>En büyük fark Medical Park'ta: Claude 16 cevabın 11'inde önerdi, ChatGPT 14 cevabın yalnız 3'ünde. Liv Hospital ve Medicana ChatGPT'nin 14 cevabının hiçbirinde önerilmedi; Gemini ise kendi bilgisiyle Medicana'yı 16 cevabın 10'unda, Memorial'ı 15'inde önerdi. Yani "yapay zekâda görünürlük" tek bir sayı değil; hastanın hangi motoru kullandığına bağlı.</p>

<h2>3. İlk önerilen her zaman en çok önerilen değil</h2>
<p>Canlı aramalı 30 cevapta ilk sırada en sık Medical Park önerildi (8 cevap), Acıbadem 6 cevapta ilk sıradaydı. Fiyat performans sorusunda Medical Park, ChatGPT ve Claude'un 4 cevabının dördünde de ilk öneriydi. Kurucumuzun şehri Antalya'da ise canlı cevaplarda yalnız iki ad çıktı: Medical Park ve Memorial, ikisi de 4 cevabın 3'ünde; başa baş.</p>

<h2>4. Soru değişince sıra değişiyor</h2>
<ul>
<li><b>Kalp ameliyatı:</b> Florence Nightingale canlı 4 cevabın 3'ünde önerildi; genel sıralamada beşinci.</li>
<li><b>Fiyat performans:</b> Medical Park 4 cevabın 4'ünde; Memorial yalnız 1'inde.</li>
<li><b>Kanser tedavisi:</b> ChatGPT'nin 2 cevabında yalnız Memorial ve Acıbadem birer kez önerildi.</li>
</ul>
<p>Bir hastane için önemli olan genel sıra değil, kendi hastalarının sorduğu soru. Sorulara tek tek bakmak için <a href="/tr/olcumler/">ölçümler</a> sayfasına, örneğin <a href="/tr/olcumler/antalyada-hangi-ozel-hastaneyi-onerirsin/">Antalya sorusu</a> ve <a href="/tr/olcumler/kalp-ameliyati-icin-en-iyi-ozel-hastane-hangisi/">kalp ameliyatı sorusu</a> sayfalarına bakabilirsiniz. Sektörlerin genel tablosu <a href="/tr/yapay-zeka-gorunurluk-endeksi/">Görünürlük Endeksi</a>'nde.</p>

<h2>Hastane ve klinikler için ne anlama geliyor?</h2>
<p>Bu ölçüm, yapay zekânın neden bir hastaneyi seçtiğini söylemiyor; yalnız o gün ne cevap verdiğini gösteriyor. Ama bir şey açık: aynı soruda Claude'un önerdiği bir hastane ChatGPT'de hiç geçmeyebiliyor. Bir sağlık kuruluşu için ilk adım, hastalarının sorduğu soruları (şehir, bölüm, yabancı hasta, fiyat) yazıp her motorda nerede anıldığını görmek. Kendi kurumunuzun durumunu <a href="/tr/kontrol/">ücretsiz kontrol</a> ile birkaç dakikada görebilirsiniz; düzenli takip ve motor karşılaştırması için ücretli paketler var.</p>
<p><b>Önemli:</b> Bu yazı tıbbi tavsiye değildir ve hastanelerin kalitesini ölçmez. Yalnız yapay zekâ cevaplarında kimin önerildiğini sayar. Tedavi ve hastane kararı için doktorunuza danışın.</p>`,
    faq: [
      ["Yapay zekâ Türkiye'de en çok hangi özel hastaneyi öneriyor?", "14 Kasım 2026 ölçümünde ChatGPT ve Claude'un canlı aramalı 30 cevabının 22'sinde Acıbadem önerildi. Onu Memorial (17) ve Medical Park (14) izledi. Sonuç soruya ve motora göre değişiyor."],
      ["ChatGPT ve Claude aynı hastaneleri mi öneriyor?", "Hayır. Medical Park Claude'un 16 cevabının 11'inde, ChatGPT'nin 14 cevabının 3'ünde önerildi. Liv Hospital ve Medicana ChatGPT'de hiç önerilmedi."],
      ["Bu sonuçlar hastanelerin kalitesini gösterir mi?", "Hayır. Bu, 8 soru ve 46 cevaplık küçük bir örneklemde yapay zekânın o gün verdiği cevaplardır. Tıbbi tavsiye değildir."],
    ],
  },
  {
    pair: "ozel-hastane-2026-11",
    lang: "en",
    slug: "which-private-hospital-does-ai-recommend-in-turkey",
    date: "2026-11-25",
    realNames: true,
    title: "Which private hospital in Turkey does AI recommend? Results from 46 answers",
    short: "Which private hospital does AI recommend?",
    description: "On 14 November 2026 we asked ChatGPT, Claude and Gemini 8 questions about private hospitals in Turkey. In 30 live-search answers, Acıbadem was recommended in 22, Memorial in 17 and Medical Park in 14, with big gaps between engines.",
    cover: "/og.png",
    names: "Acıbadem, Florence Nightingale, Liv Hospital, Medical Park, Medicana, Medipol, Memorial",
    body: `
<p class="lede">More patients in Turkey, including those travelling from abroad, now ask an AI assistant before choosing a hospital. On 14 November 2026 we asked ChatGPT, Claude and Gemini 8 questions a patient would ask, in Turkish, and counted how often seven private hospital groups were recommended. Short answer: <b>Acıbadem was recommended in 22 of 30 live-search answers, but second and third place depend on which assistant you ask.</b></p>

<h2>How we measured</h2>
<p>We asked 8 questions: the best private hospital in Turkey, in Istanbul, and in Antalya; for foreign patients; for value for money; for cancer treatment; for heart surgery; and for giving birth. Each engine answered each question twice. ChatGPT and Claude answered with live web search: Claude 16 answers, ChatGPT 14 (no ChatGPT answer was recorded for the birth question), 30 in total. Gemini, on the free tier, answered 16 times from model knowledge without web search. That is 46 answers overall. Perplexity was not part of this measurement.</p>

<h2>1. The live-search ranking</h2>
<table><thead><tr><th>Hospital</th><th>Recommended in (of 30 live answers)</th><th>Share</th></tr></thead><tbody>
<tr><td>Acıbadem</td><td><b>22</b></td><td>73%</td></tr><tr><td>Memorial</td><td>17</td><td>57%</td></tr><tr><td>Medical Park</td><td>14</td><td>47%</td></tr><tr><td>Medipol</td><td>12</td><td>40%</td></tr><tr><td>Florence Nightingale</td><td>8</td><td>27%</td></tr><tr><td>Liv Hospital</td><td>7</td><td>23%</td></tr><tr><td>Medicana</td><td>4</td><td>13%</td></tr>
</tbody></table>
<p>Acıbadem leads Memorial by 5 answers (about 17 points). Medical Park and Medipol (2 answers apart) and Florence Nightingale and Liv Hospital (1 answer apart) are neck and neck; gaps that small can flip on another day.</p>

<h2>2. The engines disagree</h2>
<table><thead><tr><th>Hospital</th><th>Claude (/16)</th><th>ChatGPT (/14)</th><th>Gemini, no search (/16)</th></tr></thead><tbody>
<tr><td>Acıbadem</td><td>13</td><td>9</td><td>14</td></tr><tr><td>Memorial</td><td>9</td><td>8</td><td>15</td></tr><tr><td>Medical Park</td><td>11</td><td><b>3</b></td><td>11</td></tr><tr><td>Medipol</td><td>8</td><td>4</td><td>4</td></tr><tr><td>Florence Nightingale</td><td>5</td><td>3</td><td>5</td></tr><tr><td>Liv Hospital</td><td>7</td><td><b>0</b></td><td>9</td></tr><tr><td>Medicana</td><td>4</td><td><b>0</b></td><td>10</td></tr>
</tbody></table>
<p>The biggest gap is Medical Park: Claude recommended it in 11 of 16 answers, ChatGPT in only 3 of 14. Liv Hospital and Medicana were not recommended in any of ChatGPT's 14 answers, while Gemini, from model knowledge, recommended Medicana in 10 of 16 and Memorial in 15. "AI visibility" is not one number; it depends on which assistant the patient uses.</p>

<h2>3. The first pick is not always the most recommended</h2>
<p>Across the 30 live answers, Medical Park was the first recommendation most often (8 answers); Acıbadem came first in 6. On the value-for-money question, Medical Park was the first pick in all 4 ChatGPT and Claude answers. In Antalya, our founder's city, only two names appeared in the live answers: Medical Park and Memorial, each in 3 of 4, neck and neck.</p>

<h2>4. Change the question, change the order</h2>
<ul>
<li><b>Heart surgery:</b> Florence Nightingale was recommended in 3 of 4 live answers, although it is fifth overall.</li>
<li><b>Value for money:</b> Medical Park 4 of 4; Memorial only 1 of 4.</li>
<li><b>Cancer treatment:</b> in ChatGPT's 2 answers, only Memorial and Acıbadem were recommended, once each.</li>
</ul>
<p>For a hospital, what matters is not the overall order but the question its own patients ask. You can browse every question on our <a href="/measurements/">measurements</a> page, including the <a href="/tr/olcumler/antalyada-hangi-ozel-hastaneyi-onerirsin/">Antalya question</a> (in Turkish). The cross-sector picture is in the <a href="/ai-visibility-index/">AI Visibility Index</a>.</p>

<h2>What it means for hospitals and clinics</h2>
<p>This measurement does not tell us why an assistant picks a hospital; it only shows what it answered that day. One thing is clear, though: a hospital Claude recommends may not appear in ChatGPT at all for the same question. For a healthcare provider, the first step is to write down the questions patients actually ask (city, department, international patients, price) and see where it appears in each engine. You can see where your own organisation stands in a few minutes with the <a href="/check/">free check</a>; paid plans add regular tracking and engine comparison.</p>
<p><b>Important:</b> this post is not medical advice and does not measure hospital quality. It only counts who is recommended in AI answers. Talk to your doctor before choosing a treatment or hospital.</p>`,
    faq: [
      ["Which private hospital in Turkey does AI recommend most?", "In our 14 November 2026 measurement, Acıbadem was recommended in 22 of 30 live-search answers from ChatGPT and Claude, followed by Memorial (17) and Medical Park (14). Results vary by question and engine."],
      ["Do ChatGPT and Claude recommend the same hospitals?", "No. Medical Park was recommended in 11 of 16 Claude answers and 3 of 14 ChatGPT answers. Liv Hospital and Medicana were never recommended by ChatGPT."],
      ["Do these results show hospital quality?", "No. They are the AI's answers on one day in a small sample of 8 questions and 46 answers. This is not medical advice."],
    ],
  },
];
