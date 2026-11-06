// Gerçek yığın üzerinde entegrasyon testleri:
// Postgres 16 + Supabase Auth (GoTrue) + PostgREST + tüm migration'lar + ölçüm işçisi.
// İstemci tarafı istekler gerçek kullanıcı oturumlarıyla (JWT) ve Supabase varsayılan yetkileriyle yapılır.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { startStack } from "../../scripts/stack/stack.mjs";
import { processNextRun } from "../src/worker.ts";

let stack: Awaited<ReturnType<typeof startStack>>;
let svc: SupabaseClient;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };

async function user(email: string): Promise<{ c: SupabaseClient; id: string }> {
  const c = createClient(stack.url, stack.anonKey, opts);
  const { data, error } = await c.auth.signUp({ email, password: "Guclu-Sifre-123" });
  if (error) throw error;
  return { c, id: data.user!.id };
}
const ok = <T>(r: { data: T; error: any }) => { if (r.error) throw new Error(r.error.message); return r.data; };

/** Sahte Gemini cevabı: aramasız (groundingMetadata yok). Gerçek API'yi taklit eder, YALNIZCA testte. */
function fakeGemini(text: string, status = 200, calls: string[] = []) {
  return async (url: string) => {
    calls.push(url);
    if (status !== 200) return new Response(text, { status });
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text }] }, finishReason: "STOP" }],
      usageMetadata: { promptTokenCount: 20, candidatesTokenCount: 150 },
    }), { status: 200 });
  };
}
const ENV = { GEMINI_API_KEY: "test-key", GEMINI_TIER: "free", ALLOW_PAID_API: "false" };
const noSleep = async () => {};

let A: { c: SupabaseClient; id: string }, B: { c: SupabaseClient; id: string };
let wsA: string, brandA: string;

before(async () => {
  stack = await startStack({ quiet: true });
  svc = createClient(stack.url, stack.serviceKey, opts);
  A = await user("a@test.local");
  B = await user("b@test.local");
}, { timeout: 120_000 });

after(async () => { await stack?.stop(); });

test("Her public tabloda RLS açık", () => {
  const missing = stack.sql(`select string_agg(relname, ',') from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`);
  assert.equal(missing, "", `RLS kapalı tablolar: ${missing}`);
});

test("Kayıt + çalışma alanı oluşturma (RPC) + marka/rakip/soru", async () => {
  wsA = ok(await A.c.rpc("create_workspace", { p_name: "Ali Usta Döner", p_kind: "business" })) as string;
  const b = ok(await A.c.from("brands").insert({ workspace_id: wsA, name: "Ali Usta Döner", aliases: ["Ali Usta"], website: "aliusta-demo.com", city: "Antalya", sector: "Restoran" }).select("id").single()) as any;
  brandA = b.id;
  ok(await A.c.from("brands").insert([
    { workspace_id: wsA, name: "Kebapçı Halil", is_competitor: true, owner_brand_id: brandA },
    { workspace_id: wsA, name: "Şirin Döner", is_competitor: true, owner_brand_id: brandA },
  ]));
  ok(await A.c.from("prompts").insert([
    { workspace_id: wsA, brand_id: brandA, text: "Antalya'da en iyi döner nerede yenir?", intent: "local" },
    { workspace_id: wsA, brand_id: brandA, text: "Antalya'da uygun fiyatlı aile restoranı önerir misin?", intent: "comparison" },
  ]));
  const usage = ok(await A.c.rpc("workspace_usage", { p_workspace: wsA })) as any[];
  assert.equal(usage[0].plan_id, "free");
  assert.equal(usage[0].live_search_enabled, false);
});

test("İzolasyon: B, A'nın hiçbir verisini göremez ve yazamaz", async () => {
  assert.equal((ok(await B.c.from("workspaces").select("id")) as any[]).length, 0);
  assert.equal((ok(await B.c.from("brands").select("id")) as any[]).length, 0);
  assert.equal((ok(await B.c.from("prompts").select("id")) as any[]).length, 0);
  const ins = await B.c.from("brands").insert({ workspace_id: wsA, name: "Sızma" });
  assert.ok(ins.error, "B, A'nın çalışma alanına marka ekleyebildi!");
  const rr = await B.c.rpc("request_run", { p_brand: brandA });
  assert.match(rr.error?.message ?? "", /Yetki yok/);
  const usage = ok(await B.c.rpc("workspace_usage", { p_workspace: wsA })) as any[];
  assert.equal(usage.length, 0);
});

