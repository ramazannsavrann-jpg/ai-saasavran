// Ölçüm sayfaları (18 Kasım, görünürlük düzeni): web/site/data/measurements.json → her soru için bir sayfa + dizin.
// Veri haftalık iş akışıyla Growth Lab'den gelir (scripts/export-measurements.ts). Gerçek marka adları (sahip kararı, 18 Kasım).
// Yorum yok: yalnız ölçülen sayılar; fark 10 puandan küçükse "başa baş" denir (ölçüm standardı).
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const FILE = join(dirname(fileURLToPath(import.meta.url)), "data", "measurements.json");
export const MEASUREMENTS = existsSync(FILE) ? JSON.parse(readFileSync(FILE, "utf8")) : { updated: null, items: [] };

const ENG = { openai: "ChatGPT", claude: "Claude", gemini: "Gemini", perplexity: "Perplexity" };
const COUNTRY = { TR: ["Türkiye", "Turkey"], US: ["ABD", "the US"], GB: ["Birleşik Krallık", "the UK"], DE: ["Almanya", "Germany"] };
export const mPath = (m) => (m.lang === "tr" ? `/tr/olcumler/${m.slug}/` : `/measurements/${m.slug}/`);
export const mIndex = (lang) => (lang === "tr" ? "/tr/olcumler/" : "/measurements/");

