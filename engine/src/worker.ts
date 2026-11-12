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
import { classifyAnswer, CLASSIFY_WORST_USD } from "./classify.ts";
import { buildProductQuestion, judgeProduct } from "./product.ts";
import { matchShopping, searchShopping, shoppingQuery, shoppingSearchesLeft, ShoppingError, type ShoppingTarget } from "./shopping.ts";
import { assertBillingAllowed } from "./providers/registry.ts";
import { estimateCost } from "./providers/types.ts";
import { OPENAI_DEFAULT } from "./providers/openai.ts";
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
  private runId: string | null;
  constructor(db: SupabaseClient, runId: string | null) { this.db = db; this.runId = runId; }
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

/** Canlı aramada çalışacak motorlar, sırayla. LIVE_ENGINES ile değiştirilebilir (ör. "openai"). */
export const DEFAULT_LIVE_ENGINES = "openai,claude";

/**
 * Ölçüm türüne göre motor listesi. Canlı aramada ücretli arama yapan tüm etkin motorlar
 * (varsayılan: önce ChatGPT, sonra Claude); diğer türlerde tek motor.
 */
export function chooseProviders(type: MeasurementType, env: Record<string, string | undefined>, brandNames: string[], seed: string, fetchFn?: FetchLike): Provider[] {
  if (type === "simulated") return [new SimulatedProvider(brandNames, seed)];
  const search = type === "live_search" ? "true" : "false";
  const { providers } = buildProviders({ ...env, GEMINI_SEARCH: search, CLAUDE_SEARCH: "true" }, fetchFn);
  if (type === "live_search") {
    // Ücretsiz Gemini'de arama yok; canlı aramada yalnız ücretli, aramalı motorlar
    const order = (env.LIVE_ENGINES || DEFAULT_LIVE_ENGINES).split(",").map((x) => x.trim()).filter(Boolean);
    const live = providers.filter((p) => p.config.useSearch && p.config.billing === "paid");
    return order.map((name) => live.find((p) => p.config.provider === name)).filter((p): p is Provider => !!p);
  }
  const g = providers.find((p) => !p.config.useSearch && p.config.provider === "gemini");
  return g ? [g] : [];
}

export function chooseProvider(type: MeasurementType, env: Record<string, string | undefined>, brandNames: string[], seed: string, fetchFn?: FetchLike): Provider | null {
  return chooseProviders(type, env, brandNames, seed, fetchFn)[0] ?? null;
}

/** Birden çok motorla yapılan ölçümün durma nedenini özetler: biri tamamlandıysa ve diğeri durduysa o neden yazılır. */
function combineStops(outs: { stop: StopReason; stopMessage?: string; errorClass?: ApiErrorClass; provider: string }[]) {
  const bad = outs.find((o) => o.stop !== "completed");
  if (!bad) return { stop: "completed" as StopReason };
  return { stop: bad.stop, errorClass: bad.errorClass, stopMessage: outs.length > 1 ? `${bad.provider}: ${bad.stopMessage ?? bad.stop}` : bad.stopMessage };
}

