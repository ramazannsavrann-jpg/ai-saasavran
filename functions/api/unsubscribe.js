// Haftalık özetten çıkma: e-postadaki bağlantı (GET) ve e-posta istemcilerinin tek tık isteği (POST, RFC 8058).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function unsubscribe(env, token) {
  if (!UUID.test(token)) return false;
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/unsubscribe_weekly`, {
    method: "POST",
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ p_token: token }),
  });
  return r.ok && (await r.json()) === true;
}
const page = (ok) => new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AI SaaSavran</title>
<body style="font-family:Arial,sans-serif;max-width:520px;margin:48px auto;padding:0 16px;color:#17211e;background:#f4f6f5">
<h1 style="font-size:22px">${ok ? "You're unsubscribed / Abonelikten çıktınız" : "Link not valid / Bağlantı geçersiz"}</h1>
<p>${ok ? "You won't receive the weekly summary anymore. You can turn it back on from your account page." : "This link is invalid or already used. You can change email settings from your account page."}</p>
<p>${ok ? "Haftalık özeti artık almayacaksınız. Hesap sayfanızdan yeniden açabilirsiniz." : "Bağlantı geçersiz ya da kullanılmış. E-posta ayarlarını hesap sayfanızdan değiştirebilirsiniz."}</p>
<p><a href="/hesap" style="color:#11705e">aisaasavran.com</a></p></body></html>`, { status: ok ? 200 : 400, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });

export async function onRequestGet({ request, env }) {
  return page(await unsubscribe(env, new URL(request.url).searchParams.get("t") ?? ""));
}
export async function onRequestPost({ request, env }) {
  const ok = await unsubscribe(env, new URL(request.url).searchParams.get("t") ?? "");
  return new Response(ok ? "ok" : "invalid", { status: ok ? 200 : 400 });
}
