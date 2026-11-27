import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
// @ts-ignore — düz JS modülü (Cloudflare Pages Functions)
import { verifyPurchase, subscriptionFields } from "../../functions/api/store/_google.js";

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const SA = JSON.stringify({ client_email: "play@p.iam.gserviceaccount.com", private_key: privateKey.export({ type: "pkcs8", format: "pem" }) });
const WS = "11111111-1111-4111-8111-111111111111", USER = "22222222-2222-4222-8222-222222222222";
const env = { SUPABASE_URL: "https://db.test", SUPABASE_SERVICE_ROLE_KEY: "srv", GOOGLE_PLAY_SERVICE_ACCOUNT: SA };

function fake(googleSub: unknown, googleProduct: unknown, dbResult: string) {
  const calls: string[] = [];
  const fetchFn = async (url: string, init?: RequestInit) => {
    calls.push(`${init?.method ?? "GET"} ${url}${init?.body && url.includes("/rpc/") ? " " + init.body : ""}`);
    if (url.includes("oauth2")) return new Response(JSON.stringify({ access_token: "AT" }));
    if (url.includes("/rpc/")) return new Response(JSON.stringify(dbResult));
    if (url.includes("subscriptionsv2")) return googleSub ? new Response(JSON.stringify(googleSub)) : new Response("", { status: 404 });
    if (url.includes(":acknowledge") || url.includes(":consume")) return new Response("{}");
    if (url.includes("/products/")) return googleProduct ? new Response(JSON.stringify(googleProduct)) : new Response("", { status: 404 });
    return new Response("", { status: 500 });
  };
  return { calls, fetchFn };
}
const sub = (over: Record<string, unknown> = {}) => ({
  subscriptionState: "SUBSCRIPTION_STATE_ACTIVE", latestOrderId: "GPA.1", acknowledgementState: "ACKNOWLEDGEMENT_STATE_PENDING",
  externalAccountIdentifiers: { obfuscatedExternalAccountId: WS },
  lineItems: [{ productId: "gumus", expiryTime: "2026-12-24T00:00:00Z", autoRenewingPlan: { autoRenewEnabled: true } }], ...over,
});

test("abonelik: Google'a sorulur, veritabanına işlenir, sonra onaylanır", async () => {
  const f = fake(sub(), null, "ok");
  const r = await verifyPurchase({ env, user: USER, input: { kind: "sub", product: "gumus", token: "tok-abcdefghij", workspace: WS }, fetchFn: f.fetchFn });
  assert.deepEqual(r, { result: "ok" });
  assert.ok(f.calls.some((c) => c.includes("apply_store_subscription") && c.includes('"p_state":"SUBSCRIPTION_STATE_ACTIVE"') && c.includes('"p_expiry":"2026-12-24T00:00:00Z"')));
  assert.ok(f.calls.some((c) => c.includes("subscriptions/gumus/tokens/tok-abcdefghij:acknowledge")));
});

test("abonelik: başka alan adına alınmış token reddedilir, veritabanına dokunulmaz", async () => {
  const f = fake(sub({ externalAccountIdentifiers: { obfuscatedExternalAccountId: "33333333-3333-4333-8333-333333333333" } }), null, "ok");
  const r = await verifyPurchase({ env, user: USER, input: { kind: "sub", product: "gumus", token: "tok-abcdefghij", workspace: WS }, fetchFn: f.fetchFn });
  assert.equal(r.error, "account_mismatch");
  assert.ok(!f.calls.some((c) => c.includes("/rpc/")));
});

test("abonelik: veritabanı reddederse onaylanmaz (Google iade eder)", async () => {
  const f = fake(sub(), null, "already_subscribed_web");
  const r = await verifyPurchase({ env, user: USER, input: { kind: "sub", product: "gumus", token: "tok-abcdefghij", workspace: WS }, fetchFn: f.fetchFn });
  assert.deepEqual(r, { result: "already_subscribed_web" });
  assert.ok(!f.calls.some((c) => c.includes(":acknowledge")));
});

