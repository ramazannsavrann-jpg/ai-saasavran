// Paylaşılan rapor: bağlantıdaki anahtarla (token) salt okunur rapor verisi. Giriş gerekmez; arama motorlarına kapalı.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" } });

export async function onRequestGet({ request, env }) {
  const t = new URL(request.url).searchParams.get("t") ?? "";
  if (!UUID.test(t)) return json({ error: "invalid" }, 404);
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return json({ error: "unavailable" }, 503);
  try {
    const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/shared_report`, {
      method: "POST",
      headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ p_token: t }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) return json({ error: "db" }, 502);
    const rep = await r.json();
    return rep ? json(rep) : json({ error: "invalid" }, 404);
  } catch {
    return json({ error: "db" }, 502);
  }
}
