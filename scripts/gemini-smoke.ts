// Gerçek Gemini bağlantı testi. Yalnızca GEMINI_API_KEY varsa çalışır; yoksa açıkça "atlandı" der.
// Ücretsiz katman dışına çıkmaz: kayıt defteri ALLOW_PAID_API olmadan ücretli sağlayıcı açmaz.
// En fazla 1 çağrı yapar (günlük 500 ücretsiz kotadan 1).

import { buildProviders } from "../engine/src/providers/registry.ts";
import { analyzeResponse } from "../engine/src/metrics.ts";

const env = { ...process.env, ALLOW_PAID_API: "false" }; // bu test asla ücretli çalışmaz
if (!env.GEMINI_API_KEY) {
  console.log("ATLANDI: GEMINI_API_KEY tanımlı değil. Gerçek bağlantı test EDİLMEDİ.");
  process.exit(0);
}

const { providers, status } = buildProviders(env);
console.log("Sağlayıcı durumu:", JSON.stringify(status));
const gemini = providers.find((p) => p.config.provider === "gemini");
if (!gemini) { console.error("HATA: Gemini açılamadı"); process.exit(1); }

const prompt = "İstanbul'da kahvaltı için en çok önerilen 3 mekan hangileri? Kısa bir liste ver.";
const t0 = Date.now();
try {
  const r = await gemini.ask("smoke", prompt);
  const hits = analyzeResponse(r, [{ id: "x", name: "Van Kahvaltı Evi", aliases: [] }]);
  console.log(JSON.stringify({
    ok: true,
    model: r.model,
    method: r.method,
    billing: r.billing,
    dataOrigin: r.dataOrigin,
    ms: Date.now() - t0,
    tokens: { in: r.inputTokens, out: r.outputTokens },
    costUsd: r.costUsd,
    paidEquivalentUsd: Number(r.paidEquivalentUsd.toFixed(5)),
    searchQueries: r.searchQueries,
    citedDomains: r.citedUrls.slice(0, 5),
    grounded: r.citedUrls.length > 0,
    sampleBrandMentioned: hits[0].mentioned,
    answerPreview: r.answerText.slice(0, 200),
  }, null, 2));
  if (r.costUsd !== 0) { console.error("HATA: ücretsiz katmanda maliyet 0 olmalıydı"); process.exit(1); }
  if (r.citedUrls.length === 0) console.log("UYARI: Cevap arama dayanağı (kaynak) içermiyor.");
} catch (e) {
  console.error("GERÇEK BAĞLANTI BAŞARISIZ:", (e as Error).message);
  process.exit(1);
}
