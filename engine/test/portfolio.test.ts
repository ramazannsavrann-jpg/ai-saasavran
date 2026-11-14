import assert from "node:assert/strict";
import { test } from "node:test";
import { portfolioRows, portfolioStatus, type PortfolioPoint } from "../src/portfolio.ts";

const pt = (at: string, k: number, n: number, low: number, high: number): PortfolioPoint => ({ at, recommend: { value: n ? k / n : 0, low, high, k, n } });

test("portföy: aralıklar örtüşmüyorsa düştü/yükseldi, örtüşüyorsa sabit", () => {
  const a = pt("2026-11-01", 12, 20, 0.39, 0.78);
  assert.equal(portfolioStatus(a, pt("2026-11-08", 2, 20, 0.03, 0.30)), "dropped");
  assert.equal(portfolioStatus(pt("2026-11-01", 2, 20, 0.03, 0.30), pt("2026-11-08", 12, 20, 0.39, 0.78)), "rose");
  assert.equal(portfolioStatus(a, pt("2026-11-08", 9, 20, 0.26, 0.66)), "steady");
});

test("portföy: ölçüm yok, az örnek ve ilk ölçüm ayrı durumlar", () => {
  assert.equal(portfolioStatus(null, null), "none");
  assert.equal(portfolioStatus(null, pt("2026-11-08", 1, 5, 0.04, 0.62)), "few_samples");
  assert.equal(portfolioStatus(null, pt("2026-11-08", 5, 20, 0.12, 0.47)), "new");
  assert.equal(portfolioStatus(pt("2026-11-01", 1, 5, 0, 0.6), pt("2026-11-08", 5, 20, 0.12, 0.47)), "new", "önceki örnek az: karşılaştırma yok");
});

test("portföy: sıra düşenler önce, değişim puan olarak, ölçümler tarihe göre", () => {
  const rows = portfolioRows([
    { id: "1", name: "Yükselen", points: [pt("2026-11-01", 2, 20, 0.03, 0.30), pt("2026-11-08", 12, 20, 0.39, 0.78)] },
    { id: "2", name: "Düşen", points: [pt("2026-11-08", 2, 20, 0.03, 0.30), pt("2026-11-01", 12, 20, 0.39, 0.78)] },
    { id: "3", name: "Yeni", points: [] },
  ]);
  assert.deepEqual(rows.map((r) => r.id), ["2", "3", "1"]);
  assert.equal(rows[0].deltaPp, -50);
  assert.equal(rows[1].deltaPp, null);
  assert.equal(rows[2].deltaPp, 50);
});
