// Perplexity Agent API adaptörü (POST https://api.perplexity.ai/v1/agent; Responses API biçimi).
// DURUM (14 Kasım 2026): Biçim resmî dokümandan okundu, ama gerçek anahtarla HENÜZ denenmedi.
// Birim testi, dokümandaki alan adlarına göre elle yazılmış örnek cevapla yapılır; gerçek bağlantı testi
// scripts/perplexity-smoke.ts (Perplexity bağlantı testi akışı). Sonar Chat Completions 27 Eylül 2026'da kapandı.
// Kaynaklar (14 Kasım 2026):
//   istek/cevap: https://docs.perplexity.ai/api-reference/agent-post.md
//   web_search:  https://docs.perplexity.ai/docs/agent-api/tools/web-search
//   fiyat:       https://docs.perplexity.ai/docs/getting-started/pricing.md  (web_search arama başına 0,0025 $)
// Model adı ve token fiyatı Agent API "Models" sayfasından teyit edilmedi: PERPLEXITY_MODEL ile değiştirilir,
// maliyet mümkünse cevabın kendi `usage.cost.total_cost` alanından alınır; fiyat kartı yalnız en kötü durum tavanı içindir.

import {
  type FetchLike, type Provider, type ProviderConfig, type ProviderResult,
  ProviderError, estimateCost, classifyHttpError, networkError,
} from "./types.ts";
import { searchLocation } from "./openai.ts";

export const PERPLEXITY_ENDPOINT = "https://api.perplexity.ai/v1/agent";

export const PERPLEXITY_DEFAULT: ProviderConfig = {
  provider: "perplexity",
  model: "perplexity/sonar",
  billing: "paid",
  useSearch: true,
  // Token fiyatı teyitsiz: tavan hesabı için bilinçli yüksek tutuldu. Gerçek maliyet cevaptan okunur.
  price: {
    inputPerMTok: 1, outputPerMTok: 3, perCall: 0.0025,
    source: "https://docs.perplexity.ai/docs/getting-started/pricing.md (arama); token fiyatı Models sayfasından teyit edilecek",
    checkedOn: "2026-11-14",
  },
  worstCaseTokens: { input: 2_000, output: 2_000 },
  worstCaseToolCalls: 2,
};

interface PplxPart { type?: string; text?: string; annotations?: { type?: string; url?: string }[] }
interface PplxItem {
  type?: string;
  content?: PplxPart[];
  queries?: string[];
  results?: { url?: string }[];
}
interface PplxResponse {
  status?: string;
  output?: PplxItem[];
  error?: { message?: string } | null;
  usage?: {
    input_tokens?: number; output_tokens?: number;
    cost?: { total_cost?: number };
  };
}

export function parsePerplexityResponse(json: PplxResponse, promptId: string, cfg: ProviderConfig): ProviderResult {
  if (json.status && json.status !== "completed") {
    throw new ProviderError(`Perplexity cevap durumu: ${json.status}${json.error?.message ? ` (${json.error.message})` : ""}`, { kind: "transient" });
  }
  const items = json.output ?? [];
  const parts = items.filter((i) => i.type === "message").flatMap((i) => i.content ?? []).filter((c) => c.type === "output_text");
  const text = parts.map((p) => p.text ?? "").join("").trim();
  if (!text) throw new ProviderError("Perplexity boş cevap döndü", { kind: "transient" });
  // Kaynak: yalnız cevabın gerçekten gösterdiği siteler (metin içi alıntı, yoksa cevaptaki bağlantılar).
  // Aramanın bulduğu ama cevapta gösterilmeyen siteler kaynak SAYILMAZ (18 Kasım kararı: diğer motorlarla aynı ölçüt;
  // eskiden her cevaba 15 arama sonucu ekleniyor, kaynak paylarında Perplexity'yi şişiriyordu).
  const annotated = parts.flatMap((p) => p.annotations ?? []).filter((a) => a.type === "url_citation" && a.url).map((a) => a.url!);
  const inText = [...text.matchAll(/https?:\/\/[^\s)\]>"'<]+/g)].map((m) => m[0].replace(/[.,;:!?]+$/, ""));
  const cited = annotated.length ? annotated : inText;
  const searchItems = items.filter((i) => i.type === "search_results");
  const found = searchItems.flatMap((i) => i.results ?? []).map((r) => r.url).filter((u): u is string => !!u);
  const queries = searchItems.flatMap((i) => i.queries ?? []).filter(Boolean);
  const u = json.usage ?? {};
  const inputTokens = u.input_tokens ?? 0;
  const outputTokens = u.output_tokens ?? 0;
  const reported = u.cost?.total_cost;
  const cost = typeof reported === "number" && Number.isFinite(reported) && reported >= 0
    ? reported
    : estimateCost({ ...cfg.price, perCall: cfg.price.perCall * Math.max(1, queries.length) }, inputTokens, outputTokens);
  return {
    promptId, provider: "perplexity", model: cfg.model,
    method: "api_with_search", dataOrigin: "live_api", billing: cfg.billing,
    answerText: text, citedUrls: [...new Set(cited)], searchQueries: queries,
    inputTokens, outputTokens, costUsd: cost, paidEquivalentUsd: cost,
  };
}

export class PerplexityProvider implements Provider {
  readonly config: ProviderConfig;
  private apiKey: string;
  private fetchFn: FetchLike;
  constructor(apiKey: string, config: ProviderConfig = PERPLEXITY_DEFAULT, fetchFn: FetchLike = fetch) {
    if (!apiKey) throw new Error("PERPLEXITY_API_KEY tanımlı değil");
    this.apiKey = apiKey; this.config = config; this.fetchFn = fetchFn;
  }
  async ask(promptId: string, prompt: string, signal?: AbortSignal): Promise<ProviderResult> {
    let res: Response;
    try {
      res = await this.fetchFn(PERPLEXITY_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({
          model: this.config.model,
          input: prompt,
          max_output_tokens: this.config.worstCaseTokens.output,
          // Her soruda web araması zorunlu: müşterinin gördüğüne en yakın cevap (eski Sonar gibi hep aramalı)
          tools: [{ type: "web_search", user_location: { country: searchLocation(this.config.searchCountry).country } }],
          tool_choice: "required",
        }),
        signal: signal ?? AbortSignal.timeout(90_000),
      });
    } catch (e) {
      throw networkError("Perplexity", e);
    }
    if (!res.ok) {
      const raw = (await res.text()).split(this.apiKey).join("***");
      let kind = classifyHttpError(res.status, raw, { searchRequested: true, freeTier: false });
      const b = raw.toLowerCase();
      if (res.status === 402 || b.includes("insufficient") || b.includes("credit")) kind = "quota_exceeded";
      else if (res.status === 404 || b.includes("model") && b.includes("not found")) kind = "model_not_found";
      throw new ProviderError(`Perplexity HTTP ${res.status} [${kind}]: ${raw.slice(0, 600)}`, { kind, status: res.status });
    }
    return parsePerplexityResponse((await res.json()) as PplxResponse, promptId, this.config);
  }
}
