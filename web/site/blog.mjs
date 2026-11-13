// Blog: haftada bir yazı. Kaynak: YouTube videoları için yaptığımız GERÇEK ölçümler (seslendirme dalı → video/sablon/*.json).
// Kurallar (kullanıcı kararları, 12–13 Kasım 2026):
//  - Sonuçlarda markalar harfle (Marka A/B…, Model 1/2…), harfler rastgele; ölçülen markaların gerçek adları yazının sonunda
//    alfabetik liste olarak verilir, hangi harfin hangi marka olduğu söylenmez.
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
    video: { id: "xNPcVCHRXiA", title: "Which phone does AI recommend? (49 s)" },
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
];
