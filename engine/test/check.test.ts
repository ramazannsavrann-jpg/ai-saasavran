import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-ignore — düz JS modülü (Cloudflare Pages Functions)
import { parseInput, buildQuestions, analyze } from "../../functions/api/_check-lib.js";

test("Ücretsiz kontrol: girdi temizlenir, kısa girdi reddedilir, 5 soru üretilir (EN/TR)", () => {
  assert.deepEqual(parseInput({ brand: "A" , category: "dentist" }), { error: "input" });
  const i = parseInput({ brand: " Smile <b>Dental</b> ", category: "dentist", city: "Austin", website: "https://www.smiledental.com/about", lang: "en" });
  assert.equal(i.brand, "Smile b Dental /b");
  assert.equal(i.domain, "smiledental.com");
  assert.equal(buildQuestions(i).length, 5);
  assert.match(buildQuestions(i)[0], /dentist options in Austin/);
  assert.match(buildQuestions({ lang: "tr", category: "diş kliniği", city: "Antalya" })[1], /diş kliniği arıyorum, Antalya bölgesinde/);
});

test("Ücretsiz kontrol: anılma ve önerilme sayılır, diğer adlar çıkarılır", () => {
  const answers = [
    { text: "Here are top picks:\n1. **Bright Smiles** — great reviews\n2. **Smile Dental** — modern clinic" },
    { text: "I recommend Bright Smiles and Austin Dental Care." },
    { text: "" },
  ];
  const a = analyze(answers, { brand: "Smile Dental", domain: "" });
  assert.equal(a.total, 2);
  assert.equal(a.mentioned, 1);
  assert.ok(a.others.some((o: { name: string }) => o.name.startsWith("Bright")));
  const b = analyze([{ text: "If you want it, What matters is GEO. It depends. Here are picks: Semrush and Peec AI. If budget matters, Semrush." }], { brand: "X Corp", domain: "" });
  assert.ok(!b.others.some((o: { name: string }) => ["If", "What", "It", "GEO", "Here"].includes(o.name)), JSON.stringify(b.others));
  assert.match(buildQuestions({ lang: "en", category: "AI visibility tool", city: "" })[1], /looking for an AI visibility tool\./);
});

test("ücretsiz kontrol: madde başı kelimeler ve sorudaki kelimeler marka sayılmaz", () => {
  const answers = [
    { text: "İzmir'de en iyi kafeler amacınıza göre değişir.\n\n* **Amacınıza göre:** sessiz mi kalabalık mı?\n* **Ders çalışmak için:** EspressoLab ve Kronotrop uygundur.\n\n1. **EspressoLab:** geniş ve priz bol.\n2. **Kronotrop (Alsancak):** nitelikli kahve." },
    { text: "Kafeler arasında **Kronotrop** öne çıkar.\n- **Çalışmak için:** EspressoLab.\n- **Ders çalışmak isteyenler:** Starbucks da olur.\n- Kafeler genelde kalabalıktır." },
  ];
  const a = analyze(answers, { brand: "Deneme", domain: "", category: "kafe", city: "" });
  const names = a.others.map((o: { name: string }) => o.name);
  assert.ok(names.includes("EspressoLab") && names.includes("Kronotrop"), JSON.stringify(names));
  for (const junk of ["Amacınıza", "Ders", "Çalışmak", "Kafeler"]) assert.ok(!names.includes(junk), `${junk}: ${JSON.stringify(names)}`);
});
