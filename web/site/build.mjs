// Herkese açık statik sayfaları üretir (vite build'den sonra çalışır, web/ klasöründen).
//  - Tek sayfa uygulama dist/index.html → dist/app/index.html taşınır; uygulama adresleri _redirects ile oraya yönlenir.
//  - "/" tanıtım sayfası, "/rehber/..." rehberler: JavaScript'siz düz HTML (arama motorları ve yapay zekâ botları okuyabilir).
import { mkdirSync, writeFileSync, renameSync, existsSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { SITE, GUIDES, HOME_FAQ } from "./content.mjs";
import { LEGAL } from "./legal.mjs";
import { demoHtml } from "./demo.mjs";
import { checkHtml, CHECK_FAQ_TR, CHECK_FAQ_EN } from "./check.mjs";
import { GUIDES_EN, HOME_FAQ_EN } from "./content-en.mjs";
import { POSTS } from "./blog.mjs";
import { LESSONS, tutorialsHtml, tutorialsPath, tutorialsSchema } from "./tutorials.mjs";
import { DEF, METHOD_PAGES } from "./method.mjs";
import { MEASUREMENTS, mPath, mIndex, measurementBody, indexBody, leadSentence } from "./measurements.mjs";
import { selfBox } from "./self.mjs";
import { buildIndex, indexReportBody, indexCsv, idxPath, idxCsvPath } from "./visibility-index.mjs";

const DIST = "dist";
if (!existsSync(join(DIST, "index.html"))) throw new Error("Önce vite build çalışmalı");

// 1) Uygulamayı /app/ altına taşı
mkdirSync(join(DIST, "app"), { recursive: true });
renameSync(join(DIST, "index.html"), join(DIST, "app", "index.html"));

// 2) Yazı tipleri (Türkçe karakterler için latin-ext dahil)
const FONTS = [
  ["instrument-sans", "instrument-sans-latin-400-normal.woff2"], ["instrument-sans", "instrument-sans-latin-ext-400-normal.woff2"],
  ["instrument-sans", "instrument-sans-latin-600-normal.woff2"], ["instrument-sans", "instrument-sans-latin-ext-600-normal.woff2"],
  ["bricolage-grotesque", "bricolage-grotesque-latin-700-normal.woff2"], ["bricolage-grotesque", "bricolage-grotesque-latin-ext-700-normal.woff2"],
];
mkdirSync(join(DIST, "site", "fonts"), { recursive: true });
for (const [pkg, f] of FONTS) copyFileSync(join("node_modules", "@fontsource", pkg, "files", f), join(DIST, "site", "fonts", f));
copyFileSync("site/site.css", join(DIST, "site", "site.css"));
copyFileSync("site/site.js", join(DIST, "site", "site.js"));

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const ld = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`;
const faqLd = (faq) => ({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) });
const faqHtml = (faq, en = false) => faq.length ? `<section class="faq"><h2>${en ? "FAQ" : "Sık sorulanlar"}</h2>${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}</section>` : "";

// Arama sonucu başlığı ≤70 karakter: uzun başlıkta kısa başlık kullanılır (sayfadaki h1 tam başlık kalır)
const seoTitle = (title, short, suffix = " | AI SaaSavran") => (title + suffix).length <= 70 ? title + suffix : title.length <= 70 ? title : short + suffix;

// Kendi sitemizin yapay zekâdan gelen ziyaretçi sayacı (Growth Lab'deki "AI SaaSavran" markası; çerezsiz, kişisel veri yok)
const OWN_TRACK_KEY = "552ec134-8c6a-4ffe-a923-2697cd66bf65";

function page({ path, title, description, body, schema = [], type = "website", lang = "en", alt = null, image = "/og.png", noindex = false, home = false }) {
  const url = SITE.url + path;
  const en = lang === "en";
  const enPath = en ? path : alt, trPath = en ? alt : path;
  const alternates = alt ? `<link rel="alternate" hreflang="en" href="${SITE.url}${enPath}">\n<link rel="alternate" hreflang="tr" href="${SITE.url}${trPath}">\n<link rel="alternate" hreflang="x-default" href="${SITE.url}${enPath}">` : "";
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? `<meta name="robots" content="noindex">` : `<link rel="canonical" href="${url}">`}
${alternates}
<meta property="og:type" content="${type}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">${image ? `\n<meta property="og:image" content="${SITE.url}${image}">\n<meta name="twitter:card" content="summary_large_image">` : ""}
<meta property="og:locale" content="${en ? "en_US" : "tr_TR"}">
<meta name="theme-color" content="#0F6E5C">
<meta name="color-scheme" content="light dark">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="alternate" type="application/rss+xml" title="AI SaaSavran Blog${en ? "" : " (Türkçe)"}" href="${SITE.url}${en ? "/blog/" : "/tr/blog/"}rss.xml">
<link rel="preload" href="/site/fonts/instrument-sans-latin-ext-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/site/site.css">
${schema.map(ld).join("\n")}
<script async src="/t.js" data-site="${OWN_TRACK_KEY}"></script>
</head>
<body${home ? ' class="home"' : ""}>
<!--email_off-->
<header class="top">
  <a class="mark" href="${en ? "/" : "/tr/"}" aria-label="AI SaaSavran"><img src="/icon.svg" alt="" width="28" height="28"><span>AI <b>SaaSavran</b></span></a>
  <nav aria-label="${en ? "Main menu" : "Ana menü"}">${en ? `<a href="/#pricing">Pricing</a><a href="/measurements/">Measurements</a><a href="/guides/">Guides</a><a href="/blog/">Blog</a>` : `<a href="/tr/fiyatlar/">Fiyatlar</a><a href="/tr/olcumler/">Ölçümler</a><a href="/rehber/">Rehberler</a><a href="/tr/blog/">Blog</a><a href="/durum">Ürün durumu</a>`}<a class="lang" href="${alt ?? (en ? "/tr/" : "/")}" hreflang="${en ? "tr" : "en"}" lang="${en ? "tr" : "en"}">${en ? "Türkçe" : "English"}</a><a class="cta-sm" data-cta href="/giris">${en ? "Sign in" : "Giriş yap"}</a></nav>
</header>
<main>
${body}
</main>
<footer class="foot">
  ${en ? `<p><b>AI SaaSavran</b> measures whether ChatGPT and Gemini recommend your business. Early access.</p>
  <p><a href="/pricing/">Pricing</a> · <a href="/guides/">Guides</a> · <a href="/blog/">Blog</a> · <a href="/ai-visibility-index/">AI Visibility Index</a> · <a href="/tutorials/">Tutorials</a> · <a href="/about/">About</a> · <a href="/founder/">Founder</a> · <a href="/methodology/">Methodology</a> · <a href="/terms/">Terms</a> · <a href="/privacy/">Privacy</a> · <a href="/refund/">Refunds</a> · <a href="/tr/">Türkçe</a></p>
  <p>Contact: <a href="mailto:${SITE.email}">${SITE.email}</a></p>` : `<p><b>AI SaaSavran</b>: markaların yapay zekâ asistanlarındaki görünürlüğünü ölçen araç. Erken erişim.</p>
  <p><a href="/tr/#fiyatlar">Fiyatlar</a> · <a href="/rehber/">Rehberler</a> · <a href="/tr/blog/">Blog</a> · <a href="/tr/yapay-zeka-gorunurluk-endeksi/">Görünürlük Endeksi</a> · <a href="/tr/egitim/">Eğitim</a> · <a href="/tr/hakkimizda/">Hakkımızda</a> · <a href="/tr/kurucu/">Kurucu</a> · <a href="/tr/metodoloji/">Metodoloji</a> · <a href="/durum">Ürün durumu</a> · <a href="/kosullar">Kullanım koşulları</a> · <a href="/gizlilik">Gizlilik</a> · <a href="/iade/">İade</a> · <a href="/">English</a></p>
  <p>İletişim: <a href="mailto:${SITE.email}">${SITE.email}</a></p>`}
</footer>
<script src="/site/site.js" defer></script>
<!--/email_off-->
</body>
</html>
`;
}

