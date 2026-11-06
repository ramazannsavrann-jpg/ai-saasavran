// Herkese açık statik sayfaları üretir (vite build'den sonra çalışır, web/ klasöründen).
//  - Tek sayfa uygulama dist/index.html → dist/app/index.html taşınır; uygulama adresleri _redirects ile oraya yönlenir.
//  - "/" tanıtım sayfası, "/rehber/..." rehberler: JavaScript'siz düz HTML (arama motorları ve yapay zekâ botları okuyabilir).
import { mkdirSync, writeFileSync, renameSync, existsSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { SITE, GUIDES, HOME_FAQ } from "./content.mjs";

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
const faqHtml = (faq) => faq.length ? `<section class="faq"><h2>Sık sorulanlar</h2>${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}</section>` : "";

function page({ path, title, description, body, schema = [], type = "website", lang = "tr", alt = null }) {
  const url = SITE.url + path;
  const en = lang === "en";
  const alternates = alt ? `<link rel="alternate" hreflang="tr" href="${SITE.url}${en ? alt : path}">\n<link rel="alternate" hreflang="en" href="${SITE.url}${en ? path : alt}">\n<link rel="alternate" hreflang="x-default" href="${SITE.url}${en ? alt : path}">` : "";
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
  <a class="mark" href="${en ? "/en/" : "/"}" aria-label="AI SaaSavran"><img src="/icon.svg" alt="" width="28" height="28"><span>AI <b>SaaSavran</b></span></a>
  <nav aria-label="${en ? "Main menu" : "Ana menü"}">${en ? "" : `<a href="/rehber/">Rehberler</a><a href="/durum">Ürün durumu</a>`}<a class="lang" href="${alt ?? (en ? "/" : "/en/")}" hreflang="${en ? "tr" : "en"}" lang="${en ? "tr" : "en"}">${en ? "Türkçe" : "English"}</a><a class="cta-sm" data-cta href="/giris">${en ? "Sign in" : "Giriş yap"}</a></nav>
</header>
<main>
${body}
</main>
<footer class="foot">
  ${en ? `<p><b>AI SaaSavran</b> measures how visible brands are in AI assistants. Early access. The app interface is currently in Turkish; English is coming.</p>
  <p><a href="/">Türkçe</a> · <a href="/gizlilik">Privacy (TR)</a> · <a href="/kosullar">Terms (TR)</a> · <a href="mailto:${SITE.email}">${SITE.email}</a></p>` : `<p><b>AI SaaSavran</b>: markaların yapay zekâ asistanlarındaki görünürlüğünü ölçen Türkçe araç. Erken erişim.</p>
  <p><a href="/rehber/">Rehberler</a> · <a href="/durum">Ürün durumu</a> · <a href="/gizlilik">Gizlilik</a> · <a href="/kosullar">Kullanım koşulları</a> · <a href="/en/">English</a> · <a href="mailto:${SITE.email}">${SITE.email}</a></p>`}
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
  operatingSystem: "Web", inLanguage: "tr", description: "Markanızın ChatGPT ve Gemini cevaplarında ne sıklıkla anıldığını ve önerildiğini ölçen Türkçe araç.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD", description: "Ücretsiz paket" },
};

// 3) Tanıtım sayfası
const home = `
<section class="hero">
  <div class="hero-copy">
    <h1>Müşteriniz yapay zekâya sorduğunda markanız cevapta mı?</h1>
    <p class="lede">AI SaaSavran, müşterilerinizin ChatGPT ve Gemini'ye soracağı soruları sorar; markanızın anılıp anılmadığını, önerilip önerilmediğini ve sizin yerinize hangi rakibin önerildiğini ölçer.</p>
    <p class="actions"><a class="btn" href="/kayit">Ücretsiz başla</a><a class="btn ghost" href="/rehber/chatgpt-marka-gorunurlugu-olcme/">Nasıl ölçülür?</a></p>
    <p class="small">Ücretsiz paket: 1 marka, 10 soru, ayda 40 ölçüm. Kart bilgisi istenmez.</p>
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
    <li class="try">ChatGPT ile canlı aramalı ölçüm ve kaynak analizi: deneme aşamasında, henüz müşterilere açık değil.</li>
    <li class="no">Perplexity, PDF rapor, ödeme: henüz yok.</li>
  </ul>
  <p><a href="/durum">Ayrıntılı ürün durumu</a></p>
</section>

${faqHtml(HOME_FAQ)}
`;
write("/", page({ alt: "/en/", path: "/", title: "AI SaaSavran: Markanız ChatGPT ve Gemini cevaplarında mı?", description: "Markanızın ChatGPT ve Gemini gibi yapay zekâ asistanlarında ne sıklıkla anıldığını ve önerildiğini ölçün. Türkçe, ücretsiz başlangıç paketi.", body: home, schema: [ORG, APP, faqLd(HOME_FAQ)] }));

