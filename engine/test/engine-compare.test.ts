import { test } from "node:test";
import assert from "node:assert/strict";
import { engineComparison, sourcesByEngine } from "../src/insights.ts";

const row = (provider: string, id: string, rec: number, men: number, n = 8, target = false) => ({ provider, brand_id: id, brand_name: id, is_target: target, n, mentioned: men, recommended: rec });

test("Motor karşılaştırması: kulaklık pilot verisi (12 Kasım): küçük örneklemde fark 'large', 'clear' değil", () => {
  const rows = [row("openai", "A", 6, 6, 8, true), row("claude", "A", 6, 8, 8, true), row("openai", "E", 0, 0), row("claude", "E", 5, 5), row("openai", "C", 3, 3), row("claude", "C", 8, 8)];
  const out = engineComparison(rows);
  assert.equal(out[0].brandId, "A", "hedef marka önce");
  const a = out.find((x) => x.brandId === "A")!; assert.equal(a.gap, 0); assert.equal(a.level, "none");
  const e = out.find((x) => x.brandId === "E")!;
  assert.equal(e.level, "large"); assert.equal(e.high, "claude"); assert.equal(e.low, "openai"); assert.deepEqual(e.ignoredBy, ["openai"]);
  assert.ok(Math.abs(e.gap - 0.625) < 1e-9);
  assert.equal(out.find((x) => x.brandId === "C")!.level, "large", "3/8 ile 8/8 aralıkları hâlâ kesişiyor");
  // Öneri payı: ChatGPT'de A 6, C 3, E 0 → A 6/9; Claude'da 6+5+8=19 → C 8/19
  assert.ok(Math.abs(a.byEngine.openai.share - 6 / 9) < 1e-9);
  assert.ok(Math.abs(out.find((x) => x.brandId === "C")!.byEngine.claude.share - 8 / 19) < 1e-9);
  assert.equal(e.byEngine.openai.share, 0);
});

test("Motor karşılaştırması: yeterli örneklemde aralıklar ayrışınca 'clear'; tek motorda karşılaştırma yok", () => {
  const out = engineComparison([row("openai", "X", 2, 2, 40), row("claude", "X", 30, 30, 40), row("openai", "Y", 5, 5, 40)]);
  assert.equal(out.find((x) => x.brandId === "X")!.level, "clear");
  const y = out.find((x) => x.brandId === "Y")!; assert.equal(y.level, "none"); assert.equal(y.high, null);
  assert.deepEqual(engineComparison([row("openai", "Z", 0, 0), row("claude", "Z", 0, 0)])[0].ignoredBy, [], "kimse önermiyorsa 'görmezden geliyor' denmez");
});

test("Motor başına kaynaklar: yalnız o motorun baktığı siteler işaretlenir, aynı cevapta tekrar sayılmaz", () => {
  const s = sourcesByEngine([
    { provider: "openai", cited_urls: ["https://www.rtings.com/a", "https://rtings.com/b", "https://akakce.com/x"] },
    { provider: "claude", cited_urls: ["https://rtings.com/c", "https://technopat.net/y"] },
    { provider: "claude", cited_urls: null },
  ]);
  const o = s.find((x) => x.provider === "openai")!, c = s.find((x) => x.provider === "claude")!;
  assert.equal(c.answers, 2);
  assert.deepEqual(o.domains.find((d) => d.domain === "rtings.com"), { domain: "rtings.com", count: 1, only: false });
  assert.equal(o.domains.find((d) => d.domain === "akakce.com")!.only, true);
  assert.equal(c.domains.find((d) => d.domain === "technopat.net")!.only, true);
});
