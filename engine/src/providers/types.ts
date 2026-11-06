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

export class ProviderError extends Error {
  readonly retryable: boolean;
  readonly status?: number;
  constructor(message: string, opts: { retryable: boolean; status?: number }) {
    super(message);
    this.retryable = opts.retryable;
    this.status = opts.status;
  }
}

export function estimateCost(p: PriceCard, inTok: number, outTok: number): number {
  return (inTok / 1e6) * p.inputPerMTok + (outTok / 1e6) * p.outputPerMTok + p.perCall;
}

/** fetch'i enjekte edilebilir yapar: testlerde gerçek ağ yerine kayıtlı cevap verilir. */
export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;