// 3b) İngilizce tanıtım sayfası
const EN_FAQ = [
  ["What does AI SaaSavran do?", "It asks ChatGPT and Gemini the questions your customers would ask, and measures whether your brand is mentioned, recommended or cited as a source, compared with your competitors."],
  ["Is it free?", "The free plan includes 1 brand, 10 questions and 40 measurements per month. Free-plan measurements use Gemini without live web search, and reports say so clearly."],
  ["Which markets and languages?", "We focus on Turkey first: Turkish question templates for 22 sectors and local competitors. The app interface is currently Turkish; an English interface is planned."],
  ["Is the product ready?", "We are in early access. Live-search measurement with ChatGPT is in a trial phase and not yet open to customers."],
];
const enHome = `
<section class="hero">
  <div class="hero-copy">
    <h1>When customers ask AI, does your brand show up?</h1>
    <p class="lede">AI SaaSavran asks ChatGPT and Gemini the questions your customers would ask, then measures whether your brand is mentioned, recommended, and which competitor is recommended instead.</p>
    <p class="actions"><a class="btn" href="/kayit">Start free</a><a class="btn ghost" href="/">Türkçe</a></p>
    <p class="small">Free plan: 1 brand, 10 questions, 40 measurements a month. No card required. App interface in Turkish for now.</p>
  </div>
  <figure class="answer-card" aria-label="Example AI answer">
    <figcaption><span class="q">Which mobile banking app is best in Turkey?</span></figcaption>
    <blockquote>
      <p>1. <mark class="hit">İşCep</mark> (İş Bankası) …</p>
      <p>2. <mark class="hit">Enpara.com</mark> …</p>
      <p>3. <mark class="hit alt">Akbank</mark> …</p>
    </blockquote>
    <p class="cite">Sources: isbank.com.tr · enpara.com · bddk.gov.tr</p>
    <p class="caption">Illustration. In our real measurement (ChatGPT with live web search, 7 Nov 2026, 10 answers, Turkish questions) the most recommended banks were İş Bankası, Enpara.com and Akbank; these were the most cited sources.</p>
  </figure>
</section>
<section class="band">
  <h2>What we measure</h2>
  <div class="trio">
    <div><h3>Mentions</h3><p>Is your brand named in the answer? Product names (like "İşCep") are mapped to their brand.</p></div>
    <div><h3>Recommendations</h3><p>Are you in the recommended list? Negative context ("not recommended") does not count.</p></div>
    <div><h3>Competitors and sources</h3><p>Who is recommended instead of you, and which websites does the AI rely on?</p></div>
  </div>
</section>
<section class="honest">
  <h2>We measured ourselves: 0 out of 20</h2>
  <p>We ran AI SaaSavran on our own brand with ChatGPT live web search. As a new brand we were recommended in none of 20 answers, while established competitors appeared in 5 to 8. We publish this because it shows exactly why measurement comes first.</p>
</section>
<section class="status">
  <h2>What works today</h2>
  <ul>
    <li class="ok">Gemini measurement (no live search, model knowledge), clearly labelled in reports.</li>
    <li class="ok">Weekly automatic measurement, website check, rule-based recommendations.</li>
    <li class="try">ChatGPT live-search measurement and source analysis: trial phase, not yet open to customers.</li>
    <li class="no">Perplexity, PDF reports, payments, English app interface: not yet.</li>
  </ul>
</section>
${faqHtml(EN_FAQ).replace("Sık sorulanlar", "FAQ")}
`;
write("/en/", page({ lang: "en", alt: "/", path: "/en/", title: "AI SaaSavran: Is your brand in ChatGPT and Gemini answers?", description: "Measure how often ChatGPT and Gemini mention and recommend your brand versus competitors. Built for Turkey, free plan available.", body: enHome, schema: [ORG, { ...APP, inLanguage: ["tr", "en"] }, faqLd(EN_FAQ)] }));

