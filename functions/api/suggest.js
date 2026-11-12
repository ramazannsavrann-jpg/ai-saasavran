// Otomatik soru önerisi: giriş yapmış kullanıcı (editör ve üstü) için ücretsiz Gemini'den soru taslakları.
// Yetki ve günlük sınır veritabanında (kullanıcının kendi oturumuyla). Gemini anahtarı yalnız sunucuda.
import { buildSuggestPrompt, parseSuggestions } from "./_suggest-lib.js";
import { geminiRestricted } from "./_check-lib.js";

const MODEL = "gemini-3.5-flash-lite";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function onRequestPost({ request, env }) {
  const auth = request.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "auth" }, 401);
  if (!env.GEMINI_API_KEY || !env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return json({ error: "unavailable" }, 503);
  if (geminiRestricted(request.cf?.country ?? request.headers.get("CF-IPCountry"))) return json({ error: "region" }, 451);
  const { brand_id } = await request.json().catch(() => ({}));
  if (!UUID.test(String(brand_id ?? ""))) return json({ error: "brand" }, 400);
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/reserve_question_suggestion`, {
    method: "POST",
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: auth, "content-type": "application/json" },
    body: JSON.stringify({ p_brand: brand_id }),
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    return json({ error: "limit", message: String(e?.message ?? "").slice(0, 200) }, r.status === 401 ? 401 : 429);
  }
  const ctx = await r.json();
  try {
    const g = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: buildSuggestPrompt(ctx) }] }], generationConfig: { maxOutputTokens: 1500, temperature: 0.9 } }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!g.ok) return json({ error: "provider" }, 502);
    const j = await g.json();
    const text = (j?.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
    const questions = parseSuggestions(text, ctx);
    return questions.length ? json({ questions }) : json({ error: "provider" }, 502);
  } catch {
    return json({ error: "provider" }, 502);
  }
}
