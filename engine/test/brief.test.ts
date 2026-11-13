import { test } from "node:test";
import assert from "node:assert/strict";
import { briefSites, buildBriefPrompt, parseBrief, writeBrief } from "../src/brief.ts";
import { processContentBriefs } from "../src/worker.ts";

const answers = [
  { provider: "openai", answer: "Kadıköy'de Kahve Durağı öneririm: sessiz, priz var, 4,7 puan.", cited: ["https://www.tripadvisor.com.tr/a", "https://kafemavi.com/x", "https://eksisozluk.com/b"] },
  { provider: "claude", answer: "Kahve Durağı ve Moda Kahve iyi seçenekler.", cited: ["https://www.tripadvisor.com.tr/c"] },
];

test("Plan siteleri: kendi site hariç, cevap sayısına göre sıralı", () => {
  assert.deepEqual(briefSites(answers, "kafemavi.com"), ["tripadvisor.com.tr", "eksisozluk.com"]);
});

test("Plan istemi: bilgi kartı ve cevaplar veri olarak, uydurma yasağı, dil", () => {
  const p = buildBriefPrompt({ brand: "Kafe Mavi", question: "Kadıköy'de çalışmak için kafe?", factCard: "Priz var", competitors: ["Kahve Durağı"], answers, lang: "tr" });
  assert.ok(p.includes("Write everything in Turkish") && p.includes("Never invent numbers") && p.includes("FACTS: <<<Priz var>>>") && p.includes("ANSWER 2 (claude)"));
});

test("Plan okuma: eksik plan reddedilir, doğrulama işareti varsayılan true", () => {
  assert.equal(parseBrief('{"title":"X","outline":["tek"]}', []), null);
  const b = parseBrief(JSON.stringify({ title: "Kadıköy'de çalışmak için sessiz kafe", angle: "Priz ve sessizlik", outline: ["Neden sessiz", "Priz ve internet"], mustInclude: [{ item: "Priz sayısı", verify: false }, { item: "Puan" }], faq: ["Wi-Fi var mı?"], winners: ["Kahve Durağı"] }), ["tripadvisor.com.tr"])!;
  assert.deepEqual(b.mustInclude, [{ item: "Priz sayısı", verify: false }, { item: "Puan", verify: true }]);
  assert.deepEqual(b.sites, ["tripadvisor.com.tr"]);
});

test("İşçi: cevap yoksa plan başarısız işaretlenir; varsa plan kaydedilir ve maliyet yazılır", async () => {
  const updates: Record<string, unknown>[] = []; const rpcs: string[] = [];
  const db = {
    rpc: async (fn: string) => { rpcs.push(fn); return { data: fn === "pending_content_briefs" ? [
      { brief_id: "A", workspace_id: "W", brand_id: "B", brand_name: "Kafe Mavi", website: "kafemavi.com", fact_card: null, prompt_text: "Soru?", lang: "tr", answers: [], competitors: [] },
      { brief_id: "C", workspace_id: "W", brand_id: "B", brand_name: "Kafe Mavi", website: "kafemavi.com", fact_card: "Priz var", prompt_text: "Soru 2?", lang: "tr", answers, competitors: ["Kahve Durağı"] },
    ] : null, error: null }; },
    from: () => ({ update: (row: Record<string, unknown>) => { updates.push(row); return { eq: async () => ({ data: null, error: null }) }; } }),
  };
  const body = { output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({ title: "Başlık", angle: "a", outline: ["H1", "H2"], mustInclude: [], faq: [], winners: ["Kahve Durağı"] }) }] }], usage: { input_tokens: 2500, output_tokens: 600 } };
  const out = await processContentBriefs({ db: db as never, env: { OPENAI_API_KEY: "k", ALLOW_PAID_API: "true" }, fetchFn: (async () => new Response(JSON.stringify(body))) as never });
  assert.deepEqual([out.done, out.failed], [1, 1]);
  assert.equal(updates[0].status, "failed");
  assert.equal(updates[1].status, "done");
  assert.ok((updates[1].cost_usd as number) < 0.002);
  assert.ok(rpcs.includes("record_aux_call"));
});
