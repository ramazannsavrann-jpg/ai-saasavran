// Gerçek Gemini bağlantı testi. Yalnızca GEMINI_API_KEY varsa çalışır; yoksa açıkça "atlandı" der.
// Asla ücretli çalışmaz (ALLOW_PAID_API zorla kapalı). En fazla 2 ücretsiz çağrı yapar:
//   1) arama dayanağı AÇIK   2) arama dayanağı KAPALI
// Sonuçlar ayrı raporlanır; aramasız cevap "api_no_search" etiketlidir ve canlı web sonucu sayılmaz.

import { buildProviders } from "../engine/src/providers/registry.ts";

const base = { ...process.env, ALLOW_PAID_API: "false", GEMINI_TIER: "free" };
if (!base.GEMINI_API_KEY) {
  console.log("ATLANDI: GEMINI_API_KEY tanımlı değil. Gerçek bağlantı test EDİLMEDİ.");
  process.exit(0);
}

const prompt = "İstanbul'da kahvaltı için en çok önerilen 3 mekan hangileri? Kısa bir liste ver.";
const results: Record<string, unknown> = {};
let anyOk = false;

for (const search of ["true", "false"]) {
  const label = search === "true" ? "arama_acik" : "arama_kapali";
  const { providers, status } = buildProviders({ ...base, GEMINI_SEARCH: search });
  const g = providers.find((p) => p.config.provider === "gemini");
  if (!g) { results[label] = { ok: false, error: JSON.stringify(status) }; continue; }
  const t0 = Date.now();
  try {
    // Geçici hatalarda (503 vb.) en fazla 3 deneme, artan bekleme
    let r;
    for (let attempt = 1; ; attempt++) {
      try { r = await g.ask("smoke", prompt); break; }
      catch (e) {
        if ((e as { kind?: string }).kind !== "transient" || attempt >= 3) throw e;
        console.log(`${label}: geçici hata, ${attempt * 10} sn sonra tekrar denenecek`);
        await new Promise((res) => setTimeout(res, attempt * 10_000));
      }
    }
    anyOk = true;
    if (r.costUsd !== 0) throw new Error("ücretsiz katmanda maliyet 0 olmalıydı");
    results[label] = {
      ok: true, model: r.model, method: r.method, billing: r.billing, dataOrigin: r.dataOrigin,
      ms: Date.now() - t0, tokens: { in: r.inputTokens, out: r.outputTokens },
      costUsd: r.costUsd, paidEquivalentUsd: Number(r.paidEquivalentUsd.toFixed(5)),
      grounded: r.citedUrls.length > 0, searchQueries: r.searchQueries, citedDomains: r.citedUrls.slice(0, 5),
      answerPreview: r.answerText.slice(0, 160).replace(/\n/g, " "),
    };
  } catch (e) {
    results[label] = { ok: false, error: (e as Error).message.slice(0, 300) };
  }
}

console.log(JSON.stringify(results, null, 2));
if (!anyOk) { console.error("GERÇEK BAĞLANTI BAŞARISIZ: iki deneme de çalışmadı"); process.exit(1); }
