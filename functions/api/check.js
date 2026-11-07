// Üye olmadan ücretsiz kontrol: Gemini'ye (ücretsiz katman, internet araması yok) 5 soru sorar, markanın geçip geçmediğini ölçer.
// Sınırlar veritabanında: kişi başına 30 günde 2 kontrol, günlük toplam tavan, ortak Gemini günlük tavanı.
import { parseInput, buildQuestions, analyze } from "./_check-lib.js";

const MODEL = "gemini-3.5-flash-lite";
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });

async function sha256(s) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function rpc(env, fn, args) {
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "content-type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error(`db ${r.status}`);
  return r.json();
}
async function ask(env, q) {
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: q }] }], generationConfig: { maxOutputTokens: 1200, temperature: 1 } }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!r.ok) return { text: "" };
    const j = await r.json();
    return { text: (j?.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim() };
  } catch { return { text: "" }; }
}

export async function onRequestPost({ request, env }) {
  if (!env.GEMINI_API_KEY || !env.SUPABASE_URL) return json({ error: "unavailable" }, 503);
  const input = parseInput(await request.json().catch(() => ({})));
  if (input.error) return json({ error: "input" }, 400);
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const ipHash = await sha256(`${ip}|${env.SUPABASE_SERVICE_ROLE_KEY}`);
  const questions = buildQuestions(input);

  const res = String(await rpc(env, "reserve_free_check", {
    p_ip_hash: ipHash, p_lang: input.lang, p_brand: input.brand, p_category: input.category, p_city: input.city,
    p_calls: questions.length, p_daily_limit: 450,
  }));
  if (!res.startsWith("ok:")) return json({ error: res }, 429);

  const answers = await Promise.all(questions.map((q) => ask(env, q)));
  const a = analyze(answers, input);
  if (a.total === 0) return json({ error: "provider" }, 502);
  await rpc(env, "finish_free_check", { p_id: res.slice(3), p_total: a.total, p_mentioned: a.mentioned, p_recommended: a.recommended }).catch(() => {});
  return json({
    engine: "Gemini (model knowledge, no live web search)",
    total: a.total, mentioned: a.mentioned, recommended: a.recommended,
    questions: a.rows.map((r) => ({ q: questions[r.i], ok: r.ok, mentioned: r.mentioned ?? false, recommended: r.recommended ?? false, excerpt: (answers[r.i].text || "").slice(0, 600) })),
    others: a.others.map((o) => o.name),
  });
}
