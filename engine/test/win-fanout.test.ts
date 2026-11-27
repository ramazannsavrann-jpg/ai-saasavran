import { test } from "node:test";
import assert from "node:assert/strict";
import { winRates, fanoutQueries } from "../src/insights.ts";

test("winRates: yalnız 1. sırada ÖNERİLEN cevap kazanma sayılır", () => {
  const answers = [{ id: "a1", provider: "openai" }, { id: "a2", provider: "openai" }, { id: "a3", provider: "claude" }, { id: "a4", provider: "claude" }];
  const mentions = [
    { response_id: "a1", brand_id: "us", recommended: true, rank: 1 },
    { response_id: "a1", brand_id: "r1", recommended: true, rank: 2 },
    { response_id: "a2", brand_id: "us", recommended: false, rank: 1 }, // önerilmedi → kazanma değil
    { response_id: "a2", brand_id: "r1", recommended: true, rank: 2 },
    { response_id: "a3", brand_id: "r1", recommended: true, rank: 1 },
    { response_id: "a4", brand_id: "us", recommended: true, rank: 1 },
    { response_id: "x9", brand_id: "us", recommended: true, rank: 1 }, // başka ölçümün cevabı → sayılmaz
  ];
  const r = winRates(answers, mentions, [{ id: "us", name: "Biz", isTarget: true }, { id: "r1", name: "Rakip", isTarget: false }]);
  const us = r.brands.find((b) => b.brandId === "us")!;
  assert.equal(us.wins, 2); assert.equal(us.n, 4); assert.equal(us.rate, 0.5);
  assert.ok(us.low < 0.5 && us.high > 0.5);
  assert.equal(r.brands.find((b) => b.brandId === "r1")!.wins, 1);
  assert.deepEqual(r.targetByEngine.find((e) => e.provider === "openai"), { provider: "openai", wins: 1, n: 2, rate: 0.5 });
  assert.deepEqual(r.targetByEngine.find((e) => e.provider === "claude"), { provider: "claude", wins: 1, n: 2, rate: 0.5 });
});

test("winRates: cevap yoksa oran 0, bölme hatası yok", () => {
  const r = winRates([], [], [{ id: "us", name: "Biz", isTarget: true }]);
  assert.equal(r.brands[0].rate, 0); assert.equal(r.brands[0].n, 0);
});

test("fanoutQueries: büyük/küçük harf ve boşluk farkı tek ifade, aynı cevapta tekrar bir kez", () => {
  const r = fanoutQueries([
    { provider: "openai", search_queries: ["best CRM 2026", "Best  crm 2026", "crm pricing"] },
    { provider: "claude", search_queries: ["best crm 2026"] },
    { provider: "claude", search_queries: [] },
    { provider: "perplexity", search_queries: null },
  ]);
  assert.equal(r.answers, 4); assert.equal(r.searched, 2);
  assert.equal(r.rows[0].count, 2); assert.deepEqual(r.rows[0].engines, ["claude", "openai"]);
  assert.equal(r.rows.length, 2);
  assert.deepEqual(r.byEngine.find((e) => e.provider === "claude"), { provider: "claude", answers: 2, searched: 1 });
});
