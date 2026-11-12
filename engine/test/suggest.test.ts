import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-ignore: düz JavaScript (Cloudflare fonksiyonu)
import { buildSuggestPrompt, parseSuggestions } from "../../functions/api/_suggest-lib.js";

const ctx = { name: "Kuzey Kafe", sector: "Kafe", city: "Antalya", country: "TR", website: "kuzeykafe.com", competitors: ["Güney Kahve"], existing: ["Antalya'da en iyi kahve nerede içilir?"] };

test("Soru önerisi: istem Türkçe/İngilizce, sektör, şehir, mevcut sorular ve kurallar", () => {
  const p = buildSuggestPrompt(ctx);
  assert.match(p, /Sektör: Kafe/);
  assert.match(p, /Antalya/);
  assert.match(p, /Hiçbir marka/);
  assert.match(p, /tekrar etme/);
  assert.doesNotMatch(p, /Kuzey Kafe/, "işletme adı isteme yazılmaz");
  const en = buildSuggestPrompt({ ...ctx, country: "US", city: null });
  assert.match(en, /Industry: Kafe/);
  assert.match(en, /no local questions/);
});

test("Soru önerisi: JSON ayıklanır; marka/rakip adı, mevcut, tekrar, kısa olanlar atılır; niyet doğrulanır", () => {
  const out = parseSuggestions(`İşte sorular:\n[
    {"text":"Antalya'da sessiz çalışılabilecek kafe önerir misin?","intent":"local"},
    {"text":"Kuzey Kafe iyi mi?","intent":"comparison"},
    {"text":"Güney Kahve mi daha iyi yoksa başka bir yer mi?","intent":"comparison"},
    {"text":"Antalya'da en iyi kahve nerede içilir?","intent":"local"},
    {"text":"Antalya'da sessiz çalışılabilecek kafe önerir misin?","intent":"local"},
    {"text":"Kısa?","intent":"purchase"},
    {"text":"Filtre kahve ile espresso arasındaki fark nedir?","intent":"bilinmeyen"}
  ]`, ctx);
  assert.deepEqual(out, [
    { text: "Antalya'da sessiz çalışılabilecek kafe önerir misin?", intent: "local" },
    { text: "Filtre kahve ile espresso arasındaki fark nedir?", intent: "informational" },
  ]);
  assert.deepEqual(parseSuggestions("bozuk cevap", ctx), []);
});