test("Elmas ve bilinmeyen ürün uygulamadan alınamaz; mağaza ayarı yoksa 503", async () => {
  assert.equal((await verifyPurchase({ env, user: USER, input: { kind: "sub", product: "elmas", token: "tok-abcdefghij", workspace: WS } })).error, "bad_product");
  assert.equal((await verifyPurchase({ env: { ...env, GOOGLE_PLAY_SERVICE_ACCOUNT: "" }, user: USER, input: { kind: "sub", product: "gumus", token: "tok-abcdefghij", workspace: WS } })).status, 503);
});

test("ek paket: ödenmişse verilir ve tüketilir; ödenmemişse verilmez", async () => {
  let f = fake(null, { purchaseState: 0, obfuscatedExternalAccountId: WS }, "ok");
  assert.deepEqual(await verifyPurchase({ env, user: USER, input: { kind: "pack", product: "ek_250", token: "pk-abcdefghij", workspace: WS }, fetchFn: f.fetchFn }), { result: "ok" });
  assert.ok(f.calls.some((c) => c.includes("products/ek_250/tokens/pk-abcdefghij:consume")));
  f = fake(null, { purchaseState: 2 }, "ok");
  assert.equal((await verifyPurchase({ env, user: USER, input: { kind: "pack", product: "ek_250", token: "pk-abcdefghij", workspace: WS }, fetchFn: f.fetchFn })).error, "not_paid");
  f = fake(null, { purchaseState: 0 }, "quota_not_exhausted");
  await verifyPurchase({ env, user: USER, input: { kind: "pack", product: "ek_250", token: "pk-abcdefghij", workspace: WS }, fetchFn: f.fetchFn });
  assert.ok(!f.calls.some((c) => c.includes(":consume")), "verilemeyen paket tüketilmez (iade edilir)");
});

test("subscriptionFields: iptal edilmiş abonelik ve paket değişikliği", () => {
  const f = subscriptionFields(sub({ subscriptionState: "SUBSCRIPTION_STATE_CANCELED", linkedPurchaseToken: "eski", lineItems: [{ productId: "altin", expiryTime: "2027-01-01T00:00:00Z", autoRenewingPlan: { autoRenewEnabled: false } }] }));
  assert.deepEqual([f.product, f.state, f.auto, f.linked], ["altin", "SUBSCRIPTION_STATE_CANCELED", false, "eski"]);
});

test("işçi: abonelikler Google'a yeniden sorulur, bulunamayan token süresi dolmuş sayılır", async () => {
  const { syncStoreSubscriptions } = await import("../src/store-sync.ts");
  const applied: Record<string, unknown>[] = [];
  const db = { rpc: async (fn: string, args: Record<string, unknown>) => {
    if (fn === "store_subscriptions_due") return { data: [{ purchase_token: "a", workspace_id: WS, product_id: "gumus" }, { purchase_token: "b", workspace_id: WS, product_id: "altin" }], error: null };
    applied.push(args); return { data: "ok", error: null };
  } };
  const fetchFn = async (url: string) => {
    if (url.includes("oauth2")) return new Response(JSON.stringify({ access_token: "AT" }));
    if (url.endsWith("/tokens/a")) return new Response(JSON.stringify(sub({ subscriptionState: "SUBSCRIPTION_STATE_CANCELED",
      lineItems: [{ productId: "gumus", expiryTime: new Date(Date.now() + 10 * 864e5).toISOString(), autoRenewingPlan: { autoRenewEnabled: false } }] })));
    if (url.includes("tokens/a:acknowledge")) { acked.push(url); return new Response("{}"); }
    return new Response("", { status: 410 });
  };
  const acked: string[] = [];
  assert.equal(await syncStoreSubscriptions({} as never, undefined), "kapalı");
  assert.deepEqual(await syncStoreSubscriptions(db as never, SA, fetchFn), { checked: 2, changed: 2, failed: 0 });
  assert.equal(applied[0].p_state, "SUBSCRIPTION_STATE_CANCELED");
  assert.equal(applied[1].p_state, "SUBSCRIPTION_STATE_EXPIRED");
  assert.equal(applied[1].p_product, "altin");
  assert.equal(acked.length, 1, "dönemi süren iptal edilmiş abonelik onaylanır");
});

