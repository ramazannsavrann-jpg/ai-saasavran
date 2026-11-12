// Ana sayfadaki "bugünün ölçümü": her gün Growth Lab'in (AI SaaSavran'ın kendi ölçümleri) gerçek bir sonucu.
// Marka adları gizli (Marka A, B, C…); cevap metni ve kaynak adresleri yok, yalnız sayılar. Müşteri verisi kullanılmaz.
const json = (b, s = 200, cache = "public, max-age=1800") => new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json", "cache-control": cache } });

export async function onRequestGet({ env }) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return json({ error: "unavailable" }, 503, "no-store");
  // İstanbul tarihine göre gün (UTC+3)
  const day = new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10);
  try {
    const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/daily_example`, {
      method: "POST",
      headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ p_day: day }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return json({ error: "db" }, 502, "no-store");
    const ex = await r.json();
    if (!ex || !Array.isArray(ex.brands) || ex.brands.length < 2) return json({ error: "none" }, 404, "public, max-age=600");
    return json({
      day: ex.day, question: String(ex.question).slice(0, 200), provider: ex.provider, measurement_type: ex.measurement_type, at: ex.at,
      answers: ex.answers, sources: ex.sources,
      brands: ex.brands.slice(0, 8).map((b) => ({ label: String(b.label).slice(0, 1), mentioned: b.mentioned, recommended: b.recommended, first: b.first })),
    });
  } catch {
    return json({ error: "db" }, 502, "no-store");
  }
}
