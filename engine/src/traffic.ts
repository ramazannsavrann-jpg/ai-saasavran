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

// ---------------- Yapay zekâ botları ----------------
export type BotKind = "search" | "user" | "training";
/** functions/api/_bot-lib.js'teki listeyle aynı (test eşitliği kontrol eder). */
export const BOT_META: Record<string, { owner: string; kind: BotKind }> = {
  "OAI-SearchBot": { owner: "OpenAI", kind: "search" }, "ChatGPT-User": { owner: "OpenAI", kind: "user" }, GPTBot: { owner: "OpenAI", kind: "training" },
  "Claude-SearchBot": { owner: "Anthropic", kind: "search" }, "Claude-User": { owner: "Anthropic", kind: "user" }, ClaudeBot: { owner: "Anthropic", kind: "training" },
  PerplexityBot: { owner: "Perplexity", kind: "search" }, "Perplexity-User": { owner: "Perplexity", kind: "user" },
  "Google-CloudVertexBot": { owner: "Google", kind: "user" }, Applebot: { owner: "Apple", kind: "search" }, Bingbot: { owner: "Microsoft", kind: "search" },
  DuckAssistBot: { owner: "DuckDuckGo", kind: "search" }, "MistralAI-User": { owner: "Mistral", kind: "user" },
  "meta-externalfetcher": { owner: "Meta", kind: "user" }, "meta-externalagent": { owner: "Meta", kind: "training" },
  Amazonbot: { owner: "Amazon", kind: "training" }, Bytespider: { owner: "ByteDance", kind: "training" }, CCBot: { owner: "Common Crawl", kind: "training" },
};
/** Görünürlük için en önemli arama botları: hiç gelmiyorsa uyarı. */
export const KEY_SEARCH_BOTS = ["OAI-SearchBot", "Claude-SearchBot", "PerplexityBot"];

export interface BotRow { day: string; bot: string; path: string; hits: number; verified: number; errors: number }
export interface BotSummary {
  total: number;
  bots: { bot: string; owner: string; kind: BotKind; hits: number; verified: number; errors: number; last: string }[];
  topPages: { path: string; hits: number }[];
  errors: number;
  missingSearch: string[];
}
export function botSummary(rows: BotRow[], today: string): BotSummary {
  const t0 = Date.parse(today + "T00:00:00Z");
  const cur = rows.filter((r) => { const a = (t0 - Date.parse(r.day + "T00:00:00Z")) / 86_400_000; return a >= 0 && a < 30; });
  const by = new Map<string, BotSummary["bots"][number]>(), pg = new Map<string, number>();
  for (const r of cur) {
    const m = BOT_META[r.bot] ?? { owner: "?", kind: "training" as BotKind };
    const b = by.get(r.bot) ?? { bot: r.bot, owner: m.owner, kind: m.kind, hits: 0, verified: 0, errors: 0, last: r.day };
    b.hits += r.hits; b.verified += r.verified; b.errors += r.errors; if (r.day > b.last) b.last = r.day;
    by.set(r.bot, b); pg.set(r.path, (pg.get(r.path) ?? 0) + r.hits);
  }
  const bots = [...by.values()].sort((a, b) => b.hits - a.hits || a.bot.localeCompare(b.bot));
  return {
    total: bots.reduce((a, b) => a + b.hits, 0), bots,
    topPages: [...pg.entries()].map(([path, hits]) => ({ path, hits })).sort((a, b) => b.hits - a.hits || a.path.localeCompare(b.path)).slice(0, 8),
    errors: bots.reduce((a, b) => a + b.errors, 0),
    missingSearch: cur.length ? KEY_SEARCH_BOTS.filter((k) => !by.has(k)) : [],
  };
}

export function workerCode(trackKey: string): string {
  return `// Cloudflare > Workers > Create > bu kodu yapıştırın, sonra sitenize "Route" ekleyin (örn. siteniz.com/*)
const SITE_KEY = "${trackKey}";
const BOT_RE = /OAI-SearchBot|ChatGPT-User|GPTBot|Claude-SearchBot|Claude-User|ClaudeBot|anthropic-ai|PerplexityBot|Perplexity-User|Google-CloudVertexBot|Applebot|bingbot|DuckAssistBot|MistralAI-User|meta-external|Amazonbot|Bytespider|CCBot/i;
export default {
  async fetch(request, env, ctx) {
    const res = await fetch(request);
    const ua = request.headers.get("user-agent") || "";
    if (BOT_RE.test(ua)) ctx.waitUntil(fetch("https://aisaasavran.com/api/ai-bot", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ k: SITE_KEY, ua: ua.slice(0, 500), ip: request.headers.get("cf-connecting-ip") || "", path: new URL(request.url).pathname, status: res.status }) }).catch(() => {}));
    return res;
  },
};`;
}

// ---------------- Görünürlük × ziyaretçi ----------------
export interface WeekPair { start: string; visits: number; rate: number | null; n: number }
/**
 * Son 8 hafta: o haftadaki ziyaret (bu kaynaktan) ve o haftadaki ölçümlerin önerilme oranı (k/n birleşik; ölçüm yoksa null).
 * Neden-sonuç iddiası yok; yalnız yan yana gösterim. `aligned`: en az 4 haftada ikisi de varsa iki serinin aynı yönde
 * hareket ettiği hafta geçişlerinin payı.
 */
export function visibilityVsVisits(points: { at: string; recommend: { k: number; n: number } }[], visits: VisitRow[], source: AiSource, today: string): { weeks: WeekPair[]; aligned: number | null } {
  const t0 = Date.parse(today + "T00:00:00Z"), day = 86_400_000;
  const age = (iso: string) => Math.floor((t0 - Date.parse(iso.slice(0, 10) + "T00:00:00Z")) / day);
  const weeks: WeekPair[] = Array.from({ length: 8 }, (_, i) => {
    const from = 7 * (7 - i) + 6, to = 7 * (7 - i);
    const inW = (a: number) => a <= from && a >= to;
    const ps = points.filter((p) => inW(age(p.at)));
    const k = ps.reduce((a, p) => a + p.recommend.k, 0), n = ps.reduce((a, p) => a + p.recommend.n, 0);
    return { start: new Date(t0 - from * day).toISOString().slice(0, 10), visits: visits.filter((v) => v.source === source && inW(age(v.day))).reduce((a, v) => a + v.visits, 0), rate: n ? k / n : null, n };
  });
  const both = weeks.filter((w) => w.rate !== null);
  let same = 0, steps = 0;
  for (let i = 1; i < both.length; i++) {
    const dr = both[i].rate! - both[i - 1].rate!, dv = both[i].visits - both[i - 1].visits;
    if (dr === 0 && dv === 0) continue;
    steps++; if (Math.sign(dr) === Math.sign(dv)) same++;
  }
  return { weeks, aligned: both.length >= 4 && steps >= 3 ? same / steps : null };
}
