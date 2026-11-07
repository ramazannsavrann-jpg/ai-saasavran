// Veri tipleri ve sorgular. Tüm erişim kullanıcının oturumuyla yapılır; izolasyonu veritabanı (RLS) sağlar.
import { sb } from "./supabase";

export type MeasurementType = "live_search" | "model_knowledge" | "simulated";
export type WorkspaceKind = "business" | "agency" | "demo_lab" | "growth_lab";

export interface Workspace { id: string; name: string; kind: WorkspaceKind; plan: string; status: "active" | "paused"; paused_reason: string | null; paid_live_allowed: boolean }
export interface Brand {
  id: string; workspace_id: string; name: string; aliases: string[]; website: string | null;
  sector: string | null; city: string | null; is_competitor: boolean; owner_brand_id: string | null; data_origin: string;
  auto_weekly: boolean; audit_requested_at: string | null; reanalyze_requested_at: string | null;
}
export interface Prompt { id: string; brand_id: string; text: string; intent: Intent; active: boolean; created_at: string }
export type Intent = "informational" | "comparison" | "purchase" | "local";
export interface Run {
  id: string; brand_id: string; status: "queued" | "running" | "done" | "failed" | "budget_blocked";
  measurement_type: MeasurementType; provider: string | null; model: string | null;
  stop_reason: string | null; error_class: string | null; error: string | null;
  calls_ok: number; calls_failed: number; prompts_total: number; created_at: string; finished_at: string | null;
  trigger: "manual" | "weekly" | "seed";
}
export interface Usage {
  plan_id: string; plan_name: string; status: "active" | "paused"; paused_reason: string | null;
  engine_calls: number; engine_call_limit: number; free_calls: number; paid_cost_usd: number; paid_cap_usd: number;
  brands_used: number; brand_limit: number; prompt_limit: number; competitor_limit: number; live_search_enabled: boolean;
}
export interface VisRow {
  run_id: string; run_at: string; provider: string; model: string; brand_id: string; brand_name: string;
  is_target: boolean; n: number; mentioned: number; recommended: number; cited: number;
}
export interface PromptResult {
  prompt_id: string; prompt_text: string; intent: Intent; answers: number; target_mentioned: number;
  target_recommended: number; best_rank: number | null; top_competitor: string | null; top_competitor_recs: number;
}

export interface SiteAudit {
  id: string; brand_id: string; url: string; status: "ok" | "unreachable"; created_at: string;
  checks: { id: string; ok: boolean; severity: "high" | "medium" | "low" | "info"; title: string; detail: string }[];
}

export const INTENT_LABEL: Record<Intent, string> = {
  local: "Yerel işletme arıyor",
  comparison: "Karşılaştırıyor",
  purchase: "Satın almaya hazırlanıyor",
  informational: "Bilgi arıyor",
};

function must<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

export const api = {
  async workspaces(): Promise<Workspace[]> {
    return must(await sb().from("workspaces").select("id,name,kind,plan,status,paused_reason,paid_live_allowed").order("created_at"));
  },
  async createWorkspace(name: string, kind: "business" | "agency"): Promise<string> {
    return must(await sb().rpc("create_workspace", { p_name: name, p_kind: kind }));
  },
  async usage(ws: string): Promise<Usage | null> {
    const rows = must(await sb().rpc("workspace_usage", { p_workspace: ws })) as Usage[];
    return rows[0] ?? null;
  },
  async brands(ws: string): Promise<Brand[]> {
    return must(await sb().from("brands").select("*").eq("workspace_id", ws).order("created_at"));
  },
  async brand(id: string): Promise<Brand> {
    return must(await sb().from("brands").select("*").eq("id", id).single());
  },
  async competitors(brandId: string): Promise<Brand[]> {
    return must(await sb().from("brands").select("*").eq("owner_brand_id", brandId).eq("is_competitor", true).order("created_at"));
  },
  async addBrand(b: Partial<Brand> & { workspace_id: string; name: string; data_origin?: string }) {
    return must(await sb().from("brands").insert(b).select("*").single()) as Brand;
  },
  async updateBrand(id: string, patch: Partial<Brand>) {
    must(await sb().from("brands").update(patch).eq("id", id));
  },
  async deleteBrand(id: string) { must(await sb().from("brands").delete().eq("id", id)); },
  async prompts(brandId: string): Promise<Prompt[]> {
    return must(await sb().from("prompts").select("*").eq("brand_id", brandId).order("created_at"));
  },
  async addPrompt(p: { workspace_id: string; brand_id: string; text: string; intent: Intent }) {
    must(await sb().from("prompts").insert(p));
  },
  async setPromptActive(id: string, active: boolean) { must(await sb().from("prompts").update({ active }).eq("id", id)); },
  async updatePrompt(id: string, patch: { text?: string; intent?: Intent }) { must(await sb().from("prompts").update(patch).eq("id", id)); },
  /** Bir ölçümdeki ham yapay zekâ cevapları (soru başına). */
  async answers(runId: string): Promise<{ id: string; prompt_id: string; repetition: number; answer_text: string; model: string; provider: string; cited_urls: string[] }[]> {
    return must(await sb().from("responses").select("id,prompt_id,repetition,answer_text,model,provider,cited_urls").eq("run_id", runId).order("repetition"));
  },
  /** Bir ölçümdeki cevap başına marka sonuçları (kaynak fırsatları için). */
  async mentionsFor(responseIds: string[]): Promise<{ response_id: string; brand_id: string; recommended: boolean; mentioned: boolean }[]> {
    if (!responseIds.length) return [];
    return must(await sb().from("mentions").select("response_id,brand_id,recommended,mentioned").in("response_id", responseIds));
  },
  async deletePrompt(id: string) { must(await sb().from("prompts").delete().eq("id", id)); },
  async runs(brandId: string): Promise<Run[]> {
    return must(await sb().from("runs").select("*").eq("brand_id", brandId).order("created_at", { ascending: false }).limit(30));
  },
  async requestRun(brandId: string, live = false): Promise<string> {
    return must(await sb().rpc("request_run", { p_brand: brandId, p_live: live }));
  },
  async paidBudget(ws: string): Promise<{ allowed: boolean; cap_usd: number; spent_usd: number } | null> {
    const rows = must(await sb().rpc("paid_budget", { p_workspace: ws })) as { allowed: boolean; cap_usd: number; spent_usd: number }[];
    return rows[0] ?? null;
  },
  async visibility(brandId: string, type: MeasurementType): Promise<VisRow[]> {
    return must(await sb().rpc("brand_visibility", { p_brand: brandId, p_type: type }));
  },
  async promptResults(runId: string): Promise<PromptResult[]> {
    return must(await sb().rpc("run_prompt_results", { p_run: runId }));
  },
  async latestAudit(brandId: string): Promise<SiteAudit | null> {
    const rows = must(await sb().from("site_audits").select("*").eq("brand_id", brandId).order("created_at", { ascending: false }).limit(1)) as SiteAudit[];
    return rows[0] ?? null;
  },
  async requestAudit(brandId: string) { must(await sb().rpc("request_site_audit", { p_brand: brandId })); },
  async isPlatformAdmin(): Promise<boolean> {
    return must(await sb().rpc("is_platform_admin"));
  },
};
