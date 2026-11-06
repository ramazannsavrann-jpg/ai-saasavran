// Ölçüm akışı (kodla yönetilir, LLM "orchestrator" yok):
// önbellek → ücretli API kilidi → müşteri kotası → görev bütçesi → çağrı → gerçek maliyeti kaydet.
// Durma koşulları açık ve sonludur: sonsuz döngü / kontrolsüz tekrar mümkün değildir.
//
// Hata sınıfına göre davranış:
//   transient            → en fazla 2 tekrar; yine olmazsa o soru atlanır. Arka arkaya 3 soru düşerse durulur.
//   quota_exceeded       → durulur (ücretsiz katmanda ücretliye GEÇİLMEZ)
//   unsupported_feature  → durulur (ör. ücretsiz katmanda arama)
//   auth_error           → durulur
//   model_not_found      → durulur
//   invalid_request      → o soru atlanır; arka arkaya 3 olursa durulur

import { BudgetGuard, ResponseCache } from "./budget.ts";
import { assertBillingAllowed, PaidApiBlocked } from "./providers/registry.ts";
import { type ApiErrorClass, type Provider, type ProviderResult, ProviderError, estimateCost } from "./providers/types.ts";
import type { UsageGate } from "./usage.ts";

export type StopReason =
  | "completed"
  | "run_budget"
  | "monthly_call_quota" | "monthly_cost_cap" | "workspace_paused" | "provider_free_daily_limit"
  | "paid_api_blocked"
  | "too_many_failures"
  | ApiErrorClass;

export const STOPPING: Record<ApiErrorClass, boolean> = {
  transient: false, invalid_request: false,
  quota_exceeded: true, unsupported_feature: true, auth_error: true, model_not_found: true,
};

export interface RunItem { result: ProviderResult; repetition: number; fromCache: boolean }

export interface RunOutcome {
  items: RunItem[];
  /** geriye dönük uyum: yalnızca sonuçlar */
  results: ProviderResult[];
  stop: StopReason;
  stopMessage?: string;
  errorClass?: ApiErrorClass;
  skipped: number;
  errors: { promptId: string; kind: ApiErrorClass; message: string }[];
  cacheHits: number;
}

export async function runPrompts(opts: {
  workspaceId: string;
  provider: Provider;
  prompts: { id: string; text: string }[];
  repetitions: number;
  guard: BudgetGuard;
  cache: ResponseCache<ProviderResult>;
  gate: UsageGate;
  env: Record<string, string | undefined>;
  day: string;
  maxRetries?: number;
  sleep?: (ms: number) => Promise<void>;
  onItem?: (item: RunItem) => Promise<void>;
  onFailedCall?: (promptId: string, kind: ApiErrorClass) => Promise<void>;
}): Promise<RunOutcome> {
  const { workspaceId, provider, prompts, repetitions, guard, cache, gate, env, day } = opts;
  const maxRetries = Math.min(opts.maxRetries ?? 2, 2); // sabit üst sınır
  const sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const cfg = provider.config;
  const worst = estimateCost(cfg.price, cfg.worstCaseTokens.input, cfg.worstCaseTokens.output);
  const total = prompts.length * repetitions;
  const out: RunOutcome = { items: [], results: [], stop: "completed", skipped: 0, errors: [], cacheHits: 0 };
  const stop = (reason: StopReason, msg: string, done: number, kind?: ApiErrorClass): RunOutcome => {
    out.stop = reason; out.stopMessage = msg; out.skipped = total - done; out.errorClass = kind; return out;
  };
  const push = async (item: RunItem) => {
    out.items.push(item); out.results.push(item.result);
    if (opts.onItem) await opts.onItem(item);
  };

  try {
    assertBillingAllowed(provider, env);
  } catch (e) {
    if (e instanceof PaidApiBlocked) return stop("paid_api_blocked", e.message, 0);
    throw e;
  }

  let done = 0;
  let consecutiveFailures = 0;
  for (const p of prompts) {
    for (let r = 1; r <= repetitions; r++, done++) {
      const key = ResponseCache.key(cfg.provider, cfg.model, p.text, r, day);
      const cached = cache.get(key);
      if (cached) { out.cacheHits++; await push({ result: cached, repetition: r, fromCache: true }); continue; }

      if (cfg.billing === "paid" && guard.spentUsd + worst > guard.maxUsd) {
        return stop("run_budget", `Görev tavanı ${guard.maxUsd} $`, done);
      }
      const res = await gate.reserve(workspaceId, cfg, worst);
      if (!res.ok) return stop(res.reason, res.message, done);

      let attempt = 0;
      for (;;) {
        try {
          const result = await provider.ask(p.id, p.text);
          if (result.costUsd > 0) guard.commit(result.costUsd);
          await gate.record(workspaceId, result);
          cache.set(key, result);
          await push({ result, repetition: r, fromCache: false });
          consecutiveFailures = 0;
          break;
        } catch (e) {
          const err = e instanceof ProviderError ? e : new ProviderError(String(e), { kind: "invalid_request" });
          if (err.kind === "transient" && attempt < maxRetries) {
            attempt++;
            await sleep(1000 * 2 ** attempt);
            continue;
          }
          out.errors.push({ promptId: p.id, kind: err.kind, message: err.message });
          if (opts.onFailedCall) await opts.onFailedCall(p.id, err.kind);
          if (STOPPING[err.kind]) return stop(err.kind, err.message, done + 1, err.kind);
          if (++consecutiveFailures >= 3) return stop("too_many_failures", err.message, done + 1, err.kind);
          break; // bu soru/tekrar atlanır
        }
      }
    }
  }
  return out;
}