export async function processNextRun(deps: WorkerDeps): Promise<WorkerResult | null> {
  const { db, env } = deps;
  const now = deps.now ?? (() => new Date());
  const claimed = must(await db.rpc("claim_next_run"), "claim_next_run") as Array<Record<string, any>>;
  const run = claimed?.[0];
  if (!run) return null;

  const finish = async (r: Omit<WorkerResult, "runId">, used?: Provider[], msg?: string) => {
    must(await db.rpc("finish_run", {
      p_run: run.id, p_status: r.status, p_stop_reason: r.stop, p_error_class: r.errorClass ?? null,
      p_error: msg ?? null, p_ok: r.ok, p_failed: r.failed,
      p_provider: used?.length ? used.map((p) => p.config.provider).join(",") : null,
      p_model: used?.length ? used.map((p) => p.config.model).join(",") : null,
    }), "finish_run");
    return { runId: run.id as string, ...r };
  };

  try {
    const target = must(await db.from("brands").select("id,name,aliases,website,country").eq("id", run.brand_id).single(), "marka") as any;
    const comps = must(await db.from("brands").select("id,name,aliases,website").eq("owner_brand_id", run.brand_id).eq("is_competitor", true), "rakipler") as any[];
    const prompts = must(await db.from("prompts").select("id,text").eq("brand_id", run.brand_id).eq("active", true).order("created_at"), "sorular") as any[];
    const ws = must(await db.from("workspaces").select("plan,kind").eq("id", run.workspace_id).single(), "workspace") as any;

    const brands: BrandRef[] = [target, ...comps].map((b) => ({ id: b.id, name: b.name, aliases: b.aliases ?? [], domain: domainOf(b.website) }));
    const day = now().toISOString().slice(0, 10);
    const all = chooseProviders(run.measurement_type, { ...env, SEARCH_COUNTRY: target.country || env.SEARCH_COUNTRY }, brands.map((b) => b.name), `${run.id}`, deps.fetchFn);
    // Canlı aramada tüm etkin motorlar (ChatGPT + Claude). Müşteri paketlerinde Claude her soruyu 1 kez sorar
    // (paket tavanları buna göre hesaplı: pricing.ts "+ Claude" satırları); Growth Lab'de her motor 2 tekrar.
    const providers = run.measurement_type === "live_search" ? all : all.slice(0, 1);
    if (!providers.length) {
      return await finish({ status: "failed", stop: "provider_not_configured", ok: 0, failed: 0 }, undefined,
        run.measurement_type === "live_search" ? "Canlı arama sağlayıcısı etkin değil" : "Gemini anahtarı tanımlı değil");
    }

    const gate = new DbUsageGate(db, run.id);
    const guard = new BudgetGuard(Number(run.max_cost_usd));
    // "Önerildi mi" LLM kontrolü: ücretli canlı ölçümlerde, OpenAI anahtarıyla ve açıkça etkinleştirildiyse
    const classifyModel = env.OPENAI_MODEL || OPENAI_DEFAULT.model;
    const repetitions = ws.plan === "free" || run.measurement_type === "simulated" ? 1 : 2;
    let failed = 0;
    let lastFailKind: ApiErrorClass | undefined;
    let ok = 0;
    const outs: { stop: StopReason; stopMessage?: string; errorClass?: ApiErrorClass; provider: string }[] = [];
    const cache = new ResponseCache<ProviderResult>(86_400_000);
    for (const provider of providers) {
      const llmClassify = env.LLM_CLASSIFY === "true" && provider.config.billing === "paid" && provider.config.useSearch && !!env.OPENAI_API_KEY;
      const outcome = await runPrompts({
        workspaceId: run.workspace_id, provider, prompts,
        repetitions: provider.config.provider === "claude" && ws.kind !== "growth_lab" ? 1 : repetitions,
        guard, cache,
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
          const classifier = new Map<string, string>();
          const seen = brands.filter((b) => hits.find((h) => h.brandId === b.id)?.mentioned);
          if (llmClassify && seen.length > 0 && guard.remainingUsd > CLASSIFY_WORST_USD) {
            try {
              const c = await classifyAnswer({ apiKey: env.OPENAI_API_KEY!, model: classifyModel, price: OPENAI_DEFAULT.price, answer: result.answerText, names: seen.map((b) => b.name), fetchFn: deps.fetchFn });
              if (c.costUsd > 0) guard.commit(c.costUsd);
              must(await db.rpc("record_aux_call", { p_workspace: run.workspace_id, p_run: run.id, p_task: "classify", p_provider: "openai", p_model: c.model, p_in: c.inputTokens, p_out: c.outputTokens, p_cost: c.costUsd }), "record_aux_call");
              for (const b of seen) {
                const label = c.labels[b.name]; const h = hits.find((x) => x.brandId === b.id)!;
                if (!label) continue;
                h.recommended = label === "recommended";
                if (!h.recommended) h.rank = null;
                classifier.set(b.id, `llm:${c.model}`);
              }
            } catch { /* kural sonucu geçerli kalır */ }
          }
          must(await db.from("mentions").insert(hits.map((h) => ({
            response_id: resp.id, workspace_id: run.workspace_id, brand_id: h.brandId,
            mentioned: h.mentioned, recommended: h.recommended, cited: h.cited, rank: h.rank, classifier: classifier.get(h.brandId) ?? "rules_v3",
          }))), "anılma kaydı");
        },
        onFailedCall: async (_pid, kind) => { failed++; lastFailKind = kind; await gate.recordFailure(run.workspace_id, provider.config, kind); },
      });
      ok += outcome.items.length;
      outs.push({ stop: outcome.stop, stopMessage: outcome.stopMessage, errorClass: outcome.errorClass, provider: provider.config.provider });
      // Bütçe/kota durması bütün ölçüm için geçerli: sonraki motora geçilmez
      if (BUDGET_STOPS.has(outcome.stop)) break;
    }

    const c = combineStops(outs);
    const status = ok > 0 ? "done" : BUDGET_STOPS.has(c.stop) ? "budget_blocked" : "failed";
    const used = providers.filter((p) => outs.some((o) => o.provider === p.config.provider));
    // Bütün çağrılar tek tek başarısız olduysa (ölçüm "tamamlandı" ama cevap yok) nedeni boş kalmasın
    const errorClass = c.errorClass ?? (status === "failed" ? lastFailKind : undefined);
    const msg = c.stopMessage ?? (status === "failed" && failed > 0 ? `Tüm çağrılar başarısız oldu (${failed})` : undefined);
    return await finish({ status, stop: c.stop, errorClass, ok, failed }, used, msg);
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

/**
 * Ürün Doğruluğu (pilot): bekleyen kontrolleri işler. Her kontrol = 1 canlı aramalı ChatGPT cevabı + 1 karşılaştırma çağrısı.
 * Kota ve harcama tavanı ölçümlerle aynı kapıdan geçer. Başarısız olursa istek temizlenir (tekrar tekrar para harcanmaz).
 */
export async function processProductChecks(deps: WorkerDeps, max = 5): Promise<{ productId: string; status: string }[]> {
  const { db, env } = deps;
  const pending = must(await db.rpc("pending_product_checks", { p_limit: max }), "pending_product_checks") as
    { product_id: string; workspace_id: string; brand_name: string; product_name: string; price: string | null; facts: string; country: string | null }[];
  const out: { productId: string; status: string }[] = [];
  const clear = async (id: string) => { await db.from("products").update({ check_requested_at: null }).eq("id", id); };
  for (const p of pending) {
    const { providers } = buildProviders({ ...env, SEARCH_COUNTRY: p.country || env.SEARCH_COUNTRY }, deps.fetchFn);
    const provider = providers.find((x) => x.config.provider === "openai");
    if (!provider) { await clear(p.product_id); out.push({ productId: p.product_id, status: "provider_not_configured" }); continue; }
    try { assertBillingAllowed(provider, env); } catch { await clear(p.product_id); out.push({ productId: p.product_id, status: "paid_api_blocked" }); continue; }
    const cfg = provider.config;
    const gate = new DbUsageGate(db, null);
    const worst = estimateCost({ ...cfg.price, perCall: cfg.price.perCall * (cfg.worstCaseToolCalls ?? 1) }, cfg.worstCaseTokens.input, cfg.worstCaseTokens.output);
    const res = await gate.reserve(p.workspace_id, cfg, worst);
    if (!res.ok) { await clear(p.product_id); out.push({ productId: p.product_id, status: res.reason }); continue; }
    const question = buildProductQuestion(p.brand_name, p.product_name, p.country);
    try {
      const result = await provider.ask(p.product_id, question);
      await gate.record(p.workspace_id, result);
      let verdict = null as Awaited<ReturnType<typeof judgeProduct>> | null;
      try {
        verdict = await judgeProduct({ apiKey: env.OPENAI_API_KEY!, model: cfg.model, price: cfg.price, product: `${p.brand_name} ${p.product_name}`, productPrice: p.price, facts: p.facts, answer: result.answerText, fetchFn: deps.fetchFn });
        must(await db.rpc("record_aux_call", { p_workspace: p.workspace_id, p_run: null, p_task: "product_judge", p_provider: "openai", p_model: cfg.model, p_in: verdict.inputTokens, p_out: verdict.outputTokens, p_cost: verdict.costUsd }), "record_aux_call");
      } catch { verdict = null; }
      must(await db.from("product_checks").insert({
        workspace_id: p.workspace_id, product_id: p.product_id, provider: result.provider, model: result.model, question,
        answer_text: result.answerText, cited_urls: result.citedUrls, recognized: verdict?.verdict.recognized ?? null,
        claims: verdict?.verdict.claims ?? [], judge: verdict ? `llm:${cfg.model}` : null, cost_usd: result.costUsd + (verdict?.costUsd ?? 0),
      }), "product_checks");
      out.push({ productId: p.product_id, status: verdict ? "done" : "done_without_judge" });
    } catch (e) {
      await gate.recordFailure(p.workspace_id, cfg, "transient").catch(() => {});
      await clear(p.product_id);
      out.push({ productId: p.product_id, status: `failed: ${(e as Error).message.slice(0, 80)}` });
    }
  }
  return out;
}

/**
 * Google Shopping görünürlüğü: ücretli alanlardaki kendi ürünleri haftada bir (ya da kullanıcı isteğiyle) Google Shopping'de arar.
 * SERPAPI_KEY yoksa hiçbir şey yapmaz. Her çalıştırmada en fazla `max` arama; SerpApi'de kalan hak SERPAPI_RESERVE'in
 * (varsayılan 10) altına inerse durur. Bir ürün 20 saatte en fazla bir kez denenir; anahtar/kota hatasında tüm iş durur.
 */
export async function processShoppingChecks(deps: WorkerDeps, max = 5): Promise<{ productId: string; status: string }[] | string> {
  const { db, env } = deps;
  const key = env.SERPAPI_KEY;
  if (!key) return "SERPAPI_KEY yok";
  const pending = must(await db.rpc("pending_shopping_checks", { p_limit: max }), "pending_shopping_checks") as
    { product_id: string; workspace_id: string; brand_name: string; product_name: string; shopping_query: string | null; country: string; rivals: { id: string; name: string; brand: string | null }[]; requested: boolean }[];
  if (!pending.length) return [];
  const reserve = Number(env.SERPAPI_RESERVE || 10);
  let left = await shoppingSearchesLeft(key, deps.fetchFn);
  const out: { productId: string; status: string }[] = [];
  for (const p of pending) {
    if (left !== null && left <= reserve) { out.push({ productId: p.product_id, status: "serpapi_quota_low" }); break; }
    must(await db.from("products").update({ shopping_attempted_at: (deps.now ?? (() => new Date()))().toISOString() }).eq("id", p.product_id), "shopping_attempted_at");
    const query = shoppingQuery(p.brand_name, p.product_name, p.shopping_query);
    const targets: ShoppingTarget[] = [
      { id: p.product_id, name: p.product_name, brand: p.brand_name, kind: "own" },
      ...(p.rivals ?? []).map((r) => ({ id: r.id, name: r.name, brand: r.brand, kind: "rival" as const })),
    ];
    try {
      const items = await searchShopping({ apiKey: key, query, country: p.country, fetchFn: deps.fetchFn });
      if (left !== null) left--;
      const r = matchShopping(items, targets, query, p.country);
      must(await db.from("shopping_checks").insert({
        workspace_id: p.workspace_id, product_id: p.product_id, query, country: p.country,
        own_position: r.own?.position ?? null, own_price: r.own?.price ?? null, own_seller: r.own?.seller ?? null, own_count: r.ownCount,
        rivals: r.rivals, items: r.items.map((i) => ({ position: i.position, title: i.title, source: i.source, price: i.price, link: i.link, match: i.match })),
      }), "shopping_checks");
      if (p.requested) await db.from("products").update({ shopping_requested_at: null }).eq("id", p.product_id);
      out.push({ productId: p.product_id, status: r.own ? `found:${r.own.position}` : "not_in_list" });
    } catch (e) {
      const kind = e instanceof ShoppingError ? e.kind : "transient";
      if (p.requested) await db.from("products").update({ shopping_requested_at: null }).eq("id", p.product_id);
      out.push({ productId: p.product_id, status: `failed(${kind}): ${(e as Error).message.slice(0, 80)}` });
      if (kind === "auth" || kind === "quota") break;
    }
  }
  return out;
}

/** Bakım: yarıda kalmış ölçümleri kapatır, önceki ayda kota nedeniyle durdurulan alanları açar. */
export async function maintain(deps: { db: SupabaseClient }, staleMinutes = 60): Promise<{ recovered: number; resumed: number; compedExpired: number }> {
  const recovered = must(await deps.db.rpc("recover_stale_runs", { p_minutes: staleMinutes }), "recover_stale_runs") as number;
  const resumed = must(await deps.db.rpc("resume_quota_paused"), "resume_quota_paused") as number;
  // süresi dolan ücretsiz (yöneticinin verdiği) paketler Free'ye döner
  const compedExpired = must(await deps.db.rpc("expire_comped"), "expire_comped") as number;
  return { recovered, resumed, compedExpired };
}

/** Sıradaki ölçümleri işler. Süre bütçesi dolunca yeni ölçüm almaz; böylece iş yarıda kesilmez. */
export async function processQueue(deps: WorkerDeps, maxRuns = 20, budgetMs = Infinity): Promise<WorkerResult[]> {
  const out: WorkerResult[] = [];
  const started = Date.now();
  for (let i = 0; i < maxRuns; i++) {
    if (Date.now() - started > budgetMs) break;
    const r = await processNextRun(deps);
    if (!r) break;
    out.push(r);
  }
  return out;
}

/** Bir markanın tüm tamamlanmış ölçümlerini güncel kurallar ve güncel marka bilgileriyle yeniden analiz eder (ücretsiz). */
export async function reanalyzeBrand(db: SupabaseClient, brandId: string): Promise<number> {
  const target = must(await db.from("brands").select("id,name,aliases,website").eq("id", brandId).single(), "marka") as any;
  const comps = must(await db.from("brands").select("id,name,aliases,website").eq("owner_brand_id", brandId).eq("is_competitor", true), "rakipler") as any[];
  const brands: BrandRef[] = [target, ...comps].map((b) => ({ id: b.id, name: b.name, aliases: b.aliases ?? [], domain: domainOf(b.website) }));
  const runs = must(await db.from("runs").select("id,workspace_id").eq("brand_id", brandId).eq("status", "done"), "ölçümler") as { id: string; workspace_id: string }[];
  let n = 0;
  for (const run of runs) {
    const resp = must(await db.from("responses").select("id,prompt_id,provider,answer_text,cited_urls").eq("run_id", run.id), "cevaplar") as any[];
    for (const r of resp) {
      const hits = analyzeResponse({ promptId: r.prompt_id, provider: r.provider, answerText: r.answer_text, citedUrls: r.cited_urls ?? [] }, brands);
      // LLM ile sınıflandırılmış "önerildi" kararları korunur (kural tabanlı yeniden hesap onları ezmez)
      const prev = must(await db.from("mentions").select("brand_id,recommended,classifier").eq("response_id", r.id), "önceki anılma") as { brand_id: string; recommended: boolean; classifier: string }[];
      const llm = new Map(prev.filter((x) => x.classifier?.startsWith("llm:")).map((x) => [x.brand_id, x]));
      must(await db.from("mentions").delete().eq("response_id", r.id), "eski anılma");
      must(await db.from("mentions").insert(hits.map((h) => {
        const k = h.mentioned ? llm.get(h.brandId) : undefined;
        return {
          response_id: r.id, workspace_id: run.workspace_id, brand_id: h.brandId, mentioned: h.mentioned,
          recommended: k ? k.recommended : h.recommended, cited: h.cited, rank: k && !k.recommended ? null : h.rank, classifier: k ? k.classifier : "rules_v3",
        };
      })), "anılma");
      n++;
    }
  }
  return n;
}

/** Marka bilgisi değiştiği için işaretlenen markaları yeniden analiz eder; işareti yalnız arada yeni değişiklik yoksa kaldırır. */
export async function processReanalysis(deps: { db: SupabaseClient }, limit = 20): Promise<{ brandId: string; responses: number }[]> {
  const ids = must(await deps.db.rpc("pending_reanalysis", { p_limit: limit }), "bekleyen yeniden analiz") as string[];
  const out: { brandId: string; responses: number }[] = [];
  for (const id of ids) {
    const before = must(await deps.db.from("brands").select("reanalyze_requested_at").eq("id", id).single(), "işaret") as { reanalyze_requested_at: string };
    const n = await reanalyzeBrand(deps.db, id);
    must(await deps.db.from("brands").update({ reanalyze_requested_at: null }).eq("id", id).eq("reanalyze_requested_at", before.reanalyze_requested_at), "işaret kaldır");
    out.push({ brandId: id, responses: n });
  }
  return out;
}

/** Growth Lab'deki tüm markaları yeniden analiz eder (kural değişikliğinden sonra; ücretsiz). */
export async function reanalyzeRuns(db: SupabaseClient, kind: "growth_lab" = "growth_lab"): Promise<{ runs: number; responses: number }> {
  const ws = must(await db.from("workspaces").select("id").eq("kind", kind), "alanlar") as { id: string }[];
  if (!ws.length) return { runs: 0, responses: 0 };
  const brands = must(await db.from("brands").select("id").in("workspace_id", ws.map((w) => w.id)).eq("is_competitor", false), "markalar") as { id: string }[];
  let responses = 0;
  for (const b of brands) responses += await reanalyzeBrand(db, b.id);
  return { runs: brands.length, responses };
}
