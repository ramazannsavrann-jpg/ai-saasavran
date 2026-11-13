// Yapay zekâ kaynak ağı: hangi siteyi hangi motorlar kaynak gösteriyor ve o sitenin geçtiği cevaplarda hangi markalar öneriliyor.
// Rol etiketleri: "shared" (en az iki motorun ortak kaynağı), "rival" (rakibin kalesi: o sitenin cevaplarında rakip öneriliyor, siz hiç),
// "yours" (sizin kaleniz), "neutral". API çağrısı yok.
import { siteKey, type InsightBrand } from "./insights.ts";

export interface NetAnswer { id: string; provider: string; cited_urls: string[] | null }
export interface NetMention { response_id: string; brand_id: string; recommended: boolean }
export interface NetSource {
  domain: string; answers: number; engines: string[];
  brands: { id: string; name: string; isTarget: boolean; count: number }[];
  role: "rival" | "yours" | "shared" | "neutral";
}

export function sourceNetwork(answers: NetAnswer[], mentions: NetMention[], brands: InsightBrand[], limit = 10): NetSource[] {
  const recBy = new Map<string, Set<string>>();
  for (const m of mentions) if (m.recommended) { const s = recBy.get(m.response_id) ?? new Set<string>(); s.add(m.brand_id); recBy.set(m.response_id, s); }
  const rows = new Map<string, { answers: number; engines: Set<string>; rec: Map<string, number> }>();
  for (const a of answers) {
    for (const d of new Set((a.cited_urls ?? []).map(siteKey).filter(Boolean) as string[])) {
      const r = rows.get(d) ?? { answers: 0, engines: new Set<string>(), rec: new Map<string, number>() };
      r.answers++; r.engines.add(a.provider);
      for (const b of recBy.get(a.id) ?? []) r.rec.set(b, (r.rec.get(b) ?? 0) + 1);
      rows.set(d, r);
    }
  }
  const target = brands.find((b) => b.isTarget);
  return [...rows.entries()].map(([domain, r]) => {
    const bs = brands.map((b) => ({ id: b.id, name: b.name, isTarget: b.isTarget, count: r.rec.get(b.id) ?? 0 })).filter((x) => x.count > 0)
      .sort((x, y) => y.count - x.count || x.name.localeCompare(y.name));
    const t = target ? r.rec.get(target.id) ?? 0 : 0;
    const comp = Math.max(0, ...bs.filter((b) => !b.isTarget).map((b) => b.count));
    const role: NetSource["role"] = r.answers >= 2 && t === 0 && comp / r.answers >= 0.5 ? "rival"
      : r.answers >= 2 && t / r.answers >= 0.5 ? "yours" : r.engines.size >= 2 ? "shared" : "neutral";
    return { domain, answers: r.answers, engines: [...r.engines].sort(), brands: bs, role };
  }).sort((x, y) => y.engines.length - x.engines.length || y.answers - x.answers || x.domain.localeCompare(y.domain)).slice(0, limit);
}
