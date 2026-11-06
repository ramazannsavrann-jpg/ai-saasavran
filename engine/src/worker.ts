// Ölçüm işçisi: kuyruktaki run'ları alır, doğru sağlayıcıyla çalıştırır, sonuçları yazar.
// Yalnızca sunucuda (service role anahtarıyla) çalışır. Kota ve maliyet kuralları
// veritabanı fonksiyonlarıyla (reserve_engine_call / record_engine_call) uygulanır.

import type { SupabaseClient } from "@supabase/supabase-js";
import { BudgetGuard, ResponseCache } from "./budget.ts";
import { analyzeResponse, type BrandRef } from "./metrics.ts";
import { runPrompts, type StopReason } from "./pipeline.ts";
import { buildProviders } from "./providers/registry.ts";
import { SimulatedProvider } from "./providers/simulated.ts";
import { auditSite } from "./audit.ts";
import type { ApiErrorClass, FetchLike, Provider, ProviderConfig, ProviderResult } from "./providers/types.ts";
import type { Denial, Rejection, Reservation, UsageGate } from "./usage.ts";

type MeasurementType = "live_search" | "model_knowledge" | "simulated";

export interface WorkerDeps {
  db: SupabaseClient;
  env: Record<string, string | undefined>;
  fetchFn?: FetchLike;          // yalnızca testlerde enjekte edilir
  now?: () => Date;
  sleep?: (ms: number) => Promise<void>;
}

export interface WorkerResult {
  runId: string;
  status: "done" | "failed" | "budget_blocked";
  stop: StopReason | "provider_not_configured" | "worker_error";
  errorClass?: ApiErrorClass;
  ok: number;
  failed: number;
}

const BUDGET_STOPS = new Set(["monthly_call_quota", "monthly_cost_cap", "workspace_paused", "provider_free_daily_limit", "run_budget", "paid_not_allowed", "global_paid_cap"]);

function must<T>(r: { data: T | null; error: { message: string } | null }, what: string): T {
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return r.data as T;
}

function domainOf(website: string | null): string | undefined {
  if (!website) return undefined;
  try { return new URL(website.includes("://") ? website : `https://${website}`).hostname.replace(/^www\./, ""); } catch { return undefined; }
}

export class DbUsageGate implements UsageGate {
  private db: SupabaseClient;
  private runId: string;
  constructor(db: SupabaseClient, runId: string) { this.db = db; this.runId = runId; }
  async reserve(ws: string, cfg: ProviderConfig, worst: number): Promise<Reservation | Rejection> {
    const r = must(await this.db.rpc("reserve_engine_call", {
      p_workspace: ws, p_provider: cfg.provider, p_billing: cfg.billing,
      p_worst_paid_usd: cfg.billing === "paid" ? worst : 0,
      p_free_daily_limit: cfg.billing === "free" ? cfg.freeDailyCallLimit ?? null : null,
    }), "reserve_engine_call") as string;
    if (r === "ok") return { ok: true };
    return { ok: false, reason: r as Denial, message: r };
  }
  async record(ws: string, res: ProviderResult): Promise<void> {
    must(await this.db.rpc("record_engine_call", {
      p_workspace: ws, p_run: this.runId, p_provider: res.provider, p_model: res.model, p_billing: res.billing,
      p_in: res.inputTokens, p_out: res.outputTokens, p_cost: res.costUsd, p_paid_equiv: res.paidEquivalentUsd, p_ok: true,
    }), "record_engine_call");
  }
  async recordFailure(ws: string, cfg: ProviderConfig, kind: ApiErrorClass): Promise<void> {
    must(await this.db.rpc("record_engine_call", {
      p_workspace: ws, p_run: this.runId, p_provider: cfg.provider, p_model: cfg.model, p_billing: cfg.billing,
      p_in: 0, p_out: 0, p_cost: 0, p_paid_equiv: 0, p_ok: false, p_error_class: kind,
    }), "record_engine_call(fail)");
  }
}

