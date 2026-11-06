// Rapor kuralları: gerçek ve simüle sonuç asla karışmaz, her raporda yöntem ve kaynak yazılır,
// gerçek API sonucu olmadan "gerçek" etiketli rapor üretilemez.

import type { BrandSummary } from "./metrics.ts";
import type { ProviderResult } from "./providers/types.ts";

export class MixedOriginError extends Error {}

export interface ReportHeader {
  origin: "live_api" | "simulated";
  label: string;
  methodology: string[];
  sampleSize: number;
  generatedAt: string;
  warnings: string[];
}

export function buildReportHeader(results: ProviderResult[], summaries: BrandSummary[], now = new Date()): ReportHeader {
  if (results.length === 0) throw new Error("Sonuç yok: rapor üretilemez");
  const origins = new Set(results.map((r) => r.dataOrigin));
  if (origins.size > 1) throw new MixedOriginError("Gerçek ve simüle sonuçlar aynı raporda kullanılamaz");
  const origin = [...origins][0];

  const combos = new Map<string, number>();
  for (const r of results) {
    const k = `${r.provider} / ${r.model} / ${r.method}`;
    combos.set(k, (combos.get(k) ?? 0) + 1);
  }
  const methodology = [...combos].map(([k, n]) => `${k}: ${n} cevap`);
  const warnings: string[] = [];
  if (origin === "simulated") warnings.push("Bu rapor SİMÜLASYONDUR. Gerçek bir AI platformundan alınmış sonuç içermez.");
  if (origin === "live_api") {
    warnings.push("Sonuçlar sağlayıcıların geliştirici API'sinden alınmıştır; tüketici uygulamasında (ör. Gemini uygulaması) görülen cevaplarla birebir aynı olmayabilir.");
  }
  if (summaries.some((s) => s.lowConfidence)) warnings.push("Örneklem küçük: oranlar geniş güven aralıklarıyla birlikte okunmalıdır.");

  return {
    origin,
    label: origin === "simulated" ? "SİMÜLASYON — gerçek veri değildir" : "Gerçek API ölçümü",
    methodology,
    sampleSize: results.length,
    generatedAt: now.toISOString(),
    warnings,
  };
}
