// Ücretsiz kontrol: soru üretimi ve cevap analizi (motorun kurallarıyla aynı: engine/src/metrics.ts).
import { analyzeResponse, untrackedNames } from "../../engine/src/metrics.ts";

const clean = (s, max = 80) => String(s ?? "").replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

export function parseInput(body) {
  const lang = body?.lang === "tr" ? "tr" : "en";
  const brand = clean(body?.brand), category = clean(body?.category), city = clean(body?.city);
  const website = clean(body?.website, 120).toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0];
  if (brand.length < 2 || category.length < 2) return { error: "input" };
  return { lang, brand, category, city, domain: /^[a-z0-9.-]+\.[a-z]{2,}$/.test(website) ? website : "" };
}

const STOP = new Set(("if what it its the this these those here there for when which also however best top note some many most you your they them " +
  "we our and or but with without what's it's i ai llm llms geo seo api faq tip tips pros cons step steps option options key final summary overall " +
  "bu şu bir ve ile için en çok daha ancak ayrıca örneğin not öneri sonuç kısaca").split(" "));
const keepName = (n) => n.length >= 3 && !STOP.has(n.toLowerCase()) && !STOP.has(n.split(" ")[0].toLowerCase());

export function buildQuestions({ lang, category, city }) {
  const where = city ? (lang === "tr" ? ` ${city} bölgesinde` : ` in ${city}`) : "";
  return lang === "tr"
    ? [
        `${where ? where.trim() + " " : ""}en iyi ${category} hangileri?`,
        `Bir ${category} arıyorum${where ? "," + where : ""}. Hangisini önerirsin?`,
        `${where ? where.trim() + " " : ""}en güvenilir ${category} seçenekleri neler? Kısa bir liste ver.`,
        `${where ? where.trim() + " " : ""}${category} seçerken hangi firmalara bakmalıyım?`,
        `${where ? where.trim() + " " : ""}fiyat/performans açısından en iyi ${category} hangisi?`,
      ]
    : [
        `What are the best ${category} options${where}?`,
        `I'm looking for ${/^[aeiou]/i.test(category) ? "an" : "a"} ${category}${where}. Which one would you recommend?`,
        `Give me a short list of the most trusted ${category} providers${where}.`,
        `Which ${category} companies should I consider${where}?`,
        `What's the best value ${category}${where}?`,
      ];
}

/** Cevapları marka için analiz eder: anıldı mı, önerildi mi, sıra; ve cevaplarda en çok geçen diğer adlar. */
export function analyze(answers, { brand, domain }) {
  const ref = { id: "t", name: brand, aliases: [], domain: domain || undefined };
  const rows = answers.map((a, i) => {
    if (!a.text) return { i, ok: false };
    const hit = analyzeResponse({ promptId: String(i), provider: "gemini", answerText: a.text, citedUrls: [] }, [ref])[0];
    return { i, ok: true, mentioned: !!hit?.mentioned, recommended: !!hit?.recommended, rank: hit?.rank ?? null };
  });
  const okRows = rows.filter((r) => r.ok);
  const others = untrackedNames(answers.filter((a) => a.text).map((a) => a.text), [{ name: brand, aliases: [] }], 16).filter((o) => keepName(o.name)).slice(0, 8);
  return {
    total: okRows.length,
    mentioned: okRows.filter((r) => r.mentioned).length,
    recommended: okRows.filter((r) => r.recommended).length,
    rows,
    others,
  };
}

/** Ücretsiz Gemini'nin kullanılamadığı ülkeler (AEA, İsviçre, Birleşik Krallık): Google Gemini API ek koşulları. */
const GEMINI_FREE_RESTRICTED = new Set(("AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE IS LI NO CH GB").split(" "));
export const geminiRestricted = (country) => GEMINI_FREE_RESTRICTED.has(String(country ?? "").toUpperCase());
