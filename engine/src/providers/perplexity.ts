// Perplexity adaptörü — BİLİNÇLİ OLARAK YAZILMADI.
// Neden: Sonar Chat Completions desteği 27 Eylül 2026'da bitti; yerine Agent API geldi.
// Yeni uç noktanın istek/cevap şeması resmi dokümandan doğrulanmadan kod yazılmayacak.
// Fiyat kartı (Sonar, düşük bağlam) Starter hesabı için tutuluyor.

import { type Provider, type ProviderConfig, type ProviderResult, ProviderError } from "./types.ts";

export const PERPLEXITY_DEFAULT: ProviderConfig = {
  provider: "perplexity",
  model: "sonar",
  billing: "paid",
  useSearch: true,
  price: {
    inputPerMTok: 1, outputPerMTok: 1, perCall: 0.005,
    source: "https://keirolabs.cloud/blog/perplexity-sonar-api-pricing-2026 (resmi sayfayla teyit edilecek)",
    checkedOn: "2026-11-06",
  },
  worstCaseTokens: { input: 1_000, output: 2_000 },
};

export class PerplexityProvider implements Provider {
  readonly config = PERPLEXITY_DEFAULT;
  async ask(): Promise<ProviderResult> {
    throw new ProviderError("Perplexity adaptörü henüz yok: Agent API şeması doğrulanmadı", { kind: "unsupported_feature" });
  }
}