export function chooseProvider(type: MeasurementType, env: Record<string, string | undefined>, brandNames: string[], seed: string, fetchFn?: FetchLike): Provider | null {
  if (type === "simulated") return new SimulatedProvider(brandNames, seed);
  const search = type === "live_search" ? "true" : "false";
  const { providers } = buildProviders({ ...env, GEMINI_SEARCH: search }, fetchFn);
  if (type === "live_search") {
    // Ücretsiz Gemini'de arama yok; canlı aramada ücretli sağlayıcı (önce OpenAI) seçilir
    return providers.find((p) => p.config.provider === "openai")
      ?? providers.find((p) => p.config.useSearch && p.config.billing === "paid") ?? null;
  }
  return providers.find((p) => !p.config.useSearch && p.config.provider === "gemini") ?? null;
}

export async function processNextRun(deps: WorkerDeps): Promise<WorkerResult | null> {
  const { db, env } = deps;
  const now = deps.now ?? (() => new Date());
  const claimed = must(await db.rpc("claim_next_run"), "claim_next_run") as Array<Record<string, any>>;
  const run = claimed?.[0];
  if (!run) return null;

  const finish = async (r: Omit<WorkerResult, "runId">, provider?: Provider, msg?: string) => {
    must(await db.rpc("finish_run", {
      p_run: run.id, p_status: r.status, p_stop_reason: r.stop, p_error_class: r.errorClass ?? null,
      p_error: msg ?? null, p_ok: r.ok, p_failed: r.failed,
      p_provider: provider?.config.provider ?? null, p_model: provider?.config.model ?? null,
    }), "finish_run");
    return { runId: run.id as string, ...r };
  };

  try {
    const target = must(await db.from("brands").select("id,name,aliases,website").eq("id", run.brand_id).single(), "marka") as any;
    const comps = must(await db.from("brands").select("id,name,aliases,website").eq("owner_brand_id", run.brand_id).eq("is_competitor", true), "rakipler") as any[];
    const prompts = must(await db.from("prompts").select("id,text").eq("brand_id", run.brand_id).eq("active", true).order("created_at"), "sorular") as any[];
    const ws = must(await db.from("workspaces").select("plan").eq("id", run.workspace_id).single(), "workspace") as any;

    const brands: BrandRef[] = [target, ...comps].map((b) => ({ id: b.id, name: b.name, aliases: b.aliases ?? [], domain: domainOf(b.website) }));
    const day = now().toISOString().slice(0, 10);
    const provider = chooseProvider(run.measurement_type, env, brands.map((b) => b.name), `${run.id}`, deps.fetchFn);
    if (!provider) {
      return await finish({ status: "failed", stop: "provider_not_configured", ok: 0, failed: 0 }, undefined,
        run.measurement_type === "live_search" ? "Canlı arama sağlayıcısı etkin değil" : "Gemini anahtarı tanımlı değil");
    }

    const gate = new DbUsageGate(db, run.id);
    const repetitions = ws.plan === "free" || run.measurement_type === "simulated" ? 1 : 2;
    let failed = 0;
    const outcome = await runPrompts({
      workspaceId: run.workspace_id, provider, prompts, repetitions,
      guard: new BudgetGuard(Number(run.max_cost_usd)), cache: new ResponseCache(86_400_000),
      gate, env, day, sleep: deps.sleep,
      onItem: async ({ result, repetition }) => {
        const resp = must(await db.from("responses").insert({
          workspace_id: run.workspace_id, run_id: run.id, prompt_id: result.promptId,
          provider: result.provider, model: result.model, method: result.method, repetition,
          answer_text: result.answerText, cited_urls: result.citedUrls, search_queries: result.searchQueries,
          data_origin: result.dataOrigin, measurement_type: run.measurement_type, billing: result.billing,
          input_tokens: result.inputTokens, output_tokens: result.outputTokens, cost_usd: result.costUsd,
        }).select("id").single(), "cevap kaydı") as any;
        const hits = analyzeResponse(result, brands);
        must(await db.from("mentions").insert(hits.map((h) => ({
          response_id: resp.id, workspace_id: run.workspace_id, brand_id: h.brandId,
          mentioned: h.mentioned, recommended: h.recommended, cited: h.cited, rank: h.rank, classifier: "rules_v2",
        }))), "anılma kaydı");
      },
      onFailedCall: async (_pid, kind) => { failed++; await gate.recordFailure(run.workspace_id, provider.config, kind); },
    });

    const ok = outcome.items.length;
    const status = ok > 0 ? "done" : BUDGET_STOPS.has(outcome.stop) ? "budget_blocked" : "failed";
    return await finish({ status, stop: outcome.stop, errorClass: outcome.errorClass, ok, failed }, provider, outcome.stopMessage);
  } catch (e) {
    return await finish({ status: "failed", stop: "worker_error", ok: 0, failed: 0 }, undefined, (e as Error).message);
  }
}

