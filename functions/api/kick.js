// "Ölçümü hemen başlat": kullanıcının sırada bekleyen ölçümü varsa ölçüm işçisini (GitHub Actions) hemen tetikler.
// Böylece ilk ölçüm saat başını beklemez. Anahtar (WORKER_DISPATCH_TOKEN) yalnız sunucuda; yoksa sessizce "started:false" döner
// ve ölçüm her zamanki saatlik sırada işlenir. Sırada ölçüm yoksa işçi tetiklenmez (kötüye kullanım koruması).
import { kickDecision, WORKFLOW_URL } from "./_kick-lib.js";

const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function onRequestPost({ request, env }) {
  const auth = request.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "auth" }, 401);
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return json({ started: false, reason: "unavailable" });
  // Kullanıcının kendi oturumuyla (RLS): yalnız kendi çalışma alanlarındaki sıradaki ölçümleri görür
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/runs?select=id&status=eq.queued&limit=1`, {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: auth }, signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  if (!r) return json({ started: false, reason: "unavailable" });
  if (r.status === 401) return json({ error: "auth" }, 401);
  const rows = r.ok ? await r.json().catch(() => []) : [];
  const d = kickDecision({ queued: Array.isArray(rows) ? rows.length : 0, hasToken: !!env.WORKER_DISPATCH_TOKEN });
  if (!d.dispatch) return json({ started: false, reason: d.reason });
  const g = await fetch(WORKFLOW_URL(env.GITHUB_REPO), {
    method: "POST",
    headers: { Authorization: `Bearer ${env.WORKER_DISPATCH_TOKEN}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "ai-saasavran-kick", "content-type": "application/json" },
    body: JSON.stringify({ ref: "main" }), signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  return json({ started: !!g && g.status === 204, reason: g && g.status === 204 ? "ok" : "dispatch_failed" });
}
