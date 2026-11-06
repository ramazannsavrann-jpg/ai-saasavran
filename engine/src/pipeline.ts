// Ölçüm akışı (kodla yönetilir, LLM "orchestrator" yok):
// önbellek → ücretli API kilidi → müşteri kotası → görev bütçesi → çağrı → gerçek maliyeti kaydet.
// Durma koşulları açık ve sonludur: sonsuz döngü / kontrolsüz tekrar mümkün değildir.

import { BudgetGuard, ResponseCache } from "./budget.ts";
import { assertBillingAllowed, PaidApiBlocked } from "./providers/registry.ts";
import { type Provider, type ProviderResult, ProviderError, estimateCost } from "./providers/types.ts";
import type { UsageGate } from "./usage.ts";

export type StopReason =
  | "completed"
  | "run_budget"
  | "monthly_call_quota" | "monthly_cost_cap" | "workspace_paused" | "provider_free_daily_limit"
  | "paid_api_blocked"
  | "provider_error";

export interface RunOutcome {
  results: ProviderResult[];
  stop: StopReason;
  stopMessage?: string;
  skipped: number;
  errors: { promptId: string; message: string }[];
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
}): Promise<RunOutcome> {
  const { workspaceId, provider, prompts, repetitions, guard, cache, gate, env, day } = opts;
  const maxRetries = Math.min(opts.maxRetries ?? 1, 2); // en fazla 2 tekrar deneme, sabit üst sınır
  const sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const cfg = provider.config;
  const worst = estimateCost(cfg.price, cfg.worstCaseTokens.input, cfg.worstCaseTokens.output);
  const total = prompts.length * repetitions;
  const out: RunOutcome = { results: [], stop: "completed", skipped: 0, errors: [], cacheHits: 0 };
  const stop = (reason: StopReason, msg: string, done: number): RunOutcome => {
    out.stop = reason; out.stopMessage = msg; out.skipped = total - done; return out;
  };

  try {
    assertBillingAllowed(provider, env);
  } catch (e) {
    if (e instanceof PaidApiBlocked) return stop("paid_api_blocked", e.message, 0);
    throw e;
  }

  let done = 0;
  for (const p of prompts) {
    for (let r = 1; r <= repetitions; r++, done++) {
      const key = ResponseCache.key(cfg.provider, cfg.model, p.text, r, day);
      const cached = cache.get(key);
      if (cached) { out.results.push(cached); out.cacheHits++; continue; }

      // Görev bütçesi yalnızca gerçek para harcanan çağrılarda düşer
      const runCost = cfg.billing === "paid" ? worst : 0;
      if (runCost > 0 && guard.spentUsd + runCost > guard.maxUsd) {
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
          out.results.push(result);
          break;
        } catch (e) {
          const err = e instanceof ProviderError ? e : new ProviderError(String(e), { retryable: false });
          // Ücretsiz katmanda 429 = sağlayıcı kotası; tekrar denemek kotayı yakar ve ücretliye geçilmez → dur.
          if (err.status === 429 && cfg.billing === "free") {
            return stop("provider_free_daily_limit", err.message, done);
          }
          if (err.retryable && attempt < maxRetries) {
            attempt++;
            await sleep(1000 * 2 ** attempt);
            continue;
          }
          out.errors.push({ promptId: p.id, message: err.message });
          if (!err.retryable) return stop("provider_error", err.message, done + 1);
          break; // bu soruyu atla, devam et
        }
      }
    }
  }
  return out;
}
