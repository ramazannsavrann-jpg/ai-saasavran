// Geliştirici API'si ve MCP için ortak yardımcılar: anahtar doğrulama ve veri çağrıları (service role, sunucu tarafı).
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const KEY = /^aisv_[0-9a-f]{64}$/;

export async function sha256hex(s) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function rpc(env, fn, args) {
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "content-type": "application/json" },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(10_000),
  });
  if (!r.ok) throw new Error(`db ${r.status}`);
  return r.json();
}

/** Authorization: Bearer aisv_… → { workspace_id, workspace } ya da { error } */
export async function authenticate(request, env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return { error: "unavailable", status: 503 };
  const h = request.headers.get("Authorization") ?? "";
  const key = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
  if (!KEY.test(key)) return { error: "invalid_key", status: 401 };
  const a = await rpc(env, "api_auth", { p_key_hash: await sha256hex(key) });
  if (a?.error) return { error: a.error, status: a.error === "rate_limit" ? 429 : a.error === "plan" ? 403 : 401 };
  return a;
}

const ERR_TEXT = {
  invalid_key: "Invalid or revoked API key. Create one in AI SaaSavran → Account → API & MCP.",
  plan: "API and MCP access needs the Pro or Business plan.",
  rate_limit: "Daily limit reached (1000 requests per key).",
  unavailable: "Service unavailable.",
  not_found: "Brand not found in this workspace.",
};
export const errorText = (e) => ERR_TEXT[e] ?? e;

/** Rapor verisinden kısa özet (ajanların okuması kolay olsun diye). */
export function summarize(rep) {
  const out = { brand: rep.brand, measurements: {} };
  for (const t of ["live_search", "model_knowledge"]) {
    const rows = rep.vis?.[t] ?? [];
    if (!rows.length) continue;
    const runs = [...new Set(rows.map((r) => r.run_id))];
    const lastRun = rows.reduce((a, r) => (r.run_at > a.run_at ? r : a), rows[0]).run_id;
    const last = rows.filter((r) => r.run_id === lastRun);
    const by = new Map();
    for (const r of last) {
      const e = by.get(r.brand_id) ?? { name: r.brand_name, is_target: r.is_target, answers: 0, mentioned: 0, recommended: 0 };
      e.answers += r.n; e.mentioned += r.mentioned; e.recommended += r.recommended; by.set(r.brand_id, e);
    }
    const brands = [...by.values()].map((e) => ({ ...e, recommend_rate: e.answers ? +(e.recommended / e.answers).toFixed(3) : 0, mention_rate: e.answers ? +(e.mentioned / e.answers).toFixed(3) : 0 }))
      .sort((a, b) => b.recommend_rate - a.recommend_rate);
    out.measurements[t] = {
      latest_at: last[0].run_at, engines: [...new Set(last.map((r) => r.provider))], runs_available: runs.length,
      brands,
      history: runs.map((id) => {
        const rs = rows.filter((r) => r.run_id === id && r.is_target);
        const n = rs.reduce((a, r) => a + r.n, 0), k = rs.reduce((a, r) => a + r.recommended, 0);
        return { at: rs[0]?.run_at ?? rows.find((r) => r.run_id === id).run_at, answers: n, recommended: k, recommend_rate: n ? +(k / n).toFixed(3) : 0 };
      }).sort((a, b) => a.at.localeCompare(b.at)),
    };
  }
  out.questions = rep.questions ?? [];
  out.sources = rep.sources ?? [];
  out.note = "Measured through the AI platforms' official APIs; consumer app answers can differ. Rates are counts over answers; small samples are uncertain.";
  return out;
}
