// Anthropic Claude Messages API + web_search aracı adaptörü.
// DURUM (11 Kasım 2026): Birim testi kayıtlı örnek cevapla yapıldı; gerçek bağlantı testi scripts/claude-smoke.ts ile.
// Claude API'nin ücretsiz katmanı yok → billing "paid"; ALLOW_PAID_API=true olmadan kayıt defteri bunu açmaz.
// Kaynaklar (11 Kasım 2026):
//   fiyat:  https://platform.claude.com/docs/en/about-claude/pricing
//   arama:  https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool

import {
  type FetchLike, type Provider, type ProviderConfig, type ProviderResult,
  ProviderError, estimateCost, classifyHttpError, networkError,
} from "./types.ts";
import { searchLocation } from "./openai.ts";

/** Bir soruda en fazla bu kadar web araması (maliyet üst sınırı). */
export const CLAUDE_MAX_SEARCHES = 2;
export const ANTHROPIC_VERSION = "2023-06-01";
export const CLAUDE_SEARCH_TOOL = "web_search_20250305";

export const CLAUDE_DEFAULT: ProviderConfig = {
  provider: "claude",
  model: "claude-haiku-5-5", // en ucuz güncel model
  billing: "paid",
  useSearch: true,
  // Haiku 5.5: 100K token altı istemde 0,10 $ / 0,50 $ (1M token). Arama 1.000'de 10 $.
  // 100K üstü istem daha pahalı → worstCaseTokens.input 100K altında tutulur.
  price: {
    inputPerMTok: 0.10, outputPerMTok: 0.50, perCall: 0.01,
    source: "https://platform.claude.com/docs/en/about-claude/pricing",
    checkedOn: "2026-11-11",
  },
  worstCaseTokens: { input: 40_000, output: 3_000 },
  worstCaseToolCalls: CLAUDE_MAX_SEARCHES,
};

interface ClaudeBlock {
  type: string;
  text?: string;
  citations?: { type: string; url?: string }[];
  input?: { query?: string };
  name?: string;
  content?: unknown;
}
interface ClaudeResponse {
  content?: ClaudeBlock[];
  stop_reason?: string;
  usage?: {
    input_tokens?: number; output_tokens?: number;
    cache_read_input_tokens?: number; cache_creation_input_tokens?: number;
    server_tool_use?: { web_search_requests?: number };
  };
}

export function parseClaudeResponse(json: ClaudeResponse, promptId: string, cfg: ProviderConfig): ProviderResult {
  const blocks = json.content ?? [];
  const textBlocks = blocks.filter((b) => b.type === "text");
  // Arama öncesi "arayacağım" gibi ara cümleler de text bloğudur; son arama sonucundan sonraki metin asıl cevaptır.
  const lastResult = blocks.map((b) => b.type).lastIndexOf("web_search_tool_result");
  const finalText = blocks.slice(lastResult + 1).filter((b) => b.type === "text");
  const text = (finalText.length ? finalText : textBlocks).map((b) => b.text ?? "").join("").trim();
  if (!text) throw new ProviderError("Claude boş cevap döndü", { kind: "transient" });
  const urls = textBlocks.flatMap((b) => b.citations ?? []).filter((c) => c.type === "web_search_result_location" && c.url).map((c) => c.url!);
  const queries = blocks.filter((b) => b.type === "server_tool_use" && b.name === "web_search").map((b) => b.input?.query ?? "").filter(Boolean);
  const u = json.usage ?? {};
  const inputTokens = (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0);
  const outputTokens = u.output_tokens ?? 0;
  const searches = u.server_tool_use?.web_search_requests ?? queries.length;
  const cost = estimateCost({ ...cfg.price, perCall: cfg.price.perCall * searches }, inputTokens, outputTokens);
  return {
    promptId, provider: "claude", model: cfg.model,
    method: cfg.useSearch ? "api_with_search" : "api_no_search",
    dataOrigin: "live_api", billing: cfg.billing,
    answerText: text, citedUrls: [...new Set(urls)], searchQueries: queries,
    inputTokens, outputTokens, costUsd: cost, paidEquivalentUsd: cost,
  };
}

export class ClaudeProvider implements Provider {
  readonly config: ProviderConfig;
  private apiKey: string;
  private fetchFn: FetchLike;
  constructor(apiKey: string, config: ProviderConfig = CLAUDE_DEFAULT, fetchFn: FetchLike = fetch) {
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY tanımlı değil");
    this.apiKey = apiKey; this.config = config; this.fetchFn = fetchFn;
  }
  async ask(promptId: string, prompt: string, signal?: AbortSignal): Promise<ProviderResult> {
    let res: Response;
    try {
      res = await this.fetchFn("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": this.apiKey, "anthropic-version": ANTHROPIC_VERSION },
        body: JSON.stringify({
          model: this.config.model,
          max_tokens: this.config.worstCaseTokens.output,
          messages: [{ role: "user", content: prompt }],
          ...(this.config.useSearch ? {
            tools: [{ type: CLAUDE_SEARCH_TOOL, name: "web_search", max_uses: CLAUDE_MAX_SEARCHES, user_location: searchLocation(this.config.searchCountry) }],
          } : {}),
        }),
        signal: signal ?? AbortSignal.timeout(90_000),
      });
    } catch (e) {
      throw networkError("Claude", e);
    }
    if (!res.ok) {
      const raw = (await res.text()).split(this.apiKey).join("***");
      let kind = classifyHttpError(res.status, raw, { searchRequested: this.config.useSearch, freeTier: false });
      const b = raw.toLowerCase();
      if (b.includes("credit balance is too low")) kind = "quota_exceeded";
      else if (b.includes("web search is not enabled")) kind = "unsupported_feature";
      else if (res.status === 529) kind = "transient"; // overloaded
      throw new ProviderError(`Claude HTTP ${res.status} [${kind}]: ${raw.slice(0, 600)}`, { kind, status: res.status });
    }
    return parseClaudeResponse((await res.json()) as ClaudeResponse, promptId, this.config);
  }
}
