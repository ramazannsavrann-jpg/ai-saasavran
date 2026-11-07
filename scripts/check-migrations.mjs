// Migration'ları gerçek Postgres (PGlite) üzerinde çalıştırır ve RLS izolasyonunu test eder.
// Supabase'in auth.uid() fonksiyonu burada test için taklit edilir.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import assert from "node:assert/strict";

const db = new PGlite();
await db.exec(`
  create schema auth;
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  create role authenticated;
`);
for (const f of readdirSync("supabase/migrations").sort()) {
  await db.exec(readFileSync(`supabase/migrations/${f}`, "utf8"));
  console.log("ok migration", f);
}
await db.exec(`grant usage on schema public to authenticated;
  grant select, insert, update, delete on all tables in schema public to authenticated;`);

const A = "11111111-1111-1111-1111-111111111111", B = "22222222-2222-2222-2222-222222222222";
const U1 = "aaaaaaaa-0000-0000-0000-000000000001", U2 = "aaaaaaaa-0000-0000-0000-000000000002";
await db.exec(`
  insert into workspaces (id,name,kind) values ('${A}','Ajans A','agency'), ('${B}','İşletme B','business');
  insert into workspace_members values ('${A}','${U1}','owner',now()), ('${B}','${U2}','viewer',now());
  insert into brands (workspace_id,name) values ('${A}','Marka A1'), ('${B}','Marka B1');
`);

async function as(uid, sql) {
  await db.exec(`set role authenticated; select set_config('test.uid','${uid}',false);`);
  try { return await db.query(sql); } finally { await db.exec(`reset role;`); }
}

// 1) Kullanıcı yalnızca kendi workspace'ini görür
const r1 = await as(U1, "select name from brands");
assert.deepEqual(r1.rows.map(r => r.name), ["Marka A1"]);
const r2 = await as(U2, "select name from brands");
assert.deepEqual(r2.rows.map(r => r.name), ["Marka B1"]);
console.log("ok RLS: workspace verileri birbirinden ayrı");

// 2) Viewer yazamaz
await assert.rejects(as(U2, `insert into brands (workspace_id,name) values ('${B}','x')`));
console.log("ok RLS: viewer rolü yazamıyor");

// 3) Başkasının workspace'ine yazılamaz
await assert.rejects(as(U1, `insert into brands (workspace_id,name) values ('${B}','sızma')`));
console.log("ok RLS: başka workspace'e yazma engellendi");

// 4) İstemci run/maliyet yazamaz (yalnızca sunucu)
await assert.rejects(as(U1, `insert into runs (workspace_id,brand_id,data_origin,max_cost_usd)
  select '${A}', id, 'live_api', 1 from brands limit 1`));
console.log("ok RLS: istemci runs tablosuna yazamıyor");

// 5) Simüle veri gerçek workspace'e giremez
await assert.rejects(db.exec(`insert into brands (workspace_id,name,data_origin) values ('${B}','Demo','simulated')`),
  /demo_lab/);
await db.exec(`insert into workspaces (id,name,kind) values ('33333333-3333-3333-3333-333333333333','Demo','demo_lab');
  insert into brands (workspace_id,name,data_origin) values ('33333333-3333-3333-3333-333333333333','Demo Döner','simulated');`);
console.log("ok guard: simüle veri yalnızca demo_lab'e yazılabiliyor");

// 6) Her run maliyet tavanı ister
await assert.rejects(db.exec(`insert into runs (workspace_id,brand_id,data_origin,max_cost_usd)
  select '${A}', id, 'live_api', 0 from brands where workspace_id='${A}'`));
console.log("ok check: max_cost_usd > 0 zorunlu");

// ---------- 0002: kota, ücretsiz/ücretli ayrımı, otomatik durdurma ----------
const C = "44444444-4444-4444-4444-444444444444";
await db.exec(`insert into workspaces (id,name,kind,plan) values ('${C}','Starter Müşteri','business','starter')`);
const reserve = async (billing, worst, lim = null) =>
  (await db.query(`select reserve_engine_call($1,'gemini',$2,$3,$4) r`, [C, billing, worst, lim])).rows[0].r;
const record = (billing, cost, equiv) =>
  db.query(`select record_engine_call($1,null,'gemini','m',$2,100,500,$3,$4,true)`, [C, billing, cost, equiv]);

// Ücretsiz çağrı: maliyet 0 yazılır, ücretli eşdeğer ayrıca tutulur
assert.equal(await reserve("free", 0.035, 2), "ok");
await record("free", 0.035, 0.035);
const u = (await db.query(`select billing, engine_calls::int, cost_usd::float, paid_equivalent_usd::float from workspace_monthly_usage where workspace_id=$1`, [C])).rows;
assert.deepEqual(u, [{ billing: "free", engine_calls: 1, cost_usd: 0, paid_equivalent_usd: 0.035 }]);
console.log("ok ücretsiz çağrı 0 $ yazıldı, ücretli eşdeğeri ayrı raporlandı");

// Ücretsiz günlük sağlayıcı sınırı (2): ikinci geçer, üçüncü reddedilir, müşteri duraklatılmaz
assert.equal(await reserve("free", 0.035, 2), "ok");
assert.equal(await reserve("free", 0.035, 2), "provider_free_daily_limit");
assert.equal((await db.query(`select status from workspaces where id=$1`, [C])).rows[0].status, "active");
console.log("ok ücretsiz günlük sınır doldu; müşteri durdurulmadı");

