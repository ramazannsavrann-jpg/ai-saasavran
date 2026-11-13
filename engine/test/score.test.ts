import { test } from "node:test";
import assert from "node:assert/strict";
import { visibilityScore, scoreChange, engineScoreChanges, SCORE_WEIGHTS } from "../src/insights.ts";

test("Skor: ağırlıklar toplamı 100; her şey tamsa 100, hiçbiri yoksa 0", () => {
  assert.equal(Object.values(SCORE_WEIGHTS).reduce((a, b) => a + b, 0), 100);
  const full = visibilityScore({ recommend: { k: 40, n: 40 }, mention: { k: 40, n: 40 }, share: 1, cite: { k: 40, n: 40 } })!;
  assert.equal(full.score, 100);
  const zero = visibilityScore({ recommend: { k: 0, n: 40 }, mention: { k: 0, n: 40 }, share: 0, cite: { k: 0, n: 40 } })!;
  assert.equal(zero.score, 0); assert.equal(zero.low, 0); assert.ok(zero.high > 0, "0/40 bile kesin sıfır değildir");
});

test("Skor: elle hesap ile aynı; parçaların puanları skoru verir", () => {
  // 0.5*45 + 0.75*20 + 0.4*20 + 0.25*15 = 22.5 + 15 + 8 + 3.75 = 49.25
  const s = visibilityScore({ recommend: { k: 20, n: 40 }, mention: { k: 30, n: 40 }, share: 0.4, cite: { k: 10, n: 40 } })!;
  assert.equal(s.score, 49);
  assert.ok(Math.abs(s.parts.reduce((a, p) => a + p.points, 0) - 49.25) < 0.2);
  assert.ok(s.low < s.score && s.score < s.high);
  assert.equal(s.lowSample, false);
});

test("Skor: aramasız ölçümde kaynak bileşeni yok, ağırlık oransal dağıtılır (sıfır sayılmaz)", () => {
  const s = visibilityScore({ recommend: { k: 20, n: 40 }, mention: { k: 30, n: 40 }, share: 0.4, cite: null })!;
  assert.equal(s.citeMissing, true);
  assert.equal(s.parts.length, 3);
  // (22.5 + 15 + 8) / 85 * 100 = 53.5
  assert.equal(s.score, 54);
  assert.ok(Math.abs(s.parts.reduce((a, p) => a + p.weight, 0) - 100) < 0.3);
});

test("Skor: veri yoksa null; küçük örneklemde uyarı ve geniş aralık", () => {
  assert.equal(visibilityScore({ recommend: { k: 0, n: 0 }, mention: { k: 0, n: 0 }, share: 0, cite: null }), null);
  const small = visibilityScore({ recommend: { k: 2, n: 5 }, mention: { k: 3, n: 5 }, share: 0.3, cite: null })!;
  const big = visibilityScore({ recommend: { k: 40, n: 100 }, mention: { k: 60, n: 100 }, share: 0.3, cite: null })!;
  assert.equal(small.lowSample, true);
  assert.ok(small.high - small.low > big.high - big.low);
});

test("Skor farkı: en çok değişen bileşen ve oynaklık kontrolü", () => {
  const a = visibilityScore({ recommend: { k: 10, n: 100 }, mention: { k: 30, n: 100 }, share: 0.2, cite: null });
  const b = visibilityScore({ recommend: { k: 50, n: 100 }, mention: { k: 32, n: 100 }, share: 0.22, cite: null });
  const c = scoreChange(a, b)!;
  assert.ok(c.delta > 15); assert.equal(c.withinNoise, false); assert.equal(c.topPart!.key, "recommend");
  const tiny = scoreChange(visibilityScore({ recommend: { k: 2, n: 8 }, mention: { k: 3, n: 8 }, share: 0.2, cite: null }),
    visibilityScore({ recommend: { k: 3, n: 8 }, mention: { k: 3, n: 8 }, share: 0.25, cite: null }))!;
  assert.equal(tiny.withinNoise, true, "8 cevaplık iki ölçüm arasındaki küçük fark oynaklıktır");
  assert.equal(scoreChange(null, b), null);
});

test("Motor farkları: en büyük değişen motor ilk sırada, tek ölçümlü motor listede yok", () => {
  const s = (k: number) => ({ recommend: { k, n: 40 }, mention: { k, n: 40 }, share: 0.3, cite: null });
  const out = engineScoreChanges([
    { provider: "openai", prev: s(10), now: s(12) },
    { provider: "claude", prev: s(5), now: s(25) },
    { provider: "gemini", prev: null, now: s(20) },
  ]);
  assert.deepEqual(out.map((e) => e.provider), ["claude", "openai"]);
  assert.ok(out[0].change.delta > 0);
});
