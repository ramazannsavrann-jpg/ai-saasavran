// Mağaza aboneliklerini Google'a yeniden sorar (işçide, 6 saatte bir her abonelik): yenileme, iptal, süre dolması, iade.
// Gerçek zamanlı bildirim (RTDN) kurulmadan da paket durumu doğru kalır. Hizmet hesabı yoksa kapalı.
import type { SupabaseClient } from "@supabase/supabase-js";
// @ts-ignore — düz JS modülü (Cloudflare Pages Functions ile ortak)
import { accessToken, getSubscription, subscriptionFields } from "../../functions/api/store/_google.js";

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export async function syncStoreSubscriptions(db: SupabaseClient, saJson: string | undefined, fetchFn: FetchLike = fetch): Promise<{ checked: number; changed: number } | "kapalı"> {
  if (!saJson) return "kapalı";
  const { data, error } = await db.rpc("store_subscriptions_due", { p_limit: 50 });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as { purchase_token: string; workspace_id: string; product_id: string }[];
  if (!rows.length) return { checked: 0, changed: 0 };
  const at = await accessToken(JSON.parse(saJson), fetchFn);
  let changed = 0;
  for (const r of rows) {
    const s = await getSubscription(at, r.purchase_token, fetchFn);
    const f = s ? subscriptionFields(s) : { product: r.product_id, state: "SUBSCRIPTION_STATE_EXPIRED", expiry: null, auto: false, order: null, linked: null };
    const { data: res, error: e2 } = await db.rpc("apply_store_subscription", {
      p_platform: "google_play", p_token: r.purchase_token, p_workspace: r.workspace_id, p_user: null, p_product: f.product ?? r.product_id,
      p_state: f.state, p_expiry: f.expiry, p_auto: f.auto, p_order: f.order, p_linked: f.linked,
    });
    if (e2) throw new Error(e2.message);
    if (res === "ok") changed++;
  }
  return { checked: rows.length, changed };
}
