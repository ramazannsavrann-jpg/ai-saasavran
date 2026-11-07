// Ortak yardımcılar (Cloudflare Pages Functions). Gizli değerler yalnız ortam değişkeninden okunur, yazdırılmaz.
export const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/** Paddle-Signature: "ts=...;h1=..." — HMAC-SHA256(secret, `${ts}:${body}`); 5 dakikadan eski imza reddedilir. */
export async function verifyPaddle(header, rawBody, secret, nowSec = Math.floor(Date.now() / 1000)) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(";").map((p) => p.split("=", 2)));
  const ts = Number(parts.ts);
  if (!ts || Math.abs(nowSec - ts) > 300 || !parts.h1) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${ts}:${rawBody}`)));
  return header.split(";").some((p) => p.startsWith("h1=") && safeEqual(p.slice(3), sig));
}

export const PLAN_IDS = ["starter", "pro", "agency"];

/** Abonelik olayından alan, paket ve durum çıkarır. */
export function subscriptionUpdate(data) {
  const ws = data?.custom_data?.workspace_id;
  const item = (data?.items ?? []).find((i) => PLAN_IDS.includes(i?.price?.custom_data?.plan) || PLAN_IDS.includes(i?.product?.custom_data?.plan));
  const plan = item?.price?.custom_data?.plan ?? item?.product?.custom_data?.plan;
  return {
    p_workspace: ws ?? null, p_plan: plan ?? null, p_status: data?.status ?? null, p_subscription: data?.id ?? null,
    p_customer: data?.customer_id ?? null, p_period_end: data?.current_billing_period?.ends_at ?? null,
  };
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
