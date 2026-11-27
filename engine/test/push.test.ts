import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { processRunPushes, pushText } from "../src/push.ts";

test("bildirim metni: rakip dili yok, haftalık ve istenen ölçüm ayrı", () => {
  assert.equal(pushText("tr", "weekly", "Ali Usta").title, "Haftalık ölçüm yapıldı");
  assert.equal(pushText("tr", "manual", "Ali Usta").title, "Sorgunuz hazır");
  for (const l of ["tr", "en"] as const) for (const t of ["weekly", "manual"]) {
    const m = pushText(l, t, "X"); assert.doesNotMatch(m.title + m.body, /rakip|competitor|öne geçti|ahead/i);
  }
});

test("hizmet hesabı yoksa hiçbir şey gönderilmez", async () => {
  assert.equal(await processRunPushes({} as never, undefined), "kapalı");
});

test("gönderir, geçersiz cihazı siler, ölçümü bir kez işaretler", async () => {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const sa = JSON.stringify({ project_id: "p", client_email: "x@p.iam.gserviceaccount.com", private_key: privateKey.export({ type: "pkcs8", format: "pem" }) });
  const calls: string[] = [];
  const db = { rpc: async (fn: string, args: Record<string, unknown>) => {
    calls.push(fn + ":" + JSON.stringify(args));
    if (fn === "pending_run_pushes") return { data: [
      { run_id: "r1", brand_name: "Ali Usta", trigger: "weekly", token: "good", lang: "tr" },
      { run_id: "r1", brand_name: "Ali Usta", trigger: "weekly", token: "dead", lang: "en" },
      { run_id: "r1", brand_name: "Ali Usta", trigger: "weekly", token: null, lang: null },
      { run_id: "r2", brand_name: "B", trigger: "manual", token: null, lang: null },
    ], error: null };
    return { data: null, error: null };
  } };
  const sentBodies: string[] = [];
  const fetchFn = async (url: string, init?: RequestInit) => {
    if (url.includes("oauth2")) return new Response(JSON.stringify({ access_token: "AT" }), { status: 200 });
    sentBodies.push(String(init?.body));
    return String(init?.body).includes("\"dead\"") ? new Response("", { status: 404 }) : new Response("{}", { status: 200 });
  };
  const r = await processRunPushes(db as never, sa, { fetchFn });
  assert.deepEqual(r, { runs: 2, sent: 1, failed: 1, removed: 1 });
  assert.ok(calls.includes('drop_push_device:{"p_token":"dead"}'));
  assert.ok(calls.includes('record_run_push:{"p_run":"r1","p_sent":1}'));
  assert.ok(calls.includes('record_run_push:{"p_run":"r2","p_sent":0}'));
  assert.match(sentBodies[0], /Haftalık ölçüm yapıldı/);
});
