// Yapay Zekâ Görünürlük Endeksi (18 Kasım): ölçüm sayfalarındaki gerçek verinin sektör sektör özeti.
// Kaynak: web/site/data/measurements.json (haftalık otomatik). Yeni veri yok, yorum yok; yalnız toplama.
// Sektör: sorunun metnindeki sabit anahtar kelimelerle (aşağıdaki SECTORS sırası önemli). Eşleşmeyen soru "other" olur
// ve endekse girmez (yalnız derleme günlüğünde uyarı).
// Ana ölçü: canlı web aramalı cevaplar (ChatGPT, Claude, Perplexity). Gemini web araması olmadan ölçüldüğü için ayrı satırda.
// Fark 10 puandan küçükse "başa baş" (ölçüm standardı).

const ENG = { openai: "ChatGPT", claude: "Claude", perplexity: "Perplexity", gemini: "Gemini" };
const LIVE_ORDER = ["openai", "claude", "perplexity"];

// [anahtar, TR ad, EN ad, düzenli ifade] — ilk eşleşen kazanır
export const SECTORS = [
  ["ai-visibility", "Yapay zekâ görünürlük araçları", "AI visibility tools", /görünürlü|\bgeo\b|chatgpt'de|yapay zekâ arama|brand visibility|visibility in chatgpt/],
  ["youtube", "Teknoloji YouTube kanalları", "Tech YouTube channels", /youtube/],
  ["carriers", "Mobil operatörler", "Mobile carriers", /carrier|phone plan|\b5g\b|data plan|prepaid/],
  ["retail", "Mağazalar ve indirim alışverişi", "Retailers and deal shopping", /retailer|\bstores?\b|where should i shop|where can i get|place to buy|cyber monday|price match|shop black friday/],
  ["ecommerce", "Online alışveriş siteleri", "Online stores", /alışveriş sitesi|e-ticaret|internetten/],
  ["headphones", "Kulaklıklar", "Headphones", /kulaklı|kulaklığ|headphone/],
  ["tv", "Televizyonlar", "TVs", /televizyon|\btv\b/],
  ["gaming-laptop", "Oyun laptopları", "Gaming laptops", /laptop|oyun bilgisayar/],
  ["hair", "Saç ekim klinikleri", "Hair transplant clinics", /saç ek|hair transplant|\bdhi\b|\bfue\b|ekim için|natural-looking/],
  ["hospital", "Özel hastaneler", "Private hospitals", /hastane|hospital|\bivf\b/],
  ["perfume", "Parfümler", "Perfumes", /parfüm|perfume|fragrance/],
  ["shoes", "Spor ayakkabılar", "Sneakers", /ayakkabı|sneaker|shoes/],
  ["coffee", "Kahve makineleri", "Coffee machines", /kahve|espresso|coffee/],
  ["robot-vacuum", "Robot süpürgeler", "Robot vacuums", /robot süpürge|robot vacuum/],
  ["smartwatch", "Akıllı saatler", "Smartwatches", /smartwatch|akıllı saat/],
  ["fast-food", "Fast food zincirleri", "Fast food chains", /fast food|burger|fries|chicken sandwich/],
  ["security-camera", "Güvenlik kameraları", "Home security cameras", /security camera|doorbell/],
  ["phones", "Akıllı telefonlar", "Smartphones", /telefon|phone/],
  ["airlines", "Havayolları", "Airlines", /havayolu|uçak bileti|airline/],
  ["banks", "Bankalar", "Banks", /banka/],
];

export const sectorOf = (q) => {
  // Türkçe küçük harf "I"yı "ı" yapar; İngilizce sorular için ikisi de denenir
  const a = q.toLocaleLowerCase("tr-TR"), b = q.toLowerCase();
  return SECTORS.find((s) => s[3].test(a) || s[3].test(b))?.[0] ?? "other";
};

export const idxPath = (lang) => (lang === "tr" ? "/tr/yapay-zeka-gorunurluk-endeksi/" : "/ai-visibility-index/");
export const idxCsvPath = "/ai-visibility-index.csv";

/** Bir grup ölçümün belirli motorlardaki marka toplamları. */
function tally(items, pick) {
  let n = 0;
  const by = new Map();
  for (const m of items) for (const e of m.engines) {
    if (!pick(e)) continue;
    n += e.answers;
    for (const b of e.brands) {
      const x = by.get(b.name) ?? { rec: 0, men: 0 };
      x.rec += b.recommended; x.men += b.mentioned;
      by.set(b.name, x);
    }
  }
  const list = [...by.entries()].map(([name, v]) => ({ name, ...v })).filter((x) => x.men > 0)
    .sort((a, b) => b.rec - a.rec || b.men - a.men || a.name.localeCompare(b.name));
  return { n, list };
}

/** Lider + 10 puandan yakın olanlar (başa baş). */
export function leaders(t) {
  const [a] = t.list;
  if (!a || !a.rec || !t.n) return [];
  return t.list.filter((x) => x.rec > 0 && (a.rec - x.rec) / t.n < 0.10);
}

/** Endeks verisi: dil (pazar) → sektör → toplamlar. Saf fonksiyon, test edilir. */
export function buildIndex(items) {
  const groups = [];
  const other = [];
  for (const lang of ["tr", "en"]) {
    const sectors = [];
    for (const [key, trName, enName] of SECTORS) {
      const qs = items.filter((m) => m.lang === lang && sectorOf(m.question) === key);
      if (!qs.length) continue;
      const live = tally(qs, (e) => e.measurement_type === "live_search");
      if (!live.n) continue; // canlı arama yoksa endekse girmez
      const engines = LIVE_ORDER.map((p) => ({ provider: p, ...tally(qs, (e) => e.provider === p && e.measurement_type === "live_search") })).filter((e) => e.n > 0);
      const gem = tally(qs, (e) => e.provider === "gemini");
      const dates = qs.map((m) => m.at.slice(0, 10)).sort();
      sectors.push({ key, name: { tr: trName, en: enName }, questions: qs.length, live, engines, gemini: gem.n ? gem : null, from: dates[0], to: dates.at(-1), sample: qs.slice(0, 3) });
    }
    groups.push({ lang, sectors });
  }
  for (const m of items) if (sectorOf(m.question) === "other") other.push(m.question);
  return { groups, other };
}

const pct = (a, n) => (n ? Math.round((100 * a) / n) : 0);
const fmtDate = (d, tr) => new Date(d + "T12:00:00Z").toLocaleDateString(tr ? "tr-TR" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Istanbul" });

function leaderText(t, esc, tr, short = false) {
  const L = leaders(t);
  if (!L.length) return tr ? "önerilen yok" : "none recommended";
  const s = L.slice(0, short ? 3 : 4).map((x) => `${esc(x.name)} ${x.rec}/${t.n}`).join(", ") + (L.length > (short ? 3 : 4) ? "…" : "");
  return L.length > 1 ? `${s} (${tr ? "başa baş" : "tied"})` : s;
}

/** Sayfa gövdesi. mPath: ölçüm sayfası adresi (measurements.mjs'den). */
export function indexReportBody(lang, idx, esc, mPath, updated) {
  const tr = lang === "tr";
  const order = tr ? ["tr", "en"] : ["en", "tr"];
  const all = idx.groups.flatMap((g) => g.sectors);
  const nQ = all.reduce((a, s) => a + s.questions, 0);
  const nA = all.reduce((a, s) => a + s.live.n, 0);
  const groupTitle = (g) => (g.lang === "tr"
    ? (tr ? "Türkçe sorular (Türkiye)" : "Turkish-language questions (Turkey)")
    : (tr ? "İngilizce sorular (ABD ve uluslararası)" : "English-language questions (US and international)"));

  // Öne çıkanlar: yalnız hesap, yorum yok; her soru dili (pazar) ayrı
  const secName = (s) => esc(s.name[lang]);
  const isSplit = (s) => {
    const tops = s.engines.filter((e) => e.n >= 4).map((e) => leaders(e));
    if (tops.length < 2 || tops.some((l) => !l.length)) return false;
    // hiçbir marka her motorda lider (veya lider ile başa baş) değilse motorlar ayrışıyor
    return !tops[0].some((x) => tops.every((l) => l.some((y) => y.name === x.name)));
  };
  const hiGroup = (g) => {
    const out = [];
    const strongest = g.sectors.filter((s) => s.live.n >= 10 && leaders(s.live).length === 1)
      .sort((a, b) => b.live.list[0].rec / b.live.n - a.live.list[0].rec / a.live.n).slice(0, 3);
    const split = g.sectors.filter(isSplit);
    if (strongest.length) out.push(tr
      ? `Tek markanın en açık önde olduğu sektörler: ${strongest.map((s) => `${secName(s)} (${esc(s.live.list[0].name)}, %${pct(s.live.list[0].rec, s.live.n)})`).join(", ")}.`
      : `Clearest single leaders: ${strongest.map((s) => `${secName(s)} (${esc(s.live.list[0].name)}, ${pct(s.live.list[0].rec, s.live.n)}%)`).join(", ")}.`);
    if (split.length) out.push(tr
      ? `Motorların farklı markayı ilk sıraya koyduğu sektörler: ${split.map(secName).join(", ")}.`
      : `Engines put a different brand first in: ${split.map(secName).join(", ")}.`);
    return out.length ? `<li><b>${groupTitle(g)}:</b> ${out.join(" ")}</li>` : "";
  };
  const hi = order.map((l) => idx.groups.find((g) => g.lang === l)).filter(Boolean).map(hiGroup).filter(Boolean);

  const section = (g) => {
    if (!g.sectors.length) return "";
    const cards = g.sectors.map((s) => {
      const rows = s.live.list.slice(0, 6).map((b) => `<tr><td>${esc(b.name)}</td><td class="num">${b.rec}/${s.live.n}</td><td class="num">${tr ? "%" + pct(b.rec, s.live.n) : pct(b.rec, s.live.n) + "%"}</td></tr>`).join("");
      const per = s.engines.map((e) => `${ENG[e.provider]}: ${leaderText(e, esc, tr, true)}`).join(" · ");
      const gem = s.gemini ? `<br>Gemini (${tr ? "web araması yok, model bilgisi" : "no web search, model knowledge"}): ${leaderText(s.gemini, esc, tr, true)}` : "";
      const qs = s.sample.map((m) => `<a href="${mPath(m)}">${esc(m.question)}</a>`).join(" · ");
      return `<h3 id="${g.lang}-${s.key}">${esc(s.name[lang])}</h3>
<p class="small">${s.questions} ${tr ? "soru" : "questions"} · ${s.live.n} ${tr ? "canlı aramalı cevap" : "live-search answers"} · ${s.from === s.to ? fmtDate(s.to, tr) : `${fmtDate(s.from, tr)} – ${fmtDate(s.to, tr)}`}</p>
<table class="mtable"><thead><tr><th>${tr ? "Marka" : "Brand"}</th><th>${tr ? "Önerildi" : "Recommended"}</th><th>${tr ? "Oran" : "Share"}</th></tr></thead><tbody>${rows}</tbody></table>
<p class="small">${tr ? "Motor bazında lider" : "Leader by engine"}: ${per}${gem}</p>
<p class="small">${tr ? "Örnek sorular" : "Sample questions"}: ${qs}</p>`;
    }).join("\n");
    return `<h2>${groupTitle(g)}</h2>\n${cards}`;
  };

  const toc = order.map((l) => idx.groups.find((g) => g.lang === l)).filter((g) => g && g.sectors.length)
    .map((g) => `<p class="small"><b>${groupTitle(g)}:</b> ${g.sectors.map((s) => `<a href="#${g.lang}-${s.key}">${esc(s.name[lang])}</a>`).join(" · ")}</p>`).join("");

  const intro = tr
    ? `<p class="lede">ChatGPT, Claude ve Perplexity'ye canlı web aramasıyla sorduğumuz gerçek müşteri sorularında hangi markaların önerildiğinin sektör sektör özeti. ${idx.groups.reduce((a, g) => a + g.sectors.length, 0)} sektör, ${nQ} soru, ${nA} canlı aramalı cevap. Her pazartesi kendiliğinden güncellenir; son güncelleme ${fmtDate(updated, true)}.</p>`
    : `<p class="lede">A sector-by-sector summary of which brands ChatGPT, Claude and Perplexity recommend when we ask them real customer questions with live web search. ${idx.groups.reduce((a, g) => a + g.sectors.length, 0)} sectors, ${nQ} questions, ${nA} live-search answers. Updated automatically every Monday; last update ${fmtDate(updated, false)}.</p>`;

  const method = tr
    ? `<h2>Nasıl okunur?</h2>
<p><b>Önerildi</b>: o sektördeki sorulara verilen canlı aramalı cevapların kaçında markanın önerildiği. <b>Oran</b>: aynı sayının yüzdesi. Her soru her motora en az iki kez soruldu; her motorun son ölçümü sayıldı. Lidere 10 puandan yakın markalar "başa baş" sayılır: az cevapla küçük farklar şans olabilir.</p>
<p>Sınırlar: Yalnız takip ettiğimiz markalar sayıldı; listede olmayan bir marka da önerilmiş olabilir. Sorular sektörlere metindeki anahtar kelimelerle ayrıldı. Cevaplar resmî API'lerle alındı; tüketici uygulamalarındaki cevaplar farklı olabilir. Gemini web araması olmadan (model bilgisi) ölçüldüğü için toplama katılmadı, ayrı satırda gösterildi. Örneklem küçüktür, pazarın tamamını temsil etmez.</p>
<p>Kaynak gösterme: Bu sayfadaki veriler <a href="https://creativecommons.org/licenses/by/4.0/deed.tr">CC BY 4.0</a> ile serbesttir; "AI SaaSavran Yapay Zekâ Görünürlük Endeksi" adıyla ve bu sayfaya bağlantıyla kullanabilirsiniz. Ham tablo: <a href="${idxCsvPath}">CSV indir</a>. Ayrıntılı yöntem: <a href="/tr/metodoloji/">metodoloji</a> · Tek tek sorular: <a href="/tr/olcumler/">tüm ölçümler</a>.</p>`
    : `<h2>How to read it</h2>
<p><b>Recommended</b>: in how many of the live-search answers to that sector's questions the brand was recommended. <b>Share</b>: the same as a percentage. Each question was asked to each engine at least twice; the latest measurement per engine counts. Brands within 10 points of the leader are called "tied": with few answers, small gaps can be chance.</p>
<p>Limits: only the brands we track were counted; a brand outside the list may also have been recommended. Questions were grouped into sectors by keywords in their text. Answers were collected through the official APIs; answers in the consumer apps can differ. Gemini was measured without web search (model knowledge), so it is shown on a separate line and not added to the totals. Samples are small and do not represent the whole market.</p>
<p>Citing: the data on this page is free under <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>; please credit "AI SaaSavran AI Visibility Index" with a link to this page. Raw table: <a href="${idxCsvPath}">download CSV</a>. Full method: <a href="/methodology/">methodology</a> · Individual questions: <a href="/measurements/">all measurements</a>.</p>`;

  const cta = tr
    ? `<p class="actions"><a class="btn" href="/tr/kontrol/">Kendi markanızı ücretsiz kontrol edin</a></p>`
    : `<p class="actions"><a class="btn" href="/check/">Check your own brand for free</a></p>`;

  return `<section class="article"><p class="eyebrow">${tr ? "Gerçek ölçümlerden, haftalık" : "From real measurements, weekly"}</p>
<h1>${tr ? "Yapay Zekâ Görünürlük Endeksi" : "AI Visibility Index"}</h1>
${intro}
${hi.length ? `<h2>${tr ? "Öne çıkanlar" : "Highlights"}</h2><ul>${hi.join("")}</ul>` : ""}
${toc}
${order.map((l) => section(idx.groups.find((g) => g.lang === l))).join("\n")}
${method}
${cta}</section>`;
}

/** CSV: pazar, sektör, motor grubu, marka, önerildi, anıldı, cevap. */
export function indexCsv(idx) {
  const q = (s) => `"${String(s).replace(/"/g, '""')}"`;
  const lines = ["language,sector,engines,brand,recommended,mentioned,answers,from,to"];
  for (const g of idx.groups) for (const s of g.sectors) {
    const rows = [["live_search_all", s.live], ...s.engines.map((e) => [`${e.provider}_live_search`, e]), ...(s.gemini ? [["gemini_model_knowledge", s.gemini]] : [])];
    for (const [label, t] of rows) for (const b of t.list) lines.push([g.lang, q(s.name.en), label, q(b.name), b.rec, b.men, t.n, s.from, s.to].join(","));
  }
  return lines.join("\n") + "\n";
}
