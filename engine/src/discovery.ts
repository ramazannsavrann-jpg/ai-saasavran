// Gerçek soru keşfi: Google'da insanların sorduğu sorular (SerpApi Google araması: related_questions = "Diğer kişiler şunları
// da sordu", related_searches = ilgili aramalar). Yapay zekâ kullanılmaz; sorular Google'dan olduğu gibi gelir.
import type { FetchLike } from "./providers/types.ts";

export interface FoundQuestion { text: string; source: "paa" | "related"; seed: string }

/** Sektör ve şehirden en fazla 3 arama tohumu. */
export function discoverySeeds(o: { sector: string; city?: string | null; lang: string }): string[] {
  const s = o.sector.trim().replace(/\s+/g, " ").slice(0, 80), c = (o.city ?? "").trim().slice(0, 40);
  const en = o.lang === "en";
  const seeds = en ? [`best ${s}`, c ? `${s} in ${c}` : `${s} recommendations`, `how to choose ${s}`] : [`en iyi ${s}`, c ? `${c} ${s}` : `${s} önerisi`, `${s} nasıl seçilir`];
  return [...new Set(seeds)];
}

export function parseDiscovery(json: unknown, seed: string): FoundQuestion[] {
  const j = (json ?? {}) as { related_questions?: { question?: string }[]; related_searches?: { query?: string }[] };
  const out: FoundQuestion[] = [];
  for (const r of j.related_questions ?? []) if (r?.question) out.push({ text: r.question, source: "paa", seed });
  for (const r of j.related_searches ?? []) if (r?.query) out.push({ text: r.query, source: "related", seed });
  return out;
}

const norm = (s: string) => s.toLocaleLowerCase("tr-TR").replace(/[?!.,;:'"’]+/g, "").replace(/\s+/g, " ").trim();
/** Temizler: çok kısa/uzun olanları, mevcut sorularla ve kendi içinde tekrar edenleri atar; ilgili aramaları soru biçimine sokmaz (olduğu gibi). */
export function cleanQuestions(found: FoundQuestion[], existing: string[], max = 30): FoundQuestion[] {
  const seen = new Set(existing.map(norm));
  const out: FoundQuestion[] = [];
  for (const f of found) {
    const t = f.text.replace(/\s+/g, " ").trim();
    const k = norm(t);
    if (t.length < 8 || t.length > 200 || k.split(" ").length < 2 || seen.has(k)) continue;
    seen.add(k);
    out.push({ ...f, text: t });
    if (out.length >= max) break;
  }
  // Önce "Diğer kişiler şunları da sordu" (gerçek soru cümleleri), sonra ilgili aramalar
  return out.sort((a, b) => (a.source === b.source ? 0 : a.source === "paa" ? -1 : 1));
}

export async function serpGoogle(q: string, o: { apiKey: string; lang: string; country?: string | null; fetchFn?: FetchLike }): Promise<unknown> {
  const gl = (o.country || (o.lang === "en" ? "us" : "tr")).toLowerCase();
  const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(q)}&hl=${o.lang === "en" ? "en" : "tr"}&gl=${gl}&num=10&api_key=${encodeURIComponent(o.apiKey)}`;
  const res = await (o.fetchFn ?? fetch)(url, { signal: AbortSignal.timeout(40_000) });
  if (res.status === 429) throw new Error("SerpApi arama hakkı doldu");
  if (!res.ok) throw new Error(`SerpApi HTTP ${res.status}`);
  const j = (await res.json()) as { error?: string };
  if (j?.error && !/hasn't returned any results|no results/i.test(j.error)) throw new Error(String(j.error).slice(0, 160));
  return j;
}

/** Kullanıcının seçtiği soruya amaç etiketi (basit kurallar). */
export function guessIntent(t: string, city?: string | null): "informational" | "comparison" | "purchase" | "local" {
  const s = t.toLocaleLowerCase("tr-TR");
  if (city && s.includes(city.toLocaleLowerCase("tr-TR"))) return "local";
  if (/yakın|near me|nearby|nerede|where/.test(s)) return "local";
  if (/fiyat|ucuz|kaç (tl|lira|para)|satın|nereden al|price|cheap|cost|buy|deal/.test(s)) return "purchase";
  if (/en iyi|hangisi|karşılaştır| vs |mı yoksa|veya|best|which|compare|versus/.test(s)) return "comparison";
  return "informational";
}