// 4) Rehberler
const list = `
<section class="article">
  <h1>Rehberler</h1>
  <p class="lede">Markanızın yapay zekâ asistanlarındaki görünürlüğünü ölçmek ve artırmak için Türkçe rehberler. Örnekler kendi gerçek ölçümlerimizden.</p>
  <ul class="guide-list">${GUIDES.map((g) => `<li><a href="/rehber/${g.slug}/"><b>${esc(g.title)}</b><span>${esc(g.description)}</span></a></li>`).join("")}</ul>
</section>`;
write("/rehber/", page({ path: "/rehber/", title: "Rehberler: Yapay zekâ görünürlüğü | AI SaaSavran", description: "ChatGPT ve Gemini'de markanızın görünürlüğünü ölçmek ve artırmak için Türkçe rehberler.", body: list, schema: [ORG] }));

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
  <aside class="next"><p><b>Kendi markanızı ölçün.</b> Ücretsiz pakette 10 soru ve sektörünüze hazır Türkçe şablonlar.</p><a class="btn" href="/kayit">Ücretsiz başla</a></aside>
  <nav class="related" aria-label="Diğer rehberler"><h2>Diğer rehberler</h2><ul>${others}</ul></nav>
</article>`;
  const article = { "@context": "https://schema.org", "@type": "Article", headline: g.title, description: g.description, inLanguage: "tr", datePublished: SITE.updated, dateModified: SITE.updated, author: { "@type": "Organization", name: SITE.name, url: SITE.url }, publisher: { "@type": "Organization", name: SITE.name, logo: { "@type": "ImageObject", url: SITE.url + "/icon.svg" } }, mainEntityOfPage: SITE.url + path };
  write(path, page({ path, title: `${g.title} | AI SaaSavran`, description: g.description, body, schema: [article, faqLd(g.faq)], type: "article" }));
}

// 5) Tarayıcılar ve yapay zekâ botları için dosyalar
const urls = ["/", "/en/", "/rehber/", ...GUIDES.map((g) => `/rehber/${g.slug}/`)];
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

> Markaların ChatGPT ve Gemini gibi yapay zekâ asistanlarının cevaplarında ne sıklıkla anıldığını ve önerildiğini ölçen Türkçe SaaS aracı. Türkiye'deki işletmeler ve ajanslar için. Erken erişim aşamasında; ücretsiz paketle başlanabilir.

İletişim: ${SITE.email}

## Rehberler
${GUIDES.map((g) => `- [${g.title}](${SITE.url}/rehber/${g.slug}/): ${g.description}`).join("\n")}

## Ürün
- [Ana sayfa](${SITE.url}/): Ne ölçtüğümüz, nasıl çalıştığı, bugün neyin çalıştığı
- [Ürün durumu](${SITE.url}/durum): Çalışan, deneme aşamasında olan ve henüz olmayan özellikler
`);

// 6) Uygulama adresleri → /app/ (Cloudflare Pages yeniden yazma, adres çubuğu değişmez)
const APP_ROUTES = ["/giris", "/kayit", "/sifre", "/durum", "/durum-ic", "/gizlilik", "/kosullar", "/panel", "/hesap", "/demo-lab", "/calisma-alani/*", "/marka/*"];
writeFileSync(join(DIST, "_redirects"), APP_ROUTES.map((r) => `${r} /app/ 200`).join("\n") + "\n");
console.log(`Statik sayfalar üretildi: ${urls.length} sayfa, uygulama /app/ altında`);
