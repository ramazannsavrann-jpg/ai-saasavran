// "Eğitim videolarımız" sayfası (/tutorials/ ve /tr/egitim/): siteyi adım adım anlatan kısa dersler.
// Her dersin yazılı adımları sayfada durur (video olmadan da okunur). Video yayınlandığında ilgili dersin
// `video` alanına YouTube kimliği yazılır: { tr: "XXXXXXXXXXX", en: "YYYYYYYYYYY" }. Kimlik yoksa bağlantı uydurulmaz;
// yalnız kanal bağlantısı gösterilir. Örneklerde kendi markamız ya da gerçek marka adı kullanılmaz.
export const CHANNEL = "https://www.youtube.com/@aisaasavran";

export const LESSONS = [
  { n: 1, video: { tr: null, en: null },
    tr: { title: "Markanız yapay zekâda geçiyor mu? Üye olmadan ücretsiz kontrol", steps: ["Ana sayfada \"Üye olmadan dene\"ye dokunun.", "İşletmenizin adını ve ne iş yaptığınızı yazın; şehir ve web sitesi isteğe bağlıdır.", "\"Ücretsiz kontrolü başlat\"a basın. Gemini'ye 5 soru sorulur; 20–30 saniye sürer.", "Sonuçta 5 cevabın kaçında anıldığınızı ve kaçında önerildiğinizi görürsünüz. Her cevabı açıp okuyabilirsiniz.", "Sizin yerinize anılan adlar da listelenir. Kişi başına ayda 2 ücretsiz kontrol hakkı vardır."], cta: ["/tr/kontrol/", "Ücretsiz kontrolü başlat"] },
    en: { title: "Is your brand in AI answers? The free check, no signup", steps: ["On the home page, tap \"Try it without signing up\".", "Type your business name and what you do; city and website are optional.", "Press \"Run the free check\". We ask Gemini 5 questions; it takes 20–30 seconds.", "You see in how many of the 5 answers you were mentioned and recommended. Open any answer to read it.", "Names mentioned instead of you are listed too. Each person gets 2 free checks a month."], cta: ["/check/", "Run the free check"] } },
  { n: 2, video: { tr: null, en: null },
    tr: { title: "Hesap açıp markanızı eklemek", steps: ["\"Hesap oluştur\"a dokunun; Google ile ya da e-posta ve şifreyle kayıt olun.", "Çalışma alanı oluşturun: kendi markanız için \"İşletme\", müşterilerinizin markaları için \"Ajans\" seçin.", "Marka adını ve müşterilerin kullandığı diğer yazılışları yazın (ör. kısa ad, bitişik yazım).", "Web sitesi, sektör ve şehri girip \"Markayı ekle\"ye basın. İçerik üreticisiyseniz kanal adresinizi yazın.", "Marka sayfanız açılır; üstteki başlangıç rehberi sıradaki adımı gösterir."], cta: ["/kayit", "Ücretsiz hesap aç"] },
    en: { title: "Create an account and add your brand", steps: ["Tap \"Create account\"; sign up with Google or with email and a password.", "Create a workspace: choose \"Business\" for your own brand or \"Agency\" for your clients' brands.", "Type the brand name and the other spellings customers use (short name, joined spelling).", "Enter website, sector and city, then press \"Add brand\". Creators enter their channel address.", "Your brand page opens; the getting-started guide at the top shows the next step."], cta: ["/kayit", "Create a free account"] } },
  { n: 3, video: { tr: null, en: null },
    tr: { title: "Soru ve rakip eklemek", steps: ["Marka sayfasında \"Sorular\" sekmesini açın.", "\"Hazır sorular\"dan sektörünüze uygun olanların yanındaki \"+ Ekle\"ye dokunun ya da \"Bana soru öner\"i kullanın.", "Soruların çoğunda marka adınız geçmesin: müşteri \"en iyi diş kliniği hangisi?\" diye sorar, adınızı yazmaz.", "\"Rakipler\" sekmesinde rakip adını yazıp \"Rakibi ekle\"ye basın.", "Raporda yapay zekânın sizi mi rakibinizi mi önerdiğini yan yana görürsünüz."], cta: ["/kayit", "Ücretsiz hesap aç"] },
    en: { title: "Add questions and competitors", steps: ["On the brand page, open the \"Questions\" tab.", "Tap \"+ Add\" next to the ready-made questions that fit your sector, or use \"Suggest questions\".", "Leave your brand name out of most questions: a customer asks \"which dental clinic is best?\", not your name.", "On the \"Competitors\" tab, type a competitor's name and press \"Add competitor\".", "The report then shows side by side whether the AI recommends you or them."], cta: ["/kayit", "Create a free account"] } },
  { n: 4, video: { tr: null, en: null },
    tr: { title: "İlk ölçümü başlatmak", steps: ["En az 3 soru ekledikten sonra \"Ölçüm başlat\"a basın.", "Ücretsiz pakette ölçüm Gemini'nin model bilgisiyle yapılır (canlı web araması yoktur); canlı aramalı ölçüm ücretli paketlerdedir.", "Ölçüm sunucuda sırayla işlenir; sayfa kendiliğinden güncellenir. Durumu \"Ölçümler\" sekmesinden izleyebilirsiniz.", "Ölçüm bitince rapor dolar. Haftalık otomatik ölçümle değişimi zaman içinde görürsünüz."], cta: ["/kayit", "Ücretsiz hesap aç"] },
    en: { title: "Run the first measurement", steps: ["After adding at least 3 questions, press \"Start measurement\".", "On the free plan the measurement uses Gemini's model knowledge (no live web search); live-search measurement is in paid plans.", "Measurements are processed in order on the server; the page updates by itself. You can follow it on the \"Runs\" tab.", "When it finishes, the report fills in. Weekly automatic measurements show the change over time."], cta: ["/kayit", "Create a free account"] } },
  { n: 5, video: { tr: null, en: null },
    tr: { title: "Raporu okumak", steps: ["En üstte yapay zekâ görünürlük skoru vardır; \"Skor nasıl hesaplandı?\" ile hesabı açabilirsiniz.", "Özet cümle kaç cevapta önerildiğinizi söyler; altında önerilme, anılma ve pay oranları durur.", "Cevap sayısı azsa \"örneklem küçük\" uyarısı çıkar; o zaman sonuç yalnız bir ipucudur.", "\"Zaman içinde\" grafiği haftadan haftaya değişimi gösterir.", "\"Rakiplerle karşılaştırma\" kimin daha çok önerildiğini, motor karşılaştırması her yapay zekâyı yan yana gösterir."], cta: ["/tr/metodoloji/", "Ölçümleri nasıl hesaplıyoruz?"] },
    en: { title: "Read the report", steps: ["The AI visibility score is at the top; \"How is the score calculated?\" opens the calculation.", "The summary sentence says in how many answers you were recommended; below it are the recommendation, mention and share rates.", "With few answers a \"small sample\" warning appears; treat the result as a hint only.", "The \"Over time\" chart shows the change from week to week.", "\"Competitor comparison\" shows who is recommended more; the engine comparison puts each AI side by side."], cta: ["/methodology/", "How we calculate the numbers"] } },
  { n: 6, video: { tr: null, en: null },
    tr: { title: "Soru bazında sonuç ve kayıp nedeni", steps: ["Raporda \"Soru bazında sonuç\" bölümü her soruyu ayrı ayrı gösterir.", "Önerilmediğiniz sorularda kayıp nedeni kartı, cevaptan alınan kanıtla birlikte durur.", "\"Cevabı göster\" ile yapay zekânın tam cevabını okuyun.", "Koşul haritası hangi müşteri türünde (ör. ucuz, premium, şehir) güçlü ya da zayıf olduğunuzu gösterir."], cta: ["/kayit", "Ücretsiz hesap aç"] },
    en: { title: "Results by question, and why you lost", steps: ["The \"Results by question\" section of the report shows every question separately.", "Where you weren't recommended, a loss card gives the reason with evidence from the answer.", "Use \"Show answer\" to read the AI's full answer.", "The condition map shows for which kind of customer (budget, premium, city) you are strong or weak."], cta: ["/kayit", "Create a free account"] } },
  { n: 7, video: { tr: null, en: null },
    tr: { title: "Yapay zekânın baktığı kaynaklar", steps: ["Canlı aramalı ölçümlerde yapay zekânın kaynak gösterdiği siteler listelenir.", "\"Kendi site payı\" bu kaynakların ne kadarının sizin siteniz, ne kadarının rakip ya da üçüncü taraf olduğunu gösterir.", "Kaynak ağı hangi sitenin hangi markayı desteklediğini çizer.", "\"Fırsat\" olarak işaretlenen siteler, rakibinizin yer aldığı ama sizin olmadığınız yerlerdir."], cta: ["/tr/#fiyatlar", "Paketleri gör"] },
    en: { title: "The sources AI reads", steps: ["Live-search measurements list the sites the AI cited.", "\"Owned-source share\" shows how much of those sources is your site, a competitor's, or a third party's.", "The source network draws which site supports which brand.", "Sites marked as an \"opportunity\" are places where your competitor appears and you don't."], cta: ["/#pricing", "See plans"] } },
  { n: 8, video: { tr: null, en: null },
    tr: { title: "İyileştirme önerileri", steps: ["\"Öneriler\" sekmesi yapılacakları önem sırasıyla verir.", "Her öneride kanıt, ne yapılacağı ve başarı ölçütü yazar.", "Bir öneriyi kampanyaya çevirip görevlere bölebilir, tamamladıkça işaretleyebilirsiniz.", "Yaptığınız değişikliği tarihiyle kaydedin; sonraki ölçümde etkisini görürsünüz.", "\"Web sitesi kontrolü\" sitenizin yapay zekâ botlarına açık olup olmadığını denetler."], cta: ["/kayit", "Ücretsiz hesap aç"] },
    en: { title: "Improvement recommendations", steps: ["The \"Recommendations\" tab lists what to do, most important first.", "Each recommendation states the evidence, what to do and how success is checked.", "Turn a recommendation into a campaign, split it into tasks and tick them off.", "Log each change with its date; the next measurement shows its effect.", "The \"Website check\" tests whether your site is open to AI crawlers."], cta: ["/kayit", "Create a free account"] } },
];

