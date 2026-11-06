// Gemini Developer API (Google AI Studio anahtarı) adaptörü.
// Uç nokta: POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
// Arama dayanağı: tools: [{ google_search: {} }]
// 2026-11-06 gerçek test: gemini-2.5-flash-lite yeni kullanıcılara kapalı (HTTP 404); Google 3.5 Flash-Lite'ı öneriyor.
// Fiyat sayfasına göre Gemini 3.x'te ücretsiz katmanda arama dayanağı YOK; ücretli katmanda ayda 5.000 ücretsiz,
// sonra 1.000 dayanaklı istek 14 $.

import {
  type FetchLike, type Provider, type ProviderConfig, type ProviderResult,
  ProviderError, estimateCost,
} from "./types.ts";

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const GROUNDING_REDIRECT_HOST = "vertexaisearch.cloud.google.com";

export const GEMINI_FREE_DEFAULT: ProviderConfig = {
  provider: "gemini",
  model: "gemini-3.5-flash-lite",
  billing: "free",
  useSearch: true,
  // Ücretli eşdeğer: $0.30 / $2.50 per 1M; aylık 5.000 ücretsiz dayanaktan sonra 1.000 istek 14 $.
  price: {
    inputPerMTok: 0.30, outputPerMTok: 2.50, perCall: 0.014,
    source: "https://aistudio.google.com/docs/pricing", checkedOn: "2026-11-06",
  },
  freeDailyCallLimit: 450, // Google ücretsiz sınırları artık yayımlamıyor; AI Studio'dan teyit edilecek. Kendi güvenli tavanımız.
  worstCaseTokens: { input: 1_000, output: 2_000 },
};

interface GeminiResponse {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    finishReason?: string;
    groundingMetadata?: {
      webSearchQueries?: string[];
      groundingChunks?: { web?: { uri?: string; title?: string } }[];
    };
  }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number };
  promptFeedback?: { blockReason?: string };
}

/** Gemini kaynak bağlantıları Google yönlendirme adresidir; gerçek alan adı "title" alanındadır. */
export function resolveGroundingUrl(uri: string | undefined, title: string | undefined): string | null {
  if (!uri && !title) return null;
  try {
    const host = uri ? new URL(uri).hostname : "";
    if (host === GROUNDING_REDIRECT_HOST || !uri) {
      return title && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(title.trim()) ? `https://${title.trim().toLowerCase()}` : null;
    }
    return uri;
  } catch {
    return null;
  }
}

export function parseGeminiResponse(json: GeminiResponse, promptId: string, cfg: ProviderConfig): ProviderResult {
  if (json.promptFeedback?.blockReason) {
    throw new ProviderError(`Gemini isteği engelledi: ${json.promptFeedback.blockReason}`, { retryable: false });
  }
  const cand = json.candidates?.[0];
  const text = (cand?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
  if (!text) throw new ProviderError(`Gemini boş cevap döndü (finishReason=${cand?.finishReason ?? "?"})`, { retryable: true });

  const gm = cand?.groundingMetadata;
  const urls = (gm?.groundingChunks ?? [])
    .map((c) => resolveGroundingUrl(c.web?.uri, c.web?.title))
    .filter((u): u is string => !!u);

  const inputTokens = json.usageMetadata?.promptTokenCount ?? 0;
  const outputTokens = (json.usageMetadata?.candidatesTokenCount ?? 0) + (json.usageMetadata?.thoughtsTokenCount ?? 0);
  const grounded = cfg.useSearch && (gm?.groundingChunks?.length ?? 0) > 0;
  const paidEquivalentUsd = estimateCost(
    { ...cfg.price, perCall: grounded ? cfg.price.perCall : 0 }, inputTokens, outputTokens,
  );

  return {
    promptId,
    provider: "gemini",
    model: cfg.model,
    method: cfg.useSearch ? "api_with_search" : "api_no_search",
    dataOrigin: "live_api",
    billing: cfg.billing,
    answerText: text,
    citedUrls: [...new Set(urls)],
    searchQueries: gm?.webSearchQueries ?? [],
    inputTokens,
    outputTokens,
    costUsd: cfg.billing === "free" ? 0 : paidEquivalentUsd,
    paidEquivalentUsd,
  };
}

export class GeminiProvider implements Provider {
  readonly config: ProviderConfig;
  private apiKey: string;
  private fetchFn: FetchLike;
  constructor(apiKey: string, config: ProviderConfig = GEMINI_FREE_DEFAULT, fetchFn: FetchLike = fetch) {
    if (!apiKey) throw new Error("GEMINI_API_KEY tanımlı değil");
    this.apiKey = apiKey;
    this.config = config;
    this.fetchFn = fetchFn;
  }

  async ask(promptId: string, prompt: string, signal?: AbortSignal): Promise<ProviderResult> {
    const body = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      ...(this.config.useSearch ? { tools: [{ google_search: {} }] } : {}),
      generationConfig: { maxOutputTokens: this.config.worstCaseTokens.output, temperature: 1 },
    };
    const res = await this.fetchFn(`${BASE}/${encodeURIComponent(this.config.model)}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": this.apiKey },
      body: JSON.stringify(body),
      signal: signal ?? AbortSignal.timeout(60_000),
    });
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300).replace(this.apiKey, "***");
      throw new ProviderError(`Gemini HTTP ${res.status}: ${detail}`, {
        status: res.status,
        retryable: res.status === 429 || res.status >= 500,
      });
    }
    return parseGeminiResponse((await res.json()) as GeminiResponse, promptId, this.config);
  }
}
