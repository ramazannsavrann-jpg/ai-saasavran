import { test } from "node:test";
import assert from "node:assert/strict";
import { campaignFor, campaignTasks, taskProgress } from "../src/campaign.ts";
import { buildRecommendations, type RecInput } from "../src/recommendations.ts";

const base: RecInput = {
  brandName: "Marka", website: "marka.com", city: null, sector: null, aliases: [], activePrompts: 12, completedRuns: 2,
  autoWeekly: true, measurementType: "live_search", audit: null, lang: "tr",
  prompts: [
    { prompt_text: "En iyi X hangisi?", answers: 4, target_mentioned: 0, target_recommended: 0, top_competitor: "Rakip A" },
    { prompt_text: "Ucuz X?", answers: 4, target_mentioned: 0, target_recommended: 0, top_competitor: "Rakip B" },
    { prompt_text: "X önerir misin?", answers: 4, target_mentioned: 2, target_recommended: 0, top_competitor: "Rakip A" },
    { prompt_text: "Premium X?", answers: 4, target_mentioned: 3, target_recommended: 2, top_competitor: null },
  ],
  opportunitySites: [{ domain: "rehber.com", count: 3 }, { domain: "liste.net", count: 2 }],
  wrongClaims: [{ product: "Model 1", claim: "pil 4000 mAh", fact: "5000 mAh" }],
};

test("Kampanya: anılmadığınız sorular için soru başına sayfa görevi ve rakip ipucu", () => {
  const t = campaignTasks("absent_prompts", base)!;
  assert.ok(t[0].includes("En iyi X hangisi?") && t[1].includes("Ucuz X?"));
  assert.ok(t.some((x) => x.includes("Rakip A ve Rakip B")));
  assert.ok(t.length <= 8);
});

test("Kampanya: kaynak siteleri ve yanlış bilgi verisi görevlere girer; İngilizce çalışır", () => {
  assert.ok(campaignTasks("source_sites", base)![0].includes("rehber.com"));
  assert.ok(campaignTasks("wrong_claims", base)![0].includes('"pil 4000 mAh"') && campaignTasks("wrong_claims", base)![0].includes("5000 mAh"));
  assert.match(campaignTasks("source_sites", { ...base, lang: "en" })![0], /^Contact rehber\.com/);
});

test("Kampanya: ayar maddeleri ve verisi olmayan maddeler kampanya değildir", () => {
  for (const id of ["more_prompts", "weekly", "aliases", "no_website", "model_knowledge_note"]) assert.equal(campaignTasks(id, base), null, id);
  assert.equal(campaignTasks("shopping_behind", base), null);
  assert.equal(campaignTasks("engine_gap", base), null);
});

test("Kampanya: rehberin ürettiği her veri maddesi için görev listesi çıkar; site kontrolü maddesi doğrulama görevi alır", () => {
  const recs = buildRecommendations(base);
  const withTasks = recs.filter((r) => campaignFor(r, base));
  assert.deepEqual(withTasks.map((r) => r.id).sort(), ["absent_prompts", "mentioned_not_recommended", "source_sites", "wrong_claims"]);
  const a = campaignFor({ id: "audit_faq", action: "SSS ekleyin" }, base)!;
  assert.equal(a.length, 2); assert.equal(a[0], "SSS ekleyin");
});

test("Görev ilerlemesi", () => {
  assert.deepEqual(taskProgress([{ t: "a", done: true }, { t: "b", done: false }]), { done: 1, total: 2 });
  assert.deepEqual(taskProgress(null), { done: 0, total: 0 });
});
