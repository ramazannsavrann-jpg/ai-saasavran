// OpenAI Responses API + web_search aracı adaptörü.
// DURUM: Yazıldı, birim testi kayıtlı örnek cevapla yapıldı, GERÇEK API İLE TEST EDİLMEDİ.
// OpenAI'ın ücretsiz katmanı yok → billing "paid"; ALLOW_PAID_API=true olmadan kayıt defteri bunu açmaz.

import {
  type FetchLike, type Provider, type ProviderConfig, type ProviderResult,
  ProviderError, estimateCost, classifyHttpError, networkError,
} from "./types.ts";

export const OPENAI_DEFAULT: ProviderConfig = {
  provider: "openai",
  model: "gpt-5.4-nano", // web_search desteği gerçek çağrıyla doğrulanmalı
  billing: "paid",
  useSearch: true,
  // Arama içeriği girdi token olarak ücretlenir; arama çağrısı 1.000'de 10 $.
  price: {
    inputPerMTok: 0.20, outputPerMTok: 1.25, perCall: 0.01,
    source: "https://developer.puter.com/tutorials/openai-api-pricing/ (resmi sayfayla teyit edilecek)",
    checkedOn: "2026-11-06",
  },
  worstCaseTokens: { input: 12_000, output: 2_000 },
};

interface OpenAIResponse {
  output?: {
    type: string;
    content?: { type: string; text?: string; annotations?: { type: string; url?: string }[] }[];
    action?: { query?: string };
  }[];
  usage?: { input_tokens?: number; output_tokens?: number };
}

export function parseOpenAIResponse(json: OpenAIResponse, promptId: string, cfg: ProviderConfig): ProviderResult {
  const out = json.output ?? [];
  const msgParts = out.filter((o) => o.type === "message").flatMap((o) => o.content ?? []);
  const text = msgParts.filter((c) => c.type === "output_text").map((c) => c.text ?? "").join("").trim();
  if (!text) throw new ProviderError("OpenAI boş cevap döndü", { kind: "transient" });
  const urls = msgParts.flatMap((c) => c.annotations ?? []).filter((a) => a.type === "url_citation" && a.url).map((a) => a.url!);
  const searchCalls = out.filter((o) => o.type === "web_search_call");
  const inputTokens = json.usage?.input_tokens ?? 0;
  const outputTokens = json.usage?.output_tokens ?? 0;
  const cost = estimateCost({ ...cfg.price, perCall: cfg.price.perCall * searchCalls.length }, inputTokens, outputTokens);
  return {
    promptId, provider: "openai", model: cfg.model,
    method: cfg.useSearch ? "api_with_search" : "api_no_search",
    dataOrigin: "live_api", billing: cfg.billing,
    answerText: text, citedUrls: [...new Set(urls)],
    searchQueries: searchCalls.map((s) => s.action?.query ?? "").filter(Boolean),
    inputTokens, outputTokens, costUsd: cost, paidEquivalentUsd: cost,
  };
}

export class OpenAIProvider implements Provider {
  readonly config: ProviderConfig;
  private apiKey: string;
  private fetchFn: FetchLike;
  constructor(apiKey: string, config: ProviderConfig = OPENAI_DEFAULT, fetchFn: FetchLike = fetch) {
    if (!apiKey) throw new Error("OPENAI_API_KEY tanımlı değil");
    this.apiKey = apiKey; this.config = config; this.fetchFn = fetchFn;
  }
  async ask(promptId: string, prompt: string, signal?: AbortSignal): Promise<ProviderResult> {
    let res: Response;
    try {
      res = await this.fetchFn("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({
          model: this.config.model,
          input: prompt,
          ...(this.config.useSearch ? { tools: [{ type: "web_search" }] } : {}),
          max_output_tokens: this.config.worstCaseTokens.output,
        }),
        signal: signal ?? AbortSignal.timeout(90_000),
      });
    } catch (e) {
      throw networkError("OpenAI", e);
    }
    if (!res.ok) {
      const raw = (await res.text()).split(this.apiKey).join("***");
      const kind = classifyHttpError(res.status, raw, { searchRequested: this.config.useSearch, freeTier: false });
      throw new ProviderError(`OpenAI HTTP ${res.status} [${kind}]: ${raw.slice(0, 600)}`, { kind, status: res.status });
    }
    return parseOpenAIResponse((await res.json()) as OpenAIResponse, promptId, this.config);
  }
}
