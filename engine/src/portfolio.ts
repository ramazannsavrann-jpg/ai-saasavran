// Ajans panosu: markaların son ölçümünü bir öncekiyle karşılaştırıp durum verir.
// "Düştü/yükseldi" yalnız güven aralıkları örtüşmüyorsa söylenir; küçük örneklemde karar verilmez.
export interface PortfolioRate { value: number; low: number; high: number; k: number; n: number }
export interface PortfolioPoint { at: string; recommend: PortfolioRate }
export type PortfolioStatus = "dropped" | "none" | "few_samples" | "new" | "steady" | "rose";

export const PORTFOLIO_MIN_SAMPLE = 20;
const ORDER: PortfolioStatus[] = ["dropped", "none", "few_samples", "new", "steady", "rose"];

export function portfolioStatus(prev: PortfolioPoint | null, last: PortfolioPoint | null, minSample = PORTFOLIO_MIN_SAMPLE): PortfolioStatus {
  if (!last) return "none";
  if (last.recommend.n < minSample) return "few_samples";
  if (!prev || prev.recommend.n < minSample) return "new";
  if (last.recommend.high < prev.recommend.low) return "dropped";
  if (last.recommend.low > prev.recommend.high) return "rose";
  return "steady";
}

export interface PortfolioRow {
  id: string; name: string; last: PortfolioPoint | null; prev: PortfolioPoint | null;
  /** Önerilme oranındaki değişim, yüzde puanı (örn. -12). Önceki ölçüm yoksa null. */
  deltaPp: number | null; status: PortfolioStatus;
}

export function portfolioRows(items: { id: string; name: string; points: PortfolioPoint[] }[], minSample = PORTFOLIO_MIN_SAMPLE): PortfolioRow[] {
  const rows = items.map((it) => {
    const pts = [...it.points].sort((a, b) => a.at.localeCompare(b.at));
    const last = pts.at(-1) ?? null;
    const prev = pts.length > 1 ? pts[pts.length - 2] : null;
    const deltaPp = last && prev ? Math.round((last.recommend.value - prev.recommend.value) * 100) : null;
    return { id: it.id, name: it.name, last, prev, deltaPp, status: portfolioStatus(prev, last, minSample) };
  });
  return rows.sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || a.name.localeCompare(b.name, "tr"));
}