function write(path, html) {
  const file = join(DIST, path, "index.html");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

const ORG = { "@context": "https://schema.org", "@type": "Organization", name: SITE.name, alternateName: ["AISaaSavran", "aisaasavran.com", "AI SaaSavran AI visibility tracker", "AI SaaSavran yapay zekâ görünürlük aracı"], url: SITE.url, email: SITE.email, logo: SITE.url + "/icon.svg", sameAs: SITE.sameAs,
  description: `${DEF.en} It is an independent product (aisaasavran.com) and is not affiliated with similarly named companies or services (for example Savran AI, savran.ai).`,
  founder: { "@type": "Person", "@id": SITE.url + "/founder/#person", name: "Ramazan Savran", url: SITE.url + "/founder/" }, foundingDate: "2026", foundingLocation: { "@type": "Place", name: "Antalya, Turkey" },
  areaServed: ["TR", "Worldwide"], knowsAbout: ["AI visibility", "Generative engine optimization (GEO)", "Answer engine optimization (AEO)", "ChatGPT", "Claude", "Perplexity", "Gemini"] };
const WEBSITE = { "@context": "https://schema.org", "@type": "WebSite", name: SITE.name, url: SITE.url, inLanguage: ["en", "tr"], description: DEF.en, publisher: { "@type": "Organization", name: SITE.name, url: SITE.url } };
const crumbs = (items) => ({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: SITE.url + path })) });
const APP = {
  "@context": "https://schema.org", "@type": "SoftwareApplication", name: SITE.name, url: SITE.url, applicationCategory: "BusinessApplication",
  operatingSystem: "Web", alternateName: "aisaasavran.com", description: `${DEF.en} Plans: Free, Plus $60/month, Pro $300/month, Business $876/month.`,
  inLanguage: ["en", "tr"],
  offers: [["Free", 0], ["Plus", 60], ["Pro", 300], ["Business", 876]].map(([n, p]) => ({ "@type": "Offer", name: n, price: String(p), priceCurrency: "USD" })),
};


// Paketler (güncel fiyatlar migration 0060: 29 / 149 / 876 $; satışta, ödeme Paddle ile).
const PLAN_ROWS = (en) => [
  { name: "Free", price: "$0", per: "", items: en
      ? ["1 brand, 15 questions, 3 competitors", "4 measurements a month (one a week, automatic)", "Gemini, model knowledge (no live search)", "Website check and recommendations"]
      : ["1 marka, 15 soru, 3 rakip", "Ayda 4 ölçüm (haftada bir, otomatik)", "Gemini, model bilgisi (canlı arama yok)", "Web sitesi kontrolü ve öneriler"], live: true },
  { name: "Plus", id: "starter", price: "$60", per: en ? "/month" : "/ay", items: en
      ? ["1 brand, 25 questions, 5 competitors", "ChatGPT, Claude and Perplexity with live web search + Gemini", "Every week: ChatGPT and Gemini ask each question twice, Claude and Perplexity once", "Which websites the AI cited", "Products: AI accuracy check and weekly Google Shopping position", "Shareable report link and PDF"]
      : ["1 marka, 25 soru, 5 rakip", "ChatGPT, Claude ve Perplexity canlı web araması + Gemini", "Her hafta: ChatGPT ve Gemini her soruyu 2 kez, Claude ve Perplexity 1 kez sorar", "Yapay zekânın baktığı kaynak siteler", "Ürünler: yapay zekâ doğruluk kontrolü ve haftalık Google Shopping sırası", "Paylaşılabilir rapor bağlantısı ve PDF"] },
  { name: "Pro", id: "pro", price: "$300", per: en ? "/month" : "/ay", items: en
      ? ["5 brands, 30 questions each", "8 competitors per brand", "Team of 3", "API and MCP access for AI agents", "Everything in Plus", "For multi-location businesses and freelancers"]
      : ["5 marka, her biri 30 soru", "Marka başına 8 rakip", "3 kişilik ekip", "Yapay zekâ ajanları için API ve MCP erişimi", "Plus'taki her şey", "Çok şubeli işletmeler ve serbest çalışanlar için"] },
  { name: "Business", id: "agency", price: "$876", per: en ? "/month" : "/ay", items: en
      ? ["15 brands, 30 questions each", "10 competitors per brand", "15 team members", "Everything in Pro", "For agencies managing client brands"]
      : ["15 marka, her biri 30 soru", "Marka başına 10 rakip", "15 kişilik ekip", "Pro'daki her şey", "Müşteri markalarını yöneten ajanslar için"] },
];
const plansHtml = (en) => `
<section class="plans" id="${en ? "pricing" : "fiyatlar"}">
  <h2>${en ? "Pricing" : "Fiyatlar"}</h2>
  <div class="plan-grid">${PLAN_ROWS(en).map((p) => `
    <div class="plan${p.name === "Plus" ? " plan-main" : ""}">
      ${p.name === "Plus" ? `<span class="badge">${en ? "Recommended" : "Önerilen"}</span>` : ""}<h3>${p.name}</h3>
      <p class="price"><span>${p.price}</span>${p.per}</p>
      <ul>${p.items.map((i) => `<li>${i}</li>`).join("")}</ul>
      ${p.live
        ? `<a class="btn" href="/kayit">${en ? "Start free" : "Ücretsiz başla"}</a>`
        : `<a class="btn${p.name === "Plus" ? "" : " ghost"}" href="/hesap?plan=${p.id}">${en ? `Choose ${p.name}` : `${p.name}'ı seç`}</a>`}
    </div>`).join("")}
  </div>
  <p class="small">${en
    ? "Monthly billing, cancel anytime, full refund within 14 days of your first payment. Prices in US dollars; sales tax may be added at checkout. Payments are processed by our reseller, Paddle."
    : "Aylık ödeme, istediğiniz zaman iptal, ilk ödemeden sonraki 14 gün içinde tam iade. Fiyatlar ABD doları; ödeme sırasında vergi eklenebilir. Ödemeler yetkili satıcımız Paddle üzerinden alınır."}</p>
</section>
`;


// Ana sayfa üst bölüm kartı: GERÇEK ölçüm (17 Kasım 2026, ABD, canlı web araması, 8 soru, 48 cevap). Uydurma veri yok.
const WATCH = [["Apple Watch", 42], ["Garmin", 37], ["Galaxy Watch", 27], ["Pixel Watch", 26], ["Amazfit", 7]];
const heroCard = (en) => `
  <figure class="answer-card" aria-label="${en ? "Example of a real measurement" : "Gerçek ölçüm örneği"}">
    <figcaption class="ac-head"><span>${en ? "Example question · US, live web search" : "Örnek soru · ABD, canlı web araması"}</span><span class="chip">${en ? "17 Nov 2026" : "17 Kas 2026"}</span></figcaption>
    <p class="q"${en ? "" : ' lang="en"'}>“What is the best smartwatch to buy this Black Friday?”</p>
    ${en ? "" : `<p class="small tr-note">Türkçesi: “Black Friday'de hangi akıllı saati almalıyım?”</p>`}
    <p class="ac-label">${en ? "Recommended in how many of 48 answers (8 questions)" : "8 soruda, 48 cevabın kaçında önerildi"}</p>
    <ul class="ac-bars">${WATCH.map(([n, k], i) => `<li${i === WATCH.length - 1 ? ' class="low"' : ""}><span class="nm">${n}</span><span class="track"><span class="fill" style="width:${Math.round(k / 48 * 100)}%"></span></span><span class="k">${k}</span></li>`).join("")}</ul>
    <p class="cite">${en ? "Sources" : "Kaynaklar"}: techradar.com · tomsguide.com · wired.com · ChatGPT, Claude ${en ? "and" : "ve"} Perplexity</p>
  </figure>`;
const ICONS = {
  gap: '<path d="M3 12h4l3-8 4 16 3-8h4"/>', why: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  src: '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
  truth: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  shop: '<path d="M3 4h2l2.5 11h11L21 7H7"/><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/>',
  merge: '<circle cx="8" cy="12" r="5"/><circle cx="16" cy="12" r="5"/>',
};
const icon = (k) => `<svg class="ic" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k]}</svg>`;
const finalCta = (en) => `
<section class="final">
  <div><h2>${en ? "What does AI say about your brand?" : "Yapay zekâ markanız hakkında ne diyor?"}</h2>
  <p>${en ? "See your first result in a few minutes. No signup, no card." : "İlk sonucu birkaç dakikada görün. Üyelik ve kart gerekmez."}</p></div>
  <a class="btn bright" href="${en ? "/check/" : "/tr/kontrol/"}">${en ? "Run a free check" : "Ücretsiz kontrol et"}</a>
</section>`;

// 3) Tanıtım sayfası
const home = `
<section class="hero">
  <div class="hero-copy">
    <p class="engines">ChatGPT · Claude · Perplexity · Gemini</p>
    <h1>Müşteriniz yapay zekâya sorduğunda <em>markanız cevapta mı?</em></h1>
    <p class="lede">Müşterilerinizin soracağı soruları ChatGPT, Claude, Perplexity ve Gemini'ye biz soruyoruz. Markanızın anılıp anılmadığını, önerilip önerilmediğini, yerinize hangi rakibin seçildiğini ve cevabın hangi sitelere dayandığını gösteriyoruz.</p>
    <p class="actions"><a class="btn bright" href="/tr/kontrol/">Markanı ücretsiz kontrol et</a><a class="btn ghost" data-cta href="/kayit">Hesap aç</a></p>
    <p class="small">Üye olmadan ayda 2 kontrol · Ücretsiz paket: 1 marka, 15 soru, ayda 4 ölçüm · Kart istenmez · <a href="#fiyatlar">Fiyatlar</a></p>
  </div>${heroCard(false)}
