import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRecommendations, type RecInput } from "../src/recommendations.ts";

const base: RecInput = { brandName: "Marka A", website: "a.com", city: null, sector: null, aliases: ["A"], activePrompts: 12, completedRuns: 2, autoWeekly: true, measurementType: "live_search", prompts: [], audit: null };
const q = (t: string, men: number, rec = 0, comp: string | null = "Marka C") => ({ prompt_text: t, answers: 4, target_mentioned: men, target_recommended: rec, top_competitor: comp });

test("İyileştirme rehberi: motor tutarsızlığı, kaynak siteleri, yanlış ürün bilgisi ve Shopping kanıtla ve başarı ölçütüyle gelir", () => {
  const recs = buildRecommendations({ ...base,
    prompts: [q("Pil ömrü en uzun?", 0)],
    engineGap: { ignoredBy: ["openai"], high: "claude", highK: 5, highN: 8, level: "large" },
    opportunitySites: [{ domain: "rtings.com", count: 3 }, { domain: "technopat.net", count: 2 }],
    wrongClaims: [{ product: "Ürün A1", claim: "Pil 20 saat", fact: "ANC açıkken 30 saat" }],
    shoppingBehind: [{ product: "Ürün A1", ownPos: 7, rival: "Ürün B1", rivalPos: 2 }],
  });
  const by = (id: string) => recs.find((r) => r.id === id)!;
  assert.match(by("engine_gap").title, /ChatGPT sizi hiç anmıyor/);
  assert.match(by("engine_gap").why, /Claude sizi 8 cevabın 5 tanesinde/);
  assert.match(by("engine_gap").why, /Örneklem küçük/);
  assert.equal(by("engine_gap").priority, "orta", "aralıklar ayrışmadıkça yüksek değil");
  assert.match(by("source_sites").why, /rtings\.com \(3\)/);
  assert.equal(by("wrong_claims").priority, "yüksek");
  assert.match(by("wrong_claims").why, /Doğrusu: ANC açıkken 30 saat/);
  assert.match(by("shopping_behind").why, /7\. sıra.*2\. sıra/);
  for (const r of recs.filter((x) => ["engine_gap", "source_sites", "wrong_claims", "shopping_behind", "absent_prompts"].includes(x.id))) assert.ok(r.check, `${r.id} başarı ölçütü`);
});

test("İyileştirme rehberi: önceki ölçüme göre ilerleme (iyileşti / kötüleşti / aynı)", () => {
  const now = [q("S1", 2, 1), q("S2", 0), q("S3", 0)];
  const better = buildRecommendations({ ...base, prompts: now, previousPrompts: [q("S1", 0), q("S2", 0), q("S3", 0)] }).find((r) => r.id === "absent_prompts")!;
  assert.equal(better.progress!.status, "improved");
  const worse = buildRecommendations({ ...base, prompts: now, previousPrompts: [q("S1", 1), q("S2", 1), q("S3", 0)] }).find((r) => r.id === "absent_prompts")!;
  assert.equal(worse.progress!.status, "worse");
  const same = buildRecommendations({ ...base, prompts: now, previousPrompts: now }).find((r) => r.id === "absent_prompts")!;
  assert.equal(same.progress!.status, "same");
  assert.equal(buildRecommendations({ ...base, prompts: now }).find((r) => r.id === "absent_prompts")!.progress, undefined, "önceki ölçüm yoksa ilerleme yok");
});

test("İyileştirme rehberi: veri yoksa yeni maddeler çıkmaz; İngilizce metin", () => {
  const recs = buildRecommendations({ ...base, engineGap: { ignoredBy: [], high: "claude", highK: 3, highN: 8, level: "none" }, opportunitySites: [], wrongClaims: [], shoppingBehind: [] });
  assert.ok(!recs.some((r) => ["engine_gap", "source_sites", "wrong_claims", "shopping_behind"].includes(r.id)));
  const en = buildRecommendations({ ...base, lang: "en", engineGap: { ignoredBy: ["claude"], high: "openai", highK: 6, highN: 8, level: "clear" } });
  assert.equal(en.find((r) => r.id === "engine_gap")!.title, "Claude doesn't mention you at all");
  assert.equal(en.find((r) => r.id === "engine_gap")!.priority, "yüksek");
});
