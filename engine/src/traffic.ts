// Yapay zekâdan gelen ziyaretçi: günlük sayaçlardan özet. API çağrısı yok.
export type AiSource = "chatgpt" | "perplexity" | "gemini" | "claude" | "copilot" | "deepseek" | "grok" | "meta" | "other_ai";
export interface VisitRow { day: string; source: AiSource; path: string; visits: number }
export interface TrafficSummary {
  last30: number; prev30: number;
  bySource: { source: AiSource; visits: number; share: number }[];
  topPages: { path: string; visits: number }[];
  /** Son 8 hafta, eskiden yeniye (hafta = bugünden geriye 7 günlük dilimler) */
  weekly: { start: string; visits: number }[];
}
const dayMs = 86_400_000;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

export function trafficSummary(rows: VisitRow[], today: string): TrafficSummary {
  const t0 = Date.parse(today + "T00:00:00Z");
  const age = (d: string) => Math.round((t0 - Date.parse(d + "T00:00:00Z")) / dayMs);
  const cur = rows.filter((r) => age(r.day) >= 0 && age(r.day) < 30), prev = rows.filter((r) => age(r.day) >= 30 && age(r.day) < 60);
  const sum = (rs: VisitRow[]) => rs.reduce((a, r) => a + r.visits, 0);
  const last30 = sum(cur);
  const bs = new Map<AiSource, number>(), pg = new Map<string, number>();
  for (const r of cur) { bs.set(r.source, (bs.get(r.source) ?? 0) + r.visits); pg.set(r.path, (pg.get(r.path) ?? 0) + r.visits); }
  const weekly = Array.from({ length: 8 }, (_, i) => {
    const from = 7 * (7 - i) + 6, to = 7 * (7 - i);
    return { start: iso(t0 - from * dayMs), visits: sum(rows.filter((r) => age(r.day) <= from && age(r.day) >= to)) };
  });
  return {
    last30, prev30: sum(prev),
    bySource: [...bs.entries()].map(([source, visits]) => ({ source, visits, share: last30 ? visits / last30 : 0 })).sort((a, b) => b.visits - a.visits || a.source.localeCompare(b.source)),
    topPages: [...pg.entries()].map(([path, visits]) => ({ path, visits })).sort((a, b) => b.visits - a.visits || a.path.localeCompare(b.path)).slice(0, 8),
    weekly,
  };
}

/** Ölçtüğümüz motorla eşleşen kaynak (görünürlük ile ziyaretçiyi yan yana koymak için). */
export const SOURCE_PROVIDER: Partial<Record<AiSource, string>> = { chatgpt: "openai", gemini: "gemini", claude: "claude", perplexity: "perplexity" };

export function snippet(trackKey: string, site = "https://aisaasavran.com"): string {
  return `<script async src="${site}/t.js" data-site="${trackKey}"></script>`;
}
