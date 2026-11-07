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
});
