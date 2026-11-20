// 20 Kasım: soru havuzu süzgeci. Marka önerilmeyen sorular (meslek, iş kurma, tanım) ölçüme girmez; "en iyi" soruları karşılaştırmadır.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const out = "/tmp/qp/sectors.mjs";
execFileSync("npx", ["--yes", "esbuild@0.28.2", "web/src/lib/sectors.ts", "--bundle", "--format=esm", "--platform=node", `--outfile=${out}`, "--log-level=error"]);
const m = await import(out);

test("ölçüme yaramayan havuz soruları çıkarılır", () => {
  for (const t of ["Bankacı nasıl olunur?", "Ambalaj nedir?", "Pastane açmak için hangi belgeler gereklidir?", "İçerik üreticisi ne kadar maaş alır?"])
    assert.equal(m.classifyPoolQuestion(t, "informational"), null, t);
});

test("öneri isteyen soru karşılaştırma sayılır, kelime içi eşleşme sayılmaz", () => {
  assert.equal(m.classifyPoolQuestion("İnekler için en iyi yem nedir?", "informational"), "comparison");
  assert.equal(m.classifyPoolQuestion("Shell mi daha iyi opet mi?", "informational"), "comparison");
  assert.equal(m.classifyPoolQuestion("Döner hangi ülkenin?", "informational"), "informational");
  assert.equal(m.classifyPoolQuestion("Kanatlı yemi için hangi firma önerilir?", "purchase"), "purchase");
});

test("otomatik başlangıç sorularında tanım/meslek sorusu yok", () => {
  for (const s of m.SECTOR_DEFS) for (const q of m.starterQuestions(s.label, "Antalya", "Örnek Marka", 5)) {
    assert.ok(!/nasıl olunur|açmak|maaş|nedir\?$/i.test(q.text) || /en iyi|en kaliteli/i.test(q.text), `${s.label}: ${q.text}`);
  }
});