const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const tutorialsPath = (lang) => (lang === "en" ? "/tutorials/" : "/tr/egitim/");

export function tutorialsHtml(lang) {
  const en = lang === "en";
  const items = LESSONS.map((l) => {
    const t = l[lang]; const id = l.video?.[lang];
    const watch = YT_ID.test(id ?? "")
      ? `<p class="video-link"><a href="https://www.youtube.com/shorts/${id}" rel="noopener">${en ? "Watch this lesson on YouTube (under 1 minute)" : "Bu dersi YouTube'da izleyin (1 dakikadan kısa)"}</a></p>` : "";
    return `<section class="lesson" id="${en ? "lesson" : "ders"}-${l.n}">
  <h2>${en ? "Tutorial" : "Eğitim"} ${l.n}: ${esc(t.title)}</h2>
  <ol>${t.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
  ${watch}<p><a class="btn ghost" href="${t.cta[0]}">${esc(t.cta[1])}</a></p>
</section>`;
  }).join("\n");
  return `<section class="article">
  <h1>${en ? "Tutorials: how to use AI SaaSavran" : "Eğitim videolarımız: AI SaaSavran nasıl kullanılır?"}</h1>
  <p class="lede">${en ? "Eight short lessons, each on one topic: from the free check to reading the report and acting on it. The steps are written out below; the videos are on our YouTube channel." : "Her biri tek konuyu anlatan sekiz kısa ders: ücretsiz kontrolden raporu okumaya ve öneriyi uygulamaya kadar. Adımlar aşağıda yazılı; videolar YouTube kanalımızda."}</p>
  <p><a href="${CHANNEL}" rel="noopener">${en ? "AI SaaSavran on YouTube" : "YouTube'da AI SaaSavran"}</a> · ${en ? "Examples use made-up brand names." : "Örneklerde hayali marka adları kullanılır."}</p>
  <nav aria-label="${en ? "Lessons" : "Dersler"}"><ol class="toc">${LESSONS.map((l) => `<li><a href="#${en ? "lesson" : "ders"}-${l.n}">${esc(l[lang].title)}</a></li>`).join("")}</ol></nav>
${items}
</section>`;
}

/** Arama motorları için yapılandırılmış veri: dersler sıralı liste, her biri adımlarıyla. */
export function tutorialsSchema(lang, siteUrl) {
  return { "@context": "https://schema.org", "@type": "ItemList", name: lang === "en" ? "AI SaaSavran tutorials" : "AI SaaSavran eğitimleri", inLanguage: lang,
    itemListElement: LESSONS.map((l) => ({ "@type": "ListItem", position: l.n, name: l[lang].title, url: `${siteUrl}${tutorialsPath(lang)}#${lang === "en" ? "lesson" : "ders"}-${l.n}` })) };
}
