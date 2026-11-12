import { test } from "node:test";
import assert from "node:assert/strict";
import { visibilityForecast } from "../src/insights.ts";

const day = (d: number) => new Date(Date.UTC(2026, 9, 1) + d * 86_400_000).toISOString();

test("Tahmin: az ölçümde veya kısa sürede tahmin yok", () => {
  assert.equal(visibilityForecast([{ at: day(0), k: 2, n: 10 }, { at: day(7), k: 3, n: 10 }, { at: day(14), k: 4, n: 10 }]), null, "3 ölçüm yetmez");
  assert.equal(visibilityForecast([0, 2, 4, 6].map((d) => ({ at: day(d), k: 3, n: 10 }))), null, "6 gün yetmez");
});

test("Tahmin: düzenli artışta 'up', değer aralık içinde ve 0–1 arasında", () => {
  const pts = [0, 7, 14, 21, 28, 35].map((d, i) => ({ at: day(d), k: 10 + i * 6, n: 100 }));
  const f = visibilityForecast(pts)!;
  assert.equal(f.trend, "up"); assert.ok(f.perWeek > 0.05 && f.perWeek < 0.07);
  assert.ok(f.low <= f.value && f.value <= f.high && f.high <= 1 && f.low >= 0);
  assert.ok(f.value > 0.4, "eğilim sürerse 30 gün sonra daha yüksek");
});

test("Tahmin: gürültülü ve düz seride 'flat'; küçük örneklemde aralık geniş", () => {
  const f = visibilityForecast([0, 7, 14, 21, 28].map((d, i) => ({ at: day(d), k: [3, 5, 2, 4, 3][i], n: 8 })))!;
  assert.equal(f.trend, "flat");
  assert.ok(f.high - f.low > 0.3, "8 cevaplık ölçümlerde aralık geniş olmalı");
});
