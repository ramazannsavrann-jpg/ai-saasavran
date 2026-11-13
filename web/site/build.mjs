// Herkese açık statik sayfaları üretir (vite build'den sonra çalışır, web/ klasöründen).
//  - Tek sayfa uygulama dist/index.html → dist/app/index.html taşınır; uygulama adresleri _redirects ile oraya yönlenir.
//  - "/" tanıtım sayfası, "/rehber/..." rehberler: JavaScript'siz düz HTML (arama motorları ve yapay zekâ botları okuyabilir).
import { mkdirSync, writeFileSync, renameSync, existsSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { SITE, GUIDES, HOME_FAQ } from "./content.mjs";
import { LEGAL } from "./legal.mjs";
import { demoHtml } from "./demo.mjs";
import { checkHtml } from "./check.mjs";
import { GUIDES_EN, HOME_FAQ_EN } from "./content-en.mjs";
import { POSTS } from "./blog.mjs";

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

function page({ path, title, description, body, schema = [], type = "website", lang = "en", alt = null, image = null, noindex = false }) {
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
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="preload" href="/site/fonts/instrument-sans-latin-ext-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/site/site.css">
${schema.map(ld).join("\n")}
</head>
<body>
<header class="top">
  <a class="mark" href="${en ? "/" : "/tr/"}" aria-label="AI SaaSavran"><img src="/icon.svg" alt="" width="28" height="28"><span>AI <b>SaaSavran</b></span></a>
  <nav aria-label="${en ? "Main menu" : "Ana menü"}">${en ? `<a href="/#pricing">Pricing</a><a href="/guides/">Guides</a><a href="/blog/">Blog</a>` : `<a href="/tr/#fiyatlar">Fiyatlar</a><a href="/rehber/">Rehberler</a><a href="/tr/blog/">Blog</a><a href="/durum">Ürün durumu</a>`}<a class="lang" href="${alt ?? (en ? "/tr/" : "/")}" hreflang="${en ? "tr" : "en"}" lang="${en ? "tr" : "en"}">${en ? "Türkçe" : "English"}</a><a class="cta-sm" data-cta href="/giris">${en ? "Sign in" : "Giriş yap"}</a></nav>
</header>
<main>
${body}
</main>
<footer class="foot">
  ${en ? `<p><b>AI SaaSavran</b> measures whether ChatGPT and Gemini recommend your business. Early access.</p>
  <p><a href="/pricing/">Pricing</a> · <a href="/guides/">Guides</a> · <a href="/blog/">Blog</a> · <a href="/about/">About</a> · <a href="/terms/">Terms</a> · <a href="/privacy/">Privacy</a> · <a href="/refund/">Refunds</a> · <a href="/tr/">Türkçe</a></p>
  <p>Contact: <a href="mailto:${SITE.email}">${SITE.email}</a></p>` : `<p><b>AI SaaSavran</b>: markaların yapay zekâ asistanlarındaki görünürlüğünü ölçen araç. Erken erişim.</p>
  <p><a href="/tr/#fiyatlar">Fiyatlar</a> · <a href="/rehber/">Rehberler</a> · <a href="/tr/blog/">Blog</a> · <a href="/tr/hakkimizda/">Hakkımızda</a> · <a href="/durum">Ürün durumu</a> · <a href="/kosullar">Kullanım koşulları</a> · <a href="/gizlilik">Gizlilik</a> · <a href="/iade/">İade</a> · <a href="/">English</a></p>
  <p>İletişim: <a href="mailto:${SITE.email}">${SITE.email}</a></p>`}
</footer>
<script src="/site/site.js" defer></script>
</body>
</html>
`;
}

function write(path, html) {
  const file = join(DIST, path, "index.html");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

const ORG = { "@context": "https://schema.org", "@type": "Organization", name: SITE.name, alternateName: ["AISaaSavran", "aisaasavran.com", "AI SaaSavran AI visibility tracker"], url: SITE.url, email: SITE.email, logo: SITE.url + "/icon.svg", sameAs: SITE.sameAs,
  description: "AI SaaSavran (aisaasavran.com) is an AI visibility measurement tool: it measures how often ChatGPT, Claude and Gemini mention and recommend a brand. It is an independent product and is not affiliated with similarly named companies or services." };
const APP = {
  "@context": "https://schema.org", "@type": "SoftwareApplication", name: SITE.name, url: SITE.url, applicationCategory: "BusinessApplication",
  operatingSystem: "Web", alternateName: "aisaasavran.com", description: "AI SaaSavran (aisaasavran.com) measures how often ChatGPT, Claude and Gemini mention and recommend your business versus competitors. Plans: Free, Plus $29/month, Pro $149/month, Business $449/month.",
  inLanguage: ["en", "tr"],
  offers: [["Free", 0], ["Plus", 29], ["Pro", 149], ["Business", 449]].map(([n, p]) => ({ "@type": "Offer", name: n, price: String(p), priceCurrency: "USD" })),
};


// Paketler (migration 0007 ile aynı). Ücretli paketler henüz satışta değil: bekleme listesi e-postayla.
const PLAN_ROWS = (en) => [
  { name: "Free", price: "$0", per: "", items: en
      ? ["1 brand, 15 questions, 3 competitors", "4 measurements a month (one a week, automatic)", "Gemini, model knowledge (no live search)", "Website check and recommendations"]
      : ["1 marka, 15 soru, 3 rakip", "Ayda 4 ölçüm (haftada bir, otomatik)", "Gemini, model bilgisi (canlı arama yok)", "Web sitesi kontrolü ve öneriler"], live: true },
  { name: "Plus", id: "starter", price: "$29", per: en ? "/month" : "/ay", items: en
      ? ["1 brand, 25 questions, 5 competitors", "ChatGPT and Claude with live web search + Gemini", "Every week: ChatGPT and Gemini ask each question twice, Claude once", "Which websites the AI cited", "Products: AI accuracy check and weekly Google Shopping position", "Shareable report link and PDF"]
      : ["1 marka, 25 soru, 5 rakip", "ChatGPT ve Claude canlı web araması + Gemini", "Her hafta: ChatGPT ve Gemini her soruyu 2 kez, Claude 1 kez sorar", "Yapay zekânın baktığı kaynak siteler", "Ürünler: yapay zekâ doğruluk kontrolü ve haftalık Google Shopping sırası", "Paylaşılabilir rapor bağlantısı ve PDF"] },
  { name: "Pro", id: "pro", price: "$149", per: en ? "/month" : "/ay", items: en
      ? ["5 brands, 30 questions each", "8 competitors per brand", "Team of 3", "API and MCP access for AI agents", "Everything in Plus", "For multi-location businesses and freelancers"]
      : ["5 marka, her biri 30 soru", "Marka başına 8 rakip", "3 kişilik ekip", "Yapay zekâ ajanları için API ve MCP erişimi", "Plus'taki her şey", "Çok şubeli işletmeler ve serbest çalışanlar için"] },
  { name: "Business", id: "agency", price: "$449", per: en ? "/month" : "/ay", items: en
      ? ["15 brands, 30 questions each", "10 competitors per brand", "15 team members", "Everything in Pro", "For agencies managing client brands"]
      : ["15 marka, her biri 30 soru", "Marka başına 10 rakip", "15 kişilik ekip", "Pro'daki her şey", "Müşteri markalarını yöneten ajanslar için"] },
];
const plansHtml = (en) => `
<section class="plans" id="${en ? "pricing" : "fiyatlar"}">
  <h2>${en ? "Pricing" : "Fiyatlar"}</h2>
  <div class="plan-grid">${PLAN_ROWS(en).map((p) => `
    <div class="plan${p.name === "Plus" ? " plan-main" : ""}">
      <h3>${p.name}</h3>
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

// 3) Tanıtım sayfası
const home = `
<section class="hero">
  <div class="hero-copy">
    <h1>Müşteriniz yapay zekâya sorduğunda markanız cevapta mı?</h1>
    <p class="lede">AI SaaSavran, müşterilerinizin ChatGPT ve Gemini'ye soracağı soruları sorar; markanızın anılıp anılmadığını, önerilip önerilmediğini ve sizin yerinize hangi rakibin önerildiğini ölçer.</p>
    <p class="actions"><a class="btn" href="/kayit">Ücretsiz başla</a><a class="btn ghost" href="/tr/kontrol/">Üye olmadan dene</a></p>
    <p class="small">Ücretsiz paket: 1 marka, 15 soru, ayda 4 ölçüm. Kart bilgisi istenmez. <a href="#fiyatlar">Fiyatlar</a></p>
  </div>
  <figure class="answer-card" aria-label="Örnek yapay zekâ cevabı">
    <figcaption><span class="q">Türkiye'de en iyi mobil bankacılık uygulaması hangisi?</span></figcaption>
    <blockquote>
      <p>1. <mark class="hit">Banka C</mark>'nin mobil uygulaması …</p>
      <p>2. <mark class="hit">Banka A</mark> …</p>
      <p>3. <mark class="hit alt">Banka B</mark> …</p>
    </blockquote>
    <p class="cite">Kaynaklar: bankaların kendi siteleri · bddk.gov.tr</p>
    <p class="caption">Temsilî gösterim, gerçek ölçümümüze dayanır (ChatGPT, canlı web aramasıyla, 7 Kasım 2026, 10 cevap). Banka adları gizlendi.</p>
  </figure>
</section>
<section class="demo daily" id="daily" data-lang="tr" hidden aria-labelledby="daily-h"></section>
${demoHtml(false)}

<section class="band">
  <h2>Ne ölçüyoruz?</h2>
  <div class="trio">
    <div><h3>Anılma</h3><p>Cevapta markanızın adı geçiyor mu? Ürün ve uygulama adlarını da markanıza bağlarız.</p></div>
    <div><h3>Önerilme</h3><p>Öneri listesinde misiniz? "Önerilmez" gibi olumsuz bağlamları öneri saymayız.</p></div>
    <div><h3>Rakip ve kaynak</h3><p>Sizin yerinize kim öneriliyor, yapay zekâ hangi sitelere bakıyor?</p></div>
  </div>
</section>

<section class="honest">
  <h2>Kendi markamızı ölçtük: 20 cevabın 0'ı</h2>
  <p>AI SaaSavran'ı kendi ürünümüzle, ChatGPT'nin canlı web aramasıyla ölçtük. Yeni bir marka olarak hiçbir cevapta önerilmedik; rakiplerimiz 20 cevabın 5 ila 8'inde önerildi. Sonuçları saklamıyoruz, çünkü ürünün ne işe yaradığını en iyi bu gösteriyor: nerede olduğunuzu bilmeden ilerleyemezsiniz.</p>
  <p><a href="/rehber/chatgpt-marka-gorunurlugu-olcme/">Ölçüm yöntemini ve tüm tabloyu okuyun</a></p>
</section>

<section class="band">
  <h2>Nasıl çalışır?</h2>
  <ol class="steps">
    <li><b>Markanızı ve rakiplerinizi ekleyin.</b> Sektörünüzü seçin; örnek rakipler ve hazır Türkçe sorular gelsin.</li>
    <li><b>Ölçümü başlatın.</b> Her soru birden fazla kez sorulur; sonuç güven aralığıyla gösterilir.</li>
    <li><b>Ne yapacağınızı görün.</b> Web siteniz kontrol edilir, eksikler önem sırasına göre listelenir. Haftalık ölçümle değişimi izleyin.</li>
  </ol>
</section>

<section class="status">
  <h2>Bugün ne çalışıyor?</h2>
  <ul>
    <li class="ok">Gemini ile ölçüm (internete bakmadan, model bilgisiyle). Raporda açıkça yazar.</li>
    <li class="ok">Haftalık otomatik ölçüm, web sitesi kontrolü, kural tabanlı öneriler.</li>
    <li class="ok">ChatGPT ile canlı aramalı ölçüm ve kaynak analizi: ücretli paketlerde.</li>
    <li class="ok">Üye olmadan ücretsiz kontrol (ayda 2 kez).</li>
    <li class="ok">Kayıp nedeni kanıtları ve "kaynaklar kimi destekliyor" tablosu: canlı aramalı ölçümde.</li>
    <li class="no">Perplexity: henüz yok. PDF, tarayıcının yazdır penceresiyle alınır.</li>
  </ul>
  <p><a href="/durum">Ayrıntılı ürün durumu</a></p>
</section>
${plansHtml(false)}
${faqHtml(HOME_FAQ)}
`;
write("/tr/", page({ lang: "tr", alt: "/", path: "/tr/", title: "AI SaaSavran: Markanız ChatGPT ve Gemini cevaplarında mı?", description: "Markanızın ChatGPT ve Gemini gibi yapay zekâ asistanlarında ne sıklıkla anıldığını ve önerildiğini ölçün. Türkçe, ücretsiz başlangıç paketi.", body: home, schema: [ORG, APP, faqLd(HOME_FAQ)] }));


// 3a) English home (default)
const enHome = `
<section class="hero">
  <div class="hero-copy">
    <h1>When customers ask AI for a recommendation, are you in the answer?</h1>
    <p class="lede">AI SaaSavran asks ChatGPT and Gemini the questions your customers ask, then shows whether your business is mentioned, recommended, or passed over for a competitor, and which websites the AI relied on.</p>
    <p class="actions"><a class="btn" href="/kayit">Start free</a><a class="btn ghost" href="/check/">Try it without signing up</a></p>
    <p class="small">Free plan: 1 brand, 15 questions, 4 measurements a month. No card. <a href="#pricing">See pricing</a></p>
  </div>
  <figure class="answer-card" aria-label="Example AI answer">
    <figcaption><span class="q">What are the best tools to track brand visibility in AI answers?</span></figcaption>
    <blockquote>
      <p>1. <mark class="hit">Tool A</mark> …</p>
      <p>2. <mark class="hit">Tool B</mark> …</p>
      <p>3. <mark class="hit alt">Tool C</mark> …</p>
    </blockquote>
    <p class="cite">Sources: the tools' own websites and help centres</p>
    <p class="caption">Illustration based on our real measurement (ChatGPT with live web search, 7 Nov 2026, 20 answers): Tool A 8/20, Tool B 7/20, Tool C 7/20. We were 0/20. Tool names are hidden.</p>
  </figure>
</section>
<section class="demo daily" id="daily" data-lang="en" hidden aria-labelledby="daily-h"></section>
${demoHtml(true)}

<section class="band">
  <h2>What you see</h2>
  <div class="trio">
    <div><h3>Mentioned</h3><p>Is your business named? Product names and alternate spellings are matched to your brand.</p></div>
    <div><h3>Recommended</h3><p>Are you on the shortlist? "Not recommended" and passing mentions don't count.</p></div>
    <div><h3>Competitors and sources</h3><p>Who gets recommended instead, and which pages the AI read before answering.</p></div>
  </div>
</section>

<section class="honest">
  <h2>We measured ourselves first: 0 out of 20</h2>
  <p>We ran AI SaaSavran on our own brand with ChatGPT's live web search. As a new brand we were recommended in none of 20 answers; established competitors appeared in 5 to 8. We publish it because it shows why measurement comes first: you can't improve what you can't see.</p>
  <p><a href="/guides/measure-brand-visibility-in-chatgpt/">Read the method and full table</a></p>
</section>

<section class="band">
  <h2>Built to be honest about the numbers</h2>
  <ol class="steps">
    <li><b>Every question is asked more than once.</b> One answer is luck; rates over many answers are signal.</li>
    <li><b>Ranges, not false precision.</b> Results come with a confidence range and a warning when the sample is small.</li>
    <li><b>Live search or not, always labelled.</b> Answers from model knowledge and answers from live web search are never mixed.</li>
  </ol>
</section>

<section class="status">
  <h2>What works today</h2>
  <ul>
    <li class="ok">Gemini measurement (model knowledge, no live search), clearly labelled.</li>
    <li class="ok">Weekly automatic measurement, competitor comparison, website check, recommendations.</li>
    <li class="ok">ChatGPT and Claude live-search measurement and source analysis: on paid plans, reported per engine.</li>
    <li class="ok">Free check without signing up (2 a month).</li>
    <li class="ok">App in English and Turkish.</li>
    <li class="ok">Evidence for why a competitor was recommended instead, and which brands each source supports: in live-search measurements.</li>
    <li class="no">Perplexity: not yet. PDFs are saved from the browser's print dialog.</li>
  </ul>
</section>
${plansHtml(true)}
${faqHtml(HOME_FAQ_EN, true)}
`;
write("/", page({ lang: "en", alt: "/tr/", path: "/", title: "AI SaaSavran: Does ChatGPT recommend your business?", description: "See whether ChatGPT and Gemini mention and recommend your business versus competitors, and which sources they rely on. Free plan for small businesses and agencies.", body: enHome, schema: [ORG, APP, faqLd(HOME_FAQ_EN)] }));

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
  write(path, page({ lang: "en", alt: `/rehber/${g.tr}/`, path, title: seoTitle(g.title, g.short), description: g.description, body, schema: [article, faqLd(g.faq)], type: "article" }));
}

// 4) Rehberler (Türkçe)
const list = `
<section class="article">
  <h1>Rehberler</h1>
  <p class="lede">Markanızın yapay zekâ asistanlarındaki görünürlüğünü ölçmek ve artırmak için Türkçe rehberler. Örnekler kendi gerçek ölçümlerimizden.</p>
  <p>Müşteriler artık hangi ürünü, mağazayı veya hizmeti seçeceklerini ChatGPT, Gemini ya da Claude'a soruyor. Yapay zekâ genellikle birkaç marka sayıyor; geri kalanlar görünmez kalıyor. Bu rehberler bu görünürlüğün doğru nasıl ölçüleceğini (tekrarlanan sorular, her motor ayrı, canlı web araması ve model bilgisi ayrımı), yapay zekânın neden sizin yerinize rakibinizi önerdiğini ve neleri değiştirebileceğinizi anlatıyor: yapay zekânın okuduğu kaynaklar, müşterinizin sorduğu sorular ve kendi sitenizin ne yaptığınızı ne kadar açık anlattığı. Küçük işletmeler, ajanslar, ürün markaları ve içerik üreticileri için yazıldı. İçlerindeki her sayı gerçek bir ölçümden geliyor; örneklem küçükse bunu söylüyoruz.</p>
  <ul class="guide-list">${GUIDES.map((g) => `<li><a href="/rehber/${g.slug}/"><b>${esc(g.title)}</b><span>${esc(g.description)}</span></a></li>`).join("")}</ul>
</section>`;
write("/rehber/", page({ lang: "tr", alt: "/guides/", path: "/rehber/", title: "Rehberler: Yapay zekâ görünürlüğü | AI SaaSavran", description: "ChatGPT ve Gemini'de markanızın görünürlüğünü ölçmek ve artırmak için Türkçe rehberler.", body: list, schema: [ORG] }));

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
  write(path, page({ lang: "tr", alt: enG ? `/guides/${enG.slug}/` : "/guides/", path, title: seoTitle(g.title, g.short), description: g.description, body, schema: [article, faqLd(g.faq)], type: "article" }));
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
  ${p.video ? `<p class="video-link"><a href="https://www.youtube.com/shorts/${p.video.id}" rel="noopener"><img src="${p.cover}" alt="${esc(p.video.title)}" width="360" height="640" loading="lazy"><span>▶ ${esc(p.video.title)}</span></a></p>` : ""}
  <p class="note"><b>${en ? "Note:" : "Not:"}</b> ${en ? `These are the AI's answers on ${fmtDate(p.date, true)}. Small sample; not representative of the whole market. Letters were assigned at random. Brands measured (alphabetical): ${esc(p.names)}. Brand names belong to their owners.` : `Bunlar yapay zekânın ${fmtDate(p.date, false)} tarihli cevaplarıdır. Küçük örneklem, tüm pazarı temsil etmez. Harfler rastgele atanmıştır. Ölçülen markalar (alfabetik): ${esc(p.names)}. Marka adları sahiplerine aittir.`}</p>
  ${faqHtml(p.faq ?? [], en)}
  <aside class="next"><p><b>${en ? "What does AI say about your brand?" : "Yapay zekâ sizin markanız için ne diyor?"}</b> ${en ? "Measure it across ChatGPT, Gemini and Claude." : "ChatGPT, Gemini ve Claude'da ölçün."}</p><a class="btn" href="${en ? "/check/" : "/tr/kontrol/"}">${en ? "Free check" : "Ücretsiz kontrol"}</a></aside>
  ${others ? `<nav class="related" aria-label="${en ? "More posts" : "Diğer yazılar"}"><h2>${en ? "More posts" : "Diğer yazılar"}</h2><ul>${others}</ul></nav>` : ""}
</article>`;
    const posting = { "@context": "https://schema.org", "@type": "BlogPosting", headline: p.title, description: p.description, inLanguage: lang, datePublished: p.date, dateModified: p.date, image: SITE.url + p.cover, author: { "@type": "Organization", name: SITE.name, url: SITE.url }, publisher: { "@type": "Organization", name: SITE.name, logo: { "@type": "ImageObject", url: SITE.url + "/icon.svg" } }, mainEntityOfPage: SITE.url + path };
    write(path, page({ lang, alt: tw ? postPath(tw) : blogBase(en ? "tr" : "en"), path, title: seoTitle(p.title, p.short), description: p.description, body, schema: [posting, ...(p.faq?.length ? [faqLd(p.faq)] : [])], type: "article", image: p.cover }));
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
  en: { path: "/about/", alt: "/tr/hakkimizda/", title: "About AI SaaSavran | AI visibility measurement", description: "AI SaaSavran measures how often ChatGPT, Gemini and Claude mention and recommend a brand or product, and which sources they rely on.", body: `
<section class="article">
  <h1>About AI SaaSavran</h1>
  <p class="lede"><b>AI SaaSavran measures how often AI assistants such as ChatGPT, Gemini and Claude mention and recommend a brand or product, compared with its competitors, and which sources they rely on.</b> It is an independent web application at aisaasavran.com.</p>
  <h2>What it does</h2>
  <ul>
    <li>Asks AI assistants the questions your customers would ask, in Turkish or English, several times.</li>
    <li>Reports each engine separately: Gemini without live web search on the free plan; ChatGPT and Claude with live web search on paid plans.</li>
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
    <li>Launched: 2026, early access. Based in Turkey; serves customers in Turkey and worldwide.</li>
    <li>Plans: Free, Plus $29, Pro $149, Business $449 per month (<a href="/pricing/">pricing</a>).</li>
    <li>Not affiliated with other companies or services with a similar name.</li>
    <li>Contact: <a href="mailto:${SITE.email}">${SITE.email}</a> · YouTube: <a href="https://www.youtube.com/@aisaasavran">@aisaasavran</a></li>
  </ul>
</section>` },
  tr: { path: "/tr/hakkimizda/", alt: "/about/", title: "AI SaaSavran hakkında | Yapay zekâ görünürlük ölçümü", description: "AI SaaSavran, ChatGPT, Gemini ve Claude'un bir markayı veya ürünü ne sıklıkla andığını ve önerdiğini, hangi kaynaklara baktığını ölçer.", body: `
<section class="article">
  <h1>AI SaaSavran hakkında</h1>
  <p class="lede"><b>AI SaaSavran, ChatGPT, Gemini ve Claude gibi yapay zekâ asistanlarının bir markayı veya ürünü rakiplerine göre ne sıklıkla andığını ve önerdiğini, hangi kaynaklara dayandığını ölçer.</b> aisaasavran.com adresinde çalışan bağımsız bir web uygulamasıdır.</p>
  <h2>Ne yapar?</h2>
  <ul>
    <li>Müşterilerinizin soracağı soruları Türkçe veya İngilizce olarak yapay zekâ asistanlarına birkaç kez sorar.</li>
    <li>Her motoru ayrı raporlar: ücretsiz pakette canlı aramasız Gemini; ücretli paketlerde canlı web aramalı ChatGPT ve Claude.</li>
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
    <li>Kuruluş: 2026, erken erişim. Türkiye merkezli; Türkiye'deki ve dünyadaki müşterilere hizmet verir.</li>
    <li>Paketler: Ücretsiz, Plus 29 $, Pro 149 $, Business 449 $ (aylık) (<a href="/tr/#fiyatlar">fiyatlar</a>).</li>
    <li>Benzer adlı başka şirket veya hizmetlerle bağlantısı yoktur.</li>
    <li>İletişim: <a href="mailto:${SITE.email}">${SITE.email}</a> · YouTube: <a href="https://www.youtube.com/@aisaasavran">@aisaasavran</a></li>
  </ul>
</section>` },
};
for (const [lang, a] of Object.entries(ABOUT)) {
  const aboutLd = { "@context": "https://schema.org", "@type": "AboutPage", name: a.title, url: SITE.url + a.path, inLanguage: lang, mainEntity: ORG };
  write(a.path, page({ lang, alt: a.alt, path: a.path, title: a.title, description: a.description, body: a.body, schema: [aboutLd] }));
}

// 5) Tarayıcılar ve yapay zekâ botları için dosyalar
const urls = ["/", "/about/", "/pricing/", "/check/", "/guides/", ...GUIDES_EN.map((g) => `/guides/${g.slug}/`), "/blog/", ...posts.filter((p) => p.lang === "en").map(postPath), "/tr/", "/tr/hakkimizda/", "/tr/kontrol/", "/rehber/", ...GUIDES.map((g) => `/rehber/${g.slug}/`), "/tr/blog/", ...posts.filter((p) => p.lang === "tr").map(postPath)];
writeFileSync(join(DIST, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${SITE.url}${u}</loc><lastmod>${SITE.updated}</lastmod></url>`).join("\n")}
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

> AI SaaSavran measures how often ChatGPT, Claude and Gemini mention and recommend a business compared with its competitors, and which sources the AI relied on. For small businesses and agencies. Early access; free plan available. Each question is asked several times, results come with confidence ranges, and live-search and model-knowledge answers are labelled separately.

Contact: ${SITE.email}

## About
- [About AI SaaSavran](${SITE.url}/about/): independent AI visibility measurement tool, launched 2026, based in Turkey; not affiliated with similarly named companies.

## Pricing
- [Plans](${SITE.url}/pricing/): Free ($0), Plus ($29/month), Pro ($149/month), Business ($449/month). Monthly billing, cancel anytime, 14-day money-back guarantee.
- [Free AI visibility check](${SITE.url}/check/): no signup; checks whether Gemini mentions a business for its category.

## Official profiles
${SITE.sameAs.map((u) => `- ${u}`).join("\n")}

## For AI agents
- MCP server (read-only, Pro and Business): ${SITE.url}/api/mcp — Streamable HTTP, header \`Authorization: Bearer aisv_...\`; tools: list_brands, get_brand_report.
- REST API: ${SITE.url}/api/v1/brands and ${SITE.url}/api/v1/brands/{id} with the same key. Keys are created in the app under Account → API and MCP.

## Guides
${GUIDES_EN.map((g) => `- [${g.title}](${SITE.url}/guides/${g.slug}/): ${g.description}`).join("\n")}

## Blog (weekly findings from real measurements)
${posts.filter((p) => p.lang === "en").map((p) => `- [${p.title}](${SITE.url}${postPath(p)}): ${p.description}`).join("\n")}

## Türkçe
- [Türkçe ana sayfa](${SITE.url}/tr/)
- [Blog (Türkçe)](${SITE.url}/tr/blog/)
${posts.filter((p) => p.lang === "tr").map((p) => `- [${p.title}](${SITE.url}${postPath(p)})`).join("\n")}
${GUIDES.map((g) => `- [${g.title}](${SITE.url}/rehber/${g.slug}/)`).join("\n")}
`);

// IndexNow anahtar dosyası: GEO otopilotu değişen sayfaları Bing/Yandex'e bu anahtarla bildirir.
writeFileSync(join(DIST, `${SITE.indexnow}.txt`), SITE.indexnow);

// 6) Uygulama adresleri → /app/ (Cloudflare Pages yeniden yazma, adres çubuğu değişmez)
const APP_ROUTES = ["/giris", "/kayit", "/sifre", "/durum", "/durum-ic", "/gizlilik", "/kosullar", "/panel", "/hesap", "/demo-lab", "/yonetim", "/calisma-alani/*", "/marka/*", "/rapor/*", "/davet/*"];
write("/check/", page({ lang: "en", alt: "/tr/kontrol/", path: "/check/", title: "Free AI visibility check | AI SaaSavran", description: "Check for free whether Gemini mentions your business when customers ask about your category. No signup.", body: checkHtml(true), schema: [APP] }));
write("/tr/kontrol/", page({ lang: "tr", alt: "/check/", path: "/tr/kontrol/", title: "Ücretsiz yapay zekâ görünürlük kontrolü | AI SaaSavran", description: "İşletmeniz Gemini cevaplarında geçiyor mu? Üye olmadan ücretsiz kontrol edin.", body: checkHtml(false), schema: [APP] }));
write("/pricing/", page({ lang: "en", path: "/pricing/", title: "Pricing | AI SaaSavran", description: "AI SaaSavran plans: Free, Plus $29/month, Pro $149/month, Business $449/month.", body: `<section class="article"><h1>Pricing</h1><p>Start free. Paid plans add ChatGPT with live web search, more brands and more questions. Monthly billing, cancel anytime, 14-day money-back guarantee (<a href="/refund/">refund policy</a>).</p></section>${plansHtml(true)}`, schema: [APP] }));

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

writeFileSync(join(DIST, "_redirects"), ["/en / 301", "/en/ / 301", "/guides/ai-visibility-tools-compared/ /guides/ 301", "/rehber/yapay-zeka-gorunurluk-araclari/ /rehber/ 301", ...APP_ROUTES.map((r) => `${r} /app/ 200`)].join("\n") + "\n");
console.log(`Statik sayfalar üretildi: ${urls.length} sayfa, uygulama /app/ altında`);
