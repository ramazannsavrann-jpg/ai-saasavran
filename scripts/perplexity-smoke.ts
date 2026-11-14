// Gerçek Perplexity (Agent API) bağlantı testi. PERPLEXITY_API_KEY yoksa açıkça "atlandı" der.
// Ücretlidir: en fazla 2 çağrı ve toplam 0,05 $ tavan. Amaç, elle yazılmış adaptörün cevap biçimini ve model adını
// GERÇEK cevapla doğrulamak: cevabın üst düzey alan adları, çıktı öğe türleri ve usage alanları günlüğe yazılır.
// İlk çağrıda model adı adayları sırayla denenir (Models sayfası teyit edilmedi). Cevap metni günlüğe kısaltılarak yazılır.

import { PerplexityProvider, PERPLEXITY_DEFAULT } from "../engine/src/providers/perplexity.ts";

const key = process.env.PERPLEXITY_API_KEY?.trim();
if (!key) {
  console.log("ATLANDI: PERPLEXITY_API_KEY tanımlı değil. Gerçek bağlantı test EDİLMEDİ.");
  process.exit(0);
}

const CAP_USD = 0.05;
const candidates = process.env.PERPLEXITY_MODEL ? [process.env.PERPLEXITY_MODEL] : ["perplexity/sonar", "sonar"];
const prompt = "Türkiye'de küçük işletmeler için en çok önerilen 3 ön muhasebe programı hangileri? Kısa liste ver.";

let shape: unknown = null;
const spy = async (url: string | URL | Request, init?: RequestInit) => {
  const res = await fetch(url, init);
  if (res.ok) {
    try {
      const j = await res.clone().json();
      shape = {
        topKeys: Object.keys(j),
        status: j.status,
        outputTypes: (j.output ?? []).map((o: any) => o.type),
        messageContentTypes: (j.output ?? []).filter((o: any) => o.type === "message").flatMap((o: any) => (o.content ?? []).map((c: any) => c.type)),
        annotationTypes: [...new Set((j.output ?? []).flatMap((o: any) => (o.content ?? []).flatMap((c: any) => (c.annotations ?? []).map((a: any) => a.type))))],
        usageKeys: Object.keys(j.usage ?? {}),
        costKeys: Object.keys(j.usage?.cost ?? {}),
        reportedTotalCost: j.usage?.cost?.total_cost,
      };
    } catch { /* biçim okunamadı */ }
  }
  return res;
};

const results: Record<string, unknown> = {};
let spent = 0; let workingModel: string | null = null;
for (const model of candidates) {
  const p = new PerplexityProvider(key, { ...PERPLEXITY_DEFAULT, model }, spy as typeof fetch);
  try {
    const r = await p.ask("smoke", prompt);
    spent += r.costUsd; workingModel = model;
    results[model] = {
      ok: true, costUsd: Number(r.costUsd.toFixed(5)), tokens: { in: r.inputTokens, out: r.outputTokens },
      searchQueries: r.searchQueries, citedCount: r.citedUrls.length,
      citedDomains: [...new Set(r.citedUrls.map((u) => { try { return new URL(u).hostname; } catch { return u; } }))].slice(0, 8),
      answerPreview: r.answerText.slice(0, 220).replace(/\n/g, " "),
    };
    break;
  } catch (e) {
    results[model] = { ok: false, kind: (e as { kind?: string }).kind, error: (e as Error).message.slice(0, 400) };
    if ((e as { kind?: string }).kind === "auth_error" || (e as { kind?: string }).kind === "quota_exceeded") break;
  }
  if (spent >= CAP_USD) break;
}

const out = JSON.stringify({ workingModel, totalCostUsd: Number(spent.toFixed(5)), capUsd: CAP_USD, responseShape: shape, results }, null, 2);
console.log(out);
if (process.env.GITHUB_STEP_SUMMARY) {
  const { appendFileSync } = await import("node:fs");
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Perplexity bağlantı testi\n\n\`\`\`json\n${out}\n\`\`\`\n`);
}
if (!workingModel) { console.error("GERÇEK BAĞLANTI BAŞARISIZ: hiçbir model adı çalışmadı"); process.exit(1); }
