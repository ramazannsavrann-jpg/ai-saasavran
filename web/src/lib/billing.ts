// Paddle ödeme penceresi ve abonelik yönetimi. Yalnız herkese açık istemci anahtarı kullanılır.
import { runtimeConfig, sb } from "./supabase";
import { isEn } from "./i18n";

export type PaidPlan = "starter" | "pro" | "agency";
export const PLAN_INFO: Record<PaidPlan, { name: string; price: number }> = {
  starter: { name: "Plus", price: 29 }, pro: { name: "Pro", price: 149 }, agency: { name: "Business", price: 449 },
};
export const planName = (id: string) => (id in PLAN_INFO ? PLAN_INFO[id as PaidPlan].name : id === "free" ? "Free" : id);

interface PaddleCfg { clientToken: string; environment: "production" | "sandbox"; prices: Record<PaidPlan, string> }
declare global { interface Window { Paddle?: any } }

export const paymentsEnabled = () => !!(runtimeConfig() as unknown as { paddle?: PaddleCfg })?.paddle;
const cfg = () => (runtimeConfig() as unknown as { paddle?: PaddleCfg }).paddle!;

let loading: Promise<any> | null = null;
function loadPaddle(onEvent: (name: string) => void): Promise<any> {
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
      s.async = true;
      s.onload = () => {
        const P = window.Paddle;
        if (cfg().environment === "sandbox") P.Environment.set("sandbox");
        P.Initialize({ token: cfg().clientToken, eventCallback: (e: { name?: string }) => e?.name && onEvent(e.name) });
        resolve(P);
      };
      s.onerror = () => { loading = null; reject(new Error("paddle_load")); };
      document.head.appendChild(s);
    });
  }
  return loading;
}

export async function openCheckout(plan: PaidPlan, workspaceId: string, email: string | undefined, onEvent: (name: string) => void) {
  const P = await loadPaddle(onEvent);
  P.Checkout.open({
    items: [{ priceId: cfg().prices[plan], quantity: 1 }],
    customer: email ? { email } : undefined,
    customData: { workspace_id: workspaceId },
    settings: { displayMode: "overlay", theme: "light", locale: isEn() ? "en" : "tr", successUrl: `${location.origin}/hesap?paid=1` },
  });
}

export async function openPortal(workspaceId: string): Promise<void> {
  const { data } = await sb().auth.getSession();
  const res = await fetch("/api/paddle/portal", {
    method: "POST", headers: { "content-type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
    body: JSON.stringify({ workspace_id: workspaceId }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.url) throw new Error(j.error ?? "portal");
  location.href = j.url;
}

export interface BillingSummary { plan: string; subscription_status: string | null; current_period_end: string | null; has_customer: boolean }
export async function billingSummary(workspaceId: string): Promise<BillingSummary | null> {
  const { data, error } = await sb().rpc("billing_summary", { p_workspace: workspaceId });
  if (error) return null;
  return (data as BillingSummary[])?.[0] ?? null;
}
