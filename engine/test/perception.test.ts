import { test } from "node:test";
import assert from "node:assert/strict";
import { buildClassifyPrompt, parseLabels, parsePerception, classifyAnswer } from "../src/classify.ts";
import { perceptionSummary } from "../src/insights.ts";

const ANSWER = "Marka X is a premium option with excellent build quality. Marka Y is cheaper but less reliable.";

test("Algı istemi: hedef ve nitelik listesi yalnız istenince eklenir", () => {
  assert.ok(!buildClassifyPrompt(ANSWER, ["Marka X"]).includes("TARGET"));
  const p = buildClassifyPrompt(ANSWER, ["Marka X", "Marka Y"], "Marka X");
  assert.ok(p.includes('TARGET: "Marka X"') && p.includes("premium") && p.includes('"labels"'));
});

test("Etiketler: hem düz hem 'labels' altındaki biçim okunur", () => {
  assert.deepEqual(parseLabels('{"labels":{"Marka X":"recommended"},"perception":{}}', ["Marka X"]), { "Marka X": "recommended" });
  assert.deepEqual(parseLabels('{"Marka X":"neutral"}', ["Marka X"]), { "Marka X": "neutral" });
});

test("Algı: listede olmayan nitelik ve cevapta geçmeyen (uydurma) alıntı atılır; büyük/küçük harf ve tırnak farkı tolere edilir", () => {
  const out = parsePerception(JSON.stringify({ perception: { sentiment: "positive", traits: [
    { trait: "premium", quote: "a premium option" },
    { trait: "high_quality", quote: "EXCELLENT build quality" },
    { trait: "reliable", quote: "the most reliable brand ever" },
    { trait: "magical", quote: "premium" },
    { trait: "premium", quote: "premium option" },
  ] } }), ANSWER)!;
  assert.equal(out.sentiment, "positive");
  assert.deepEqual(out.traits.map((t) => t.trait), ["premium", "high_quality"]);
  assert.equal(parsePerception('{"perception":{"sentiment":"great","traits":[]}}', ANSWER), null);
  assert.equal(parsePerception("bozuk", ANSWER), null);
});

test("classifyAnswer: hedef verilince algı döner, maliyet hesaplanır", async () => {
  const body = { output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({ labels: { "Marka X": "recommended" }, perception: { sentiment: "positive", traits: [{ trait: "premium", quote: "a premium option" }] } }) }] }], usage: { input_tokens: 700, output_tokens: 150 } };
  const fetchFn = async () => new Response(JSON.stringify(body), { status: 200 });
  const r = await classifyAnswer({ apiKey: "k", model: "m", price: { inputPerMTok: 0.1, outputPerMTok: 0.5, perCall: 0.01, source: "" } as never, answer: ANSWER, names: ["Marka X"], target: "Marka X", fetchFn: fetchFn as never });
  assert.equal(r.labels["Marka X"], "recommended");
  assert.equal(r.perception!.traits[0].trait, "premium");
  assert.ok(r.costUsd > 0 && r.costUsd < 0.0005, "web araması ücreti eklenmez");
});

test("Algı özeti: duygu dağılımı, nitelik payı, motor bazında; okunamamış kayıt ve rakip satırı sayılmaz", () => {
  const answers = [{ id: "a1", provider: "openai" }, { id: "a2", provider: "openai" }, { id: "a3", provider: "claude" }, { id: "a4", provider: "claude" }];
  const P = (s: string, traits: [string, string][]) => ({ sentiment: s, traits: traits.map(([trait, quote]) => ({ trait, quote })) });
  const s = perceptionSummary(answers, [
    { response_id: "a1", brand_id: "T", perception: P("positive", [["premium", "q1"], ["reliable", "q2"]]) },
    { response_id: "a2", brand_id: "T", perception: P("mixed", [["premium", "q3"], ["expensive", "q4"]]) },
    { response_id: "a3", brand_id: "T", perception: P("negative", [["expensive", "q5"]]) },
    { response_id: "a4", brand_id: "T", perception: { failed: true } },
    { response_id: "a1", brand_id: "R", perception: P("positive", [["affordable", "x"]]) },
  ], "T");
  assert.equal(s.answers, 3);
  assert.deepEqual(s.sentiment, { positive: 1, neutral: 0, negative: 1, mixed: 1 });
  assert.deepEqual(s.traits.map((t) => [t.trait, t.count]), [["expensive", 2], ["premium", 2], ["reliable", 1]]);
  assert.deepEqual(s.traits.find((t) => t.trait === "expensive")!.byEngine, { openai: 1, claude: 1 });
  assert.deepEqual(s.byEngine.map((e) => [e.provider, e.answers, e.negative]), [["claude", 1, 1], ["openai", 2, 0]]);
});
