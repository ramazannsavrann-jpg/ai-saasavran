// Üye olmadan ücretsiz kontrol sayfası (form site.js ile çalışır; sonuç /api/check'ten gelir).
export function checkHtml(en) {
  const t = en ? {
    h: "Free AI visibility check", lede: "We ask Gemini 5 questions a customer might ask about your category and show whether your business comes up. No signup.",
    brand: "Business name", brandPh: "e.g. Smile Dental", cat: "What you do", catPh: "e.g. dentist, CRM software, coffee shop",
    city: "City or country (optional)", cityPh: "e.g. Austin, Texas", web: "Website (optional)", webPh: "e.g. smiledental.com",
    go: "Run the free check", note: "2 free checks per person per month. Uses Gemini's model knowledge without live web search; ChatGPT with live search is in paid plans. The free Gemini check is not available from the European Economic Area, Switzerland or the UK. Don't enter personal data.",
  } : {
    h: "Ücretsiz yapay zekâ görünürlük kontrolü", lede: "Müşterinizin sektörünüzle ilgili sorabileceği 5 soruyu Gemini'ye soruyoruz ve işletmenizin cevaplarda geçip geçmediğini gösteriyoruz. Üyelik gerekmez.",
    brand: "İşletme adı", brandPh: "ör. Gülüş Diş Kliniği", cat: "Ne iş yapıyorsunuz?", catPh: "ör. diş kliniği, muhasebe yazılımı, kafe",
    city: "Şehir veya ülke (isteğe bağlı)", cityPh: "ör. Antalya", web: "Web sitesi (isteğe bağlı)", webPh: "ör. gulusdis.com",
    go: "Ücretsiz kontrolü başlat", note: "Kişi başına ayda 2 ücretsiz kontrol. Gemini'nin model bilgisi kullanılır, canlı web araması yoktur; ChatGPT canlı arama ücretli paketlerde. Ücretsiz Gemini kontrolü Avrupa Ekonomik Alanı, İsviçre ve Birleşik Krallık'tan kullanılamaz. Kişisel bilgi girmeyin.",
  };
  return `
<section class="article check">
  <h1>${t.h}</h1>
  <p class="lede">${t.lede}</p>
  <form id="free-check" class="check-form" data-lang="${en ? "en" : "tr"}" novalidate>
    <label>${t.brand}<input name="brand" required minlength="2" maxlength="80" placeholder="${t.brandPh}" autocomplete="organization"></label>
    <label>${t.cat}<input name="category" required minlength="2" maxlength="80" placeholder="${t.catPh}"></label>
    <label>${t.city}<input name="city" maxlength="80" placeholder="${t.cityPh}"></label>
    <label>${t.web}<input name="website" maxlength="120" placeholder="${t.webPh}" inputmode="url"></label>
    <button class="btn" type="submit">${t.go}</button>
    <p class="small">${t.note}</p>
  </form>
  <div id="check-result" aria-live="polite"></div>
</section>
${en ? CHECK_INFO_EN : CHECK_INFO_TR}`;
}