/** Haftalık ölçümleri sıraya alır (kota yetiyorsa). */
export async function scheduleWeekly(deps: WorkerDeps): Promise<number> {
  return must(await deps.db.rpc("schedule_weekly_runs", { p_limit: 50 }), "schedule_weekly_runs") as number;
}

/** Bekleyen web sitesi kontrollerini yapar. */
export async function processAudits(deps: WorkerDeps, max = 10): Promise<{ brandId: string; status: string }[]> {
  const { db } = deps;
  const pending = must(await db.rpc("pending_site_audits", { p_limit: max }), "pending_site_audits") as { brand_id: string; workspace_id: string; website: string }[];
  const out: { brandId: string; status: string }[] = [];
  for (const p of pending) {
    const b = must(await db.from("brands").select("name,aliases").eq("id", p.brand_id).single(), "marka") as { name: string; aliases: string[] };
    let res;
    try { res = await auditSite(p.website, [b.name, ...(b.aliases ?? [])], deps.fetchFn); }
    catch (e) { res = { url: p.website, status: "unreachable" as const, checks: [{ id: "reachable", ok: false, severity: "high" as const, title: "Siteye ulaşılamadı", detail: (e as Error).message.slice(0, 200) }] }; }
    must(await db.from("site_audits").insert({ workspace_id: p.workspace_id, brand_id: p.brand_id, url: res.url, status: res.status, checks: res.checks }), "site_audits");
    out.push({ brandId: p.brand_id, status: res.status });
  }
  return out;
}

export async function processQueue(deps: WorkerDeps, maxRuns = 20): Promise<WorkerResult[]> {
  const out: WorkerResult[] = [];
  for (let i = 0; i < maxRuns; i++) {
    const r = await processNextRun(deps);
    if (!r) break;
    out.push(r);
  }
  return out;
}

/**
 * Kayıtlı cevapları güncel kurallarla ve güncel marka bilgileriyle (takma ad, web sitesi) yeniden analiz eder.
 * API çağrısı yapmaz, ücretsizdir. Yalnız verilen çalışma alanı türündeki ölçümlere uygulanır.
 */
export async function reanalyzeRuns(db: SupabaseClient, kind: "growth_lab" = "growth_lab"): Promise<{ runs: number; responses: number }> {
  const ws = must(await db.from("workspaces").select("id").eq("kind", kind), "alanlar") as { id: string }[];
  if (!ws.length) return { runs: 0, responses: 0 };
  const runs = must(await db.from("runs").select("id,brand_id,workspace_id").in("workspace_id", ws.map((w) => w.id)).eq("status", "done"), "ölçümler") as { id: string; brand_id: string; workspace_id: string }[];
  let n = 0;
  for (const run of runs) {
    const target = must(await db.from("brands").select("id,name,aliases,website").eq("id", run.brand_id).single(), "marka") as any;
    const comps = must(await db.from("brands").select("id,name,aliases,website").eq("owner_brand_id", run.brand_id).eq("is_competitor", true), "rakipler") as any[];
    const brands: BrandRef[] = [target, ...comps].map((b) => ({ id: b.id, name: b.name, aliases: b.aliases ?? [], domain: domainOf(b.website) }));
    const resp = must(await db.from("responses").select("id,prompt_id,provider,answer_text,cited_urls").eq("run_id", run.id), "cevaplar") as any[];
    for (const r of resp) {
      const hits = analyzeResponse({ promptId: r.prompt_id, provider: r.provider, answerText: r.answer_text, citedUrls: r.cited_urls ?? [] }, brands);
      must(await db.from("mentions").delete().eq("response_id", r.id), "eski anılma");
      must(await db.from("mentions").insert(hits.map((h) => ({
        response_id: r.id, workspace_id: run.workspace_id, brand_id: h.brandId,
        mentioned: h.mentioned, recommended: h.recommended, cited: h.cited, rank: h.rank, classifier: "rules_v2",
      }))), "anılma");
      n++;
    }
  }
  return { runs: runs.length, responses: n };
}