const fmtDate = (iso, tr) => new Date(iso).toLocaleDateString(tr ? "tr-TR" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Istanbul" });

/** Tüm motorlardaki canlı aramalı cevaplarda toplam; yoksa model bilgisi. */
export function totals(m) {
  const live = m.engines.filter((e) => e.measurement_type === "live_search");
  const set = live.length ? live : m.engines;
  const n = set.reduce((a, e) => a + e.answers, 0);
  const by = new Map();
  for (const e of set) for (const b of e.brands) by.set(b.name, (by.get(b.name) ?? 0) + b.recommended);
  const list = [...by.entries()].map(([name, rec]) => ({ name, rec })).sort((a, b) => b.rec - a.rec || a.name.localeCompare(b.name));
  return { live: live.length > 0, n, list, engines: set.map((e) => ENG[e.provider] ?? e.provider) };
}

export function leadSentence(m, esc) {
  const tr = m.lang === "tr";
  const t = totals(m);
  const [a] = t.list;
  const date = fmtDate(m.at, tr);
  const where = COUNTRY[m.country] ? (tr ? `${COUNTRY[m.country][0]}'den ` : `from ${COUNTRY[m.country][1]} `) : "";
  const how = t.live ? (tr ? `${where}canlı web aramasıyla` : `with live web search ${where}`.trim()) : (tr ? "web araması olmadan (model bilgisi)" : "without web search (model knowledge)");
  const engines = t.engines.join(", ");
  // Liderle arasında 10 puandan az fark olan herkes başa baş sayılır
  const tied = a ? t.list.filter((x) => t.n && (a.rec - x.rec) / t.n < 0.10 && x.rec > 0) : [];
  const tie = tied.length > 1;
  const names = (sep) => tied.slice(0, 5).map((x) => `${esc(x.name)} (${x.rec})`).join(", ").replace(/, ([^,]*)$/, sep + "$1") + (tied.length > 5 ? "…" : "");
  if (tr) {
    const top = !a || a.rec === 0 ? "Hiçbir marka önerilmedi." : tie ? `${names(" ve ")} başa baş.` : `En çok önerilen: ${esc(a.name)}, ${t.n} cevabın ${a.rec} tanesinde.`;
    return `${date} tarihinde bu soruyu ${engines} motorlarına ${how} sorduk; ${t.n} cevap. ${top}`;
  }
  const top = !a || a.rec === 0 ? "No brand was recommended." : tie ? `${names(" and ")} are tied.` : `Most recommended: ${esc(a.name)}, in ${a.rec} of ${t.n} answers.`;
  return `On ${date} we asked ${engines} this question ${how}; ${t.n} answers. ${top}`;
}

export function measurementBody(m, esc) {
  const tr = m.lang === "tr";
  const tables = m.engines.map((e) => {
    const kind = e.measurement_type === "live_search" ? (tr ? "canlı web araması" : "live web search") : (tr ? "web araması yok, model bilgisi" : "no web search, model knowledge");
    const rows = e.brands.map((b) => `<tr><td>${esc(b.name)}</td><td class="num">${b.recommended}/${e.answers}</td><td class="num">${b.mentioned}/${e.answers}</td><td class="num">${b.first}</td></tr>`).join("");
    return `<h2>${esc(ENG[e.provider] ?? e.provider)} · ${kind}</h2>
<p class="small">${fmtDate(e.at, tr)} · ${e.answers} ${tr ? "cevap" : "answers"}</p>
<table class="mtable"><thead><tr><th>${tr ? "Marka" : "Brand"}</th><th>${tr ? "Önerildi" : "Recommended"}</th><th>${tr ? "Anıldı" : "Mentioned"}</th><th>${tr ? "İlk sırada" : "First pick"}</th></tr></thead><tbody>${rows}</tbody></table>`;
  }).join("\n");
  const note = tr
    ? `<p class="small">Sayılar AI SaaSavran'ın kendi laboratuvarındaki (Growth Lab) gerçek ölçümdür; cevaplar resmî API'lerle alındı, tüketici uygulamasındaki cevaplar farklı olabilir. Az cevapla küçük farklar şans olabilir: 10 puandan küçük farkları "başa baş" sayarız. <a href="/tr/metodoloji/">Yöntem</a> · <a href="${mIndex("tr")}">Tüm ölçümler</a> · <a href="/tr/yapay-zeka-gorunurluk-endeksi/">Sektör endeksi</a></p>`
    : `<p class="small">These are real measurements from AI SaaSavran's own lab (Growth Lab), collected through the official APIs; answers in the consumer apps can differ. With few answers small gaps can be chance: we call gaps under 10 points a tie. <a href="/methodology/">Method</a> · <a href="${mIndex("en")}">All measurements</a> · <a href="/ai-visibility-index/">Sector index</a></p>`;
  const cta = tr
    ? `<p class="actions"><a class="btn" href="/tr/kontrol/">Kendi markanızı ücretsiz kontrol edin</a></p>`
    : `<p class="actions"><a class="btn" href="/check/">Check your own brand for free</a></p>`;
  return `<section class="article"><p class="eyebrow">${tr ? "Yapay zekâ ne öneriyor?" : "What does AI recommend?"}</p><h1>${esc(m.question)}</h1><p class="lead">${leadSentence(m, esc)}</p>
${tables}
${note}
${cta}</section>`;
}

export function indexBody(lang, items, esc) {
  const tr = lang === "tr";
  const li = items.map((m) => { const t = totals(m); const a = t.list[0]; return `<li><a href="${mPath(m)}">${esc(m.question)}</a><span class="small"> · ${fmtDate(m.at, tr)} · ${a && a.rec ? `${esc(a.name)} ${a.rec}/${t.n}` : tr ? "önerilen yok" : "none recommended"}</span></li>`; }).join("");
  return `<section class="article"><h1>${tr ? "Yapay zekâ ne öneriyor? Gerçek ölçümler" : "What does AI recommend? Real measurements"}</h1>
<p class="lead">${tr ? `ChatGPT, Claude, Perplexity ve Gemini'ye sorduğumuz gerçek soruların sonuçları. Her hafta kendiliğinden güncellenir; ${items.length} soru. Sektör sektör özet: <a href="/tr/yapay-zeka-gorunurluk-endeksi/">Yapay Zekâ Görünürlük Endeksi</a>.` : `Results of real questions we asked ChatGPT, Claude, Perplexity and Gemini. Updated automatically every week; ${items.length} questions. Sector summary: <a href="/ai-visibility-index/">AI Visibility Index</a>.`}</p>
<ul class="mlist">${li}</ul></section>`;
}