// Müşteri (business) alanında ücretli çağrı hiç yapılamaz; bayrak da konulamaz
assert.equal(await reserve("paid", 0.01), "paid_not_allowed");
await assert.rejects(db.exec(`update workspaces set paid_live_allowed = true where id='${C}'`));
console.log("ok müşteri alanında ücretli çağrı reddedildi (paid_not_allowed), izin bayrağı konulamadı");

// Abonelik: yalnız apply_subscription açar; aktifken ücretli çağrı izinli (toplam deneme tavanı uygulanmaz), iptalde Free'ye döner
{
  const before = (await db.query(`select plan from workspaces where id=$1`, [C])).rows[0].plan;
  assert.equal((await db.query(`select apply_subscription($1, 'starter', 'active', 'sub_test', 'ctm_test', now() + interval '30 days') r`, [C])).rows[0].r, "ok");
  let w = (await db.query(`select plan, paid_live_allowed, subscription_status from workspaces where id=$1`, [C])).rows[0];
  assert.deepEqual(w, { plan: "starter", paid_live_allowed: true, subscription_status: "active" });
  await db.exec(`update app_settings set paid_total_cap_usd = 0`);
  assert.equal(await reserve("paid", 0.01), "ok", "abonede toplam deneme tavanı uygulanmamalı");
  assert.equal((await db.query(`select apply_subscription($1, 'starter', 'canceled', 'sub_old', null, null) r`, [C])).rows[0].r, "stale_event");
  assert.equal((await db.query(`select apply_subscription($1, 'starter', 'canceled', 'sub_test', null, null) r`, [C])).rows[0].r, "ok");
  w = (await db.query(`select plan, paid_live_allowed from workspaces where id=$1`, [C])).rows[0];
  assert.deepEqual(w, { plan: "free", paid_live_allowed: false });
  assert.equal(await reserve("paid", 0.01), "paid_not_allowed");
  await db.exec(`update workspaces set plan='${before}', subscription_status=null, paddle_subscription_id=null, paddle_customer_id=null; update app_settings set paid_total_cap_usd = 3; delete from cost_ledger where billing='paid'`);
  console.log("ok abonelik: aktifken ücretli ölçüm açık, eski aboneliğin iptali yok sayıldı, iptalde Free'ye döndü");
}

// Ücretli tavan (Plus 9 $) — izinli alan (growth_lab) üzerinde, toplam tavan geniş tutularak
await db.exec(`update workspaces set kind='growth_lab', paid_live_allowed=true where id='${C}'; update app_settings set paid_total_cap_usd = 1000;`);
await record("paid", 8.5, 8.5);
assert.equal(await reserve("paid", 1.0), "monthly_cost_cap");
const ws = (await db.query(`select status, paused_reason from workspaces where id=$1`, [C])).rows[0];
assert.deepEqual(ws, { status: "paused", paused_reason: "monthly_cost_cap" });
assert.equal(await reserve("free", 0.035, 100), "workspace_paused");
console.log("ok ücretli tavan aşılacakken çağrı reddedildi, workspace otomatik durdu");

// Toplam ücretli tavan (tüm alanlar): aşılacaksa reddedilir, alan durdurulmaz
await db.exec(`update workspaces set status='active', paused_reason=null where id='${C}'; update app_settings set paid_total_cap_usd = 8.6;`);
assert.equal(await reserve("paid", 0.5), "global_paid_cap");
assert.equal((await db.query(`select status from workspaces where id=$1`, [C])).rows[0].status, "active");
await db.exec(`update workspaces set kind='business', paid_live_allowed=false where id='${C}'; update app_settings set paid_total_cap_usd = 3;`);
console.log("ok toplam ücretli tavan aşılacakken çağrı reddedildi, alan durdurulmadı");

// Aylık çağrı kotası
const D = "55555555-5555-5555-5555-555555555555";
await db.exec(`insert into workspaces (id,name,kind,plan) values ('${D}','Free Müşteri','business','free')`);
for (let i = 0; i < 100; i++) await db.query(`select record_engine_call($1,null,'gemini','m','free',1,1,0,0,true)`, [D]);
assert.equal((await db.query(`select reserve_engine_call($1,'gemini','free',0,1000) r`, [D])).rows[0].r, "monthly_call_quota");
console.log("ok Free paket 100 çağrı kotası dolunca durdu");

// Free pakette ücretli harcama tavanı 0: ücretli çağrı hiç başlayamaz
const E = "66666666-6666-6666-6666-666666666666";
await db.exec(`insert into workspaces (id,name,kind,plan) values ('${E}','Free 2','business','free')`);
assert.notEqual((await db.query(`select reserve_engine_call($1,'openai','paid',0.01,null) r`, [E])).rows[0].r, "ok");
console.log("ok Free pakette ücretli API kullanılamıyor");

// İstemci rolü kota fonksiyonlarını çağıramaz, maliyet defterini göremez
await assert.rejects(as(U1, `select reserve_engine_call('${A}','gemini','free',0,10)`));
const ledger = await as(U1, `select count(*)::int n from cost_ledger`);
assert.equal(ledger.rows[0].n, 0);
console.log("ok istemci kota fonksiyonlarını çağıramıyor; başka müşterinin maliyetini göremiyor");

// Bilinmeyen paket atanamaz
await assert.rejects(db.exec(`insert into workspaces (name,kind,plan) values ('x','business','yok')`));
console.log("ok tanımsız paket atanamıyor");

console.log("TÜM DB TESTLERİ GEÇTİ");
