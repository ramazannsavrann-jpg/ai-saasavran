// Demo Lab simülasyon sağlayıcısı. Gerçek hiçbir AI platformuna bağlanmaz.
// Çıktı her zaman dataOrigin="simulated", method="simulation" etiketlidir ve veritabanı
// yalnızca demo_lab çalışma alanına yazılmasına izin verir.

import { createHash } from "node:crypto";
import type { Provider, ProviderConfig, ProviderResult } from "./types.ts";

export const SIMULATED_CONFIG: ProviderConfig = {
  provider: "mock",
  model: "simulasyon-v1",
  billing: "free",
  useSearch: false,
  price: { inputPerMTok: 0, outputPerMTok: 0, perCall: 0, source: "simülasyon", checkedOn: "2026-11-06" },
  worstCaseTokens: { input: 0, output: 0 },
};

function score(seed: string): number {
  return createHash("sha256").update(seed).digest().readUInt32BE(0) / 0xffffffff;
}

export class SimulatedProvider implements Provider {
  readonly config = SIMULATED_CONFIG;
  private brandNames: string[];
  private seed: string;
  constructor(brandNames: string[], seed: string) {
    this.brandNames = brandNames;
    this.seed = seed;
  }
  async ask(promptId: string, prompt: string): Promise<ProviderResult> {
    // Her marka için tekrar üretilebilir sözde-rastgele puan; ilk 3'ü "öneri listesi" olur.
    const ranked = this.brandNames
      .map((name) => ({ name, s: score(`${this.seed}|${promptId}|${name}`) }))
      .sort((a, b) => b.s - a.s);
    const listed = ranked.filter((x) => x.s > 0.35).slice(0, 3);
    const lines = [`[SİMÜLASYON] "${prompt}" için örnek cevap:`];
    listed.forEach((x, i) => lines.push(`${i + 1}. ${x.name}`));
    if (listed.length === 0) lines.push("Bu soru için belirgin bir öneri yok.");
    return {
      promptId, provider: "mock", model: this.config.model, method: "simulation",
      dataOrigin: "simulated", billing: "free",
      answerText: lines.join("\n"), citedUrls: [], searchQueries: [],
      inputTokens: 0, outputTokens: 0, costUsd: 0, paidEquivalentUsd: 0,
    };
  }
}
