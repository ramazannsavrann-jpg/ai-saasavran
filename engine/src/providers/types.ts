// Sağlayıcıdan bağımsız sözleşme. Analiz motoru yalnızca bu tipleri bilir;
// yeni bir sağlayıcı/model eklemek motoru değiştirmez, sadece yeni bir adaptör ekler.

export type DataOrigin = "live_api" | "simulated";
export type BillingTier = "free" | "paid";

/** Fiyat kartı — kaynak ve kontrol tarihi zorunlu, böylece eskiyen fiyat fark edilir. */
export interface PriceCard {
  inputPerMTok: number;  // USD / 1M girdi token
  outputPerMTok: number; // USD / 1M çıktı token
  perCall: number;       // USD / çağrı (arama aracı / istek ücreti)
  source: string;
  checkedOn: string;     // YYYY-MM-DD
}

export interface ProviderConfig {
  provider: "gemini" | "openai" | "perplexity" | "mock";
  model: string;
  billing: BillingTier;          // bu anahtar/model ücretsiz mi ücretli mi kullanılıyor
  useSearch: boolean;            // arama dayanağı açık mı
  price: PriceCard;              // ücretli eşdeğer fiyat (free tier'da bile raporlamak için)
  freeDailyCallLimit?: number;   // ücretsiz katman günlük çağrı sınırı (sağlayıcı tarafı)
  worstCaseTokens: { input: number; output: number };
  /** Canlı aramada konum (ISO 3166-1 iki harf). Boşsa TR. */
  searchCountry?: string;
  /** Bir çağrıdaki en fazla ücretli araç (arama) sayısı; yoksa 1. */
  worstCaseToolCalls?: number;
}

export interface ProviderResult {
  promptId: string;
  provider: string;
  model: string;
  method: "api_with_search" | "api_no_search" | "simulation";
  dataOrigin: DataOrigin;
  billing: BillingTier;
  answerText: string;
  citedUrls: string[];
  searchQueries: string[];
  inputTokens: number;
  outputTokens: number;
  /** Gerçekte ödenen tutar (free tier'da 0). */
  costUsd: number;
  /** Aynı çağrı ücretli katmanda yapılsaydı maliyeti — fiyatlandırma kararı için. */
  paidEquivalentUsd: number;
}

export interface Provider {
  readonly config: ProviderConfig;
  ask(promptId: string, prompt: string, signal?: AbortSignal): Promise<ProviderResult>;
}

/** API hata sınıfları — veritabanındaki api_error_class ile birebir aynı. */
export type ApiErrorClass =
  | "unsupported_feature" // istenen özellik bu model/katmanda yok (ör. ücretsiz katmanda arama)
  | "quota_exceeded"      // kota/oran sınırı doldu
  | "auth_error"          // anahtar geçersiz / yetki yok
  | "model_not_found"     // model yok veya kullanıcıya kapalı
  | "transient"           // geçici bağlantı/sunucu hatası, tekrar denenebilir
  | "invalid_request";    // istek biçimi hatalı

export const RETRYABLE: Record<ApiErrorClass, boolean> = {
  unsupported_feature: false, quota_exceeded: false, auth_error: false,
  model_not_found: false, transient: true, invalid_request: false,
};

export class ProviderError extends Error {
  readonly kind: ApiErrorClass;
  readonly status?: number;
  constructor(message: string, opts: { kind: ApiErrorClass; status?: number }) {
    super(message);
    this.kind = opts.kind;
    this.status = opts.status;
  }
  get retryable() { return RETRYABLE[this.kind]; }
}

/**
 * HTTP hatasını sınıflandırır. Sağlayıcıya özgü ipuçları (Google "status" alanı, "limit: 0" gibi)
 * metin içinde aranır; emin olunamayan 4xx → invalid_request, 5xx → transient.
 */
export function classifyHttpError(status: number, body: string, ctx: { searchRequested: boolean; freeTier: boolean }): ApiErrorClass {
  const b = body.toLowerCase();
  if (status === 401 || b.includes("api key not valid") || b.includes("api_key_invalid") || b.includes("unauthenticated") || b.includes("invalid api key")) return "auth_error";
  if (status === 403 || b.includes("permission_denied")) {
    return b.includes("not supported") || b.includes("not available") ? "unsupported_feature" : "auth_error";
  }
  if (status === 404 || b.includes("no longer available") || (b.includes("model") && b.includes("not found"))) return "model_not_found";
  if (status === 429 || b.includes("resource_exhausted")) {
    // Ücretsiz katmanda sıfır kota = özellik bu katmanda hiç yok
    if (/limit:\s*0\b/.test(b) || /"quotavalue":\s*"0"/.test(b)) return "unsupported_feature";
    // Gemini 3.x ücretsiz katmanında arama dayanağı yok (fiyat sayfası; 2026-11-06 gerçek testte 429 döndü).
    if (ctx.searchRequested && ctx.freeTier) return "unsupported_feature";
    return "quota_exceeded";
  }
  if (status === 400 && (b.includes("not supported") || b.includes("is not available") || b.includes("unsupported"))) return "unsupported_feature";
  if (status === 408 || status >= 500) return "transient";
  return "invalid_request";
}

/** fetch'in kendisi patlarsa (ağ, zaman aşımı) → geçici hata. */
export function networkError(provider: string, e: unknown): ProviderError {
  const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  return new ProviderError(`${provider} bağlantı hatası: ${msg}`, { kind: "transient" });
}

export function estimateCost(p: PriceCard, inTok: number, outTok: number): number {
  return (inTok / 1e6) * p.inputPerMTok + (outTok / 1e6) * p.outputPerMTok + p.perCall;
}

/** fetch'i enjekte edilebilir yapar: testlerde gerçek ağ yerine kayıtlı cevap verilir. */
export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;