</section>

<section class="qs" aria-label="Ne ölçüyoruz?">
  <div><h2>Anıldınız mı?</h2><p>Cevapta markanızın adı geçiyor mu? Ürün ve uygulama adlarını da markanıza bağlarız.</p></div>
  <div><h2>Önerildiniz mi?</h2><p>Öneri listesinde misiniz? "Önerilmez" gibi olumsuz bağlamları öneri saymayız.</p></div>
  <div><h2>Yerinize kim?</h2><p>Sizin yerinize hangi rakip önerildi, yapay zekâ kararını hangi sitelere bakarak verdi?</p></div>
</section>

<section class="howto">
  <p class="eyebrow">Nasıl çalışır?</p>
  <h2>Üç adımda nerede durduğunuzu görün</h2>
  <ol>
    <li><h3>Markanızı ve rakiplerinizi ekleyin</h3><p>Sektörünüzü seçin; örnek rakipler ve hazır Türkçe sorular gelsin.</p></li>
    <li><h3>Ölçümü başlatın</h3><p>Her soru birden fazla kez sorulur; sonuç güven aralığıyla gösterilir.</p></li>
    <li><h3>Ne yapacağınızı görün</h3><p>Web siteniz kontrol edilir, eksikler önem sırasına göre listelenir. Haftalık ölçümle değişimi izleyin.</p></li>
  </ol>
</section>

<section class="demo daily" id="daily" data-lang="tr" hidden aria-labelledby="daily-h"></section>
${demoHtml(false)}

<section class="feat">
  <p class="eyebrow">Rapor</p>
  <h2>Sadece skor değil, nedeni ve çözümü</h2>
  <div class="feat-grid">
    <div>${icon("gap")}<h3>Motor farkı</h3><p>Aynı soruda Claude sizi öneriyor, ChatGPT önermiyor mu? Her motor ayrı gösterilir, büyük farklar işaretlenir.</p></div>
    <div>${icon("why")}<h3>Neden önerilmediniz?</h3><p>Önerilmediğiniz her soru için kanıt kartı: yerinize kim önerildi, cevap hangi sitelere dayandı.</p></div>
    <div>${icon("src")}<h3>Kaynak etkisi</h3><p>Hangi site hangi markanın önerilmesine katkı veriyor? Kendi siteniz kaynak gösterilip yine de rakip önerildiyse ayrıca belirtilir.</p></div>
    <div>${icon("truth")}<h3>Bilgi doğruluğu (TruthGuard)</h3><p>Yapay zekânın ürünleriniz hakkında söylediklerini sizin girdiğiniz resmî bilgilerle karşılaştırır: doğru, yanlış, doğrulanamadı.</p></div>
    <div>${icon("shop")}<h3>Yapay zekâ ↔ Google Shopping</h3><p>Yapay zekânın en çok önerdiği marka ile Google Shopping'de 1. sıradaki aynı mı? Ürünleriniz haftada bir aranır.</p></div>
    <div>${icon("merge")}<h3>Aynı şirket, tek rakip</h3><p>Bir rakibin alt markası ya da sahibi olan şirket cevaplarda ayrı adla geçerse birleştirmeniz önerilir; aynı şirket iki kez sayılmaz.</p></div>
  </div>
  <p class="small">Motor farkı, kaynak etkisi, TruthGuard ve Google Shopping canlı aramalı ölçümde, ücretli paketlerdedir. Gemini internete bakmadan, model bilgisiyle ölçülür ve raporda açıkça yazar. <a href="/durum">Ayrıntılı ürün durumu</a></p>
</section>

${selfBox(false)}
${plansHtml(false)}
${faqHtml(HOME_FAQ)}
${finalCta(false)}
`;
write("/tr/", page({ lang: "tr", alt: "/", path: "/tr/", title: "AI SaaSavran: Markanız ChatGPT, Gemini, Claude ve Perplexity'de mi?", description: DEF.tr, body: home, home: true, schema: [ORG, WEBSITE, APP, faqLd(HOME_FAQ)] }));


// 3a) English home (default)
const enHome = `
<section class="hero">
  <div class="hero-copy">
    <p class="engines">ChatGPT · Claude · Perplexity · Gemini</p>
    <h1>When customers ask AI for a recommendation, <em>are you in the answer?</em></h1>
    <p class="lede">AI SaaSavran asks ChatGPT, Claude, Perplexity and Gemini the questions your customers ask, then shows whether your business is mentioned, recommended, or passed over for a competitor, and which websites the AI relied on.</p>
    <p class="actions"><a class="btn bright" href="/check/">Check your brand for free</a><a class="btn ghost" data-cta href="/kayit">Create account</a></p>
    <p class="small">2 checks a month without signing up · Free plan: 1 brand, 15 questions, 4 measurements a month · No card · <a href="#pricing">See pricing</a></p>
  </div>${heroCard(true)}
</section>

<section class="qs" aria-label="What you see">
  <div><h2>Mentioned?</h2><p>Is your business named? Product names and alternate spellings are matched to your brand.</p></div>
  <div><h2>Recommended?</h2><p>Are you on the shortlist? "Not recommended" and passing mentions don't count.</p></div>
  <div><h2>Who instead?</h2><p>Who gets recommended instead, and which pages the AI read before answering.</p></div>
</section>

<section class="howto">
  <p class="eyebrow">Method</p>
  <h2>Built to be honest about the numbers</h2>
  <ol>
    <li><h3>Every question is asked more than once</h3><p>One answer is luck; rates over many answers are signal.</p></li>
    <li><h3>Ranges, not false precision</h3><p>Results come with a confidence range and a warning when the sample is small.</p></li>
    <li><h3>Live search or not, always labelled</h3><p>Answers from model knowledge and answers from live web search are never mixed.</p></li>
  </ol>
</section>

<section class="demo daily" id="daily" data-lang="en" hidden aria-labelledby="daily-h"></section>
${demoHtml(true)}

<section class="feat">
  <p class="eyebrow">Report</p>
  <h2>Not just a score: the reason and the fix</h2>
  <div class="feat-grid">
    <div>${icon("gap")}<h3>Engine gaps</h3><p>Does Claude recommend you while ChatGPT doesn't? Every engine is shown separately and large gaps are flagged.</p></div>
    <div>${icon("why")}<h3>Why you weren't recommended</h3><p>An evidence card for each question you lost: who was recommended instead and which sites the answer relied on.</p></div>
    <div>${icon("src")}<h3>Source impact</h3><p>Which site helps which brand get recommended? If your own site was cited and a competitor was still recommended, we point it out.</p></div>
    <div>${icon("truth")}<h3>Fact check (TruthGuard)</h3><p>Compares what AI says about your products with the official facts you enter: correct, wrong, or can't be verified.</p></div>
    <div>${icon("shop")}<h3>AI ↔ Google Shopping</h3><p>Is AI's most recommended brand also #1 on Google Shopping? Your products are searched once a week.</p></div>
    <div>${icon("merge")}<h3>One company, one competitor</h3><p>When a competitor's sub-brand or parent company shows up under another name, you're prompted to merge them, so one company isn't counted twice.</p></div>
  </div>
  <p class="small">Engine gaps, source impact, TruthGuard and Google Shopping are part of live-search measurement on paid plans. Gemini is measured from model knowledge (no live search) and labelled as such. The app is in English and Turkish.</p>
</section>

${selfBox(true)}
${plansHtml(true)}
${faqHtml(HOME_FAQ_EN, true)}
${finalCta(true)}
`;
write("/", page({ lang: "en", alt: "/tr/", path: "/", title: "AI SaaSavran: Does ChatGPT recommend your business?", description: DEF.en, body: enHome, home: true, schema: [ORG, WEBSITE, APP, faqLd(HOME_FAQ_EN)] }));

// 4a) English guides
const enList = `
<section class="article">
  <h1>Guides</h1>
  <p class="lede">How to measure and improve your brand's visibility in AI assistants. Examples come from our own real measurements.</p>
  <p>More and more customers ask ChatGPT, Gemini or Claude which product, shop or service to choose. The assistant usually names a handful of brands, and the rest are invisible. These guides explain how to measure that visibility properly (repeated questions, each engine separately, live web search versus model knowledge), why an AI recommends a competitor instead of you, and what you can change: the sources the AI reads, the questions your customers ask, and how clearly your own site describes what you do. They are written for small businesses, agencies, product brands and content creators. Every number in them comes from a real measurement, and we say when a sample is small.</p>
  <ul class="guide-list">${GUIDES_EN.map((g) => `<li><a href="/guides/${g.slug}/"><b>${esc(g.title)}</b><span>${esc(g.description)}</span></a></li>`).join("")}</ul>
