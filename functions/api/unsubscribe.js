// Haftalık özetten (veya k=drop ile düşüş uyarılarından) çıkma: e-postadaki bağlantı (GET) ve e-posta istemcilerinin tek tık isteği (POST, RFC 8058).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function unsubscribe(env, token, kind) {
  if (!UUID.test(token)) return false;
  const fn = kind === "drop" ? "unsubscribe_drop_alerts" : "unsubscribe_weekly";
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ p_token: token }),
  });
  return r.ok && (await r.json()) === true;
}
const page = (ok, kind) => new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AI SaaSavran</title>
<body style="font-family:Arial,sans-serif;max-width:520px;margin:48px auto;padding:0 16px;color:#17211e;background:#f4f6f5">
<h1 style="font-size:22px">${ok ? "You're unsubscribed / Abonelikten çıktınız" : "Link not valid / Bağlantı geçersiz"}</h1>
<p>${ok ? (kind === "drop" ? "You won't receive drop alerts anymore." : "You won't receive the weekly summary anymore.") + " You can turn it back on from your account page." : "This link is invalid or already used. You can change email settings from your account page."}</p>
<p>${ok ? (kind === "drop" ? "Düşüş uyarılarını artık almayacaksınız." : "Haftalık özeti artık almayacaksınız.") + " Hesap sayfanızdan yeniden açabilirsiniz." : "Bağlantı geçersiz ya da kullanılmış. E-posta ayarlarını hesap sayfanızdan değiştirebilirsiniz."}</p>
<p><a href="/hesap" style="color:#11705e">aisaasavran.com</a></p></body></html>`, { status: ok ? 200 : 400, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });

export async function onRequestGet({ request, env }) {
  const q = new URL(request.url).searchParams, kind = q.get("k") === "drop" ? "drop" : "weekly";
  return page(await unsubscribe(env, q.get("t") ?? "", kind), kind);
}
export async function onRequestPost({ request, env }) {
  const q = new URL(request.url).searchParams;
  const ok = await unsubscribe(env, q.get("t") ?? "", q.get("k") === "drop" ? "drop" : "weekly");
  return new Response(ok ? "ok" : "invalid", { status: ok ? 200 : 400 });
}