test("Güvenlik: istemci paketini yükseltemez, durdurmayı kaldıramaz, sonuç/maliyet yazamaz", async () => {
  const upd = ok(await A.c.from("workspaces").update({ plan: "agency_plus", status: "active" }).eq("id", wsA).select("id")) as any[];
  assert.equal(upd.length, 0, "Müşteri kendi paketini değiştirebildi!");
  assert.equal(stack.sql(`select plan from workspaces where id = '${wsA}'`), "free");
  for (const [table, row] of [
    ["runs", { workspace_id: wsA, brand_id: brandA, data_origin: "live_api", measurement_type: "model_knowledge", max_cost_usd: 1 }],
    ["cost_ledger", { workspace_id: wsA, task: "x", provider: "x", model: "x", cost_usd: 0 }],
    ["platform_admins", { user_id: A.id }],
    ["app_settings", { id: true, live_search_enabled: true }],
  ] as const) {
    const r = await A.c.from(table).insert(row as any);
    assert.ok(r.error, `İstemci ${table} tablosuna yazabildi!`);
  }
  const live = await A.c.from("app_settings").update({ live_search_enabled: true }).eq("id", true).select();
  assert.equal((live.data ?? []).length, 0, "İstemci canlı aramayı açabildi!");
  const calls: [string, Record<string, unknown>][] = [
    ["reserve_engine_call", { p_workspace: wsA, p_provider: "gemini", p_billing: "free", p_worst_paid_usd: 0, p_free_daily_limit: 10 }],
    ["record_engine_call", { p_workspace: wsA, p_run: null, p_provider: "x", p_model: "x", p_billing: "free", p_in: 0, p_out: 0, p_cost: 0, p_paid_equiv: 0, p_ok: true }],
    ["claim_next_run", {}],
    ["finish_run", { p_run: wsA, p_status: "done", p_stop_reason: "x", p_error_class: null, p_error: null, p_ok: 0, p_failed: 0, p_provider: null, p_model: null }],
  ];
  for (const [fn, args] of calls) {
    const r = await A.c.rpc(fn, args);
    assert.match(r.error?.message ?? "(hata yok)", /permission denied/, `İstemci ${fn} fonksiyonunu çağırabildi veya yanlış hata: ${r.error?.message}`);
  }
});

test("Paket limitleri: Free'de 1 marka, 2 rakip", async () => {
  const b2 = await A.c.from("brands").insert({ workspace_id: wsA, name: "İkinci Marka" });
  assert.match(b2.error?.message ?? "", /en fazla 1 marka/);
  const c3 = await A.c.from("brands").insert({ workspace_id: wsA, name: "Üçüncü Rakip", is_competitor: true, owner_brand_id: brandA });
  assert.match(c3.error?.message ?? "", /en fazla 2 rakip/);
});

test("Demo Lab: müşteri oluşturamaz, simüle veri müşteriye yazılamaz", async () => {
  const d = await A.c.rpc("create_workspace", { p_name: "Sahte demo", p_kind: "demo_lab" });
  assert.match(d.error?.message ?? "", /oluşturulamaz/);
  const s = await A.c.from("brands").insert({ workspace_id: wsA, name: "Sim", data_origin: "simulated" });
  assert.ok(s.error);
});

