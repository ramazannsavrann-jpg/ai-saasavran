import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRecoveryEmail } from "../src/recovery.ts";

test("Telafi e-postası: TR/EN, gerçek sayılar, bağlantı, HTML kaçışı", () => {
  const rows = [{ provider: "openai", answers: 2, mentioned: 1, recommended: 0 }, { provider: "gemini", answers: 0, mentioned: 0, recommended: 0 }];
  const tr = buildRecoveryEmail("tr", { id: "b1", name: "Bob<gym>" }, rows);
  assert.match(tr.subject, /sonuçlarınız hazır/);
  assert.match(tr.text, /iyileştirmelerin ardından/);
  assert.match(tr.text, /ChatGPT: 2 cevabın 1 tanesinde anıldınız, 0 tanesinde önerildiniz/);
  assert.doesNotMatch(tr.text, /Gemini/, "cevapsız motor yazılmaz");
  assert.match(tr.html, /Bob&lt;gym&gt;/);
  assert.match(tr.html, /aisaasavran\.com\/marka\/b1/);
  const en = buildRecoveryEmail("en", { id: "b1", name: "Bobgym" }, []);
  assert.match(en.subject, /results are ready/);
  assert.doesNotMatch(en.text, /Quick summary/);
});
