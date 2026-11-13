// Veri tipleri ve sorgular. Tüm erişim kullanıcının oturumuyla yapılır; izolasyonu veritabanı (RLS) sağlar.
import { sb } from "./supabase";
import { L } from "./i18n";

export type MeasurementType = "live_search" | "model_knowledge" | "simulated";
export type WorkspaceKind = "business" | "agency" | "demo_lab" | "growth_lab";

export interface Workspace { id: string; name: string; kind: WorkspaceKind; plan: string; status: "active" | "paused"; paused_reason: string | null; paid_live_allowed: boolean }
export interface Brand {
  id: string; workspace_id: string; name: string; aliases: string[]; website: string | null;
  sector: string | null; city: string | null; country: string | null; is_competitor: boolean; owner_brand_id: string | null; data_origin: string;
  auto_weekly: boolean; audit_requested_at: string | null; reanalyze_requested_at: string | null;
  fact_card?: string | null; fact_card_updated_at?: string | null;
}
export interface Prompt { id: string; brand_id: string; text: string; intent: Intent; segment: string | null; active: boolean; created_at: string }
export type Intent = "informational" | "comparison" | "purchase" | "local" | "post_purchase";
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
  checks: { id: string; ok: boolean; severity: "high" | "medium" | "low" | "info"; title: string; detail: string; title_en?: string; detail_en?: string }[];
}

export interface BrandAction { id: string; brand_id: string; title: string; note: string | null; done_on: string; created_at: string; rec_id: string | null; tasks: { t: string; done: boolean }[] | null }

export interface Product { id: string; brand_id: string; name: string; price: string | null; facts: string | null; rival_of: string | null; rival_brand: string | null; check_requested_at: string | null; shopping_query: string | null; shopping_requested_at: string | null; created_at: string }
export interface ApiKey { id: string; name: string; prefix: string; created_at: string; last_used_at: string | null }
export interface TeamMember { user_id: string; email: string; role: string; joined_at: string; is_me: boolean }
export interface Invite { id: string; token: string; email: string; role: string; expires_at: string }
export interface MyInvite { id: string; token: string; workspace_name: string; role: string; expires_at: string }
export interface ReportShare { id: string; token: string; created_at: string; expires_at: string; revoked_at: string | null }
export interface AdminWorkspace {
  id: string; name: string; kind: string; plan: string; status: string; subscription_status: string | null; comped: boolean; comped_until: string | null;
  has_paddle: boolean; owner_email: string | null; brands: number; created_at: string;
}
export interface ShoppingCheck {
  id: string; product_id: string; query: string; country: string; own_position: number | null; own_price: string | null; own_seller: string | null; own_count: number;
  rivals: { id: string; position: number; price: string | null; seller: string | null }[];
  items: { position: number; title: string; source: string | null; price: string | null; link: string | null; match: { id: string; kind: "own" | "rival" } | null }[]; created_at: string;
}
export interface ProductCheck {
  id: string; product_id: string; model: string; question: string; answer_text: string; cited_urls: string[];
  recognized: boolean | null; claims: { claim: string; status: "correct" | "wrong" | "unverifiable"; fact: string }[]; judge: string | null; created_at: string;
}