test("Aramasız ölçüm: kuyruk → işçi → ayrı veri türü olarak kayıt → rapor serisi", async () => {
  const runId = ok(await A.c.rpc("request_run", { p_brand: brandA })) as string;
  const dup = await A.c.rpc("request_run", { p_brand: brandA });
  assert.match(dup.error?.message ?? "", /bekleyen/);
  const calls: string[] = [];
  const res = await processNextRun({
    db: svc, env: ENV, sleep: noSleep,
    fetchFn: fakeGemini("Antalya'da öne çıkanlar:\n1. Kebapçı Halil\n2. Ali Usta Döner\n3. Başka Yer", 200, calls) as any,
  });
  assert.equal(res?.runId, runId);
  assert.equal(res?.status, "done");
  assert.equal(res?.ok, 2); // free paket: 1 tekrar × 2 soru
  assert.ok(calls.every((u) => u.includes("generativelanguage.googleapis.com")), "Gemini dışında bir yere istek gitti");

  const run = ok(await A.c.from("runs").select("status,measurement_type,provider,model,calls_ok").eq("id", runId).single()) as any;
  assert.deepEqual([run.status, run.measurement_type, run.provider], ["done", "model_knowledge", "gemini"]);
  const resp = ok(await A.c.from("responses").select("measurement_type,method,data_origin,billing,cost_usd")) as any[];
  assert.ok(resp.every((r) => r.measurement_type === "model_knowledge" && r.method === "api_no_search" && r.billing === "free" && Number(r.cost_usd) === 0));

  const series = ok(await A.c.rpc("brand_visibility", { p_brand: brandA, p_type: "model_knowledge" })) as any[];
  const us = series.find((x) => x.is_target);
  assert.deepEqual([us.n, us.mentioned, us.recommended], [2, 2, 2]);
  const liveSeries = ok(await A.c.rpc("brand_visibility", { p_brand: brandA, p_type: "live_search" })) as any[];
  assert.equal(liveSeries.length, 0, "Aramasız sonuç canlı arama gibi gösterildi!");

  const prompts = ok(await A.c.rpc("run_prompt_results", { p_run: runId })) as any[];
  assert.equal(prompts.length, 2);
  assert.equal(prompts[0].top_competitor, "Kebapçı Halil");

  const usage = (ok(await A.c.rpc("workspace_usage", { p_workspace: wsA })) as any[])[0];
  assert.deepEqual([usage.engine_calls, usage.free_calls, Number(usage.paid_cost_usd)], [2, 2, 0]);
  // B bu sonuçları göremez
  assert.equal((ok(await B.c.from("responses").select("id")) as any[]).length, 0);
  assert.equal((ok(await B.c.rpc("brand_visibility", { p_brand: brandA, p_type: "model_knowledge" })) as any[]).length, 0);
});

test("Hata sınıfları uçtan uca: model yok / yetki hatası / anahtar yok", async () => {
  const cases: [number, string, string][] = [
    [404, '{"error":{"message":"This model models/x is no longer available to new users."}}', "model_not_found"],
    [400, '{"error":{"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT"}}', "auth_error"],
  ];
  for (const [status, body, cls] of cases) {
    ok(await A.c.rpc("request_run", { p_brand: brandA }));
    const r = await processNextRun({ db: svc, env: ENV, sleep: noSleep, fetchFn: fakeGemini(body, status) as any });
    assert.equal(r?.status, "failed");
    assert.equal(r?.errorClass, cls);
    const run = ok(await A.c.from("runs").select("error_class").eq("id", r!.runId).single()) as any;
    assert.equal(run.error_class, cls);
  }
  ok(await A.c.rpc("request_run", { p_brand: brandA }));
  const none = await processNextRun({ db: svc, env: {}, sleep: noSleep });
  assert.equal(none?.stop, "provider_not_configured");
});

test("Ücretli kilit: canlı arama açılsa bile OpenAI çağrılmaz; ücretsiz aramalı istek 'desteklenmeyen özellik' olur", async () => {
  stack.sql(`update app_settings set live_search_enabled = true`);
  try {
    const runId = ok(await A.c.rpc("request_run", { p_brand: brandA })) as string;
    const calls: string[] = [];
    const r = await processNextRun({
      db: svc, env: { ...ENV, OPENAI_API_KEY: "sk-test" }, sleep: noSleep,
      fetchFn: fakeGemini('{"error":{"code":429,"status":"RESOURCE_EXHAUSTED"}}', 429, calls) as any,
    });
    assert.equal(r?.runId, runId);
    assert.equal(r?.errorClass, "unsupported_feature");
    assert.ok(!calls.some((u) => u.includes("openai")), "Ücretli API'ye istek gitti!");
    assert.equal(stack.sql(`select measurement_type from runs where id = '${runId}'`), "live_search");
    assert.equal(stack.sql(`select count(*) from responses where run_id = '${runId}'`), "0");
  } finally {
    stack.sql(`update app_settings set live_search_enabled = false`);
  }
});

test("Maliyet koruması: aylık kota dolunca run çalışmaz, çalışma alanı durur, yeni istek reddedilir", async () => {
  ok(await A.c.rpc("request_run", { p_brand: brandA }));
  stack.sql(`insert into cost_ledger (workspace_id, task, provider, model, cost_usd, billing)
             select '${wsA}', 'query_engine', 'gemini', 'm', 0, 'free' from generate_series(1, 40)`);
  const r = await processNextRun({ db: svc, env: ENV, sleep: noSleep, fetchFn: fakeGemini("1. Ali Usta Döner") as any });
  assert.equal(r?.status, "budget_blocked");
  assert.equal(r?.stop, "monthly_call_quota");
  const ws = ok(await A.c.from("workspaces").select("status,paused_reason").eq("id", wsA).single()) as any;
  assert.deepEqual([ws.status, ws.paused_reason], ["paused", "monthly_call_quota"]);
  const again = await A.c.rpc("request_run", { p_brand: brandA });
  assert.match(again.error?.message ?? "", /durduruldu/);
});