// Formun altındaki açıklama (18 Kasım): sayfanın ne yaptığını, sınırlarını ve sonucun nasıl okunacağını anlatır.
// Sorular functions/api/_check-lib.js buildQuestions() ile aynı olmalı.
export const CHECK_FAQ_TR = [
  ["Ücretsiz kontrol ne kadar sürer?", "Genellikle bir dakikadan kısa. Gemini'ye 5 soru aynı anda sorulur ve sonuç bu sayfada gösterilir."],
  ["Neden yalnız Gemini?", "Ücretsiz kontrol maliyeti düşük tutmak için Gemini'nin ücretsiz katmanını kullanır. ChatGPT, Gemini, Claude ve Perplexity'yi canlı web aramasıyla ölçmek ücretli paketlerde."],
  ["Sonuç neden ChatGPT'de gördüğümden farklı?", "Motorlar aynı soruya farklı markalar önerebilir; ayrıca bu kontrol internete bakmadan (model bilgisiyle) yapılır. Canlı arama yapan ChatGPT bugünkü internete göre farklı cevap verebilir."],
  ["Verdiğim bilgiler saklanıyor mu?", "Girdiğiniz işletme adı, sektör ve şehir ile sonuç sayıları (kaç soruda anıldınız, önerildiniz) kaydedilir. IP adresiniz açık hâliyle saklanmaz; yalnız ayda 2 kontrol sınırı için geri çevrilemez bir özeti (karma) tutulur. Kişisel bilgi girmeyin. Ayrıntı: gizlilik politikası."],
  ["Kaç kez kontrol yapabilirim?", "Kişi başına ayda 2 ücretsiz kontrol. Düzenli ve daha fazla soruyla ölçüm için ücretsiz hesap açabilirsiniz: 15 soru, ayda 4 otomatik ölçüm."],
];
export const CHECK_FAQ_EN = [
  ["How long does the free check take?", "Usually under a minute. Gemini is asked 5 questions at once and the result appears on this page."],
  ["Why only Gemini?", "The free check uses Gemini's free tier to keep it free. Measuring ChatGPT, Gemini, Claude and Perplexity with live web search is part of the paid plans."],
  ["Why is the result different from what I see in ChatGPT?", "Engines can recommend different brands for the same question, and this check uses model knowledge without web search. ChatGPT with live search can answer differently based on today's web."],
  ["Is what I enter stored?", "The business name, category and city you enter and the result counts (how many answers mentioned or recommended you) are stored. Your IP address is not stored in plain form; only a one-way hash is kept to enforce the limit of 2 checks a month. Don't enter personal data. See the privacy policy."],
  ["How many checks can I run?", "Two free checks per person per month. For regular measurement with more questions, open a free account: 15 questions and 4 automatic measurements a month."],
];

const faqBlock = (faq, h) => `<section class="article faq"><h2>${h}</h2>${faq.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join("")}</section>`;

const CHECK_INFO_TR = `
<section class="article">
  <h2>Bu kontrol ne yapar?</h2>
  <p>Müşterileriniz artık "hangi firmayı önerirsin?" sorusunu yapay zekâ asistanlarına soruyor. Bu kontrol, sektörünüz ve şehriniz için bir müşterinin sorabileceği 5 soruyu Gemini'ye sorar ve her cevapta işletmenizin <b>anılıp anılmadığını</b> ve <b>önerilip önerilmediğini</b> gösterir. Cevaplarda sizin yerinize en çok geçen diğer adları da listeler.</p>
  <h2>Hangi sorular soruluyor?</h2>
  <p>Örneğin "diş kliniği" ve "Antalya" girerseniz:</p>
  <ul>
    <li>Antalya bölgesinde en iyi diş kliniği hangileri?</li>
    <li>Bir diş kliniği arıyorum, Antalya bölgesinde. Hangisini önerirsin?</li>
    <li>Antalya bölgesinde en güvenilir diş kliniği seçenekleri neler? Kısa bir liste ver.</li>
    <li>Antalya bölgesinde diş kliniği seçerken hangi firmalara bakmalıyım?</li>
    <li>Antalya bölgesinde fiyat/performans açısından en iyi diş kliniği hangisi?</li>
  </ul>
  <p>Sorularda işletmenizin adı geçmez; tıpkı sizi henüz tanımayan bir müşteri gibi.</p>
  <h2>Sonuç nasıl okunur?</h2>
  <ul>
    <li><b>Önerildi:</b> Gemini sizi bir seçenek olarak önerdi. En güçlü sinyal.</li>
    <li><b>Anıldı:</b> Adınız geçti ama öneri olarak değil.</li>
    <li><b>Geçmedi:</b> Bu soruda Gemini sizi bilmiyor ya da başka işletmeleri seçti. Cevapta geçen diğer adlar, kimin önde olduğunu gösterir.</li>
  </ul>
  <h2>Sınırları</h2>
  <p>Bu bir ilk bakıştır, tam ölçüm değildir: yalnız Gemini, internete bakmadan (model bilgisiyle) ve her soru bir kez sorulur. Yapay zekâ aynı soruya farklı zamanlarda farklı cevap verebilir. Avrupa Ekonomik Alanı, İsviçre ve Birleşik Krallık'tan ücretsiz Gemini kontrolü yapılamaz. Tam ölçümde her soru birkaç kez, her motor ayrı ve canlı web aramasıyla sorulur; yöntem: <a href="/tr/metodoloji/">metodoloji</a>.</p>
  <h2>Sonra ne yapmalı?</h2>
  <ol>
    <li>Sonucunuz ne olursa olsun, düzenli ölçüm için <a href="/kayit">ücretsiz hesap</a> açın: 1 marka, 15 soru, 3 rakip, ayda 4 otomatik ölçüm.</li>
    <li>Görünmüyorsanız nedenlerini okuyun: <a href="/rehber/markam-chatgptde-neden-cikmiyor/">markam ChatGPT'de neden çıkmıyor?</a></li>
    <li>Yerel işletmeyseniz: <a href="/rehber/yerel-isletme-yapay-zeka/">yerel işletmeler yapay zekâda nasıl öne çıkar?</a></li>
    <li>Sektörünüzde yapay zekânın kimi önerdiğine bakın: <a href="/tr/yapay-zeka-gorunurluk-endeksi/">Yapay Zekâ Görünürlük Endeksi</a>.</li>
  </ol>
</section>
${faqBlock(CHECK_FAQ_TR, "Sık sorulanlar")}`;