test("işçi: uygulamanın onaylayamadığı etkin abonelik işçide onaylanır; bir hata diğerlerini durdurmaz", async () => {
  const { syncStoreSubscriptions } = await import("../src/store-sync.ts");
  const calls: string[] = [];
  const db = { rpc: async (fn: string) => fn === "store_subscriptions_due"
    ? { data: [{ purchase_token: "x", workspace_id: WS, product_id: "gumus" }, { purchase_token: "y", workspace_id: WS, product_id: "gumus" }], error: null }
    : { data: "ok", error: null } };
  const fetchFn = async (url: string, init?: RequestInit) => {
    calls.push(`${init?.method ?? "GET"} ${url}`);
    if (url.includes("oauth2")) return new Response(JSON.stringify({ access_token: "AT" }));
    if (url.endsWith("/tokens/x")) return new Response("", { status: 503 });
    if (url.endsWith("/tokens/y")) return new Response(JSON.stringify(sub()));
    if (url.includes(":acknowledge")) return new Response("{}");
    return new Response("", { status: 500 });
  };
  assert.deepEqual(await syncStoreSubscriptions(db as never, SA, fetchFn), { checked: 2, changed: 1, failed: 1 });
  assert.ok(calls.some((c) => c.includes("subscriptions/gumus/tokens/y:acknowledge")));
});

test("abonelik: ödemesi bekleyen satın alma onaylanmaz; onay 400 dönerse Google'a yeniden sorulur", async () => {
  let f = fake(sub({ subscriptionState: "SUBSCRIPTION_STATE_PENDING" }), null, "pending");
  assert.deepEqual(await verifyPurchase({ env, user: USER, input: { kind: "sub", product: "gumus", token: "tok-abcdefghij", workspace: WS }, fetchFn: f.fetchFn }), { result: "pending" });
  assert.ok(!f.calls.some((c) => c.includes(":acknowledge")));
  // 400 ve hâlâ onaysız: hata (sessizce yutulmaz)
  const fetch400 = async (url: string) => {
    if (url.includes("oauth2")) return new Response(JSON.stringify({ access_token: "AT" }));
    if (url.includes("/rpc/")) return new Response(JSON.stringify("ok"));
    if (url.includes(":acknowledge")) return new Response("{}", { status: 400 });
    if (url.includes("subscriptionsv2")) return new Response(JSON.stringify(sub()));
    return new Response("", { status: 500 });
  };
  await assert.rejects(() => verifyPurchase({ env, user: USER, input: { kind: "sub", product: "gumus", token: "tok-abcdefghij", workspace: WS }, fetchFn: fetch400 }), /google_ack_400/);
});

test("abonelik: iptal edilmiş ama dönemi süren satın alma onaylanır; süresi geçmiş iptal onaylanmaz", async () => {
  const future = new Date(Date.now() + 10 * 864e5).toISOString(), past = new Date(Date.now() - 864e5).toISOString();
  const line = (expiryTime: string) => [{ productId: "gumus", expiryTime, autoRenewingPlan: { autoRenewEnabled: false } }];
  let f = fake(sub({ subscriptionState: "SUBSCRIPTION_STATE_CANCELED", lineItems: line(future) }), null, "ok");
  await verifyPurchase({ env, user: USER, input: { kind: "sub", product: "gumus", token: "tok-abcdefghij", workspace: WS }, fetchFn: f.fetchFn });
  assert.ok(f.calls.some((c) => c.includes(":acknowledge")), "dönemi süren iptal onaylanır");
  f = fake(sub({ subscriptionState: "SUBSCRIPTION_STATE_CANCELED", lineItems: line(past) }), null, "ok");
  await verifyPurchase({ env, user: USER, input: { kind: "sub", product: "gumus", token: "tok-abcdefghij", workspace: WS }, fetchFn: f.fetchFn });
  assert.ok(!f.calls.some((c) => c.includes(":acknowledge")), "süresi geçmiş iptal onaylanmaz");
});
