// Abonelik yönetimi: giriş yapmış kullanıcı (alanda editör ve üstü) için Paddle müşteri portalı bağlantısı üretir.
import { json, UUID } from "./_lib.js";

export async function onRequestPost({ request, env }) {
  const auth = request.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "auth" }, 401);
  const { workspace_id } = await request.json().catch(() => ({}));
  if (!UUID.test(String(workspace_id ?? ""))) return json({ error: "workspace" }, 400);
  // Yetki kontrolü veritabanında: kullanıcının kendi oturumuyla (RLS / is_member)
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/billing_customer`, {
    method: "POST",
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: auth, "content-type": "application/json" },
    body: JSON.stringify({ p_workspace: workspace_id }),
  });
  if (!r.ok) return json({ error: "auth" }, 401);
  const customer = await r.json();
  if (!customer) return json({ error: "no_subscription" }, 404);
  const base = String(env.PADDLE_API_KEY ?? "").includes("_sdbx_") ? "https://sandbox-api.paddle.com" : "https://api.paddle.com";
  const p = await fetch(`${base}/customers/${encodeURIComponent(customer)}/portal-sessions`, {
    method: "POST", headers: { Authorization: `Bearer ${env.PADDLE_API_KEY}`, "content-type": "application/json" }, body: "{}",
  });
  if (!p.ok) { console.log("paddle portal hatası", p.status); return json({ error: "paddle" }, 502); }
  const url = (await p.json())?.data?.urls?.general?.overview;
  return url ? json({ url }) : json({ error: "paddle" }, 502);
}
