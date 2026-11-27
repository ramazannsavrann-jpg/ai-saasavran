// Uygulamadan Google Play satın alması: doğrula, uygula, onayla. Yalnız giriş yapmış kullanıcı.
import { json, currentUser, verifyPurchase } from "./_google.js";

export async function onRequestPost({ request, env }) {
  const user = await currentUser(request, env);
  if (!user) return json({ error: "auth" }, 401);
  const input = await request.json().catch(() => null);
  try {
    const r = await verifyPurchase({ env, user, input });
    if (r.error) return json({ error: r.error }, r.status ?? 400);
    return json({ ok: r.result === "ok" || r.result === "already_granted" || r.result === "ok_other_active" || r.result === "pending", result: r.result });
  } catch (e) {
    console.log("store/google hata:", String(e?.message ?? e));
    return json({ error: "store_error" }, 502);
  }
}