</section>`;
write("/guides/", page({ lang: "en", alt: "/rehber/", path: "/guides/", title: "Guides: AI visibility | AI SaaSavran", description: "Guides to measuring and improving your brand's visibility in ChatGPT and Gemini.", body: enList, schema: [ORG] }));
for (const g of GUIDES_EN) {
  const path = `/guides/${g.slug}/`;
  const others = GUIDES_EN.filter((x) => x.slug !== g.slug).map((x) => `<li><a href="/guides/${x.slug}/">${esc(x.short)}</a></li>`).join("");
  const body = `
<article class="article">
  <p class="crumb"><a href="/guides/">Guides</a></p>
  <h1>${esc(g.title)}</h1>
  <p class="meta">Updated ${new Date(SITE.updated).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })} · AI SaaSavran</p>
  ${g.body}
  ${faqHtml(g.faq, true)}
  <aside class="next"><p><b>Measure your own brand.</b> The free plan includes 15 questions and ready-made question templates.</p><a class="btn" href="/kayit">Start free</a></aside>
  <nav class="related" aria-label="More guides"><h2>More guides</h2><ul>${others}</ul></nav>
</article>`;
  const article = { "@context": "https://schema.org", "@type": "Article", headline: g.title, description: g.description, inLanguage: "en", datePublished: SITE.updated, dateModified: SITE.updated, author: { "@type": "Organization", name: SITE.name, url: SITE.url }, publisher: { "@type": "Organization", name: SITE.name, logo: { "@type": "ImageObject", url: SITE.url + "/icon.svg" } }, mainEntityOfPage: SITE.url + path };
  write(path, page({ lang: "en", alt: `/rehber/${g.tr}/`, path, title: seoTitle(g.title, g.short), description: g.description, body, schema: [article, faqLd(g.faq), crumbs([["AI SaaSavran", "/"], ["Guides", "/guides/"], [g.short, path]])], type: "article" }));
}

// 4) Rehberler (Türkçe)
const list = `
<section class="article">
  <h1>Rehberler</h1>
  <p class="lede">Markanızın yapay zekâ asistanlarındaki görünürlüğünü ölçmek ve artırmak için Türkçe rehberler. Örnekler kendi gerçek ölçümlerimizden.</p>
  <p>Müşteriler artık hangi ürünü, mağazayı veya hizmeti seçeceklerini ChatGPT, Gemini ya da Claude'a soruyor. Yapay zekâ genellikle birkaç marka sayıyor; geri kalanlar görünmez kalıyor. Bu rehberler bu görünürlüğün doğru nasıl ölçüleceğini (tekrarlanan sorular, her motor ayrı, canlı web araması ve model bilgisi ayrımı), yapay zekânın neden sizin yerinize rakibinizi önerdiğini ve neleri değiştirebileceğinizi anlatıyor: yapay zekânın okuduğu kaynaklar, müşterinizin sorduğu sorular ve kendi sitenizin ne yaptığınızı ne kadar açık anlattığı. Küçük işletmeler, ajanslar, ürün markaları ve içerik üreticileri için yazıldı. İçlerindeki her sayı gerçek bir ölçümden geliyor; örneklem küçükse bunu söylüyoruz.</p>
  <ul class="guide-list">${GUIDES.map((g) => `<li><a href="/rehber/${g.slug}/"><b>${esc(g.title)}</b><span>${esc(g.description)}</span></a></li>`).join("")}</ul>
</section>`;
write("/rehber/", page({ lang: "tr", alt: "/guides/", path: "/rehber/", title: "Rehberler: Yapay zekâ görünürlüğü | AI SaaSavran", description: "ChatGPT, Gemini, Claude ve Perplexity'de markanızın görünürlüğünü ölçmek ve artırmak için Türkçe rehberler.", body: list, schema: [ORG] }));

for (const g of GUIDES) {
  const path = `/rehber/${g.slug}/`;
  const others = GUIDES.filter((x) => x.slug !== g.slug).map((x) => `<li><a href="/rehber/${x.slug}/">${esc(x.short)}</a></li>`).join("");
  const body = `
<article class="article">
  <p class="crumb"><a href="/rehber/">Rehberler</a></p>
  <h1>${esc(g.title)}</h1>
  <p class="meta">Güncelleme: ${new Date(SITE.updated).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })} · AI SaaSavran</p>
  ${g.body}
  ${faqHtml(g.faq)}
  <aside class="next"><p><b>Kendi markanızı ölçün.</b> Ücretsiz pakette 15 soru ve sektörünüze hazır Türkçe şablonlar.</p><a class="btn" href="/kayit">Ücretsiz başla</a></aside>
  <nav class="related" aria-label="Diğer rehberler"><h2>Diğer rehberler</h2><ul>${others}</ul></nav>
</article>`;
  const article = { "@context": "https://schema.org", "@type": "Article", headline: g.title, description: g.description, inLanguage: "tr", datePublished: SITE.updated, dateModified: SITE.updated, author: { "@type": "Organization", name: SITE.name, url: SITE.url }, publisher: { "@type": "Organization", name: SITE.name, logo: { "@type": "ImageObject", url: SITE.url + "/icon.svg" } }, mainEntityOfPage: SITE.url + path };
  const enG = GUIDES_EN.find((x) => x.tr === g.slug);
  write(path, page({ lang: "tr", alt: enG ? `/guides/${enG.slug}/` : "/guides/", path, title: seoTitle(g.title, g.short), description: g.description, body, schema: [article, faqLd(g.faq), crumbs([["AI SaaSavran", "/tr/"], ["Rehberler", "/rehber/"], [g.short, path]])], type: "article" }));
}

// 4b) Blog (haftada bir yazı; gerçek ölçüm verilerinden). Yayın tarihi gelmemiş yazı üretilmez.
const today = new Date().toISOString().slice(0, 10);
const posts = POSTS.filter((p) => p.date <= today).sort((a, b) => (a.date < b.date ? 1 : -1));
const blogBase = (lang) => (lang === "en" ? "/blog/" : "/tr/blog/");
const postPath = (p) => `${blogBase(p.lang)}${p.slug}/`;
const twin = (p) => posts.find((x) => x.pair === p.pair && x.lang !== p.lang);
const fmtDate = (d, en) => new Date(d).toLocaleDateString(en ? "en-US" : "tr-TR", { day: "numeric", month: "long", year: "numeric" });
for (const lang of ["en", "tr"]) {
  const en = lang === "en";
  const mine = posts.filter((p) => p.lang === lang);
  const list = `
<section class="article">
  <h1>${en ? "Blog: what AI actually recommends" : "Blog: yapay zekâ gerçekte neyi öneriyor?"}</h1>
  <p class="lede">${en ? "Every week we ask ChatGPT, Claude and Gemini the questions real customers ask, and write up the most interesting findings. Real measurements, small samples, clearly labelled." : "Her hafta ChatGPT, Claude ve Gemini'ye gerçek müşterilerin sorduğu soruları soruyor, en ilginç sonuçları yazıyoruz. Gerçek ölçümler, küçük örneklemler, açıkça etiketli."}</p>
  <p>${en ? "Each post covers one category, such as phones, online stores, headphones or YouTube channels. We ask the same buyer questions to each engine, count how often each brand is mentioned and recommended, compare the engines, check the AI's product claims against official data and list the sites it cited. Brands are shown as letters in the results and the measured brands are listed at the end, so the focus stays on how AI assistants choose, not on promoting anyone. Each post also has a short video on our YouTube channel." : "Her yazı tek bir kategoriyi ele alıyor: telefonlar, alışveriş siteleri, kulaklıklar, YouTube kanalları gibi. Her motora aynı müşteri sorularını soruyor, her markanın kaç kez anıldığını ve önerildiğini sayıyor, motorları karşılaştırıyor, yapay zekânın ürün iddialarını resmî bilgilerle kontrol ediyor ve gösterdiği kaynakları listeliyoruz. Sonuçlarda markalar harfle gösteriliyor, ölçülen markalar yazının sonunda listeleniyor; amaç kimseyi övmek değil, yapay zekânın nasıl seçtiğini göstermek. Her yazının YouTube kanalımızda kısa bir videosu da var."}</p>
  <ul class="guide-list">${mine.map((p) => `<li><a href="${postPath(p)}"><b>${esc(p.title)}</b><span>${fmtDate(p.date, en)} · ${esc(p.description)}</span></a></li>`).join("")}</ul>
  <p>${en ? "Why it matters: when an AI assistant answers a buying question, it rarely lists more than five brands. Our measurements repeatedly show that the brands it picks depend on the engine, the exact question and the review sites it reads, not only on market share. Follow new posts by RSS or on our YouTube channel @aisaasavran, and use the free check to see where your own business stands. Want us to measure a category? Email us; the most requested topics go into upcoming posts." : "Neden önemli: Yapay zekâ bir satın alma sorusuna cevap verirken nadiren beşten fazla marka sayar. Ölçümlerimiz, seçtiği markaların yalnızca pazar payına değil; motora, sorunun tam hâline ve okuduğu inceleme sitelerine bağlı olduğunu tekrar tekrar gösteriyor. Yeni yazıları RSS ile veya YouTube kanalımız @aisaasavran'dan takip edebilir, kendi işletmenizin durumunu ücretsiz kontrolle görebilirsiniz. Bir kategori ölçmemizi isterseniz bize yazın; en çok istenen konuları sıradaki yazılara ekliyoruz."}</p>
  <p><a href="${blogBase(lang)}rss.xml">RSS</a> · <a href="https://www.youtube.com/@aisaasavran">YouTube</a> · <a href="${en ? "/check/" : "/tr/kontrol/"}">${en ? "Free check" : "Ücretsiz kontrol"}</a></p>
