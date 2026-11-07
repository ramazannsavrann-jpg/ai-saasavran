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

function page({ path, title, description, body, schema = [], type = "website", lang = "en", alt = null }) {
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
<link rel="canonical" href="${url}">
${alternates}
<meta property="og:type" content="${type}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
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
  <nav aria-label="${en ? "Main menu" : "Ana menü"}">${en ? `<a href="/#pricing">Pricing</a><a href="/guides/">Guides</a>` : `<a href="/tr/#fiyatlar">Fiyatlar</a><a href="/rehber/">Rehberler</a><a href="/durum">Ürün durumu</a>`}<a class="lang" href="${alt ?? (en ? "/tr/" : "/")}" hreflang="${en ? "tr" : "en"}" lang="${en ? "tr" : "en"}">${en ? "Türkçe" : "English"}</a><a class="cta-sm" data-cta href="/giris">${en ? "Sign in" : "Giriş yap"}</a></nav>
</header>
<main>
${body}
</main>
<footer class="foot">
  ${en ? `<p><b>AI SaaSavran</b> measures whether ChatGPT and Gemini recommend your business. Early access.</p>
  <p><a href="/pricing/">Pricing</a> · <a href="/guides/">Guides</a> · <a href="/terms/">Terms</a> · <a href="/privacy/">Privacy</a> · <a href="/refund/">Refunds</a> · <a href="/tr/">Türkçe</a></p>
  <p>Contact: <a href="mailto:${SITE.email}">${SITE.email}</a></p>` : `<p><b>AI SaaSavran</b>: markaların yapay zekâ asistanlarındaki görünürlüğünü ölçen araç. Erken erişim.</p>
  <p><a href="/tr/#fiyatlar">Fiyatlar</a> · <a href="/rehber/">Rehberler</a> · <a href="/durum">Ürün durumu</a> · <a href="/kosullar">Kullanım koşulları</a> · <a href="/gizlilik">Gizlilik</a> · <a href="/iade/">İade</a> · <a href="/">English</a></p>
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

const ORG = { "@context": "https://schema.org", "@type": "Organization", name: SITE.name, url: SITE.url, email: SITE.email, logo: SITE.url + "/icon.svg" };
const APP = {
  "@context": "https://schema.org", "@type": "SoftwareApplication", name: SITE.name, url: SITE.url, applicationCategory: "BusinessApplication",
  operatingSystem: "Web", description: "Measures how often ChatGPT and Gemini mention and recommend your business versus competitors.",
  inLanguage: ["en", "tr"],
  offers: [["Free", 0], ["Plus", 20], ["Pro", 99], ["Business", 249]].map(([n, p]) => ({ "@type": "Offer", name: n, price: String(p), priceCurrency: "USD" })),
};


// Paketler (migration 0007 ile aynı). Ücretli paketler henüz satışta değil: bekleme listesi e-postayla.
const PLAN_ROWS = (en) => [
  { name: "Free", price: "$0", per: "", items: en
      ? ["1 brand, 15 questions, 3 competitors", "4 measurements a month (one a week, automatic)", "Gemini, model knowledge (no live search)", "Website check and recommendations"]
      : ["1 marka, 15 soru, 3 rakip", "Ayda 4 ölçüm (haftada bir, otomatik)", "Gemini, model bilgisi (canlı arama yok)", "Web sitesi kontrolü ve öneriler"], live: true },
  { name: "Plus", id: "starter", price: "$20", per: en ? "/month" : "/ay", items: en
      ? ["1 brand, 25 questions, 5 competitors", "ChatGPT with live web search + Gemini", "Each question asked twice, every week", "Which websites the AI cited"]
      : ["1 marka, 25 soru, 5 rakip", "ChatGPT canlı web araması + Gemini", "Her soru haftada 2 kez sorulur", "Yapay zekânın baktığı kaynak siteler"] },
  { name: "Pro", id: "pro", price: "$99", per: en ? "/month" : "/ay", items: en
      ? ["5 brands, 30 questions each", "8 competitors per brand", "Everything in Plus", "For multi-location businesses and freelancers"]
      : ["5 marka, her biri 30 soru", "Marka başına 8 rakip", "Plus'taki her şey", "Çok şubeli işletmeler ve serbest çalışanlar için"] },
  { name: "Business", id: "agency", price: "$249", per: en ? "/month" : "/ay", items: en
      ? ["15 brands, 30 questions each", "10 competitors per brand", "Everything in Pro", "For agencies managing client brands"]
      : ["15 marka, her biri 30 soru", "Marka başına 10 rakip", "Pro'daki her şey", "Müşteri markalarını yöneten ajanslar için"] },
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
      <p>1. <mark class="hit">İşCep</mark> (İş Bankası) …</p>
      <p>2. <mark class="hit">Enpara.com</mark> …</p>
      <p>3. <mark class="hit alt">Akbank</mark> …</p>
    </blockquote>
    <p class="cite">Kaynaklar: isbank.com.tr · enpara.com · bddk.gov.tr</p>
    <p class="caption">Temsilî gösterim. Gerçek ölçümümüzde (ChatGPT, canlı web aramasıyla, 7 Kasım 2026, 10 cevap) bu tür sorularda en sık önerilenler İş Bankası (İşCep), Enpara.com ve Akbank; en sık kaynaklar bu sitelerdi.</p>
  </figure>
</section>
${demoHtml(false)}

<section class="band">
  <h2>Ne ölçüyoruz?</h2>
  <div class="trio">
    <div><h3>Anılma</h3><p>Cevapta markanızın adı geçiyor mu? "İşCep" gibi ürün adlarını da markanıza bağlarız.</p></div>
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
    <li class="no">Perplexity, PDF rapor, ödeme: henüz yok.</li>
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
      <p>1. <mark class="hit">Peec AI</mark> …</p>
      <p>2. <mark class="hit">Otterly.AI</mark> …</p>
      <p>3. <mark class="hit alt">Semrush</mark> …</p>
    </blockquote>
    <p class="cite">Sources: peec.ai · semrush.com · help.ahrefs.com</p>
    <p class="caption">Illustration based on our real measurement (ChatGPT with live web search, 7 Nov 2026, 20 answers): Peec AI 8/20, Otterly.AI 7/20, Semrush 7/20. We were 0/20.</p>
  </figure>
</section>
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
    <li class="ok">ChatGPT live-search measurement and source analysis: on paid plans.</li>
    <li class="ok">Free check without signing up (2 a month).</li>
    <li class="ok">App in English and Turkish.</li>
    <li class="no">Perplexity, PDF reports, payments: not yet.</li>
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
  write(path, page({ lang: "en", alt: `/rehber/${g.tr}/`, path, title: `${g.title} | AI SaaSavran`, description: g.description, body, schema: [article, faqLd(g.faq)], type: "article" }));
}

// 4) Rehberler (Türkçe)
const list = `
<section class="article">
  <h1>Rehberler</h1>
  <p class="lede">Markanızın yapay zekâ asistanlarındaki görünürlüğünü ölçmek ve artırmak için Türkçe rehberler. Örnekler kendi gerçek ölçümlerimizden.</p>
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
  write(path, page({ lang: "tr", alt: enG ? `/guides/${enG.slug}/` : "/guides/", path, title: `${g.title} | AI SaaSavran`, description: g.description, body, schema: [article, faqLd(g.faq)], type: "article" }));
}

// 5) Tarayıcılar ve yapay zekâ botları için dosyalar
const urls = ["/", "/guides/", ...GUIDES_EN.map((g) => `/guides/${g.slug}/`), "/tr/", "/rehber/", ...GUIDES.map((g) => `/rehber/${g.slug}/`)];
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

Sitemap: ${SITE.url}/sitemap.xml
`);
writeFileSync(join(DIST, "llms.txt"), `# AI SaaSavran

> AI SaaSavran measures how often ChatGPT and Gemini mention and recommend a business compared with its competitors, and which sources the AI relied on. For small businesses and agencies. Early access; free plan available. Each question is asked several times, results come with confidence ranges, and live-search and model-knowledge answers are labelled separately.

Contact: ${SITE.email}

## Guides
${GUIDES_EN.map((g) => `- [${g.title}](${SITE.url}/guides/${g.slug}/): ${g.description}`).join("\n")}

## Türkçe
- [Türkçe ana sayfa](${SITE.url}/tr/)
${GUIDES.map((g) => `- [${g.title}](${SITE.url}/rehber/${g.slug}/)`).join("\n")}
`);

// 6) Uygulama adresleri → /app/ (Cloudflare Pages yeniden yazma, adres çubuğu değişmez)
const APP_ROUTES = ["/giris", "/kayit", "/sifre", "/durum", "/durum-ic", "/gizlilik", "/kosullar", "/panel", "/hesap", "/demo-lab", "/calisma-alani/*", "/marka/*"];
write("/check/", page({ lang: "en", alt: "/tr/kontrol/", path: "/check/", title: "Free AI visibility check | AI SaaSavran", description: "Check for free whether Gemini mentions your business when customers ask about your category. No signup.", body: checkHtml(true), schema: [APP] }));
write("/tr/kontrol/", page({ lang: "tr", alt: "/check/", path: "/tr/kontrol/", title: "Ücretsiz yapay zekâ görünürlük kontrolü | AI SaaSavran", description: "İşletmeniz Gemini cevaplarında geçiyor mu? Üye olmadan ücretsiz kontrol edin.", body: checkHtml(false), schema: [APP] }));
write("/pricing/", page({ lang: "en", path: "/pricing/", title: "Pricing | AI SaaSavran", description: "AI SaaSavran plans: Free, Plus $20/month, Pro $99/month, Business $249/month.", body: `<section class="article"><h1>Pricing</h1><p>Start free. Paid plans add ChatGPT with live web search, more brands and more questions. Monthly billing, cancel anytime, 14-day money-back guarantee (<a href="/refund/">refund policy</a>).</p></section>${plansHtml(true)}`, schema: [APP] }));

for (const l of Object.values(LEGAL)) write(l.path, page({ lang: l.lang, path: l.path, title: l.title, description: l.description, body: l.body }));

writeFileSync(join(DIST, "_redirects"), ["/en / 301", "/en/ / 301", ...APP_ROUTES.map((r) => `${r} /app/ 200`)].join("\n") + "\n");
console.log(`Statik sayfalar üretildi: ${urls.length} sayfa, uygulama /app/ altında`);
