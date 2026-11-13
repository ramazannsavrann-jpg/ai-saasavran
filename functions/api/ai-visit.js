// Yapay zekâdan gelen ziyaret sayacı. Müşteri sitesindeki /t.js yalnız yapay zekâ kaynaklı ziyaretlerde buraya bildirir.
// Kişisel veri yok: IP, çerez, tarayıcı bilgisi saklanmaz. Sayfa yolu sorgu parametresiz, en fazla 200 karakter.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SOURCES = new Set(["chatgpt", "perplexity", "gemini", "claude", "copilot", "deepseek", "grok", "meta", "other_ai"]);
const cors = { "access-control-allow-origin": "*", "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type" };

export function cleanPath(p) {
  let s = String(p ?? "/").split(/[?#]/)[0].slice(0, 200);
  if (!s.startsWith("/")) s = "/" + s;
  // E-posta, uzun sayı dizisi ve uzun kimlikleri maskele (kişisel veri sayfa yolunda taşınmasın)
  return s.replace(/[^/]*@[^/]*/g, "(gizli)").replace(/\d{6,}/g, "(sayı)").replace(/[0-9a-f]{24,}/gi, "(kimlik)");
}

export async function onRequestOptions() { return new Response(null, { status: 204, headers: cors }); }

export async function onRequestPost({ request, env }) {
  const no = (s = 204) => new Response(null, { status: s, headers: cors });
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return no(503);
  let body;
  try { body = JSON.parse((await request.text()).slice(0, 2000)); } catch { return no(400); }
  const key = String(body?.k ?? ""), source = String(body?.s ?? "");
  if (!UUID.test(key) || !SOURCES.has(source)) return no(400);
  let host = "";
  try { host = new URL(request.headers.get("origin") || request.headers.get("referer") || "").hostname; } catch { /* boş */ }
  if (!host) return no(400);
  try {
    await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/record_ai_visit`, {
      method: "POST",
      headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ p_key: key, p_source: source, p_path: cleanPath(body?.p), p_host: host }),
      signal: AbortSignal.timeout(5000),
    });
  } catch { /* sayılamazsa ziyaretçiyi etkilemez */ }
  return no(204);
}
