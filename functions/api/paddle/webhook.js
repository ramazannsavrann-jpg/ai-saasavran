// Paddle bildirimleri: abonelik açılınca / değişince / iptal edilince çalışma alanının paketini günceller.
import { json, verifyPaddle, subscriptionUpdate, UUID } from "./_lib.js";

export async function onRequestPost({ request, env }) {
  const raw = await request.text();
  if (!(await verifyPaddle(request.headers.get("Paddle-Signature"), raw, env.PADDLE_WEBHOOK_SECRET))) return json({ error: "bad_signature" }, 401);
  let evt;
  try { evt = JSON.parse(raw); } catch { return json({ error: "bad_json" }, 400); }
  if (!String(evt.event_type ?? "").startsWith("subscription.")) return json({ ok: true, ignored: evt.event_type ?? null });

  const u = subscriptionUpdate(evt.data);
  if (!u.p_workspace || !UUID.test(u.p_workspace) || !u.p_plan || !u.p_status || !u.p_subscription) {
    console.log("paddle: eksik abonelik bilgisi", evt.event_type, evt.data?.id ?? null);
    return json({ ok: true, ignored: "missing_fields" }); // 200: Paddle tekrar denemesin
  }
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/apply_subscription`, {
    method: "POST",
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "content-type": "application/json" },
    body: JSON.stringify(u),
  });
  if (!r.ok) { console.log("paddle: veritabanı hatası", r.status); return json({ error: "db" }, 500); } // 500: Paddle tekrar dener
  const result = await r.json();
  console.log("paddle:", evt.event_type, u.p_subscription, result);
  return json({ ok: true, result });
}
