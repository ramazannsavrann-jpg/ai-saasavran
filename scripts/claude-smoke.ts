// Gerçek Claude (Anthropic) bağlantı testi. ANTHROPIC_API_KEY yoksa açıkça "atlandı" der.
// Ücretlidir: kullanıcı izni 11 Kasım 2026 (5 $ ön ödemeli kredi). Tek çalıştırmada en fazla 3 çağrı
// ve toplam 0,15 $ tavan; tavan aşılacaksa sonraki çağrı yapılmaz.
//   1) web araması KAPALI (model bilgisi)   2) web araması AÇIK   3) web araması AÇIK, marka sorusu
// Gerçek isimler herkese açık sitede kullanılmaz; bu test yalnız Actions günlüğüne yazar.

import { ClaudeProvider, CLAUDE_DEFAULT } from "../engine/src/providers/claude.ts";

const key = process.env.ANTHROPIC_API_KEY?.trim();
if (!key) {
  console.log("ATLANDI: ANTHROPIC_API_KEY tanımlı değil. Gerçek bağlantı test EDİLMEDİ.");
  process.exit(0);
}

const CAP_USD = 0.15;
const model = process.env.CLAUDE_MODEL || CLAUDE_DEFAULT.model;
const worstPerCall = (search: boolean) => {
  const c = CLAUDE_DEFAULT;
  return (search ? c.price.perCall * (c.worstCaseToolCalls ?? 1) : 0)
    + c.worstCaseTokens.input / 1e6 * c.price.inputPerMTok + c.worstCaseTokens.output / 1e6 * c.price.outputPerMTok;
};

const cases = [
  { label: "arama_kapali", search: false, prompt: "Türkiye'de küçük işletmeler için en çok önerilen 3 ön muhasebe programı hangileri? Kısa liste ver." },
  { label: "arama_acik", search: true, prompt: "Türkiye'de küçük işletmeler için en çok önerilen 3 ön muhasebe programı hangileri? Kısa liste ver." },
  { label: "arama_acik_ai_gorunurluk", search: true, prompt: "Bir markanın ChatGPT ve Gemini cevaplarında ne kadar görünür olduğunu ölçen araçlar hangileri? Kısa liste ver." },
];

let spent = 0;
let anyOk = false;
const results: Record<string, unknown> = {};
for (const c of cases) {
  if (spent + worstPerCall(c.search) > CAP_USD) { results[c.label] = { ok: false, error: `atlandı: ${CAP_USD} $ tavan` }; continue; }
  const p = new ClaudeProvider(key, { ...CLAUDE_DEFAULT, model, useSearch: c.search });
  const t0 = Date.now();
  try {
    let r;
    for (let attempt = 1; ; attempt++) {
      try { r = await p.ask("smoke", c.prompt); break; }
      catch (e) {
        if ((e as { kind?: string }).kind !== "transient" || attempt >= 3) throw e;
        console.log(`${c.label}: geçici hata, ${attempt * 10} sn sonra tekrar`);
        await new Promise((res) => setTimeout(res, attempt * 10_000));
      }
    }
    anyOk = true;
    spent += r.costUsd;
    results[c.label] = {
      ok: true, model: r.model, method: r.method, billing: r.billing, ms: Date.now() - t0,
      tokens: { in: r.inputTokens, out: r.outputTokens }, costUsd: Number(r.costUsd.toFixed(5)),
      searchQueries: r.searchQueries, citedCount: r.citedUrls.length,
      citedDomains: [...new Set(r.citedUrls.map((u) => { try { return new URL(u).hostname; } catch { return u; } }))].slice(0, 8),
      answerPreview: r.answerText.slice(0, 220).replace(/\n/g, " "),
    };
  } catch (e) {
    results[c.label] = { ok: false, kind: (e as { kind?: string }).kind, error: (e as Error).message.slice(0, 400) };
  }
}

const out = JSON.stringify({ model, totalCostUsd: Number(spent.toFixed(5)), capUsd: CAP_USD, results }, null, 2);
console.log(out);
if (process.env.GITHUB_STEP_SUMMARY) {
  const { appendFileSync } = await import("node:fs");
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Claude bağlantı testi\n\n\`\`\`json\n${out}\n\`\`\`\n`);
}
if (!anyOk) { console.error("GERÇEK BAĞLANTI BAŞARISIZ: hiçbir çağrı çalışmadı"); process.exit(1); }
