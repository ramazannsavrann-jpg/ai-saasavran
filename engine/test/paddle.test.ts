import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
// @ts-ignore — düz JS modülü (Cloudflare Pages Functions)
import { verifyPaddle, subscriptionUpdate } from "../../functions/api/paddle/_lib.js";

const secret = "pdl_ntfset_test_secret";
const sign = (ts: number, body: string) => `ts=${ts};h1=${createHmac("sha256", secret).update(`${ts}:${body}`).digest("hex")}`;

test("Paddle imzası: doğru imza kabul, değiştirilmiş gövde / eski zaman / yanlış anahtar reddedilir", async () => {
  const now = 1_800_000_000, body = '{"event_type":"subscription.created"}';
  assert.equal(await verifyPaddle(sign(now, body), body, secret, now), true);
  assert.equal(await verifyPaddle(sign(now, body), body + " ", secret, now), false);
  assert.equal(await verifyPaddle(sign(now - 600, body), body, secret, now), false);
  assert.equal(await verifyPaddle(sign(now, body), body, "baska", now), false);
  assert.equal(await verifyPaddle(null, body, secret, now), false);
});

test("Paddle abonelik olayı: alan, paket, durum ve dönem sonu çıkarılır", () => {
  const u = subscriptionUpdate({
    id: "sub_1", status: "active", customer_id: "ctm_1", custom_data: { workspace_id: "6f1c2d3e-4a5b-4c6d-8e9f-0a1b2c3d4e5f" },
    current_billing_period: { ends_at: "2026-12-07T00:00:00Z" },
    items: [{ price: { id: "pri_1", custom_data: { plan: "pro" } } }],
  });
  assert.deepEqual(u, { p_workspace: "6f1c2d3e-4a5b-4c6d-8e9f-0a1b2c3d4e5f", p_plan: "pro", p_status: "active", p_subscription: "sub_1", p_customer: "ctm_1", p_period_end: "2026-12-07T00:00:00Z" });
  assert.equal(subscriptionUpdate({ id: "sub_2", status: "active", items: [] }).p_plan, null);
});
