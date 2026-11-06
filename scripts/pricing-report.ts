// Kullanım: node scripts/pricing-report.ts  → docs/PRICING.md içeriğini üretir
import { PLANS, SCENARIOS, planCost, freeTierCapacity, costPerCall } from "../engine/src/pricing.ts";

const usd = (n: number, d = 2) => `$${n.toFixed(d)}`;
const lines: string[] = [];
lines.push("| Paket | Fiyat | Çağrı/ay | " + SCENARIOS.map((s) => `${s.name}: maliyet / brüt marj`).join(" | ") + " |");
lines.push("|---|---|---|" + SCENARIOS.map(() => "---").join("|") + "|");
for (const p of PLANS) {
  const cells = SCENARIOS.map((s) => {
    const c = planCost(p, s);
    return `${usd(c.totalCostUsd)} / %${c.grossMarginPct.toFixed(0)}`;
  });
  lines.push(`| ${p.name} | ${usd(p.priceUsd)} | ${planCost(p, SCENARIOS[0]).engineCallsPerMonth} | ${cells.join(" | ")} |`);
}
lines.push("");
lines.push("Çağrı başı API maliyeti:");
for (const s of SCENARIOS) {
  const e = (["gemini", "openai", "perplexity"] as const).map((k) => `${k} ${usd(costPerCall(k, s.calls[k], s), 4)}`);
  lines.push(`- ${s.name}: ${e.join(", ")}`);
}
lines.push("");
lines.push(`Ücretsiz Gemini kotasıyla (günde 450 çağrı) izlenebilecek "Starter yeni" marka sayısı: ${freeTierCapacity(PLANS[1])}`);
console.log(lines.join("\n"));