test("Demo Lab: yalnızca platform yöneticisi; simülasyon etiketli; müşteriden tamamen ayrı", async () => {
  const C = await user("admin@test.local");
  stack.sql(`insert into platform_admins values ('${C.id}')`);
  const demo = stack.sql(`insert into workspaces (name, kind, plan) values ('Demo Lab', 'demo_lab', 'agency_plus') returning id`).split("\n")[0];
  stack.sql(`insert into workspace_members values ('${demo}', '${C.id}', 'owner', now())`);
  assert.throws(() => stack.sql(`insert into workspace_members values ('${demo}', '${A.id}', 'viewer', now())`), /platform yöneticileri/);

  const db = ok(await C.c.from("brands").insert({ workspace_id: demo, name: "Demo Döner (hayali)", data_origin: "simulated" }).select("id").single()) as any;
  ok(await C.c.from("brands").insert({ workspace_id: demo, name: "Hayali Rakip", is_competitor: true, owner_brand_id: db.id, data_origin: "simulated" }));
  ok(await C.c.from("prompts").insert({ workspace_id: demo, brand_id: db.id, text: "Hayali şehirde en iyi döner?", intent: "local" }));
  const live = await C.c.from("brands").insert({ workspace_id: demo, name: "Gerçek", data_origin: "live_api" });
  assert.match(live.error?.message ?? "", /gerçek veri/);

  ok(await C.c.rpc("request_run", { p_brand: db.id }));
  const calls: string[] = [];
  const r = await processNextRun({ db: svc, env: ENV, sleep: noSleep, fetchFn: fakeGemini("x", 200, calls) as any });
  assert.equal(r?.status, "done");
  assert.equal(calls.length, 0, "Demo ölçümü gerçek API'ye gitti!");
  const resp = ok(await C.c.from("responses").select("measurement_type,data_origin,answer_text")) as any[];
  assert.ok(resp.length > 0 && resp.every((x) => x.measurement_type === "simulated" && x.data_origin === "simulated" && x.answer_text.startsWith("[SİMÜLASYON]")));
  // Müşteri demo'yu göremez; yönetici müşteriyi göremez
  assert.equal((ok(await A.c.from("brands").select("name").ilike("name", "%hayali%")) as any[]).length, 0);
  assert.equal((ok(await C.c.from("brands").select("id").eq("workspace_id", wsA)) as any[]).length, 0);
});

test("Migration çalıştırıcı: boş veritabanına uygular, ikinci kez uygulamaz, değiştirilmiş dosyayı reddeder", async () => {
  const { spawnSync } = await import("node:child_process");
  const { mkdtempSync, cpSync, appendFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  const { tmpdir } = await import("node:os");
  stack.sql(`create database migtest`);
  const url = "postgres://postgres:postgres@127.0.0.1:54322/migtest";
  const p = spawnSync("psql", ["-X", "-q", url, "-c", `create schema auth; create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;`], { encoding: "utf8" });
  assert.equal(p.status, 0, p.stderr);
  const root = new URL("../..", import.meta.url).pathname;
  const run = (dir?: string) => spawnSync("node", [join(root, "scripts/migrate.mjs")], {
    encoding: "utf8", env: { ...process.env, SUPABASE_DB_URL: url, ...(dir ? { MIGRATIONS_DIR: dir } : {}) },
  });
  const first = run();
  assert.equal(first.status, 0, first.stderr);
  assert.match(first.stdout, /3 migration uygulandı/);
  const second = run();
  assert.equal(second.status, 0, second.stderr);
  assert.match(second.stdout, /güncel/);
  // Değiştirilmiş migration reddedilir; hata mesajında şifre görünmez
  const dir = mkdtempSync(join(tmpdir(), "mig-copy-"));
  cpSync(join(root, "supabase/migrations"), dir, { recursive: true });
  appendFileSync(join(dir, "0001_init.sql"), "\n-- değişiklik\n");
  const tampered = run(dir);
  assert.notEqual(tampered.status, 0);
  assert.match(tampered.stderr, /değiştirilmiş/);
  assert.ok(!tampered.stderr.includes("postgres:postgres@"), "Bağlantı şifresi hata mesajına sızdı");
  // RLS migtest'te de açık
  const noRls = spawnSync("psql", ["-X", "-A", "-t", url, "-c",
    `select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`], { encoding: "utf8" });
  assert.equal(noRls.stdout.trim(), "0");
});
