// Ham sayımlardan rapor metrikleri. Güven aralığı motorla aynı fonksiyondan gelir.
import { wilson } from "../../../engine/src/metrics.ts";
import type { VisRow } from "./data";

export interface Rate { value: number; low: number; high: number; k: number; n: number }
const rate = (k: number, n: number): Rate => ({ value: n ? k / n : 0, ...wilson(k, n), k, n });

export interface RunPoint {
  runId: string; at: string; providers: string[];
  mention: Rate; recommend: Rate; cite: Rate; share: number;
}
export interface CompetitorStat { brandId: string; name: string; isTarget: boolean; recommend: Rate; mention: Rate; share: number }

export const MIN_SAMPLE = 20;

/** Her ölçüm (run) için hedef markanın oranları ve önerilerdeki payı. */
export function series(rows: VisRow[]): RunPoint[] {
  const byRun = new Map<string, VisRow[]>();
  for (const r of rows) byRun.set(r.run_id, [...(byRun.get(r.run_id) ?? []), r]);
  return [...byRun.entries()].map(([runId, rs]) => {
    const target = rs.filter((r) => r.is_target);
    const n = target.reduce((a, r) => a + r.n, 0);
    const sum = (f: (r: VisRow) => number) => target.reduce((a, r) => a + f(r), 0);
    const allRecs = rs.reduce((a, r) => a + r.recommended, 0);
    return {
      runId, at: rs[0].run_at, providers: [...new Set(rs.map((r) => r.provider))],
      mention: rate(sum((r) => r.mentioned), n),
      recommend: rate(sum((r) => r.recommended), n),
      cite: rate(sum((r) => r.cited), n),
      share: allRecs ? sum((r) => r.recommended) / allRecs : 0,
    };
  }).sort((a, b) => a.at.localeCompare(b.at));
}

/** Son ölçümde markaların karşılaştırması. */
export function competitorsInRun(rows: VisRow[], runId: string): CompetitorStat[] {
  const rs = rows.filter((r) => r.run_id === runId);
  const byBrand = new Map<string, VisRow[]>();
  for (const r of rs) byBrand.set(r.brand_id, [...(byBrand.get(r.brand_id) ?? []), r]);
  const allRecs = rs.reduce((a, r) => a + r.recommended, 0);
  return [...byBrand.entries()].map(([brandId, b]) => {
    const n = b.reduce((a, r) => a + r.n, 0);
    const rec = b.reduce((a, r) => a + r.recommended, 0);
    return {
      brandId, name: b[0].brand_name, isTarget: b[0].is_target,
      recommend: rate(rec, n), mention: rate(b.reduce((a, r) => a + r.mentioned, 0), n),
      share: allRecs ? rec / allRecs : 0,
    };
  }).sort((a, b) => b.recommend.value - a.recommend.value || (a.isTarget ? -1 : 1));
}

export const pct = (v: number) => `%${Math.round(v * 100)}`;
export const rangeText = (r: Rate) => `${pct(r.low)}–${pct(r.high)}`;

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}
export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** Sayıya Türkçe bulunma eki: 2'sinde, 3'ünde, 10'unda, 0'ında. Okunuştaki son kelimeye göre. */
const UNITS = ["ında", "inde", "sinde", "ünde", "ünde", "inde", "sında", "sinde", "inde", "unda"];
const TENS = ["", "unda", "sinde", "unda", "ında", "sinde", "ında", "inde", "inde", "ında"];
export function numLoc(n: number): string {
  const sfx = n === 0 ? UNITS[0] : n % 10 ? UNITS[n % 10] : n % 100 ? TENS[(n % 100) / 10] : n % 1000 ? "ünde" : "inde";
  return `${n}'${sfx}`;
}

export const usd = (v: number) => `${v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;
export const providerLabel = (p: string) => (p === "mock" ? "simülasyon" : p === "gemini" ? "Gemini" : p === "openai" ? "ChatGPT (OpenAI)" : p);

/** Cevaplarda kaynak gösterilen alan adları, en çok gösterilenden aza. */
export function topDomains(urls: string[], limit = 10): { domain: string; count: number }[] {
  const m = new Map<string, number>();
  for (const u of urls) {
    try { const d = new URL(u).hostname.replace(/^www\./, ""); m.set(d, (m.get(d) ?? 0) + 1); } catch { /* geçersiz adres */ }
  }
  return [...m.entries()].map(([domain, count]) => ({ domain, count })).sort((a, b) => b.count - a.count).slice(0, limit);
}