const CHECK_INFO_EN = `
<section class="article">
  <h2>What this check does</h2>
  <p>Customers now ask AI assistants "which company do you recommend?". This check asks Gemini 5 questions a customer might ask about your category and location, and shows for each answer whether your business was <b>mentioned</b> and whether it was <b>recommended</b>. It also lists the other names that came up most often instead of you.</p>
  <h2>Which questions are asked?</h2>
  <p>For example, with "dentist" and "Austin, Texas":</p>
  <ul>
    <li>What are the best dentist options in Austin, Texas?</li>
    <li>I'm looking for a dentist in Austin, Texas. Which one would you recommend?</li>
    <li>Give me a short list of the most trusted dentist providers in Austin, Texas.</li>
    <li>Which dentist companies should I consider in Austin, Texas?</li>
    <li>What's the best value dentist in Austin, Texas?</li>
  </ul>
  <p>Your business name is never in the question, just like a customer who doesn't know you yet.</p>
  <h2>How to read the result</h2>
  <ul>
    <li><b>Recommended:</b> Gemini suggested you as an option. The strongest signal.</li>
    <li><b>Mentioned:</b> your name appeared, but not as a recommendation.</li>
    <li><b>Not found:</b> Gemini doesn't know you for this question or chose others. The other names show who is ahead.</li>
  </ul>
  <h2>Limits</h2>
  <p>This is a first look, not a full measurement: Gemini only, without web search (model knowledge), each question asked once. AI can answer the same question differently at different times. The free Gemini check isn't available from the European Economic Area, Switzerland or the UK. A full measurement asks each question several times, per engine, with live web search; see the <a href="/methodology/">methodology</a>.</p>
  <h2>What next?</h2>
  <ol>
    <li>Whatever the result, open a <a href="/kayit">free account</a> for regular measurement: 1 brand, 15 questions, 3 competitors, 4 automatic measurements a month.</li>
    <li>Not showing up? Read <a href="/guides/why-chatgpt-doesnt-mention-my-brand/">why ChatGPT doesn't mention my brand</a>.</li>
    <li>Local business? See <a href="/guides/local-business-ai-recommendations/">how local businesses get recommended by AI</a>.</li>
    <li>See who AI recommends in your sector: <a href="/ai-visibility-index/">AI Visibility Index</a>.</li>
  </ol>
</section>
${faqBlock(CHECK_FAQ_EN, "FAQ")}`;