</section>`;
  write(blogBase(lang), page({ lang, alt: blogBase(en ? "tr" : "en"), path: blogBase(lang), title: en ? "Blog: what AI recommends | AI SaaSavran" : "Blog: yapay zekâ ne öneriyor? | AI SaaSavran", description: en ? "Weekly findings from real measurements of what ChatGPT, Claude and Gemini recommend to customers." : "ChatGPT, Claude ve Gemini'nin müşterilere ne önerdiğine dair gerçek ölçümlerden haftalık bulgular.", body: list, schema: [ORG] }));
  for (const p of mine) {
    const path = postPath(p), tw = twin(p);
    const others = mine.filter((x) => x !== p).slice(0, 5).map((x) => `<li><a href="${postPath(x)}">${esc(x.short)}</a></li>`).join("");
    const body = `
<article class="article">
  <p class="crumb"><a href="${blogBase(lang)}">Blog</a></p>
  <h1>${esc(p.title)}</h1>
  <p class="meta">${fmtDate(p.date, en)} · AI SaaSavran</p>
  ${p.body}
  ${p.video ? `<p class="video-link"><a href="https://www.youtube.com/shorts/${p.video.id}" rel="noopener"><img src="${p.cover}" alt="${esc(p.video.title)}" width="640" height="360" loading="lazy"><span>▶ ${esc(p.video.title)}</span></a></p>` : ""}
  <p class="note"><b>${en ? "Note:" : "Not:"}</b> ${en ? `These are the AI's answers on ${fmtDate(p.date, true)}. Small sample; not representative of the whole market. Letters were assigned at random. Brands measured (alphabetical): ${esc(p.names)}. Brand names belong to their owners.` : `Bunlar yapay zekânın ${fmtDate(p.date, false)} tarihli cevaplarıdır. Küçük örneklem, tüm pazarı temsil etmez. Harfler rastgele atanmıştır. Ölçülen markalar (alfabetik): ${esc(p.names)}. Marka adları sahiplerine aittir.`}</p>
  ${faqHtml(p.faq ?? [], en)}
  <aside class="next"><p><b>${en ? "What does AI say about your brand?" : "Yapay zekâ sizin markanız için ne diyor?"}</b> ${en ? "Measure it across ChatGPT, Gemini, Claude and Perplexity." : "ChatGPT, Gemini, Claude ve Perplexity'de ölçün."}</p><a class="btn" href="${en ? "/check/" : "/tr/kontrol/"}">${en ? "Free check" : "Ücretsiz kontrol"}</a></aside>
  ${others ? `<nav class="related" aria-label="${en ? "More posts" : "Diğer yazılar"}"><h2>${en ? "More posts" : "Diğer yazılar"}</h2><ul>${others}</ul></nav>` : ""}
</article>`;
    const posting = { "@context": "https://schema.org", "@type": "BlogPosting", headline: p.title, description: p.description, inLanguage: lang, datePublished: p.date, dateModified: p.date, image: SITE.url + p.cover, author: { "@type": "Organization", name: SITE.name, url: SITE.url }, publisher: { "@type": "Organization", name: SITE.name, logo: { "@type": "ImageObject", url: SITE.url + "/icon.svg" } }, mainEntityOfPage: SITE.url + path };
    write(path, page({ lang, alt: tw ? postPath(tw) : blogBase(en ? "tr" : "en"), path, title: seoTitle(p.title, p.short), description: p.description, body, schema: [posting, crumbs([["AI SaaSavran", en ? "/" : "/tr/"], ["Blog", blogBase(lang)], [p.short, path]]), ...(p.faq?.length ? [faqLd(p.faq)] : [])], type: "article", image: p.cover }));
  }
  const rssEsc = (x) => esc(x);
  writeFileSync(join(DIST, `${blogBase(lang).slice(1)}rss.xml`), `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>AI SaaSavran Blog${en ? "" : " (Türkçe)"}</title><link>${SITE.url}${blogBase(lang)}</link><description>${en ? "What ChatGPT, Claude and Gemini actually recommend — weekly real measurements." : "ChatGPT, Claude ve Gemini gerçekte neyi öneriyor — haftalık gerçek ölçümler."}</description><language>${lang}</language>
${mine.map((p) => `<item><title>${rssEsc(p.title)}</title><link>${SITE.url}${postPath(p)}</link><guid>${SITE.url}${postPath(p)}</guid><pubDate>${new Date(p.date + "T08:00:00Z").toUTCString()}</pubDate><description>${rssEsc(p.description)}</description></item>`).join("\n")}
</channel></rss>
`);
}

// 4c) Hakkımızda: yapay zekânın markayı tek ve doğru bir tanımla tanıması için
const ABOUT = {
  en: { path: "/about/", alt: "/tr/hakkimizda/", title: "About AI SaaSavran | AI visibility measurement", description: "AI SaaSavran measures how often ChatGPT, Gemini, Claude and Perplexity mention and recommend a brand or product, and which sources they rely on.", body: `
<section class="article">
  <h1>About AI SaaSavran</h1>
  <p class="lede"><b>${DEF.en}</b> It is an independent web application at aisaasavran.com. How we measure: <a href="/methodology/">methodology</a>.</p>
  <h2>What it does</h2>
  <ul>
    <li>Asks AI assistants the questions your customers would ask, in Turkish or English, several times.</li>
    <li>Reports each engine separately: Gemini without live web search on the free plan; ChatGPT, Claude and Perplexity with live web search on paid plans.</li>
    <li>Separates mention, recommendation and citation; shows competitor comparisons, the sites the AI cited and the share of your own site among them.</li>
    <li>Checks product-level facts (price, specifications) and compares them with shopping results.</li>
    <li>Gives a site audit and an action list, and tracks whether changes improved results.</li>
  </ul>
  <h2>Who it is for</h2>
  <p>Small and medium businesses, product brands, agencies managing several brands, and YouTubers and other content creators.</p>
  <h2>How we work</h2>
  <ul>
    <li>Every number comes from a real API answer. Results without a real connection are never shown as real.</li>
    <li>Each measurement is labelled as live web search or model knowledge.</li>
    <li>Small samples are called small samples.</li>
  </ul>
  <h2>Facts</h2>
  <ul>
    <li>Launched: 2026, early access. Founded by <a href="/founder/">Ramazan Savran</a> in Antalya, Turkey; serves customers in Turkey and worldwide. The name combines SaaS and the founder's surname, Savran.</li>
    <li>Plans: Free, Plus $60, Pro $300, Business $876 per month (<a href="/pricing/">pricing</a>).</li>
    <li>Not affiliated with other companies or services with a similar name.</li>
    <li>Contact: <a href="mailto:${SITE.email}">${SITE.email}</a> · YouTube: <a href="https://www.youtube.com/@aisaasavran">@aisaasavran</a></li>
  </ul>
</section>` },
  tr: { path: "/tr/hakkimizda/", alt: "/about/", title: "AI SaaSavran hakkında | Yapay zekâ görünürlük ölçümü", description: "AI SaaSavran, ChatGPT, Gemini, Claude ve Perplexity'nin bir markayı veya ürünü ne sıklıkla andığını ve önerdiğini, hangi kaynaklara baktığını ölçer.", body: `
