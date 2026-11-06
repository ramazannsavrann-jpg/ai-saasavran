// Görev (run) başına maliyet tavanı ve günlük cevap önbelleği.

export class BudgetExceeded extends Error {}

export class BudgetGuard {
  private spent = 0;
  readonly maxUsd: number;
  constructor(maxUsd: number) {
    if (!(maxUsd > 0)) throw new Error("maxUsd > 0 olmalı");
    this.maxUsd = maxUsd;
  }
  get spentUsd() { return this.spent; }
  get remainingUsd() { return this.maxUsd - this.spent; }

  /** Çağrıdan ÖNCE en kötü durum tahminiyle izin iste. */
  reserve(worstCaseUsd: number) {
    if (this.spent + worstCaseUsd > this.maxUsd) {
      throw new BudgetExceeded(
        `Bütçe aşılır: harcanan ${this.spent.toFixed(4)} + tahmin ${worstCaseUsd.toFixed(4)} > tavan ${this.maxUsd}`,
      );
    }
  }
  /** Çağrıdan SONRA gerçek maliyeti kaydet. */
  commit(actualUsd: number) { this.spent += actualUsd; }
}

/** Basit TTL önbellek; üretimde aynı anahtar Postgres'te tutulur. */
export class ResponseCache<T> {
  private store = new Map<string, { at: number; value: T }>();
  hits = 0; misses = 0;
  private ttlMs: number;
  private now: () => number;
  constructor(ttlMs: number, now: () => number = Date.now) { this.ttlMs = ttlMs; this.now = now; }

  static key(provider: string, model: string, prompt: string, repetition: number, day: string) {
    return [provider, model, day, repetition, prompt.trim().toLocaleLowerCase("tr-TR")].join("|");
  }
  get(k: string): T | undefined {
    const e = this.store.get(k);
    if (e && this.now() - e.at < this.ttlMs) { this.hits++; return e.value; }
    this.misses++; return undefined;
  }
  set(k: string, v: T) { this.store.set(k, { at: this.now(), value: v }); }
}
