// Google Play gerçek zamanlı bildirimleri (RTDN, Pub/Sub push): yenileme, iptal, süre dolması, iade.
// Pub/Sub aboneliğinin adresi: /api/store/google-rtdn?key=<GOOGLE_PLAY_RTDN_KEY>. Bildirim içeriğine güvenilmez; token Google'a yeniden sorulur.
import { json, accessToken, getSubscription, subscriptionFields, serviceRpc, ackIfNeeded, SUB_PRODUCTS } from "./_google.js";

export async function onRequestPost({ request, env }) {
  const key = new URL(request.url).searchParams.get("key") ?? "";
  if (!env.GOOGLE_PLAY_RTDN_KEY || key !== env.GOOGLE_PLAY_RTDN_KEY) return json({ error: "auth" }, 401);
  const body = await request.json().catch(() => null);
  let msg = null;
  try { msg = JSON.parse(atob(body?.message?.data ?? "")); } catch { return json({ ok: true, ignored: "bad_message" }); }
  const n = msg?.subscriptionNotification;
  if (!n?.purchaseToken) return json({ ok: true, ignored: msg?.testNotification ? "test" : "not_subscription" });
  if (!env.GOOGLE_PLAY_SERVICE_ACCOUNT) return json({ error: "store_not_configured" }, 503);
  try {
    const at = await accessToken(JSON.parse(env.GOOGLE_PLAY_SERVICE_ACCOUNT));
    const s = await getSubscription(at, n.purchaseToken);
    if (!s) return json({ ok: true, ignored: "not_found" });
    const f = subscriptionFields(s);
    if (!SUB_PRODUCTS.includes(f.product)) return json({ ok: true, ignored: "unknown_product" });
    // Alan: önce bilinen token, sonra eski (bağlı) token, sonra satın almadaki alan kimliği
    let ws = await serviceRpc(env, "store_token_workspace", { p_token: n.purchaseToken });
    if (!ws && f.linked) ws = await serviceRpc(env, "store_token_workspace", { p_token: f.linked });
    if (!ws) return json({ ok: true, ignored: "unknown_token" }); // ilk kayıt uygulamadan doğrulamayla yapılır (uygulama açılışta da dener)
    const result = await serviceRpc(env, "apply_store_subscription", {
      p_platform: "google_play", p_token: n.purchaseToken, p_workspace: ws, p_user: null, p_product: f.product, p_state: f.state,
      p_expiry: f.expiry, p_auto: f.auto, p_order: f.order, p_linked: f.linked,
    });
    await ackIfNeeded(at, f, n.purchaseToken, result);
    console.log("rtdn:", n.notificationType, f.state, result);
    return json({ ok: true, result });
  } catch (e) {
    console.log("rtdn hata:", String(e?.message ?? e));
    return json({ error: "store_error" }, 500); // Pub/Sub tekrar dener
  }
}