<section class="article">
  <h1>AI SaaSavran hakkında</h1>
  <p class="lede"><b>${DEF.tr}</b> aisaasavran.com adresinde çalışan bağımsız bir web uygulamasıdır. Nasıl ölçtüğümüz: <a href="/tr/metodoloji/">metodoloji</a>.</p>
  <h2>Ne yapar?</h2>
  <ul>
    <li>Müşterilerinizin soracağı soruları Türkçe veya İngilizce olarak yapay zekâ asistanlarına birkaç kez sorar.</li>
    <li>Her motoru ayrı raporlar: ücretsiz pakette canlı aramasız Gemini; ücretli paketlerde canlı web aramalı ChatGPT, Claude ve Perplexity.</li>
    <li>Anılma, önerilme ve kaynak gösterilmeyi ayırır; rakip karşılaştırmasını, yapay zekânın gösterdiği siteleri ve bunlar içinde kendi sitenizin payını gösterir.</li>
    <li>Ürün düzeyinde bilgileri (fiyat, özellik) kontrol eder ve alışveriş sonuçlarıyla karşılaştırır.</li>
    <li>Site denetimi ve aksiyon listesi verir, yapılan değişikliklerin sonucu iyileştirip iyileştirmediğini takip eder.</li>
  </ul>
  <h2>Kimler için?</h2>
  <p>Küçük ve orta ölçekli işletmeler, ürün markaları, birden fazla markayı yöneten ajanslar, YouTuber'lar ve diğer içerik üreticileri.</p>
  <h2>Çalışma ilkelerimiz</h2>
  <ul>
    <li>Her sayı gerçek bir API cevabından gelir. Gerçek bağlantısı olmayan sonuç asla gerçekmiş gibi gösterilmez.</li>
    <li>Her ölçümün canlı web araması mı model bilgisi mi olduğu yazılır.</li>
    <li>Küçük örneklemlere küçük örneklem denir.</li>
  </ul>
  <h2>Bilgiler</h2>
  <ul>
    <li>Kuruluş: 2026, erken erişim. Kurucu: <a href="/tr/kurucu/">Ramazan Savran</a> (Antalya). Türkiye'deki ve dünyadaki müşterilere hizmet verir. Ad, SaaS ile kurucunun soyadı Savran'dan gelir.</li>
    <li>Paketler: Ücretsiz, Plus 60 $, Pro 300 $, Business 876 $ (aylık) (<a href="/tr/#fiyatlar">fiyatlar</a>).</li>
    <li>Benzer adlı başka şirket veya hizmetlerle bağlantısı yoktur.</li>
    <li>İletişim: <a href="mailto:${SITE.email}">${SITE.email}</a> · YouTube: <a href="https://www.youtube.com/@aisaasavran">@aisaasavran</a></li>
  </ul>
</section>` },
};
for (const [lang, a] of Object.entries(ABOUT)) {
  const aboutLd = { "@context": "https://schema.org", "@type": "AboutPage", name: a.title, url: SITE.url + a.path, inLanguage: lang, mainEntity: ORG };
  write(a.path, page({ lang, alt: a.alt, path: a.path, title: a.title, description: a.description, body: a.body, schema: [aboutLd] }));
}

// 4d) Metodoloji + marka görünürlüğü + ürün görünürlüğü (TR + EN)
for (const m of METHOD_PAGES) {
  const en = m.lang === "en";
  const home = en ? ["AI SaaSavran", "/"] : ["AI SaaSavran", "/tr/"];
  const siblings = METHOD_PAGES.filter((x) => x.lang === m.lang && x !== m).map((x) => `<li><a href="${x.path}">${esc(x.short)}</a></li>`).join("");
  const body = `
<article class="article">
  <h1>${esc(m.title)}</h1>
  ${m.body}
  ${faqHtml(m.faq, en)}
  <nav class="related" aria-label="${en ? "Related" : "İlgili"}"><h2>${en ? "Related" : "İlgili sayfalar"}</h2><ul>${siblings}<li><a href="${en ? "/guides/" : "/rehber/"}">${en ? "Guides" : "Rehberler"}</a></li><li><a href="${en ? "/about/" : "/tr/hakkimizda/"}">${en ? "About" : "Hakkımızda"}</a></li></ul></nav>
  <aside class="next"><p><b>${en ? "See your own numbers." : "Kendi sonuçlarınızı görün."}</b></p><a class="btn" href="${en ? "/check/" : "/tr/kontrol/"}">${en ? "Free check" : "Ücretsiz kontrol"}</a></aside>
</article>`;
  write(m.path, page({ lang: m.lang, alt: m.alt, path: m.path, title: seoTitle(m.title, m.short), description: m.description, body, type: "article", schema: [crumbs([home, [m.short, m.path]]), faqLd(m.faq)] }));
}

// Eğitim sayfaları (yazılı adımlar + varsa YouTube bağlantısı)
for (const lang of ["en", "tr"]) {
  const en = lang === "en"; const path = tutorialsPath(lang);
  write(path, page({ lang, alt: tutorialsPath(en ? "tr" : "en"), path,
    title: en ? "Tutorials: how to use AI SaaSavran" : "Eğitim: AI SaaSavran nasıl kullanılır?",
    description: en ? "Ten short step-by-step lessons: free check, adding a brand, questions and competitors, first measurement, reading the report, sources, recommendations, products, sharing and weekly runs." : "On kısa, adım adım ders: ücretsiz kontrol, marka ekleme, soru ve rakipler, ilk ölçüm, raporu okuma, kaynaklar, öneriler, ürünler, paylaşım ve haftalık ölçüm.",
    body: tutorialsHtml(lang), schema: [tutorialsSchema(lang, SITE.url), crumbs([["AI SaaSavran", en ? "/" : "/tr/"], [en ? "Tutorials" : "Eğitim", path]])] }));
}


// 4d) Kurucu sayfası (18 Kasım, sahip onayı ve kendi verdiği bilgilerle). Yapay zekânın markayı bir kişiye bağlayıp doğru tanıması için.
const PERSON = { "@context": "https://schema.org", "@type": "Person", "@id": SITE.url + "/founder/#person", name: "Ramazan Savran", jobTitle: "Founder", url: SITE.url + "/founder/",
  homeLocation: { "@type": "Place", name: "Antalya, Turkey" }, worksFor: { "@type": "Organization", name: SITE.name, url: SITE.url },
  knowsAbout: ["AI visibility", "Generative engine optimization", "Banking", "Customer service", "Training"] };
const FOUNDER = {
  en: { path: "/founder/", alt: "/tr/kurucu/", title: "Ramazan Savran, founder of AI SaaSavran", description: "Ramazan Savran founded AI SaaSavran in Antalya, Turkey, after eight years in banking. The name AI SaaSavran combines SaaS and his surname, Savran.", body: `
<section class="article">
  <p class="eyebrow">Founder</p>
  <h1>Ramazan Savran</h1>
  <p class="lede">Ramazan Savran is the founder of <a href="/about/">AI SaaSavran</a>, the tool that measures how often ChatGPT, Claude, Perplexity and Gemini mention and recommend brands and products. He lives in Antalya, Turkey.</p>
  <h2>Background</h2>
  <p>Ramazan worked in banking for eight years, in roles that included the bank's call centre and staff training. Before that he worked as an agricultural technician. His interest in artificial intelligence led him to focus on building products that add real value, and in 2026 he started AI SaaSavran.</p>
  <h2>Why AI SaaSavran</h2>
  <p>More and more customers ask AI assistants which product, shop or service to choose. Years of answering customers' questions showed him how much the first answer matters. AI SaaSavran lets businesses see whether they are part of that answer, measured with real questions and real answers, never simulated data shown as real.</p>
  <h2>About the name</h2>
  <p>AI SaaSavran = SaaS + Savran, the founder's surname. It is not affiliated with Savran AI (savran.ai) or any other similarly named company.</p>
  <p>Contact: <a href="mailto:${SITE.email}">${SITE.email}</a></p>
</section>` },
  tr: { path: "/tr/kurucu/", alt: "/founder/", title: "Ramazan Savran, AI SaaSavran'ın kurucusu", description: "Ramazan Savran, sekiz yıllık bankacılık deneyiminin ardından AI SaaSavran'ı Antalya'da kurdu. AI SaaSavran adı SaaS ile kurucunun soyadı Savran'dan gelir.", body: `
