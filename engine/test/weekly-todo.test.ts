import { test } from "node:test";
import assert from "node:assert/strict";
import { weeklyTodo } from "../src/insights.ts";

const prompts = [
  { prompt_text: "En iyi diş kliniği?", answers: 6, target_mentioned: 0, target_recommended: 0, top_competitor: "Klinik X", top_competitor_recs: 5 },
  { prompt_text: "İmplant fiyatları?", answers: 6, target_mentioned: 0, target_recommended: 0, top_competitor: "Klinik Y", top_competitor_recs: 2 },
  { prompt_text: "Antalya diş hekimi?", answers: 6, target_mentioned: 3, target_recommended: 0, top_competitor: null, top_competitor_recs: 0 },
  { prompt_text: "Ölçülmedi", answers: 0, target_mentioned: 0, target_recommended: 0, top_competitor: null, top_competitor_recs: 0 },
];

test("weeklyTodo: en çok kaybedilen soru önce, rakip sitesi kaynak olarak önerilmez", () => {
  const t = weeklyTodo({ prompts, opportunities: [{ domain: "klinikx.com", count: 9, own: true }, { domain: "rehber.com", count: 4, own: false }],
    fanout: [{ query: "antalya implant fiyat", count: 3 }],
    engines: [{ provider: "openai", rate: 0.5, n: 10 }, { provider: "claude", rate: 0.1, n: 10 }] });
  assert.equal(t[0].kind, "lost_question"); assert.match(t[0].title, /En iyi diş kliniği/); assert.match(t[0].detail, /Klinik X 5 kez/);
  assert.equal(t[1].kind, "source"); assert.match(t[1].title, /rehber\.com/);
  assert.equal(t[2].kind, "search_phrase");
  assert.equal(t[3].kind, "not_recommended"); assert.match(t[3].title, /Antalya diş hekimi/);
  assert.equal(t[4].kind, "engine_gap"); assert.match(t[4].title, /Claude/);
  assert.ok(t.length <= 5);
});

test("weeklyTodo: veri yoksa boş liste, uydurma iş yok", () => {
  assert.deepEqual(weeklyTodo({ prompts: [], opportunities: [] }), []);
});

test("weeklyTodo: küçük motor farkı ya da az örneklem iş üretmez; İngilizce metin", () => {
  const t = weeklyTodo({ lang: "en", prompts: [], opportunities: [], engines: [{ provider: "openai", rate: 0.5, n: 10 }, { provider: "claude", rate: 0.0, n: 3 }] });
  assert.equal(t.length, 0);
  const t2 = weeklyTodo({ lang: "en", prompts: [prompts[0]], opportunities: [] });
  assert.match(t2[0].title, /^Answer/);
});