export const INTENT_LABEL: Record<Intent, string> = {
  local: L("Yerel işletme arıyor", "Looking for a local business"),
  comparison: L("Karşılaştırıyor", "Comparing options"),
  purchase: L("Satın almaya hazırlanıyor", "Ready to buy"),
  post_purchase: L("Satın aldıktan sonra soruyor", "After buying"),
  informational: L("Bilgi arıyor", "Researching"),
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
  async truthChecks(brandId: string): Promise<{ provider: string; created_at: string; failed: boolean; claims: { claim: string; status: "correct" | "wrong" | "unverifiable"; fact: string; quote: string }[] }[]> {
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
    return must(await sb().from("truth_checks").select("provider,created_at,failed,claims").eq("brand_id", brandId).gte("created_at", since).order("created_at", { ascending: false }).limit(200));
  },
  async deleteBrand(id: string) { must(await sb().from("brands").delete().eq("id", id)); },
  async prompts(brandId: string): Promise<Prompt[]> {
    return must(await sb().from("prompts").select("*").eq("brand_id", brandId).order("created_at"));
  },
  async addPrompt(p: { workspace_id: string; brand_id: string; text: string; intent: Intent; segment?: string | null }) {
    must(await sb().from("prompts").insert(p));
  },
  async setPromptActive(id: string, active: boolean) { must(await sb().from("prompts").update({ active }).eq("id", id)); },
  async updatePrompt(id: string, patch: { text?: string; intent?: Intent; segment?: string | null }) { must(await sb().from("prompts").update(patch).eq("id", id)); },
  /** Bir ölçümdeki ham yapay zekâ cevapları (soru başına). */
  async answers(runId: string): Promise<{ id: string; prompt_id: string; repetition: number; answer_text: string; model: string; provider: string; cited_urls: string[] }[]> {
    return must(await sb().from("responses").select("id,prompt_id,repetition,answer_text,model,provider,cited_urls").eq("run_id", runId).order("repetition"));
  },
  /** Bir ölçümdeki cevap başına marka sonuçları (kaynak fırsatları için). */
  async mentionsFor(responseIds: string[]): Promise<{ response_id: string; brand_id: string; recommended: boolean; mentioned: boolean; perception?: unknown }[]> {
    if (!responseIds.length) return [];
    return must(await sb().from("mentions").select("response_id,brand_id,recommended,mentioned,perception").in("response_id", responseIds));
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
  async promptResults(runId: string, provider?: string | null): Promise<PromptResult[]> {
    return must(await sb().rpc("run_prompt_results", provider ? { p_run: runId, p_provider: provider } : { p_run: runId }));
  },
  async latestAudit(brandId: string): Promise<SiteAudit | null> {
    const rows = must(await sb().from("site_audits").select("*").eq("brand_id", brandId).order("created_at", { ascending: false }).limit(1)) as SiteAudit[];
    return rows[0] ?? null;
  },
  async requestAudit(brandId: string) { must(await sb().rpc("request_site_audit", { p_brand: brandId })); },
  async actions(brandId: string): Promise<BrandAction[]> {
    return must(await sb().from("brand_actions").select("id,brand_id,title,note,done_on,created_at,rec_id,tasks").eq("brand_id", brandId).order("done_on", { ascending: false }).limit(50));
  },
  async addAction(a: { workspace_id: string; brand_id: string; title: string; note: string | null; done_on: string; rec_id?: string; tasks?: { t: string; done: boolean }[] }) { must(await sb().from("brand_actions").insert(a)); },
  async updateActionTasks(id: string, tasks: { t: string; done: boolean }[]) { must(await sb().from("brand_actions").update({ tasks }).eq("id", id)); },
  async deleteAction(id: string) { must(await sb().from("brand_actions").delete().eq("id", id)); },
  async products(brandId: string): Promise<Product[]> {
    return must(await sb().from("products").select("id,brand_id,name,price,facts,rival_of,rival_brand,check_requested_at,shopping_query,shopping_requested_at,created_at").eq("brand_id", brandId).order("created_at"));
  },
  async addProduct(p: { workspace_id: string; brand_id: string; name: string; price: string | null; facts: string }) { must(await sb().from("products").insert(p)); },
  async addRival(p: { workspace_id: string; brand_id: string; name: string; rival_of: string; rival_brand: string | null }) { must(await sb().from("products").insert(p)); },
  async deleteProduct(id: string) { must(await sb().from("products").delete().eq("id", id)); },
  async requestProductCheck(id: string) { must(await sb().rpc("request_product_check", { p_product: id })); },
  async productChecks(productIds: string[]): Promise<ProductCheck[]> {
    if (!productIds.length) return [];
    return must(await sb().from("product_checks").select("id,product_id,model,question,answer_text,cited_urls,recognized,claims,judge,created_at").in("product_id", productIds).order("created_at", { ascending: false }).limit(40));
  },
  async shoppingChecks(productIds: string[]): Promise<ShoppingCheck[]> {
    if (!productIds.length) return [];
    return must(await sb().from("shopping_checks").select("id,product_id,query,country,own_position,own_price,own_seller,own_count,rivals,items,created_at").in("product_id", productIds).order("created_at", { ascending: false }).limit(60));
  },
  async requestShoppingCheck(id: string) { must(await sb().rpc("request_shopping_check", { p_product: id })); },
  async setShoppingQuery(id: string, q: string | null) { must(await sb().from("products").update({ shopping_query: q }).eq("id", id)); },
  async adminWorkspaces(): Promise<AdminWorkspace[]> { return must(await sb().rpc("admin_workspaces")); },
  async adminSetPlan(workspaceId: string, plan: string, until: string | null) { must(await sb().rpc("admin_set_plan", { p_workspace: workspaceId, p_plan: plan, p_until: until })); },
  async reportShares(brandId: string): Promise<ReportShare[]> {
    return must(await sb().from("report_shares").select("id,token,created_at,expires_at,revoked_at").eq("brand_id", brandId).is("revoked_at", null).gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }));
  },
  async createReportShare(brandId: string, days: number): Promise<string> { return must(await sb().rpc("create_report_share", { p_brand: brandId, p_days: days })); },
  async revokeReportShare(id: string) { must(await sb().rpc("revoke_report_share", { p_share: id })); },
  async team(workspaceId: string): Promise<TeamMember[]> { return must(await sb().rpc("workspace_team", { p_workspace: workspaceId })); },
  async invites(workspaceId: string): Promise<Invite[]> {
    return must(await sb().from("workspace_invites").select("id,token,email,role,expires_at").eq("workspace_id", workspaceId).is("accepted_at", null).is("revoked_at", null).gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }));
  },
  async createInvite(workspaceId: string, email: string, role: string): Promise<string> { return must(await sb().rpc("create_invite", { p_workspace: workspaceId, p_email: email, p_role: role })); },
  async revokeInvite(id: string) { must(await sb().rpc("revoke_invite", { p_invite: id })); },
  async myInvites(): Promise<MyInvite[]> { return must(await sb().rpc("my_invites")); },
  async acceptInvite(token: string): Promise<string> { return must(await sb().rpc("accept_invite", { p_token: token })); },
  async setMemberRole(workspaceId: string, userId: string, role: string) { must(await sb().rpc("set_member_role", { p_workspace: workspaceId, p_user: userId, p_role: role })); },
  async removeMember(workspaceId: string, userId: string) { must(await sb().rpc("remove_member", { p_workspace: workspaceId, p_user: userId })); },
  async apiKeys(workspaceId: string): Promise<ApiKey[]> {
    return must(await sb().from("api_keys").select("id,name,prefix,created_at,last_used_at").eq("workspace_id", workspaceId).is("revoked_at", null).order("created_at", { ascending: false }));
  },
  async createApiKey(workspaceId: string, name: string): Promise<string> { return must(await sb().rpc("create_api_key", { p_workspace: workspaceId, p_name: name })); },
  async revokeApiKey(id: string) { must(await sb().rpc("revoke_api_key", { p_key: id })); },
  async isPlatformAdmin(): Promise<boolean> {
    return must(await sb().rpc("is_platform_admin"));
  },
};