<section class="article">
  <p class="eyebrow">Kurucu</p>
  <h1>Ramazan Savran</h1>
  <p class="lede">Ramazan Savran, markaların ve ürünlerin ChatGPT, Claude, Perplexity ve Gemini cevaplarında ne sıklıkla anıldığını ve önerildiğini ölçen <a href="/tr/hakkimizda/">AI SaaSavran</a>'ın kurucusudur. Antalya'da yaşıyor.</p>
  <h2>Geçmişi</h2>
  <p>Sekiz yıl bankacılık sektöründe çalıştı; bankada çağrı merkezi ve eğitmenlik gibi görevlerde bulundu. Daha önce ziraat teknikeri olarak çalıştı. Yapay zekâya ilgisi onu katma değerli işler üretmeye yöneltti ve 2026'da AI SaaSavran'ı kurdu.</p>
  <h2>Neden AI SaaSavran?</h2>
  <p>Müşteriler artık hangi ürünü, mağazayı veya hizmeti seçeceklerini yapay zekâ asistanlarına soruyor. Yıllarca müşteri sorularını cevaplamak, ilk cevabın ne kadar önemli olduğunu gösterdi. AI SaaSavran, işletmelerin o cevapta yer alıp almadığını gerçek sorular ve gerçek cevaplarla gösterir; simülasyon asla gerçek gibi sunulmaz.</p>
  <h2>Adın hikâyesi</h2>
  <p>AI SaaSavran = SaaS + Savran (kurucunun soyadı). Savran AI (savran.ai) veya benzer adlı başka bir şirketle bağlantısı yoktur.</p>
  <p>İletişim: <a href="mailto:${SITE.email}">${SITE.email}</a></p>
</section>` },
};
for (const [lang, f] of Object.entries(FOUNDER)) {
  const prof = { "@context": "https://schema.org", "@type": "ProfilePage", name: f.title, url: SITE.url + f.path, inLanguage: lang, mainEntity: PERSON };
  write(f.path, page({ lang, alt: f.alt, path: f.path, title: f.title + " | AI SaaSavran", description: f.description, body: f.body, schema: [prof, ORG], type: "profile" }));
}

// 5) Tarayıcılar ve yapay zekâ botları için dosyalar
// ---------- Ölçüm sayfaları (haftalık otomatik; scripts/export-measurements.ts) ----------
const MITEMS = MEASUREMENTS.items ?? [];
for (const m of MITEMS) {
  const tr = m.lang === "tr";
  const desc = leadSentence(m, (x) => x).slice(0, 160);
  write(mPath(m), page({ lang: m.lang, path: mPath(m), title: seoTitle(m.question, m.question.slice(0, 50)), description: desc, type: "article",
    body: measurementBody(m, esc),
    schema: [ORG, crumbs([[tr ? "Ana sayfa" : "Home", tr ? "/tr/" : "/"], [tr ? "Ölçümler" : "Measurements", mIndex(m.lang)], [m.question.slice(0, 60), mPath(m)]]),
      { "@context": "https://schema.org", "@type": "Dataset", name: m.question, description: desc, url: SITE.url + mPath(m), inLanguage: m.lang, dateModified: m.at.slice(0, 10),
        creator: { "@type": "Organization", name: SITE.name, url: SITE.url }, license: "https://creativecommons.org/licenses/by/4.0/",
        measurementTechnique: "Repeated questions to AI assistants via official APIs; brand mention and recommendation counts", variableMeasured: ["recommended", "mentioned", "first pick"] }] }));
}
for (const lang of ["tr", "en"]) {
  const items = MITEMS.filter((m) => m.lang === lang);
  if (!items.length) continue;
  write(mIndex(lang), page({ lang, path: mIndex(lang), title: lang === "tr" ? "Yapay zekâ ne öneriyor? Gerçek ölçümler | AI SaaSavran" : "What does AI recommend? Real measurements | AI SaaSavran",
    description: lang === "tr" ? "ChatGPT, Claude, Perplexity ve Gemini'nin gerçek sorulara verdiği cevaplarda hangi markaların önerildiği. Haftalık güncellenir." : "Which brands ChatGPT, Claude, Perplexity and Gemini recommend for real questions. Updated weekly.",
    body: indexBody(lang, items, esc), schema: [ORG] }));
}
// ---------- Yapay Zekâ Görünürlük Endeksi (ölçümlerin sektör özeti; aynı veriyle haftalık) ----------
const IDX = buildIndex(MITEMS);
if (IDX.other.length) console.log(`Endeks: sektörü bulunamayan ${IDX.other.length} soru endekse girmedi: ${IDX.other.join(" | ")}`);
const IDX_SECTORS = IDX.groups.reduce((a, g) => a + g.sectors.length, 0);
if (IDX_SECTORS) {
  for (const lang of ["tr", "en"]) {
    const tr = lang === "tr";
    const title = tr ? "Yapay Zekâ Görünürlük Endeksi: sektör sektör | AI SaaSavran" : "AI Visibility Index: which brands AI recommends | AI SaaSavran";
    const description = tr
      ? `ChatGPT, Claude ve Perplexity ${IDX_SECTORS} sektörde hangi markaları öneriyor? Gerçek ölçümlerin sektör özeti, haftalık güncellenir.`
      : `Which brands do ChatGPT, Claude and Perplexity recommend across ${IDX_SECTORS} sectors? A summary of real measurements, updated weekly.`;
    const updated = MEASUREMENTS.updated ?? SITE.updated;
    write(idxPath(lang), page({ lang, path: idxPath(lang), alt: idxPath(tr ? "en" : "tr"), title, description,
      body: indexReportBody(lang, IDX, esc, mPath, updated),
      schema: [ORG, crumbs([[tr ? "Ana sayfa" : "Home", tr ? "/tr/" : "/"], [tr ? "Görünürlük Endeksi" : "AI Visibility Index", idxPath(lang)]]),
        { "@context": "https://schema.org", "@type": "Dataset", name: tr ? "AI SaaSavran Yapay Zekâ Görünürlük Endeksi" : "AI SaaSavran AI Visibility Index", description, url: SITE.url + idxPath(lang), inLanguage: lang, dateModified: updated,
          isAccessibleForFree: true, keywords: ["AI visibility", "GEO", "ChatGPT", "Claude", "Perplexity", "brand recommendations"],
          creator: { "@type": "Organization", name: SITE.name, url: SITE.url }, license: "https://creativecommons.org/licenses/by/4.0/",
          distribution: [{ "@type": "DataDownload", encodingFormat: "text/csv", contentUrl: SITE.url + idxCsvPath }],
          measurementTechnique: "Repeated customer questions to AI assistants with live web search via official APIs; brand recommendation counts grouped by sector",
          variableMeasured: ["recommended", "mentioned", "answers"] }] }));
  }
  writeFileSync(join(DIST, idxCsvPath.slice(1)), indexCsv(IDX));
}

const urls = ["/", "/about/", "/founder/", "/tr/kurucu/", ...METHOD_PAGES.filter((m) => m.lang === "en").map((m) => m.path), "/pricing/", "/check/", "/guides/", ...GUIDES_EN.map((g) => `/guides/${g.slug}/`), "/blog/", ...posts.filter((p) => p.lang === "en").map(postPath), "/tutorials/", "/tr/", "/tr/fiyatlar/", "/tr/hakkimizda/", ...METHOD_PAGES.filter((m) => m.lang === "tr").map((m) => m.path), "/tr/kontrol/", "/rehber/", ...GUIDES.map((g) => `/rehber/${g.slug}/`), "/tr/blog/", ...posts.filter((p) => p.lang === "tr").map(postPath), "/tr/egitim/", ...(MITEMS.some((m) => m.lang === "en") ? ["/measurements/"] : []), ...(MITEMS.some((m) => m.lang === "tr") ? ["/tr/olcumler/"] : []), ...(IDX_SECTORS ? [idxPath("en"), idxPath("tr")] : []), ...MITEMS.map(mPath)];
writeFileSync(join(DIST, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${SITE.url}${u}</loc><lastmod>${posts.find((p) => postPath(p) === u)?.date ?? MITEMS.find((m) => mPath(m) === u)?.at.slice(0, 10) ?? (u === "/measurements/" || u === "/tr/olcumler/" || u === idxPath("en") || u === idxPath("tr") ? MEASUREMENTS.updated ?? SITE.updated : SITE.updated)}</lastmod></url>`).join("\n")}
</urlset>
`);
writeFileSync(join(DIST, "robots.txt"), `User-agent: *
Allow: /
Disallow: /app/
Disallow: /panel
Disallow: /marka/
Disallow: /hesap
Disallow: /demo-lab
Disallow: /calisma-alani/
Disallow: /rapor/
Disallow: /davet/
Disallow: /yonetim

Sitemap: ${SITE.url}/sitemap.xml
`);
writeFileSync(join(DIST, "llms.txt"), `# AI SaaSavran

> ${DEF.en} Brand visibility and product visibility are measured and reported separately. For businesses, product brands, agencies and content creators. Early access; free plan available. Each question is asked several times, results come with confidence ranges, and live-search and model-knowledge answers are labelled separately.

Contact: ${SITE.email}

