// Gerçek yığın üzerinde entegrasyon testleri:
// Postgres 16 + Supabase Auth (GoTrue) + PostgREST + tüm migration'lar + ölçüm işçisi.
// İstemci tarafı istekler gerçek kullanıcı oturumlarıyla (JWT) ve Supabase varsayılan yetkileriyle yapılır.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { startStack } from "../../scripts/stack/stack.mjs";
import { maintain, processNextRun, processShoppingChecks } from "../src/worker.ts";

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

test("Paket limitleri: Free'de 1 marka, 3 rakip", async () => {
  const b2 = await A.c.from("brands").insert({ workspace_id: wsA, name: "İkinci Marka" });
  assert.match(b2.error?.message ?? "", /en fazla 1 marka/);
  // Tek ifadede 3. ve 4. rakip: 4. sınırı aşar, ifade bütünüyle geri alınır (sonraki testler etkilenmez)
  const c4 = await A.c.from("brands").insert([
    { workspace_id: wsA, name: "Üçüncü Rakip", is_competitor: true, owner_brand_id: brandA },
    { workspace_id: wsA, name: "Dördüncü Rakip", is_competitor: true, owner_brand_id: brandA },
  ]);
  assert.match(c4.error?.message ?? "", /en fazla 3 rakip/);
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

test("Ücretli kilit: canlı arama açılsa bile ALLOW_PAID_API kapalıyken OpenAI çağrılmaz; ücretsiz Gemini'de arama olmadığı için sağlayıcı yok", async () => {
  stack.sql(`update app_settings set live_search_enabled = true`);
  try {
    const runId = ok(await A.c.rpc("request_run", { p_brand: brandA })) as string;
    const calls: string[] = [];
    const r = await processNextRun({
      db: svc, env: { ...ENV, OPENAI_API_KEY: "sk-test" }, sleep: noSleep,
      fetchFn: fakeGemini('{"error":{"code":429,"status":"RESOURCE_EXHAUSTED"}}', 429, calls) as any,
    });
    assert.equal(r?.runId, runId);
    assert.equal(r?.stop, "provider_not_configured");
    assert.equal(calls.length, 0, "Hiçbir sağlayıcıya istek gitmemeli");
    assert.equal(stack.sql(`select measurement_type from runs where id = '${runId}'`), "live_search");
    assert.equal(stack.sql(`select count(*) from responses where run_id = '${runId}'`), "0");
  } finally {
    stack.sql(`update app_settings set live_search_enabled = false`);
  }
});

test("Maliyet koruması: aylık kota dolunca run çalışmaz, çalışma alanı durur, yeni istek reddedilir", async () => {
  ok(await A.c.rpc("request_run", { p_brand: brandA }));
  stack.sql(`insert into cost_ledger (workspace_id, task, provider, model, cost_usd, billing)
             select '${wsA}', 'query_engine', 'gemini', 'm', 0, 'free' from generate_series(1, 100)`);
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
  assert.match(first.stdout, /27 migration uygulandı/);
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

test("Haftalık otomatik ölçüm: uygun markayı sıraya alır, yakın zamanda ölçüleni ve kotası yetmeyeni atlar", async () => {
  const W = await user("haftalik@test.local");
  const ws = ok(await W.c.rpc("create_workspace", { p_name: "Haftalık", p_kind: "business" })) as string;
  const b = ok(await W.c.from("brands").insert({ workspace_id: ws, name: "Haftalık Marka" }).select("id").single()) as any;
  ok(await W.c.from("prompts").insert([
    { workspace_id: ws, brand_id: b.id, text: "Birinci deneme sorusu?", intent: "local" },
    { workspace_id: ws, brand_id: b.id, text: "İkinci deneme sorusu?", intent: "local" },
  ]));
  const sched = async () => ok(await svc.rpc("schedule_weekly_runs", { p_limit: 100 })) as number;
  const queued = () => stack.sql(`select count(*) from runs where brand_id='${b.id}' and trigger='weekly' and status='queued'`);
  await sched();
  assert.equal(queued(), "1");
  await sched();
  assert.equal(queued(), "1", "Bekleyen ölçüm varken ikinci kez sıraya alınmamalı");
  // İstemci çağıramaz
  assert.match((await W.c.rpc("schedule_weekly_runs", { p_limit: 1 })).error?.message ?? "", /permission denied/);
  // Ölçümü tamamla, 8 gün öncesine çek → tekrar uygun
  stack.sql(`update runs set status='done', created_at=now()-interval '8 days' where brand_id='${b.id}'`);
  await sched();
  assert.equal(queued(), "1");
  // Kota: Free=100; 99 çağrı kullanılmışken 2 soruluk ölçüm kotayı aşar → atlanır, çalışma alanı DURDURULMAZ
  stack.sql(`update runs set status='done', created_at=now()-interval '8 days' where brand_id='${b.id}'`);
  stack.sql(`insert into cost_ledger (workspace_id, task, provider, model, cost_usd, billing) select '${ws}', 'query_engine', 'gemini', 'm', 0, 'free' from generate_series(1, 99)`);
  await sched();
  assert.equal(queued(), "0");
  assert.equal(stack.sql(`select status from workspaces where id='${ws}'`), "active");
  // Kapatılmış marka sıraya alınmaz
  stack.sql(`delete from cost_ledger where workspace_id='${ws}'`);
  ok(await W.c.from("brands").update({ auto_weekly: false }).eq("id", b.id));
  await sched();
  assert.equal(queued(), "0");
});

test("Site kontrolü: kullanıcı ister, işçi yapar, yalnız üyeler görür, saatte bir sınırı", async () => {
  const S = await user("site@test.local");
  const ws = ok(await S.c.rpc("create_workspace", { p_name: "Site", p_kind: "business" })) as string;
  const b = ok(await S.c.from("brands").insert({ workspace_id: ws, name: "Site Marka" }).select("id").single()) as any;
  assert.match((await S.c.rpc("request_site_audit", { p_brand: b.id })).error?.message ?? "", /web sitesi ekleyin/);
  ok(await S.c.from("brands").update({ website: "sitemarka.test" }).eq("id", b.id));
  ok(await S.c.rpc("request_site_audit", { p_brand: b.id }));
  const { processAudits } = await import("../src/worker.ts");
  const fake = async (url: string) => {
    const body = url.endsWith("/robots.txt") ? "User-agent: *\nDisallow:\n" : url.endsWith("/") ? "<html lang='tr'><head><title>Site Marka resmi sitesi</title></head><body>merhaba</body></html>" : "";
    const r = new Response(body, { status: body ? 200 : 404 }); Object.defineProperty(r, "url", { value: url }); return r;
  };
  const done = await processAudits({ db: svc, env: {}, fetchFn: fake as any });
  assert.ok(done.some((d) => d.brandId === b.id && d.status === "ok"));
  const audits = ok(await S.c.from("site_audits").select("checks,status").eq("brand_id", b.id)) as any[];
  assert.equal(audits.length, 1);
  assert.ok(audits[0].checks.find((c: any) => c.id === "ai_bots").ok);
  assert.equal(audits[0].checks.find((c: any) => c.id === "schema_org").ok, false);
  assert.match((await S.c.rpc("request_site_audit", { p_brand: b.id })).error?.message ?? "", /son bir saat/);
  // Başka kullanıcı göremez, istemci yazamaz
  assert.equal((ok(await B.c.from("site_audits").select("id")) as any[]).length, 0);
  assert.ok((await S.c.from("site_audits").insert({ workspace_id: ws, brand_id: b.id, url: "x", status: "ok" })).error);
});

test("Laboratuvarlar: yönetici atanır, Demo Lab 10 hayali marka + 6 haftalık simülasyon, Growth Lab gerçek ölçüm sırada, tekrar çalışınca çoğaltmaz", async () => {
  const { seedLabs, DEMO_BRANDS } = await import("../src/labs.ts");
  const names = DEMO_BRANDS.map((d) => d.name);
  const L = await user("kurucu@test.local");
  const logs: string[] = [];
  const none = await seedLabs(svc, "yok@test.local", (m) => logs.push(m));
  assert.equal(none.ok, false);
  const r = await seedLabs(svc, "KURUCU@test.local", (m) => logs.push(m));
  assert.equal(r.ok, true);
  assert.equal(ok(await L.c.rpc("is_platform_admin")), true);
  const demoBrands = ok(await L.c.from("brands").select("id,name,data_origin").eq("workspace_id", r.demo).eq("is_competitor", false).in("name", names)) as any[];
  assert.equal(demoBrands.length, 10);
  assert.ok(demoBrands.every((x) => x.data_origin === "simulated"));
  const series = ok(await L.c.rpc("brand_visibility", { p_brand: demoBrands[0].id, p_type: "simulated" })) as any[];
  assert.equal(new Set(series.map((x) => x.run_id)).size, 6);
  const growthRuns = ok(await L.c.from("runs").select("status,measurement_type,brand_id,brands(name)").eq("workspace_id", r.growth)) as any[];
  const byName = (n: string) => growthRuns.filter((x) => x.brands.name === n).map((x) => [x.status, x.measurement_type]);
  assert.deepEqual(byName("AI SaaSavran"), [["queued", "model_knowledge"]]);
  assert.deepEqual(byName("Garanti BBVA"), [["queued", "live_search"]], "test markası için tek seferlik canlı deneme");
  const pws = ok(await L.c.from("workspaces").select("kind,plan,paid_live_allowed").eq("id", r.pilot).single()) as any;
  assert.deepEqual([pws.kind, pws.plan, pws.paid_live_allowed], ["agency", "agency_plus", false], "pilot alanı: ajans, geniş kota, ücretli kapalı");
  const gws = ok(await L.c.from("workspaces").select("paid_live_allowed").eq("id", r.growth).single()) as any;
  assert.equal(gws.paid_live_allowed, true);
  // Tekrar çalıştır: çoğaltma yok
  await seedLabs(svc, "kurucu@test.local", () => {});
  assert.equal((ok(await L.c.from("brands").select("id").eq("workspace_id", r.demo).eq("is_competitor", false).in("name", names)) as any[]).length, 10);
  assert.equal(stack.sql(`select count(*) from runs where workspace_id='${r.growth}'`), "2", "tekrar çalışınca yeni ölçüm eklenmemeli");
  // Müşteri Demo Lab'i ve Growth Lab'i göremez
  assert.equal((ok(await A.c.from("workspaces").select("id").in("id", [r.demo, r.growth])) as any[]).length, 0);
});

/** Sahte OpenAI Responses cevabı (web_search ile). YALNIZCA testte. */
function fakeOpenAI(text: string, urls: string[], calls: { url: string; body: any }[] = []) {
  return async (url: string, init?: RequestInit) => {
    calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : null });
    return new Response(JSON.stringify({
      output: [
        { type: "web_search_call", action: { query: "en iyi banka" } },
        { type: "message", content: [{ type: "output_text", text, annotations: urls.map((u) => ({ type: "url_citation", url: u })) }] },
      ],
      usage: { input_tokens: 8000, output_tokens: 400 },
    }), { status: 200 });
  };
}

test("Ücretli canlı ölçüm: müşteri alanında imkânsız, Growth Lab'de çalışır, toplam tavanda durur", async () => {
  const PAID_ENV = { ...ENV, OPENAI_API_KEY: "sk-test", ALLOW_PAID_API: "true" };
  stack.sql(`update runs set status='failed' where status in ('queued','running')`);
  stack.sql(`update workspaces set status='active', paused_reason=null where id='${wsA}'`);
  // Müşteri: istek reddedilir, izin bayrağı müşteri alanına konulamaz
  assert.match((await A.c.rpc("request_run", { p_brand: brandA, p_live: true })).error?.message ?? "", /kapalı/);
  assert.ok((await svc.from("workspaces").update({ paid_live_allowed: true }).eq("id", wsA)).error, "müşteri alanına ücretli izin verilememeli");
  // İstemci bayrağı kendisi değiştiremez
  const G = await user("growth@test.local");
  const gws = ok(await svc.from("workspaces").insert({ name: "Growth Test", kind: "growth_lab", plan: "pro", paid_live_allowed: true }).select("id").single()) as any;
  ok(await svc.from("workspace_members").insert({ workspace_id: gws.id, user_id: G.id, role: "owner" }));
  const gb = ok(await G.c.from("brands").insert({ workspace_id: gws.id, name: "Garanti BBVA", website: "garantibbva.com.tr" }).select("id").single()) as any;
  ok(await G.c.from("brands").insert({ workspace_id: gws.id, name: "Akbank", is_competitor: true, owner_brand_id: gb.id }));
  ok(await G.c.from("prompts").insert([{ workspace_id: gws.id, brand_id: gb.id, text: "Hangi bankayı önerirsin?", intent: "purchase" }]));
  const bud = ok(await G.c.rpc("paid_budget", { p_workspace: gws.id })) as any[];
  assert.equal(bud[0].allowed, true);
  assert.equal(Number(bud[0].cap_usd), 3);
  // Canlı ölçüm: OpenAI seçilir, kaynaklar kaydedilir, maliyet "paid" olarak yazılır
  const runId = ok(await G.c.rpc("request_run", { p_brand: gb.id, p_live: true })) as string;
  assert.equal(stack.sql(`select measurement_type from runs where id='${runId}'`), "live_search");
  const calls: { url: string; body: any }[] = [];
  const r = await processNextRun({ db: svc, env: PAID_ENV, sleep: noSleep,
    fetchFn: fakeOpenAI("1. Garanti BBVA\n2. Akbank", ["https://www.garantibbva.com.tr/kart", "https://www.sikayetvar.com/x"], calls) as any });
  assert.equal(r?.status, "done", JSON.stringify(r));
  assert.ok(calls.every((c) => c.url === "https://api.openai.com/v1/responses"));
  assert.equal(calls[0].body.model, "gpt-6-luna");
  assert.equal(calls[0].body.tools[0].type, "web_search");
  assert.equal(calls[0].body.max_tool_calls, 2);
  const resp = ok(await G.c.from("responses").select("provider,cited_urls,measurement_type,billing").eq("run_id", runId)) as any[];
  assert.ok(resp.length >= 1 && resp.every((x) => x.provider === "openai" && x.billing === "paid" && x.measurement_type === "live_search"));
  assert.equal(resp[0].cited_urls.length, 2);
  const cited = stack.sql(`select bool_or(m.cited) from mentions m join responses rr on rr.id=m.response_id where rr.run_id='${runId}' and m.brand_id='${gb.id}'`);
  assert.equal(cited, "t", "markanın sitesi kaynak gösterildi olarak işaretlenmeli");
  const spent = Number(stack.sql(`select sum(cost_usd) from cost_ledger where billing='paid'`));
  assert.ok(spent > 0 && spent < 0.1, `harcama ${spent}`);
  // Toplam tavan: kalan bütçeyi bitir → yeni canlı istek reddedilir; işçi de ücretli çağrı yapmaz
  stack.sql(`update app_settings set paid_total_cap_usd = ${spent + 0.01}`);
  assert.match((await G.c.rpc("request_run", { p_brand: gb.id, p_live: true })).error?.message ?? "", /tavan/);
  stack.sql(`update app_settings set paid_total_cap_usd = 3`);
  const run2 = ok(await G.c.rpc("request_run", { p_brand: gb.id, p_live: true })) as string;
  stack.sql(`update app_settings set paid_total_cap_usd = ${spent + 0.01}`); // en kötü durum çağrı maliyetinden az kaldı
  const calls2: { url: string; body: any }[] = [];
  const r2 = await processNextRun({ db: svc, env: PAID_ENV, sleep: noSleep, fetchFn: fakeOpenAI("x", [], calls2) as any });
  assert.equal(r2?.runId, run2);
  assert.equal(r2?.stop, "global_paid_cap");
  assert.equal(calls2.length, 0, "tavan aşılacaksa ücretli çağrı hiç yapılmamalı");
  assert.equal(stack.sql(`select status from workspaces where id='${gws.id}'`), "active", "toplam tavan alanı durdurmaz");
  // ALLOW_PAID_API kapalıysa canlı ölçümde sağlayıcı yok
  stack.sql(`update app_settings set paid_total_cap_usd = 3`);
  ok(await G.c.rpc("request_run", { p_brand: gb.id, p_live: true }));
  const r3 = await processNextRun({ db: svc, env: { ...PAID_ENV, ALLOW_PAID_API: "false" }, sleep: noSleep });
  assert.equal(r3?.stop, "provider_not_configured");
  // Growth Lab'de ChatGPT + Claude birlikte: her motor ayrı cevap yazar, ölçümün sağlayıcısı "openai,claude"
  stack.sql(`update runs set status='failed' where status in ('queued','running')`);
  const run4 = ok(await G.c.rpc("request_run", { p_brand: gb.id, p_live: true })) as string;
  const calls4: string[] = [];
  const both = async (url: string, init?: RequestInit) => {
    calls4.push(url);
    if (url.includes("anthropic")) {
      return new Response(JSON.stringify({
        content: [
          { type: "server_tool_use", name: "web_search", input: { query: "banka" } },
          { type: "web_search_tool_result", content: [] },
          { type: "text", text: "1. Akbank\n2. Garanti BBVA", citations: [{ type: "web_search_result_location", url: "https://www.akbank.com/x" }] },
        ],
        usage: { input_tokens: 6000, output_tokens: 300, server_tool_use: { web_search_requests: 1 } },
      }), { status: 200 });
    }
    return fakeOpenAI("1. Garanti BBVA", ["https://www.garantibbva.com.tr/kart"])(url, init);
  };
  const r4 = await processNextRun({ db: svc, env: { ...PAID_ENV, ANTHROPIC_API_KEY: "sk-ant-test" }, sleep: noSleep, fetchFn: both as any });
  assert.equal(r4?.runId, run4);
  assert.equal(r4?.status, "done", JSON.stringify(r4));
  assert.ok(calls4.some((u) => u.includes("api.openai.com")) && calls4.some((u) => u === "https://api.anthropic.com/v1/messages"));
  const resp4 = ok(await G.c.from("responses").select("provider,billing").eq("run_id", run4)) as any[];
  assert.deepEqual([...new Set(resp4.map((x) => x.provider))].sort(), ["claude", "openai"]);
  assert.ok(resp4.every((x) => x.billing === "paid"));
  assert.equal(stack.sql(`select provider from runs where id='${run4}'`), "openai,claude");
  const vis = ok(await G.c.rpc("brand_visibility", { p_brand: gb.id, p_type: "live_search" })) as any[];
  assert.ok(vis.some((v) => v.run_id === run4 && v.provider === "claude"), "rapor satırları motor bazında ayrılmalı");
});

test("Yeniden analiz: takma ad eklenince marka işaretlenir, işçi eski cevapları ücretsiz yeniden hesaplar, işaret kalkar", async () => {
  const { processReanalysis } = await import("../src/worker.ts");
  const R = await user("reanaliz@test.local");
  const ws = ok(await R.c.rpc("create_workspace", { p_name: "Reanaliz", p_kind: "business" })) as string;
  const b = ok(await R.c.from("brands").insert({ workspace_id: ws, name: "Garanti BBVA" }).select("id,reanalyze_requested_at").single()) as any;
  assert.equal(b.reanalyze_requested_at, null, "yeni markada işaret olmamalı");
  const p = ok(await R.c.from("prompts").insert({ workspace_id: ws, brand_id: b.id, text: "Hangi kartı önerirsin?", intent: "purchase" }).select("id").single()) as any;
  // Kayıtlı bir ölçüm ve cevap (servis rolüyle; gerçek ölçümün bıraktığı iz)
  const run = ok(await svc.from("runs").insert({ workspace_id: ws, brand_id: b.id, status: "done", data_origin: "live_api", measurement_type: "model_knowledge", max_cost_usd: 1, prompts_total: 1 }).select("id").single()) as any;
  const resp = ok(await svc.from("responses").insert({ workspace_id: ws, run_id: run.id, prompt_id: p.id, provider: "gemini", model: "m", method: "api_no_search", repetition: 1, answer_text: "1. QNB kart\n2. Bonus programı", measurement_type: "model_knowledge", data_origin: "live_api", billing: "free" }).select("id").single()) as any;
  ok(await svc.from("mentions").insert({ response_id: resp.id, workspace_id: ws, brand_id: b.id, mentioned: false, recommended: false, cited: false, classifier: "rules_v2" }));
  // Rakip ekle → ana marka işaretlenir; işçi çalışınca QNB önerildi olarak hesaplanır
  const qnb = ok(await R.c.from("brands").insert({ workspace_id: ws, name: "QNB", is_competitor: true, owner_brand_id: b.id }).select("id").single()) as any;
  assert.notEqual(stack.sql(`select reanalyze_requested_at from brands where id='${b.id}'`), "");
  const done = await processReanalysis({ db: svc });
  assert.ok(done.some((d) => d.brandId === b.id && d.responses === 1));
  assert.equal(stack.sql(`select recommended from mentions where response_id='${resp.id}' and brand_id='${qnb.id}'`), "t");
  assert.equal(stack.sql(`select coalesce(reanalyze_requested_at::text,'') from brands where id='${b.id}'`), "", "işaret kalkmalı");
  // Takma ad eklenince yine işaretlenir; istemci pending_reanalysis çağıramaz
  ok(await R.c.from("brands").update({ aliases: ["Bonus programı"] }).eq("id", b.id));
  assert.notEqual(stack.sql(`select coalesce(reanalyze_requested_at::text,'') from brands where id='${b.id}'`), "");
  assert.match((await R.c.rpc("pending_reanalysis", { p_limit: 5 })).error?.message ?? "", /permission denied/);
  await processReanalysis({ db: svc });
  assert.equal(stack.sql(`select mentioned from mentions where response_id='${resp.id}' and brand_id='${b.id}'`), "t");
});

test("Kötüye kullanım sınırı: Free pakette ayda 4 ölçüm; 5. istek reddedilir, haftalık plan da sıraya almaz", async () => {
  const F = await user("aylik-sinir@test.local");
  const ws = ok(await F.c.rpc("create_workspace", { p_name: "Aylık sınır", p_kind: "business" })) as string;
  const b = ok(await F.c.from("brands").insert({ workspace_id: ws, name: "Sınır Marka" }).select("id").single()) as any;
  ok(await F.c.from("prompts").insert({ workspace_id: ws, brand_id: b.id, text: "En iyi döner nerede?", intent: "local" }));
  stack.sql(`insert into runs (workspace_id, brand_id, status, data_origin, measurement_type, max_cost_usd, prompts_total)
             select '${ws}', '${b.id}', 'done', 'live_api', 'model_knowledge', 0.01, 1 from generate_series(1, 3)`);
  ok(await F.c.rpc("request_run", { p_brand: b.id }));  // 4. ölçüm: izin var
  stack.sql(`update runs set status='done', created_at = greatest(date_trunc('month', now()), now() - interval '8 days') where brand_id='${b.id}'`);
  const fifth = await F.c.rpc("request_run", { p_brand: b.id });
  assert.match(fifth.error?.message ?? "", /ölçüm hakkınız doldu \(4 \/ ay\)/);
  ok(await svc.rpc("schedule_weekly_runs", { p_limit: 500 }));
  assert.equal(stack.sql(`select count(*) from runs where brand_id='${b.id}' and status='queued'`), "0");
});

test("Haftalık e-posta özeti: gerçek ölçümü olan kullanıcıya gider, haftada bir kez; abonelikten çıkan almaz", async () => {
  const { sendWeeklyDigests } = await import("../src/email.ts");
  ok(await A.c.rpc("set_email_prefs", { p_lang: "tr" }));
  const sentTo: any[] = [];
  const fakeResend = async (_u: string, init?: RequestInit) => { sentTo.push(JSON.parse(String(init!.body))); return new Response("{}", { status: 200 }); };
  const r1 = await sendWeeklyDigests(svc, "re_test", { fetchFn: fakeResend as any, force: true });
  const mine = sentTo.find((m) => m.to[0] === "a@test.local");
  assert.ok(r1.sent >= 1 && mine, JSON.stringify(r1));
  assert.match(mine.subject, /Haftalık/);
  assert.match(mine.text, /Önerilme: %?\d+/);
  assert.match(mine.headers["List-Unsubscribe"], /\/api\/unsubscribe\?t=/);
  sentTo.length = 0;
  await sendWeeklyDigests(svc, "re_test", { fetchFn: fakeResend as any, force: true });
  assert.ok(!sentTo.some((m) => m.to[0] === "a@test.local"), "aynı hafta ikinci kez gitmemeli");
  const token = mine.headers["List-Unsubscribe"].match(/t=([0-9a-f-]+)/)[1];
  assert.equal(ok(await svc.rpc("unsubscribe_weekly", { p_token: token })), true);
  stack.sql(`update email_prefs set last_weekly_at = null`);
  sentTo.length = 0;
  await sendWeeklyDigests(svc, "re_test", { fetchFn: fakeResend as any, force: true });
  assert.ok(!sentTo.some((m) => m.to[0] === "a@test.local"), "abonelikten çıkan almamalı");
  assert.ok((await A.c.rpc("weekly_digest")).error, "özet verisi kullanıcıya kapalı olmalı");
});

test("Google Shopping: ücretli alanda istek → işçi SerpApi'yi arar → sıra/fiyat/rakip kaydedilir; günde bir; kota azsa durur", async () => {
  const G = await user("shop@test.local");
  const gws = ok(await svc.from("workspaces").insert({ name: "Shop Test", kind: "growth_lab", plan: "pro", paid_live_allowed: true }).select("id").single()) as any;
  ok(await svc.from("workspace_members").insert({ workspace_id: gws.id, user_id: G.id, role: "owner" }));
  const gb = ok(await G.c.from("brands").insert({ workspace_id: gws.id, name: "Marka A", country: "TR" }).select("id").single()) as any;
  const own = ok(await G.c.from("products").insert({ workspace_id: gws.id, brand_id: gb.id, name: "Rüzgar 2", facts: "Koşu ayakkabısı, 280 gr", shopping_query: "koşu ayakkabısı" }).select("id").single()) as any;
  const riv = ok(await G.c.from("products").insert({ workspace_id: gws.id, brand_id: gb.id, name: "Hızlı 3", rival_of: own.id, rival_brand: "Marka C" }).select("id").single()) as any;
  // rakip ürüne ayrı istek yok
  assert.ok((await G.c.rpc("request_shopping_check", { p_product: riv.id })).error);
  ok(await G.c.rpc("request_shopping_check", { p_product: own.id }));
  assert.equal(await processShoppingChecks({ db: svc, env: {} }), "SERPAPI_KEY yok");
  const urls: string[] = [];
  const fake = async (u: string) => {
    urls.push(u);
    if (u.includes("account.json")) return new Response(JSON.stringify({ total_searches_left: 200 }), { status: 200 });
    return new Response(JSON.stringify({ shopping_results: [
      { title: "Marka C Hızlı 3 Erkek Koşu Ayakkabısı", source: "Mağaza X", price: "2.499 TL" },
      { title: "Marka A Rüzgar 2 Koşu Ayakkabısı", source: "Mağaza Y", price: "1.999 TL" },
    ] }), { status: 200 });
  };
  const out = await processShoppingChecks({ db: svc, env: { SERPAPI_KEY: "k" }, fetchFn: fake as any }) as { productId: string; status: string }[];
  const mine = out.find((o) => o.productId === own.id);
  assert.equal(mine?.status, "found:2", JSON.stringify(out));
  assert.ok(urls.some((u) => u.includes("q=ko%C5%9Fu+ayakkab%C4%B1s%C4%B1") && u.includes("gl=tr")));
  const row = ok(await G.c.from("shopping_checks").select("own_position,own_price,own_seller,rivals,items").eq("product_id", own.id).single()) as any;
  assert.equal(row.own_position, 2);
  assert.equal(row.own_seller, "Mağaza Y");
  assert.deepEqual(row.rivals.map((r: any) => [r.id, r.position]), [[riv.id, 1]]);
  assert.equal(row.items.length, 2);
  // başka kullanıcı göremez; istemci yazamaz; aynı gün ikinci istek yok; işçi tekrar aramaz
  assert.equal((ok(await A.c.from("shopping_checks").select("id").eq("product_id", own.id)) as any[]).length, 0);
  assert.ok((await G.c.from("shopping_checks").insert({ workspace_id: gws.id, product_id: own.id, query: "x", country: "TR" })).error);
  assert.ok((await G.c.rpc("request_shopping_check", { p_product: own.id })).error);
  urls.length = 0;
  const again = await processShoppingChecks({ db: svc, env: { SERPAPI_KEY: "k" }, fetchFn: fake as any }) as any[];
  assert.ok(!again.some((o) => o.productId === own.id));
  // kalan hak azsa arama yapılmaz
  const own2 = ok(await G.c.from("products").insert({ workspace_id: gws.id, brand_id: gb.id, name: "Fırtına", facts: "Yürüyüş ayakkabısı" }).select("id").single()) as any;
  const low = async (u: string) => { urls.push(u); return new Response(JSON.stringify({ total_searches_left: 3 }), { status: 200 }); };
  urls.length = 0;
  const lowOut = await processShoppingChecks({ db: svc, env: { SERPAPI_KEY: "k" }, fetchFn: low as any }) as any[];
  assert.equal(lowOut.find((o) => o.productId === own2.id)?.status ?? lowOut[0]?.status, "serpapi_quota_low");
  assert.ok(urls.every((u) => u.includes("account.json")), "arama yapılmamalı");
});

test("Güvenlik: giriş yapmamış ziyaretçi oturum gerektiren fonksiyonları çağıramaz, tablolardan veri okuyamaz", async () => {
  const anon = createClient(stack.url, stack.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  for (const [fn, args] of [
    ["create_workspace", { p_name: "x", p_kind: "business" }],
    ["billing_summary", { p_workspace: "00000000-0000-0000-0000-000000000000" }],
    ["workspace_usage", { p_workspace: "00000000-0000-0000-0000-000000000000" }],
    ["my_email_prefs", {}],
    ["request_shopping_check", { p_product: "00000000-0000-0000-0000-000000000000" }],
  ] as const) {
    const r = await anon.rpc(fn, args as never);
    assert.ok(r.error, `${fn} anon için açık kalmamalı`);
  }
  for (const t of ["workspaces", "brands", "products", "shopping_checks", "cost_ledger"]) {
    const r = await anon.from(t).select("id").limit(1);
    assert.ok(r.error || (r.data ?? []).length === 0, `${t} anon'a veri vermemeli`);
  }
});

test("Yönetici ücretsiz paket: yalnız platform yöneticisi verir; Paddle aboneliğine dokunmaz; süresi dolunca Free'ye döner", async () => {
  const adm = await user("yonetici@test.local");
  const cust = await user("musteri-comp@test.local");
  stack.sql(`insert into platform_admins values ('${adm.id}')`);
  const wsId = ok(await cust.c.rpc("create_workspace", { p_name: "Comp Müşteri", p_kind: "business" })) as string;
  // müşteri kendine paket veremez, listeyi göremez
  assert.ok((await cust.c.rpc("admin_set_plan", { p_workspace: wsId, p_plan: "pro" })).error);
  assert.ok((await cust.c.rpc("admin_workspaces")).error);
  const list = ok(await adm.c.rpc("admin_workspaces")) as any[];
  const row = list.find((w) => w.id === wsId);
  assert.equal(row.owner_email, "musteri-comp@test.local");
  assert.equal(row.plan, "free");
  // geçmiş tarih reddedilir
  assert.ok((await adm.c.rpc("admin_set_plan", { p_workspace: wsId, p_plan: "pro", p_until: "2020-01-01" })).error);
  ok(await adm.c.rpc("admin_set_plan", { p_workspace: wsId, p_plan: "pro", p_until: "2099-01-01" }));
  let w = ok(await svc.from("workspaces").select("plan,paid_live_allowed,comped,comped_until,subscription_status").eq("id", wsId).single()) as any;
  assert.deepEqual([w.plan, w.paid_live_allowed, w.comped, w.subscription_status], ["pro", true, true, "active"]);
  const log = ok(await adm.c.from("admin_log").select("action,detail").eq("workspace_id", wsId)) as any[];
  assert.equal(log[0].detail.to, "pro");
  assert.equal((ok(await cust.c.from("admin_log").select("id")) as any[]).length, 0, "müşteri yönetici kaydını görmez");
  // süre dolunca (tarihi geçmişe çek) işçi bakımı Free'ye döndürür
  ok(await svc.from("workspaces").update({ comped_until: "2020-01-01" }).eq("id", wsId));
  const m = await maintain({ db: svc });
  assert.ok(m.compedExpired >= 1);
  w = ok(await svc.from("workspaces").select("plan,paid_live_allowed,comped").eq("id", wsId).single()) as any;
  assert.deepEqual([w.plan, w.paid_live_allowed, w.comped], ["free", false, false]);
  // Paddle aboneliği olan alana dokunulmaz
  ok(await svc.rpc("apply_subscription", { p_workspace: wsId, p_plan: "starter", p_status: "active", p_subscription: "sub_1", p_customer: "ctm_1", p_period_end: null }));
  assert.ok((await adm.c.rpc("admin_set_plan", { p_workspace: wsId, p_plan: "agency" })).error);
});

test("Bugünün ölçümü: yalnız Growth Lab, markalı soru seçilmez, marka adları harfe dönüşür", async () => {
  const g = ok(await svc.from("workspaces").insert({ name: "GL Örnek", kind: "growth_lab", plan: "pro" }).select("id").single()) as any;
  const own = ok(await svc.from("brands").insert({ workspace_id: g.id, name: "Örnekmarka", data_origin: "live_api" }).select("id").single()) as any;
  const rival = ok(await svc.from("brands").insert({ workspace_id: g.id, name: "Rakipmarka", is_competitor: true, owner_brand_id: own.id, data_origin: "live_api" }).select("id").single()) as any;
  const run = ok(await svc.from("runs").insert({ workspace_id: g.id, brand_id: own.id, status: "done", data_origin: "live_api", measurement_type: "live_search", max_cost_usd: 1, prompts_total: 2 }).select("id").single()) as any;
  for (const text of ["Hangi aracı önerirsin?", "Rakipmarka iyi mi?"]) {
    const p = ok(await svc.from("prompts").insert({ workspace_id: g.id, brand_id: own.id, text, intent: "comparison" }).select("id").single()) as any;
    for (const rep of [1, 2]) {
      const r = ok(await svc.from("responses").insert({ workspace_id: g.id, run_id: run.id, prompt_id: p.id, provider: "openai", model: "m", method: "api_with_search", repetition: rep, answer_text: "Rakipmarka ve Örnekmarka", cited_urls: ["https://a.example/x", "https://b.example/y"], measurement_type: "live_search", data_origin: "live_api", billing: "paid" }).select("id").single()) as any;
      ok(await svc.from("mentions").insert([
        { response_id: r.id, workspace_id: g.id, brand_id: rival.id, mentioned: true, recommended: true, cited: false, rank: 1, classifier: "rules_v3" },
        { response_id: r.id, workspace_id: g.id, brand_id: own.id, mentioned: true, recommended: rep === 1, cited: false, rank: 2, classifier: "rules_v3" },
      ]));
    }
  }
  // aday soruların hepsini gün gün dolaş (testte başka Growth Lab verisi de olabilir)
  const first = ok(await svc.rpc("daily_example", { p_day: "2026-01-01" })) as any;
  const seen: any[] = [];
  for (let i = 0; i < first.candidates; i++) {
    const day = new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10);
    seen.push(ok(await svc.rpc("daily_example", { p_day: day })) as any);
  }
  assert.ok(!seen.some((x) => x.question === "Rakipmarka iyi mi?"), "markalı soru seçilmemeli");
  const ex = seen.find((x) => x.question === "Hangi aracı önerirsin?");
  assert.ok(ex, "uygun soru adaylar arasında olmalı");
  assert.equal(ex.answers, 2);
  assert.equal(ex.sources, 2);
  assert.deepEqual(ex.brands.map((b: any) => [b.label, b.recommended, b.first]), [["A", 2, 2], ["B", 1, 0]]);
  assert.ok(!JSON.stringify(seen).toLocaleLowerCase("tr-TR").includes("marka\""), "marka adı sızmamalı");
  assert.ok(!JSON.stringify(seen).includes("Örnekmarka"));
  // istemci çağıramaz
  const u = await user("ornek@test.local");
  assert.ok((await u.c.rpc("daily_example", { p_day: "2026-11-12" })).error);
});

test("Paylaşılan rapor: editör bağlantı üretir; bağlantıyla salt okunur rapor; iptal/süre sonrası boş; başkası üretemez", async () => {
  const O = await user("paylas@test.local");
  const X = await user("yabanci-paylas@test.local");
  const ws = ok(await O.c.rpc("create_workspace", { p_name: "Paylaşım", p_kind: "business" })) as string;
  const b = ok(await O.c.from("brands").insert({ workspace_id: ws, name: "Paylaşmarka" }).select("id").single()) as any;
  const p = ok(await O.c.from("prompts").insert({ workspace_id: ws, brand_id: b.id, text: "Hangi kafeyi önerirsin?", intent: "local" }).select("id").single()) as any;
  const run = ok(await svc.from("runs").insert({ workspace_id: ws, brand_id: b.id, status: "done", data_origin: "live_api", measurement_type: "model_knowledge", max_cost_usd: 1, prompts_total: 1, finished_at: new Date().toISOString() }).select("id").single()) as any;
  const r = ok(await svc.from("responses").insert({ workspace_id: ws, run_id: run.id, prompt_id: p.id, provider: "gemini", model: "m", method: "api_no_search", repetition: 1, answer_text: "Paylaşmarka iyi", cited_urls: ["https://www.ornek.com/a"], measurement_type: "model_knowledge", data_origin: "live_api", billing: "free" }).select("id").single()) as any;
  ok(await svc.from("mentions").insert({ response_id: r.id, workspace_id: ws, brand_id: b.id, mentioned: true, recommended: true, cited: false, rank: 1, classifier: "rules_v3" }));

  assert.ok((await X.c.rpc("create_report_share", { p_brand: b.id, p_days: 30 })).error, "üye olmayan üretemez");
  assert.ok((await O.c.rpc("create_report_share", { p_brand: b.id, p_days: 365 })).error, "en fazla 90 gün");
  const token = ok(await O.c.rpc("create_report_share", { p_brand: b.id, p_days: 30 })) as string;
  assert.ok((await O.c.rpc("shared_report", { p_token: token })).error, "istemci rapor fonksiyonunu doğrudan çağıramaz");
  const rep = ok(await svc.rpc("shared_report", { p_token: token })) as any;
  assert.equal(rep.brand.name, "Paylaşmarka");
  assert.equal(rep.vis.model_knowledge.length, 1);
  assert.equal(rep.vis.model_knowledge[0].recommended, 1);
  assert.deepEqual(rep.questions.map((q: any) => [q.text, q.recommended]), [["Hangi kafeyi önerirsin?", 1]]);
  assert.deepEqual(rep.sources, [{ domain: "ornek.com", count: 1 }]);
  assert.ok(!JSON.stringify(rep).includes("Paylaşmarka iyi"), "cevap metni raporda olmamalı");
  // listede görünür, yabancı görmez; iptal edilince boş
  const list = ok(await O.c.from("report_shares").select("id,token")) as any[];
  assert.equal(list.length, 1);
  assert.equal((ok(await X.c.from("report_shares").select("id")) as any[]).length, 0);
  assert.ok((await X.c.rpc("revoke_report_share", { p_share: list[0].id })).error);
  ok(await O.c.rpc("revoke_report_share", { p_share: list[0].id }));
  assert.equal(ok(await svc.rpc("shared_report", { p_token: token })), null);
  // süresi dolan bağlantı da boş
  const t2 = ok(await O.c.rpc("create_report_share", { p_brand: b.id, p_days: 1 })) as string;
  ok(await svc.from("report_shares").update({ expires_at: "2020-01-01" }).eq("token", t2));
  assert.equal(ok(await svc.rpc("shared_report", { p_token: t2 })), null);
});

test("Ekip daveti: sahip davet eder, davetli aynı e-postayla kabul eder; koltuk sınırı; roller ve çıkarma kuralları", async () => {
  const S = await user("sahip-ekip@test.local");
  const E = await user("editor-ekip@test.local");
  const Y = await user("baska-ekip@test.local");
  const ws = ok(await S.c.rpc("create_workspace", { p_name: "Ekip", p_kind: "business" })) as string;
  // Free: yalnız sahip
  assert.ok((await S.c.rpc("create_invite", { p_workspace: ws, p_email: "editor-ekip@test.local", p_role: "editor" })).error, "Free pakette davet yok");
  ok(await svc.from("workspaces").update({ plan: "pro" }).eq("id", ws));
  assert.ok((await S.c.rpc("create_invite", { p_workspace: ws, p_email: "gecersiz", p_role: "editor" })).error);
  const token = ok(await S.c.rpc("create_invite", { p_workspace: ws, p_email: " Editor-Ekip@test.local ", p_role: "editor" })) as string;
  assert.ok((await S.c.rpc("create_invite", { p_workspace: ws, p_email: "editor-ekip@test.local", p_role: "viewer" })).error, "aynı adrese ikinci davet yok");
  // davetli panelde görür; başkası göremez ve kabul edemez
  const mine = ok(await E.c.rpc("my_invites")) as any[];
  assert.equal(mine.length, 1);
  assert.equal(mine[0].workspace_name, "Ekip");
  assert.equal((ok(await Y.c.rpc("my_invites")) as any[]).length, 0);
  assert.ok((await Y.c.rpc("accept_invite", { p_token: token })).error, "başka e-posta kabul edemez");
  assert.equal(ok(await E.c.rpc("accept_invite", { p_token: token })), ws);
  const team = ok(await E.c.rpc("workspace_team", { p_workspace: ws })) as any[];
  assert.deepEqual(team.map((m) => [m.email, m.role]), [["sahip-ekip@test.local", "owner"], ["editor-ekip@test.local", "editor"]]);
  assert.equal((ok(await Y.c.rpc("workspace_team", { p_workspace: ws })) as any[]).length, 0, "üye olmayan ekibi görmez");
  // editör davet edemez, rol değiştiremez; sahip değiştirir
  assert.ok((await E.c.rpc("create_invite", { p_workspace: ws, p_email: "x@test.local", p_role: "viewer" })).error);
  assert.ok((await E.c.rpc("set_member_role", { p_workspace: ws, p_user: E.id, p_role: "admin" })).error);
  ok(await S.c.rpc("set_member_role", { p_workspace: ws, p_user: E.id, p_role: "viewer" }));
  assert.ok((await S.c.rpc("set_member_role", { p_workspace: ws, p_user: S.id, p_role: "viewer" })).error, "sahip rolü değişmez");
  assert.ok((await E.c.rpc("remove_member", { p_workspace: ws, p_user: S.id })).error, "sahip çıkarılamaz");
  // koltuk sınırı: Plus = 2 kişi (sahip + 1)
  ok(await svc.from("workspaces").update({ plan: "starter" }).eq("id", ws));
  assert.ok((await S.c.rpc("create_invite", { p_workspace: ws, p_email: "ucuncu@test.local", p_role: "viewer" })).error, "koltuk dolu");
  // kendi isteğiyle ayrılır; sonra koltuk açılır
  ok(await E.c.rpc("remove_member", { p_workspace: ws, p_user: E.id }));
  const t2 = ok(await S.c.rpc("create_invite", { p_workspace: ws, p_email: "ucuncu@test.local", p_role: "viewer" })) as string;
  const inv = ok(await S.c.from("workspace_invites").select("id").eq("token", t2).single()) as any;
  ok(await S.c.rpc("revoke_invite", { p_invite: inv.id }));
  assert.ok((await Y.c.rpc("accept_invite", { p_token: t2 })).error, "iptal edilen davet kullanılamaz");
});

test("Soru önerisi: yalnız editör; demo ve kısıtlı ülkede kapalı; günde 5; Gemini günlük sayacına yazılır", async () => {
  const O = await user("oneri@test.local");
  const X = await user("oneri-yabanci@test.local");
  const ws = ok(await O.c.rpc("create_workspace", { p_name: "Öneri", p_kind: "business" })) as string;
  const b = ok(await O.c.from("brands").insert({ workspace_id: ws, name: "Öneri Kafe", sector: "Kafe", city: "Antalya" }).select("id").single()) as any;
  ok(await O.c.from("brands").insert({ workspace_id: ws, name: "Rakip Kafe", is_competitor: true, owner_brand_id: b.id }));
  ok(await O.c.from("prompts").insert({ workspace_id: ws, brand_id: b.id, text: "Antalya'da kahve nerede içilir?", intent: "local" }));
  assert.ok((await X.c.rpc("reserve_question_suggestion", { p_brand: b.id })).error, "üye olmayan kullanamaz");
  const before = (ok(await svc.from("provider_daily_usage").select("calls").eq("provider", "gemini").eq("day", new Date().toISOString().slice(0, 10))) as any[])[0]?.calls ?? 0;
  const ctx = ok(await O.c.rpc("reserve_question_suggestion", { p_brand: b.id })) as any;
  assert.equal(ctx.name, "Öneri Kafe");
  assert.deepEqual(ctx.competitors, ["Rakip Kafe"]);
  assert.deepEqual(ctx.existing, ["Antalya'da kahve nerede içilir?"]);
  const after = (ok(await svc.from("provider_daily_usage").select("calls").eq("provider", "gemini").eq("day", new Date().toISOString().slice(0, 10))) as any[])[0].calls;
  assert.equal(after, before + 1);
  for (let i = 0; i < 4; i++) ok(await O.c.rpc("reserve_question_suggestion", { p_brand: b.id }));
  assert.ok((await O.c.rpc("reserve_question_suggestion", { p_brand: b.id })).error, "günde 5");
  // kısıtlı ülke
  const de = ok(await O.c.rpc("create_workspace", { p_name: "DE", p_kind: "business" })) as string;
  const bd = ok(await O.c.from("brands").insert({ workspace_id: de, name: "Berlin Kafe", country: "DE" }).select("id").single()) as any;
  assert.ok((await O.c.rpc("reserve_question_suggestion", { p_brand: bd.id })).error, "AEA'da kapalı");
});