## Methodology
- [Methodology](${SITE.url}/methodology/): metric definitions (mention rate, recommendation rate, position, citation rate, share of recommendations, owned-source share), question sets, repetition, live search vs model knowledge, confidence ranges, limits, sample-data policy.
- [Brand visibility](${SITE.url}/brand-visibility/): what is measured for brands in category questions.
- [Product visibility](${SITE.url}/product-visibility/): products in AI buying answers, product accuracy, Google Shopping position.

## About
- [About AI SaaSavran](${SITE.url}/about/): independent AI visibility measurement tool, launched 2026, founded in 2026 by Ramazan Savran in Antalya, Turkey (the name combines SaaS and his surname); not affiliated with similarly named companies such as Savran AI (savran.ai).
- [Founder: Ramazan Savran](${SITE.url}/founder/)
- [AI visibility tools compared](${SITE.url}/guides/ai-visibility-tools-compared/): AI SaaSavran, Peec AI, Otterly.AI, Profound, Semrush and Ahrefs, with our own measurement of which ones AI recommends.
- [Peec AI alternative](${SITE.url}/guides/peec-ai-alternative/): when AI SaaSavran fits (free plan, Turkish and English questions, Claude included) and when another tool fits better.

## Pricing
- [Plans](${SITE.url}/pricing/): Free ($0), Plus ($60/month), Pro ($300/month), Business ($876/month). Monthly billing, cancel anytime, 14-day money-back guarantee.
- [Free AI visibility check](${SITE.url}/check/): no signup; checks whether Gemini mentions a business for its category.

## Official profiles
${SITE.sameAs.map((u) => `- ${u}`).join("\n")}

## For AI agents
- MCP server (read-only, Pro and Business): ${SITE.url}/api/mcp — Streamable HTTP, header \`Authorization: Bearer aisv_...\`; tools: list_brands, get_brand_report.
- REST API: ${SITE.url}/api/v1/brands and ${SITE.url}/api/v1/brands/{id} with the same key. Keys are created in the app under Account → API and MCP.

## Tutorials
- [How to use AI SaaSavran](${SITE.url}/tutorials/): ${LESSONS.length} short step-by-step lessons (${LESSONS.map((l) => l.en.title).join("; ")}).

## Guides
${GUIDES_EN.map((g) => `- [${g.title}](${SITE.url}/guides/${g.slug}/): ${g.description}`).join("\n")}

## Blog (weekly findings from real measurements)
${posts.filter((p) => p.lang === "en").map((p) => `- [${p.title}](${SITE.url}${postPath(p)}): ${p.description}`).join("\n")}

## AI Visibility Index (sector summary, updated weekly)
- [AI Visibility Index](${SITE.url}${idxPath("en")}) · [Yapay Zekâ Görünürlük Endeksi](${SITE.url}${idxPath("tr")}): which brands ChatGPT, Claude and Perplexity recommend in ${IDX_SECTORS} sectors (Turkish- and English-language questions), from real live-search measurements. Data under CC BY 4.0; CSV: ${SITE.url}${idxCsvPath}

## Measurements (real AI answers, updated weekly)
- [All measurements](${SITE.url}/measurements/) · [Türkçe ölçümler](${SITE.url}/tr/olcumler/): ${MITEMS.length} real questions asked to ChatGPT, Claude, Perplexity and Gemini, with brand recommendation counts.
${MITEMS.slice(0, 15).map((m) => `- [${m.question}](${SITE.url}${mPath(m)}): ${leadSentence(m, (x) => x)}`).join("\n")}

## Türkçe
- [Türkçe ana sayfa](${SITE.url}/tr/)
- [Blog (Türkçe)](${SITE.url}/tr/blog/)
- [Eğitim: nasıl kullanılır?](${SITE.url}/tr/egitim/)
- [Metodoloji](${SITE.url}/tr/metodoloji/) · [Marka görünürlüğü](${SITE.url}/tr/marka-gorunurlugu/) · [Ürün görünürlüğü](${SITE.url}/tr/urun-gorunurlugu/)
${posts.filter((p) => p.lang === "tr").map((p) => `- [${p.title}](${SITE.url}${postPath(p)})`).join("\n")}
${GUIDES.map((g) => `- [${g.title}](${SITE.url}/rehber/${g.slug}/)`).join("\n")}
`);

// IndexNow anahtar dosyası: GEO otopilotu değişen sayfaları Bing/Yandex'e bu anahtarla bildirir.
writeFileSync(join(DIST, `${SITE.indexnow}.txt`), SITE.indexnow);

// 6) Uygulama adresleri → /app/ (Cloudflare Pages yeniden yazma, adres çubuğu değişmez)
const APP_ROUTES = ["/giris", "/kayit", "/sifre", "/durum", "/durum-ic", "/gizlilik", "/kosullar", "/panel", "/hesap", "/demo-lab", "/yonetim", "/calisma-alani/*", "/marka/*", "/rapor/*", "/davet/*"];
write("/check/", page({ lang: "en", alt: "/tr/kontrol/", path: "/check/", title: "Free AI visibility check | AI SaaSavran", description: "Check for free whether Gemini mentions your business when customers ask about your category. No signup.", body: checkHtml(true), schema: [APP, faqLd(CHECK_FAQ_EN)] }));
write("/tr/kontrol/", page({ lang: "tr", alt: "/check/", path: "/tr/kontrol/", title: "Ücretsiz yapay zekâ görünürlük kontrolü | AI SaaSavran", description: "İşletmeniz Gemini cevaplarında geçiyor mu? Üye olmadan ücretsiz kontrol edin.", body: checkHtml(false), schema: [APP, faqLd(CHECK_FAQ_TR)] }));
write("/tr/fiyatlar/", page({ lang: "tr", path: "/tr/fiyatlar/", alt: "/pricing/", title: "Fiyatlar: yapay zekâ görünürlük aracı | AI SaaSavran", description: "AI SaaSavran paketleri: Free, Plus aylık 60 $, Pro aylık 300 $, Business aylık 876 $. Aylık ödeme, istediğiniz zaman iptal, 14 gün para iadesi.", body: `<section class="article"><h1>Fiyatlar</h1><p>Ücretsiz başlayın. Ücretli paketler canlı web aramalı ChatGPT, Claude ve Perplexity ölçümü, daha fazla marka ve soru ekler. Aylık ödeme, istediğiniz zaman iptal, 14 gün para iadesi (<a href="/iade/">iade koşulları</a>).</p></section>${plansHtml(false)}`, schema: [APP] }));
write("/pricing/", page({ lang: "en", path: "/pricing/", alt: "/tr/fiyatlar/", title: "Pricing: AI visibility tracking tool | AI SaaSavran", description: "AI SaaSavran plans: Free, Plus $60/month, Pro $300/month, Business $876/month.", body: `<section class="article"><h1>Pricing</h1><p>Start free. Paid plans add live-search ChatGPT, Claude and Perplexity, more brands and more questions. Monthly billing, cancel anytime, 14-day money-back guarantee (<a href="/refund/">refund policy</a>).</p></section>${plansHtml(true)}`, schema: [APP] }));

for (const l of Object.values(LEGAL)) write(l.path, page({ lang: l.lang, path: l.path, title: l.title, description: l.description, body: l.body }));

// 404: Cloudflare Pages, 404.html yoksa olmayan her adrese ana sayfayı 200 ile verir (Google bunu "soft 404" sayar).
// Bu dosya varken uygulama adresleri yine _redirects ile /app/'e gider; geri kalan bilinmeyen adresler gerçek 404 alır.
writeFileSync(join(DIST, "404.html"), page({ lang: "tr", path: "/404", noindex: true, title: "Sayfa bulunamadı | AI SaaSavran", description: "Aradığınız sayfa bulunamadı. Page not found.", body: `
<section class="article">
  <h1>Sayfa bulunamadı</h1>
  <p class="lede">Aradığınız sayfa taşınmış veya hiç olmamış olabilir.</p>
  <ul><li><a href="/tr/">Ana sayfa</a></li><li><a href="/rehber/">Rehberler</a></li><li><a href="/tr/blog/">Blog</a></li><li><a href="/tr/kontrol/">Ücretsiz kontrol</a></li><li><a href="/giris">Giriş yap</a></li></ul>
  <h2 lang="en">Page not found</h2>
  <p lang="en">The page you are looking for may have moved or never existed.</p>
  <ul lang="en"><li><a href="/">Home</a></li><li><a href="/guides/">Guides</a></li><li><a href="/blog/">Blog</a></li><li><a href="/check/">Free check</a></li></ul>
</section>` }));

writeFileSync(join(DIST, "_redirects"), ["/en / 301", "/en/ / 301", ...APP_ROUTES.map((r) => `${r} /app/ 200`)].join("\n") + "\n");
console.log(`Statik sayfalar üretildi: ${urls.length} sayfa, uygulama /app/ altında`);
