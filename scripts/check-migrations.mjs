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

// Ücretli tavan (Gümüş 45 $, 22 Kasım 2026 onayı) — izinli alan (growth_lab) üzerinde, toplam tavan geniş tutularak
await db.exec(`update workspaces set kind='growth_lab', paid_live_allowed=true where id='${C}'; update app_settings set paid_total_cap_usd = 1000;`);
await record("paid", 44.5, 44.5);
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

{
  const r = async (ip) => (await db.query(`select reserve_free_check($1, 'en', 'Acme', 'dentist', 'Austin', 5, 450) r`, [ip])).rows[0].r;
  assert.match(await r("ip-a"), /^ok:/);
  assert.match(await r("ip-a"), /^ok:/);
  assert.equal(await r("ip-a"), "person_limit", "kişi başına 30 günde 2 kontrol");
  assert.match(await r("ip-b"), /^ok:/);
  await db.exec(`update provider_daily_usage set calls = 448 where provider='gemini' and day=current_date`);
  assert.equal(await r("ip-c"), "daily_limit", "ortak Gemini günlük tavanı korunur");
  console.log("ok ücretsiz kontrol: kişi başına 2 hak, ortak günlük tavan korunuyor");
}
{
  // 0012: yarıda kalan ölçüm kurtarılır; önceki ayda durdurulan alan yeni ayda açılır
  const br = (await db.query(`select id from brands where workspace_id=$1 and not is_competitor limit 1`, [A])).rows[0];
  if (br) {
    const run = (await db.query(`insert into runs (workspace_id, brand_id, status, data_origin, measurement_type, max_cost_usd, started_at)
      values ($1, $2, 'running', 'live_api', 'model_knowledge', 1, now() - interval '3 hours') returning id`, [A, br.id])).rows[0].id;
    const fresh = (await db.query(`insert into runs (workspace_id, brand_id, status, data_origin, measurement_type, max_cost_usd, started_at)
      values ($1, $2, 'running', 'live_api', 'model_knowledge', 1, now()) returning id`, [A, br.id])).rows[0].id;
    assert.equal((await db.query(`select recover_stale_runs(60) r`)).rows[0].r, 1);
    assert.deepEqual((await db.query(`select status, stop_reason from runs where id=$1`, [run])).rows[0], { status: "failed", stop_reason: "worker_timeout" });
    assert.equal((await db.query(`select status from runs where id=$1`, [fresh])).rows[0].status, "running");
    await db.query(`delete from runs where id in ($1, $2)`, [run, fresh]);
  }
  await db.exec(`update workspaces set status='paused', paused_reason='monthly_call_quota', paused_at = now() where id='${D}'`);
  assert.equal((await db.query(`select resume_quota_paused() r`)).rows[0].r, 0, "aynı ay içinde açılmaz");
  await db.exec(`update workspaces set paused_at = date_trunc('month', now()) - interval '1 day' where id='${D}'`);
  assert.equal((await db.query(`select resume_quota_paused() r`)).rows[0].r, 1);
  assert.equal((await db.query(`select status from workspaces where id=$1`, [D])).rows[0].status, "active");
  await assert.rejects(as(U1, `select resume_quota_paused()`));
  await assert.rejects(db.exec(`update brands set country = 'tr' where false; insert into brands (workspace_id, name, country) values ('${D}', 'x', 'turkiye')`));
  console.log("ok 0012: yarıda kalan ölçüm kurtarıldı; durdurulan alan yeni ayda açıldı; istemci çağıramıyor; ülke kodu doğrulanıyor");
}
{
  // 0013: bölge kısıtı ve aksiyon takibi
  const g = async (c) => (await db.query(`select gemini_free_restricted($1) r`, [c])).rows[0].r;
  assert.equal(await g("de"), true); assert.equal(await g("GB"), true); assert.equal(await g("TR"), false); assert.equal(await g(null), false); assert.equal(await g("US"), false);
  const own = (await db.query(`select id, workspace_id from brands where workspace_id=$1 and not is_competitor limit 1`, [A])).rows[0];
  if (own) {
    await as(U1, `insert into brand_actions (workspace_id, brand_id, title) values ('${A}', '${own.id}', 'SSS sayfası eklendi')`);
    assert.equal((await as(U1, `select count(*)::int n from brand_actions`)).rows[0].n, 1);
    await assert.rejects(as(U1, `insert into brand_actions (workspace_id, brand_id, title) values ('${D}', '${own.id}', 'başka alan')`));
    await assert.rejects(as(U1, `insert into brand_actions (workspace_id, brand_id, title) values ('${A}', '${own.id}', 'x')`), "çok kısa başlık");
  }
  console.log("ok 0013: bölge listesi doğru; aksiyon yalnız kendi alanına ve markasına yazılabiliyor" + (own ? "" : " (marka yok, RLS adımı atlandı)"));
}
{
  // 0014: yardımcı ücretli çağrı kotaya sayılmaz, harcamaya sayılır; soru etiketi sınırı
  const F = "77777777-7777-7777-7777-777777777777";
  await db.exec(`insert into workspaces (id,name,kind,plan) values ('${F}','Aux','business','starter')`);
  await db.query(`select record_aux_call($1, null, 'classify', 'openai', 'm', 900, 100, 0.0002)`, [F]);
  const u = (await db.query(`select count(*) filter (where task='query_engine')::int q, sum(cost_usd)::float c from cost_ledger where workspace_id=$1`, [F])).rows[0];
  assert.deepEqual(u, { q: 0, c: 0.0002 });
  await assert.rejects(db.query(`select record_aux_call($1, null, 'query_engine', 'openai', 'm', 1, 1, 0.1)`, [F]));
  await db.query(`select record_aux_call($1, null, 'classify', 'openai', 'm', 1, 1, 45.5)`, [F]);
  assert.equal((await db.query(`select status from workspaces where id=$1`, [F])).rows[0].status, "paused", "tavan aşılınca durur");
  await assert.rejects(as(U1, `select record_aux_call('${A}', null, 'classify', 'openai', 'm', 1, 1, 0.1)`));
  assert.equal((await db.query(`select count(*)::int n from pg_constraint where conrelid = 'prompts'::regclass and pg_get_constraintdef(oid) like '%segment%'`)).rows[0].n, 1);
  console.log("ok 0014: yardımcı çağrı kotaya sayılmıyor, tavana sayılıyor; istemci çağıramıyor; etiket en fazla 40 karakter");
}
{
  // 0015: ürünler ve doğruluk kontrolü isteği
  const own = (await db.query(`select id from brands where workspace_id=$1 and not is_competitor limit 1`, [A])).rows[0];
  if (own) {
    await as(U1, `insert into products (workspace_id, brand_id, name, facts, check_requested_at) values ('${A}', '${own.id}', 'Model X', 'Ağırlık 9 kg, karbon kadro', now())`);
    const pr = (await db.query(`select id, check_requested_at from products where brand_id=$1`, [own.id])).rows[0];
    assert.equal(pr.check_requested_at, null, "istemci kontrol isteğini doğrudan yazamaz");
    await assert.rejects(as(U1, `select request_product_check('${pr.id}')`), "ücretsiz alanda kapalı");
    await assert.rejects(as(U1, `insert into products (workspace_id, brand_id, name, facts) values ('${D}', '${own.id}', 'Başka', 'başka alan başka alan')`));
    await assert.rejects(as(U1, `insert into product_checks (workspace_id, product_id, provider, model, question, answer_text) values ('${A}', '${pr.id}', 'x', 'x', 'x', 'x')`));
    assert.equal((await db.query(`select count(*)::int n from pending_product_checks(5)`)).rows[0].n, 0);
    await db.query(`delete from products where id=$1`, [pr.id]);
  }
  console.log("ok 0015: ürün yalnız kendi markasına eklenir; kontrol isteği yalnız ücretli alanda ve yalnız fonksiyonla" + (own ? "" : " (marka yok, RLS adımı atlandı)"));
}
{
  // 0018: rakip ürünler
  const own = (await db.query(`select id from brands where workspace_id=$1 and not is_competitor limit 1`, [A])).rows[0];
  if (own) {
    await as(U1, `insert into products (workspace_id, brand_id, name, facts) values ('${A}', '${own.id}', 'Model X', 'Ağırlık 9 kg, karbon kadro')`);
    const mine = (await db.query(`select id from products where brand_id=$1 and rival_of is null`, [own.id])).rows[0].id;
    await as(U1, `insert into products (workspace_id, brand_id, name, rival_of, rival_brand) values ('${A}', '${own.id}', 'Aero 5', '${mine}', 'Rakip Bisiklet')`);
    const rival = (await db.query(`select id from products where rival_of=$1`, [mine])).rows[0].id;
    await assert.rejects(as(U1, `insert into products (workspace_id, brand_id, name, rival_of) values ('${A}', '${own.id}', 'Zincir', '${rival}')`), "rakibin rakibi olmaz");
    await assert.rejects(as(U1, `insert into products (workspace_id, brand_id, name) values ('${A}', '${own.id}', 'Bilgisiz ürün')`), "kendi ürününde bilgi zorunlu");
    await assert.rejects(as(U1, `select request_product_check('${rival}')`), "rakip ürüne doğruluk kontrolü yok");
    await db.query(`delete from products where id=$1`, [mine]);
    assert.equal((await db.query(`select count(*)::int n from products where id=$1`, [rival])).rows[0].n, 0, "kendi ürünü silinince rakipleri de silinir");
  }
  console.log("ok 0018: rakip ürün yalnız kendi ürününe bağlanır; doğruluk kontrolü yalnız kendi ürününde" + (own ? "" : " (marka yok, atlandı)"));
}
{
  // 0020: Google Shopping kontrolü (üretimdeki yetkiyi burada da ver; PGlite'ta anon rolü yok)
  await db.exec(`grant execute on function request_shopping_check(uuid) to authenticated`);
  const own = (await db.query(`select id from brands where workspace_id=$1 and not is_competitor limit 1`, [A])).rows[0];
  if (own) {
    await as(U1, `insert into products (workspace_id, brand_id, name, facts, shopping_query, shopping_requested_at) values ('${A}', '${own.id}', 'Model S', 'Ağırlık 9 kg, karbon kadro', 'karbon yol bisikleti', now())`);
    const pr = (await db.query(`select id, shopping_requested_at, shopping_query from products where brand_id=$1 and name='Model S'`, [own.id])).rows[0];
    assert.equal(pr.shopping_requested_at, null, "istemci Shopping isteğini doğrudan yazamaz");
    assert.equal(pr.shopping_query, "karbon yol bisikleti");
    await assert.rejects(as(U1, `select request_shopping_check('${pr.id}')`), "ücretsiz alanda kapalı");
    await assert.rejects(as(U1, `insert into shopping_checks (workspace_id, product_id, query, country) values ('${A}', '${pr.id}', 'q', 'TR')`));
    await assert.rejects(as(U1, `update products set shopping_query = 'x' where id='${pr.id}'`), "sorgu en az 2 karakter");
    assert.equal((await db.query(`select count(*)::int n from pending_shopping_checks(5) where product_id=$1`, [pr.id])).rows[0].n, 0, "ücretsiz alan sıraya girmez");
    const prevWs = (await db.query(`select kind, plan, subscription_status from workspaces where id=$1`, [A])).rows[0];
    await db.query(`update workspaces set kind='business', plan='starter', subscription_status='active', paid_live_allowed = true where id=$1`, [A]);
    // 0046: müşteri elle isteyemez; ürünü haftalık otomatik kontrole girer
    await assert.rejects(as(U1, `select request_shopping_check('${pr.id}')`), "müşteride elle Shopping kontrolü kapalı");
    assert.equal((await db.query(`select count(*)::int n from pending_shopping_checks(20) where product_id=$1 and not requested`, [pr.id])).rows[0].n, 1, "müşteri ürünü haftalık otomatik kontrolde");
    await db.query(`update workspaces set kind='growth_lab' where id=$1`, [A]);
    await as(U1, `select request_shopping_check('${pr.id}')`);
    // Ürün doğruluğu da abone (ücretli paket) alanında açık: yalnız Growth Lab'e özel değil
    await db.exec(`grant execute on function request_product_check(uuid) to authenticated`);
    await as(U1, `select request_product_check('${pr.id}')`);
    assert.equal((await db.query(`select count(*)::int n from pending_product_checks(5) where product_id=$1`, [pr.id])).rows[0].n, 1, "abone alanında ürün doğruluğu sıraya girer");
    await db.query(`update products set check_requested_at = null where id=$1`, [pr.id]);
    const q = (await db.query(`select requested, shopping_query from pending_shopping_checks(5) where product_id=$1`, [pr.id])).rows[0];
    assert.equal(q.requested, true);
    await assert.rejects(as(U1, `select request_shopping_check('${pr.id}')`), "bekleyen istek varken ikinci istek yok");
    await db.query(`insert into shopping_checks (workspace_id, product_id, query, country, own_position) values ($1, $2, 'q', 'TR', 3)`, [A, pr.id]);
    assert.equal((await db.query(`select count(*)::int n from pending_shopping_checks(5) where product_id=$1`, [pr.id])).rows[0].n, 0, "yeni kontrol sonrası sıradan çıkar");
    await assert.rejects(as(U1, `select request_shopping_check('${pr.id}')`), "günde bir kez");
    assert.equal((await as(U1, `select own_position from shopping_checks where product_id='${pr.id}'`)).rows[0].own_position, 3, "üye kendi sonucunu okur");
    // 0045: rakip ürün kendi adıyla ve kendi markasıyla aranır; yalnız istek üzerine (haftalık otomatiğe girmez)
    await db.query(`delete from shopping_checks where product_id=$1`, [pr.id]);
    await db.query(`update products set shopping_requested_at = null where id=$1`, [pr.id]);
    const rv = (await db.query(`insert into products (workspace_id, brand_id, name, rival_of, rival_brand) values ($1, $2, 'Rakip X 2', $3, 'Rakip Marka') returning id`, [A, own.id, pr.id])).rows[0];
    assert.equal((await db.query(`select count(*)::int n from pending_shopping_checks(20) where product_id=$1`, [rv.id])).rows[0].n, 0, "rakip istek olmadan sıraya girmez");
    await as(U1, `select request_shopping_check('${pr.id}')`);
    const rq = (await db.query(`select brand_name, product_name, requested, rivals from pending_shopping_checks(20) where product_id=$1`, [rv.id])).rows[0];
    assert.ok(rq, "kendi ürün istenince rakip de sıraya girer");
    assert.equal(rq.brand_name, "Rakip Marka", "rakip kendi markasıyla aranır");
    assert.equal(rq.requested, true);
    assert.deepEqual(rq.rivals, []);
    await assert.rejects(as(U1, `select request_shopping_check('${rv.id}')`), "rakip doğrudan istenemez");
    await db.query(`delete from products where id=$1`, [rv.id]);
    await db.query(`update workspaces set paid_live_allowed = false, kind=$2, plan=$3, subscription_status=$4 where id=$1`, [A, prevWs.kind, prevWs.plan, prevWs.subscription_status]);
    await db.query(`delete from products where id=$1`, [pr.id]);
  }
  console.log("ok 0020: Shopping isteği yalnız ücretli alanda ve fonksiyonla; günde bir; sonuçları yalnız sunucu yazar" + (own ? "" : " (marka yok, atlandı)"));
}
// 0042: white-label rapor markalama yalnız Business abonesinde, yönetici tarafından ve doğrulanmış değerlerle
{
  const PNG = "data:image/png;base64,iVBORw0KGgo=";
  await db.exec(`grant execute on function set_report_branding(uuid, text, text, text) to authenticated`);
  const prev = (await db.query(`select kind, plan, subscription_status from workspaces where id=$1`, [A])).rows[0];
  await assert.rejects(as(U1, `select set_report_branding('${A}', 'Ajans X', null, '#112233')`), /Business/, "Free/Plus alanda markalama kapalı");
  await db.query(`update workspaces set kind='agency', plan='agency', subscription_status='active' where id=$1`, [A]);
  await as(U1, `select set_report_branding('${A}', 'Ajans X', '${PNG}', '#112233')`);
  const w = (await db.query(`select report_brand_name n, report_accent a, report_logo l from workspaces where id=$1`, [A])).rows[0];
  assert.deepEqual([w.n, w.a, w.l], ["Ajans X", "#112233", PNG]);
  await assert.rejects(as(U1, `select set_report_branding('${A}', 'Ajans X', null, 'red')`), "renk #rrggbb olmalı");
  await assert.rejects(as(U1, `select set_report_branding('${A}', 'Ajans X', 'data:image/svg+xml;base64,PHN2Zz4=', null)`), "SVG logo kabul edilmez");
  await assert.rejects(as(U1, `select set_report_branding('${A}', 'Ajans X', 'https://example.com/x.png', null)`), "yalnız veri adresi");
  await assert.rejects(as(U1, `select set_report_branding('${A}', '${"x".repeat(61)}', null, null)`), "ad en fazla 60 karakter");
  await assert.rejects(as(U2, `select set_report_branding('${A}', 'Sızma', null, null)`), "başka alan yazamaz");
  const br = (await db.query(`select id from brands where workspace_id=$1 and not is_competitor limit 1`, [A])).rows[0];
  if (br) {
    const t = (await db.query(`insert into report_shares (workspace_id, brand_id, created_by, expires_at) values ($1, $2, $3, now() + interval '1 day') returning token`, [A, br.id, U1])).rows[0].token;
    const rep = (await db.query(`select shared_report($1) r`, [t])).rows[0].r;
    assert.equal(rep.branding.name, "Ajans X");
    await db.query(`update workspaces set subscription_status='canceled' where id=$1`, [A]);
    assert.equal((await db.query(`select shared_report($1) r`, [t])).rows[0].r.branding, null, "abonelik bitince marka görünmez");
    await db.query(`delete from report_shares where token=$1`, [t]);
  }
  await db.query(`update workspaces set kind=$2, plan=$3, subscription_status=$4, report_brand_name=null, report_logo=null, report_accent=null where id=$1`, [A, prev.kind, prev.plan, prev.subscription_status]);
  console.log("ok 0042: rapor markalama yalnız Business abonesinde; doğrulama ve rapor çıktısı");
}
// 0066: güven puanı girdileri — tekrar grupları ve tutarlılık doğru sayılıyor; başka alanın verisi görünmüyor
{
  const br = (await db.query(`select id from brands where workspace_id=$1 and not is_competitor limit 1`, [A])).rows[0];
  if (br) {
    const run = (await db.query(`insert into runs (workspace_id, brand_id, status, data_origin, measurement_type, max_cost_usd)
      values ($1, $2, 'done', 'live_api', 'live_search', 1) returning id`, [A, br.id])).rows[0].id;
    const p = [];
    for (const t of ["Soru bir", "Soru iki", "Soru üç"]) p.push((await db.query(`insert into prompts (workspace_id, brand_id, text, intent) values ($1, $2, $3, 'informational') returning id`, [A, br.id, t])).rows[0].id);
    // openai: soru1 2 tekrar (evet, evet) tutarlı; soru2 2 tekrar (evet, hayır) tutarsız; soru3 1 cevap. claude: soru1 1 cevap
    const plan = [["openai", p[0], 1, true], ["openai", p[0], 2, true], ["openai", p[1], 1, true], ["openai", p[1], 2, false], ["openai", p[2], 1, false], ["claude", p[0], 1, false]];
    for (const [prov, pid, rep, rec] of plan) {
      const rid = (await db.query(`insert into responses (workspace_id, run_id, prompt_id, provider, model, method, repetition, answer_text, data_origin, measurement_type)
        values ($1, $2, $3, $4, 'm', 'api_with_search', $5, 'cevap', 'live_api', 'live_search') returning id`, [A, run, pid, prov, rep])).rows[0].id;
      await db.query(`insert into mentions (response_id, workspace_id, brand_id, mentioned, recommended, cited, classifier) values ($1, $2, $3, $4, $4, false, 'rules_v1')`, [rid, A, br.id, rec]);
    }
    const rows = (await db.query(`select * from run_confidence($1)`, [run])).rows;
    assert.deepEqual(rows, [
      { provider: "claude", answers: 1, prompts: 1, repeat_groups: 0, consistent_groups: 0 },
      { provider: "openai", answers: 5, prompts: 3, repeat_groups: 2, consistent_groups: 1 },
    ]);
    assert.equal((await as(U2, `select count(*)::int n from run_confidence('${run}')`)).rows[0].n, 0, "başka alanın kullanıcısı göremez");
    await db.query(`delete from runs where id=$1`, [run]);
    await db.query(`delete from prompts where id = any($1)`, [p]);
  }
  console.log("ok 0066: güven puanı girdileri doğru; RLS korunuyor" + (br ? "" : " (marka yok, atlandı)"));
}
// 0067: müşteri adı — uzunluk sınırı; başka alanın kullanıcısı yazamaz
{
  const br = (await db.query(`select id from brands where workspace_id=$1 and not is_competitor limit 1`, [A])).rows[0];
  if (br) {
    await as(U1, `update brands set client_name = 'Akdeniz Otel Grubu' where id = '${br.id}'`);
    assert.equal((await db.query(`select client_name from brands where id=$1`, [br.id])).rows[0].client_name, "Akdeniz Otel Grubu");
    await assert.rejects(db.query(`update brands set client_name = $2 where id=$1`, [br.id, "x".repeat(81)]), "en fazla 80 karakter");
    await assert.rejects(db.query(`update brands set client_name = '   ' where id=$1`, [br.id]), "boş ad olmaz");
    await as(U2, `update brands set client_name = 'Sızma' where id = '${br.id}'`);
    assert.equal((await db.query(`select client_name from brands where id=$1`, [br.id])).rows[0].client_name, "Akdeniz Otel Grubu", "başka alan yazamaz");
    await db.query(`update brands set client_name = null where id=$1`, [br.id]);
  }
  console.log("ok 0067: müşteri adı doğrulanıyor; başka alan yazamıyor" + (br ? "" : " (marka yok, atlandı)"));
}
// 0069: hesap silme — abonelik engeli, ekipte sahiplik devri, tek kişilik alan silinir
{
  await db.exec(`create table if not exists auth.users (id uuid primary key, email text)`);
  const X = "aaaaaaaa-0000-0000-0000-0000000000d1", Y = "aaaaaaaa-0000-0000-0000-0000000000d2";
  const S = "55555555-5555-5555-5555-555555555501", T = "55555555-5555-5555-5555-555555555502", P = "55555555-5555-5555-5555-555555555503";
  await db.exec(`insert into auth.users values ('${X}','x@ornek.com'), ('${Y}','y@ornek.com');
    insert into workspaces (id,name,kind) values ('${S}','Tek Kişi','business'), ('${T}','Ekip','agency'), ('${P}','Abone','business');
    insert into workspace_members values ('${S}','${X}','owner',now()), ('${T}','${X}','owner',now()), ('${T}','${Y}','editor',now()), ('${P}','${X}','owner',now());
    insert into brands (workspace_id,name) values ('${S}','Silinecek Marka'), ('${T}','Ekip Markası');
    update workspaces set subscription_status='active' where id='${P}';`);
  assert.equal((await as(X, "select delete_my_account() r")).rows[0].r, "active_subscription");
  assert.equal((await db.query(`select count(*)::int n from auth.users where id=$1`, [X])).rows[0].n, 1, "abonelik varken silinmez");
  await db.exec(`update workspaces set subscription_status='canceled' where id='${P}'`);
  assert.equal((await as(X, "select delete_my_account() r")).rows[0].r, "deleted");
  assert.equal((await db.query(`select count(*)::int n from auth.users where id=$1`, [X])).rows[0].n, 0);
  assert.equal((await db.query(`select count(*)::int n from workspaces where id in ('${S}','${P}')`)).rows[0].n, 0, "tek kişilik alanlar silindi");
  assert.equal((await db.query(`select count(*)::int n from brands where name='Silinecek Marka'`)).rows[0].n, 0);
  assert.equal((await db.query(`select role from workspace_members where workspace_id=$1 and user_id=$2`, [T, Y])).rows[0].role, "owner", "ekip alanı devredildi");
  assert.equal((await db.query(`select count(*)::int n from brands where name='Ekip Markası'`)).rows[0].n, 1);
  assert.equal((await db.query(`select count(*)::int n from workspace_members where user_id=$1`, [X])).rows[0].n, 0);
  await db.exec(`delete from workspaces where id='${T}'; delete from auth.users where id='${Y}'`);
  console.log("ok 0069: hesap silme — abonelik engeli, ekip devri, tek kişilik alan ve kişisel kayıtlar siliniyor");
}
// 0070: marka uyarıları yalnız üyelere
{
  const br = (await db.query(`select id from brands where workspace_id=$1 and not is_competitor limit 1`, [A])).rows[0];
  if (br) {
    const run = (await db.query(`insert into runs (workspace_id,brand_id,data_origin,max_cost_usd,status,measurement_type) values ($1,$2,'live_api',1,'done','model_knowledge') returning id`, [A, br.id])).rows[0].id;
    await db.query(`insert into drop_alerts (run_id,brand_id,alerted,detail) values ($1,$2,true,'{"drops":[{"provider":"gemini","lost":1,"lost_items":[{"prompt":"x","instead":"Rakip"}]}]}')`, [run, br.id]);
    assert.equal((await as(U1, `select count(*)::int n from brand_alerts('${br.id}')`)).rows[0].n, 1, "üye görür");
    assert.equal((await as(U2, `select count(*)::int n from brand_alerts('${br.id}')`)).rows[0].n, 0, "başka alan göremez");
    await db.query(`delete from runs where id=$1`, [run]);
  }
  console.log("ok 0070: marka uyarıları yalnız üyelere görünüyor" + (br ? "" : " (marka yok, atlandı)"));
}
// 0071: telefon bildirimi cihazları yalnız sahibine; bildirilen ölçüm bir kez
{
  const tok = "tok_" + "x".repeat(30);
  await as(U1, `select register_push_device('${tok}', 'android', 'tr')`);
  assert.equal((await as(U1, `select count(*)::int n from push_devices`)).rows[0].n, 1, "sahibi görür");
  assert.equal((await as(U2, `select count(*)::int n from push_devices`)).rows[0].n, 0, "başkası göremez");
  await assert.rejects(as(U1, `select register_push_device('kisa', 'android', 'tr')`), /invalid_token/);
  await assert.rejects(as(U1, `select pending_run_pushes(10)`), /permission denied/);
  const br = (await db.query(`select id from brands where workspace_id=$1 and not is_competitor limit 1`, [A])).rows[0];
  if (br) {
    const run = (await db.query(`insert into runs (workspace_id,brand_id,data_origin,max_cost_usd,status,measurement_type,finished_at) values ($1,$2,'live_api',1,'done','model_knowledge',now()) returning id`, [A, br.id])).rows[0].id;
    const rows = (await db.query(`select * from pending_run_pushes(100) where run_id=$1`, [run])).rows;
    assert.ok(rows.some((r) => r.token === tok), "üyenin cihazı listede");
    await db.query(`select record_run_push($1, 1)`, [run]);
    assert.equal((await db.query(`select count(*)::int n from pending_run_pushes(100) where run_id=$1`, [run])).rows[0].n, 0, "ikinci kez listelenmez");
    await db.query(`delete from runs where id=$1`, [run]);
  }
  await as(U1, `select unregister_push_device('${tok}')`);
  assert.equal((await db.query(`select count(*)::int n from push_devices where token=$1`, [tok])).rows[0].n, 0, "kapatınca silinir");
  console.log("ok 0071: bildirim cihazları yalnız sahibine, ölçüm bildirimi bir kez");
}
// 0072: soru hakkı (karma ölçüm): abonede kota %30 haftalık hafif ölçüm + %70 istek üzerine
{
  const own = (await db.query(`select id from brands where workspace_id=$1 and not is_competitor order by created_at limit 1`, [A])).rows[0];
  if (own) {
    const prev = (await db.query(`select kind, plan, subscription_status, paid_live_allowed, status from workspaces where id=$1`, [A])).rows[0];
    const prevAuto = (await db.query(`select auto_weekly, country from brands where id=$1`, [own.id])).rows[0];
    await db.query(`update workspaces set kind='business', plan='starter', subscription_status='active', paid_live_allowed=true, status='active' where id=$1`, [A]);
    await db.query(`update brands set auto_weekly=true, country='TR' where id=$1`, [own.id]);
    await db.query(`delete from runs where workspace_id=$1`, [A]);
    await db.query(`delete from cost_ledger where workspace_id=$1`, [A]);
    await db.query(`update prompts set active=false where brand_id=$1`, [own.id]);
    for (let i = 0; i < 10; i++) await db.query(`insert into prompts (workspace_id, brand_id, text, intent, active) values ($1, $2, $3, 'purchase', true)`, [A, own.id, `soru hakkı testi ${i}`]);
    let q = (await as(U1, `select * from my_quota('${A}')`)).rows[0];
    assert.deepEqual([q.hybrid, q.total, q.weekly_cap, q.manual_cap, q.manual_left], [true, 760, 228, 532, 532], "Gümüş: 760 = 228 haftalık + 532 soru hakkı");
    assert.equal((await as(U2, `select count(*)::int n from my_quota('${A}')`)).rows[0].n, 0, "üye olmayan göremez");
    // Haftalık: hafif ölçüm (her soru Gemini 1 + ChatGPT 1 = 20 hak)
    await db.query(`select schedule_weekly_runs(50)`);
    const wk = (await db.query(`select measurement_type, light, trigger, prompts_total from runs where brand_id=$1 order by measurement_type`, [own.id])).rows;
    assert.deepEqual(wk.map((r) => [r.measurement_type, r.light, r.trigger, r.prompts_total]), [["live_search", true, "weekly", 10], ["model_knowledge", true, "weekly", 10]], "haftalık hafif ölçüm, tüm sorular");
    const wkRun = (await db.query(`select id from runs where brand_id=$1 limit 1`, [own.id])).rows[0].id;
    // Haftalık harcama soru hakkından düşmez
    await db.query(`insert into cost_ledger (workspace_id, run_id, task, provider, model, cost_usd, billing) select $1, $2, 'query_engine', 'openai', 'm', 0, 'paid' from generate_series(1, 220)`, [A, wkRun]);
    q = (await as(U1, `select * from my_quota('${A}')`)).rows[0];
    assert.deepEqual([q.weekly_used, q.manual_left], [220, 532]);
    // Haftalık pay doldu: yeni haftalık ölçüm açılmaz (220 + 20 > 228)
    await db.query(`update runs set status='done', created_at = now() - interval '8 days' where brand_id=$1`, [own.id]);
    await db.query(`select schedule_weekly_runs(50)`);
    assert.equal((await db.query(`select count(*)::int n from runs where brand_id=$1 and status='queued'`, [own.id])).rows[0].n, 0, "haftalık pay dolunca durur");
    // İstek üzerine canlı ölçüm: 10 soru × 6 = 60 hak (0077: 4 motor canlı); hak yetmezse başlamaz
    const r = (await as(U1, `select request_run('${own.id}', true) id`)).rows[0].id;
    assert.ok(r);
    const mRun = r;
    await db.query(`update runs set status='done' where id=$1`, [mRun]);
    await db.query(`insert into cost_ledger (workspace_id, run_id, task, provider, model, cost_usd, billing) select $1, $2, 'query_engine', 'openai', 'm', 0, 'paid' from generate_series(1, 500)`, [A, mRun]);
    q = (await as(U1, `select * from my_quota('${A}')`)).rows[0];
    assert.equal(q.manual_left, 32);
    await assert.rejects(as(U1, `select request_run('${own.id}', true)`), /Soru hakkınız yetmiyor: bu ölçüm 60 soru hakkı kullanır, bu ay 32/);
    // Ücretsiz pakette karma düzen yok
    await db.query(`update workspaces set plan='free', subscription_status=null, paid_live_allowed=false where id=$1`, [A]);
    q = (await as(U1, `select * from my_quota('${A}')`)).rows[0];
    assert.equal(q.hybrid, false);
    // geri al
    await db.query(`delete from cost_ledger where workspace_id=$1`, [A]);
    await db.query(`delete from runs where workspace_id=$1`, [A]);
    await db.query(`delete from prompts where brand_id=$1 and text like 'soru hakkı testi %'`, [own.id]);
    await db.query(`update prompts set active=true where brand_id=$1`, [own.id]);
    await db.query(`update brands set auto_weekly=$2, country=$3 where id=$1`, [own.id, prevAuto.auto_weekly, prevAuto.country]);
    await db.query(`update workspaces set kind=$2, plan=$3, subscription_status=$4, paid_live_allowed=$5, status=$6 where id=$1`, [A, prev.kind, prev.plan, prev.subscription_status, prev.paid_live_allowed, prev.status]);
    console.log("ok 0072: soru hakkı: %30 haftalık hafif ölçüm, %70 istek üzerine, hak yetmezse ölçüm başlamaz");
  }
}
// 0074: mağaza ödemesi: abonelik paketi açar, iptal dönem sonuna kadar sürer, ek paket yalnız hakkı biten aboneye
{
  const prev = (await db.query(`select kind, plan, subscription_status, paid_live_allowed, status, billing_source, paddle_subscription_id, current_period_end from workspaces where id=$1`, [A])).rows[0];
  await db.query(`update workspaces set kind='business', plan='free', subscription_status=null, paid_live_allowed=false, paddle_subscription_id=null where id=$1`, [A]);
  const exp = new Date(Date.now() + 20 * 864e5).toISOString();
  const call = (args) => db.query(`select apply_store_subscription($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) r`, args).then((x) => x.rows[0].r);
  assert.equal(await call(["google_play", "tok-1", A, U2, "gumus", "SUBSCRIPTION_STATE_ACTIVE", exp, true, "GPA.1", null]), "not_member", "üye olmayan bağlayamaz");
  assert.equal(await call(["google_play", "tok-1", A, U1, "elmas", "SUBSCRIPTION_STATE_ACTIVE", exp, true, "GPA.1", null]), "unknown_product", "Elmas uygulamada yok");
  assert.equal(await call(["google_play", "tok-1", A, U1, "gumus", "SUBSCRIPTION_STATE_ACTIVE", exp, true, "GPA.1", null]), "ok");
  let w = (await db.query(`select plan, subscription_status, billing_source, paid_live_allowed from workspaces where id=$1`, [A])).rows[0];
  assert.deepEqual([w.plan, w.subscription_status, w.billing_source, w.paid_live_allowed], ["starter", "active", "google_play", true]);
  assert.equal((await as(U1, `select count(*)::int n from store_subscriptions`)).rows[0].n, 1, "üye kendi aboneliğini görür");
  assert.equal((await as(U2, `select count(*)::int n from store_subscriptions`)).rows[0].n, 0);
  // İptal: dönem sonuna kadar kullanır
  assert.equal(await call(["google_play", "tok-1", A, null, "gumus", "SUBSCRIPTION_STATE_CANCELED", exp, false, null, null]), "ok");
  assert.equal((await db.query(`select plan from workspaces where id=$1`, [A])).rows[0].plan, "starter", "iptalde dönem sonuna kadar paket sürer");
  // Ek paket: hak bitmeden alınamaz
  const pack = (tok, prod) => db.query(`select grant_quota_pack('google_play',$1,$2,$3,$4) r`, [tok, A, U1, prod]).then((x) => x.rows[0].r);
  assert.equal(await pack("pk-1", "ek_250"), "quota_not_exhausted");
  assert.equal((await as(U1, `select can_buy_quota_pack('${A}') b`)).rows[0].b, false);
  const run = (await db.query(`insert into runs (workspace_id,brand_id,data_origin,max_cost_usd,status,measurement_type,trigger) select $1, id, 'live_api', 1, 'done', 'live_search', 'manual' from brands where workspace_id=$1 and not is_competitor limit 1 returning id`, [A])).rows[0].id;
  await db.query(`insert into cost_ledger (workspace_id, run_id, task, provider, model, cost_usd, billing) select $1, $2, 'query_engine', 'openai', 'm', 0, 'paid' from generate_series(1, 532)`, [A, run]);
  assert.equal((await as(U1, `select can_buy_quota_pack('${A}') b`)).rows[0].b, true, "hak bitince ek paket alınabilir");
  assert.equal(await pack("pk-1", "ek_250"), "ok");
  assert.equal(await pack("pk-1", "ek_250"), "already_granted", "aynı satın alma iki kez işlenmez");
  const q = (await as(U1, `select * from my_quota('${A}')`)).rows[0];
  assert.deepEqual([q.manual_cap, q.manual_left], [782, 250], "ek paket soru hakkına eklenir");
  // Süre doldu: paket düşer
  assert.equal(await call(["google_play", "tok-1", A, null, "gumus", "SUBSCRIPTION_STATE_EXPIRED", exp, false, null, null]), "ok");
  w = (await db.query(`select plan, subscription_status, paid_live_allowed from workspaces where id=$1`, [A])).rows[0];
  assert.deepEqual([w.plan, w.subscription_status, w.paid_live_allowed], ["free", "canceled", false]);
  // Sitede (Paddle) aboneliği olan alana mağaza aboneliği bağlanmaz
  await db.query(`update workspaces set plan='starter', subscription_status='active', paid_live_allowed=true, billing_source='paddle', paddle_subscription_id='sub_x' where id=$1`, [A]);
  assert.equal(await call(["google_play", "tok-2", A, U1, "altin", "SUBSCRIPTION_STATE_ACTIVE", exp, true, "GPA.2", null]), "already_subscribed_web");
  // geri al
  for (const t of ["quota_extras", "store_subscriptions", "cost_ledger"]) await db.query(`delete from ${t} where workspace_id=$1`, [A]);
  await db.query(`delete from runs where id=$1`, [run]);
  await db.query(`update workspaces set kind=$2, plan=$3, subscription_status=$4, paid_live_allowed=$5, status=$6, billing_source=$7, paddle_subscription_id=$8, current_period_end=$9 where id=$1`, [A, prev.kind, prev.plan, prev.subscription_status, prev.paid_live_allowed, prev.status, prev.billing_source, prev.paddle_subscription_id, prev.current_period_end]);
  console.log("ok 0074: mağaza aboneliği paket açar/kapatır, iptalde dönem sonuna kadar sürer, ek paket yalnız hakkı biten aboneye ve bir kez");
}
// 0076: mağaza ödemesi düzeltmeleri: Paddle/Play birbirini düşürmez, çift abonelik reddedilir, paket en yüksek etkin abonelikten
{
  const prev = (await db.query(`select kind, plan, subscription_status, paid_live_allowed, status, billing_source, paddle_subscription_id, current_period_end from workspaces where id=$1`, [A])).rows[0];
  await db.query(`update workspaces set kind='business', plan='free', subscription_status=null, paid_live_allowed=false, paddle_subscription_id=null, billing_source='paddle' where id=$1`, [A]);
  const exp = new Date(Date.now() + 20 * 864e5).toISOString();
  const call = (args) => db.query(`select apply_store_subscription($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) r`, args).then((x) => x.rows[0].r);
  const ws = () => db.query(`select plan, subscription_status, billing_source, paid_live_allowed from workspaces where id=$1`, [A]).then((x) => x.rows[0]);
  // Bekleyen ödeme pakete dokunmaz
  assert.equal(await call(["google_play", "t-p", A, U1, "altin", "SUBSCRIPTION_STATE_PENDING", null, true, null, null]), "pending");
  assert.equal((await ws()).plan, "free", "bekleyen ödeme paket açmaz");
  assert.equal((await db.query(`select count(*)::int n from store_subscriptions_due(50) where purchase_token='t-p'`)).rows[0].n, 0, "6 saat dolmadan sorulmaz");
  await db.query(`update store_subscriptions set updated_at = now() - interval '7 hours' where purchase_token='t-p'`);
  assert.equal((await db.query(`select count(*)::int n from store_subscriptions_due(50) where purchase_token='t-p'`)).rows[0].n, 1, "bekleyen ödeme işçi tarafından yeniden sorulur");
  // Tamamlandı
  assert.equal(await call(["google_play", "t-p", A, null, "altin", "SUBSCRIPTION_STATE_ACTIVE", exp, true, "GPA.p", null]), "ok");
  assert.equal((await ws()).plan, "altin");
  // İkinci yenilenen abonelik reddedilir (çift ücret olmasın)
  assert.equal(await call(["google_play", "t-2", A, U1, "platin", "SUBSCRIPTION_STATE_ACTIVE", exp, true, "GPA.2", null]), "already_subscribed_store");
  // İptal edilmiş (yenilenmeyecek) aboneliğin yanında yenisi alınabilir; paket en yükseği, eski bitince yenisinde kalır
  assert.equal(await call(["google_play", "t-p", A, null, "altin", "SUBSCRIPTION_STATE_CANCELED", exp, false, null, null]), "ok");
  assert.equal(await call(["google_play", "t-3", A, U1, "gumus", "SUBSCRIPTION_STATE_ACTIVE", exp, true, "GPA.3", null]), "ok");
  assert.equal((await ws()).plan, "altin", "iki etkin abonelikte en yükseği");
  assert.equal(await call(["google_play", "t-p", A, null, "altin", "SUBSCRIPTION_STATE_EXPIRED", exp, false, null, null]), "ok");
  assert.equal((await ws()).plan, "starter", "biri bitince kalan aboneliğin paketine iner");
  // CANCELED + süre yok: hata vermez
  assert.equal(await call(["google_play", "t-4", A, U1, "gumus", "SUBSCRIPTION_STATE_CANCELED", null, false, null, null]), "ok");
  // Hesap silme: yenilenecek Play aboneliği varken ayrı sonuç
  const owner = (await db.query(`select user_id from workspace_members where workspace_id=$1 and role='owner' limit 1`, [A])).rows[0].user_id;
  assert.equal((await as(owner, `select delete_my_account() r`)).rows[0].r, "active_store_subscription", "yenilenecek Play aboneliği varken önce Google Play'de iptal");
  // Play biter, sonra sitede (Paddle) abone olur: eski Play token'ının bitişi onu düşürmez
  assert.equal(await call(["google_play", "t-3", A, null, "gumus", "SUBSCRIPTION_STATE_EXPIRED", exp, false, null, null]), "ok");
  assert.equal((await ws()).plan, "free");
  assert.equal((await db.query(`select apply_subscription($1,'pro','active','sub_new','ctm_1',$2) r`, [A, exp])).rows[0].r, "ok");
  assert.equal((await ws()).billing_source, "paddle", "Paddle etkin olunca ödeme kaynağı Paddle");
  assert.equal(await call(["google_play", "t-3", A, null, "gumus", "SUBSCRIPTION_STATE_EXPIRED", exp, false, null, null]), "ok_not_billing_source");
  let w = await ws();
  assert.deepEqual([w.plan, w.subscription_status, w.paid_live_allowed], ["pro", "active", true], "eski Play olayı Paddle abonesini düşürmez");
  // Tersi: Play ile öderken eski Paddle aboneliğinin iptal olayı onu düşürmez
  await db.query(`update workspaces set plan='altin', subscription_status='active', billing_source='google_play', paddle_subscription_id='sub_new' where id=$1`, [A]);
  assert.equal((await db.query(`select apply_subscription($1,'pro','canceled','sub_new','ctm_1',$2) r`, [A, exp])).rows[0].r, "other_billing_source");
  assert.equal((await ws()).plan, "altin");
  for (const t of ["store_subscriptions"]) await db.query(`delete from ${t} where workspace_id=$1`, [A]);
  await db.query(`update workspaces set kind=$2, plan=$3, subscription_status=$4, paid_live_allowed=$5, status=$6, billing_source=$7, paddle_subscription_id=$8, current_period_end=$9 where id=$1`, [A, prev.kind, prev.plan, prev.subscription_status, prev.paid_live_allowed, prev.status, prev.billing_source, prev.paddle_subscription_id, prev.current_period_end]);
  console.log("ok 0076: Paddle/Play birbirini düşürmez, bekleyen ödeme paket açmaz, çift abonelik reddedilir, paket en yüksek etkin abonelikten");
}
// 0078: askıdaki abonelik yeniden sorulur ve ikinci aboneliği engeller, süresi geçen hemen sorulur, Paddle mağaza aboneliğini ezmez
{
  const prev = (await db.query(`select kind, plan, subscription_status, paid_live_allowed, status, billing_source, paddle_subscription_id, current_period_end from workspaces where id=$1`, [A])).rows[0];
  await db.query(`update workspaces set kind='business', plan='free', subscription_status=null, paid_live_allowed=false, paddle_subscription_id=null, billing_source='paddle' where id=$1`, [A]);
  const exp = new Date(Date.now() + 20 * 864e5).toISOString(), old = new Date(Date.now() - 20 * 864e5).toISOString();
  const call = (args) => db.query(`select apply_store_subscription($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) r`, args).then((x) => x.rows[0].r);
  const ws = () => db.query(`select plan, subscription_status, billing_source, paid_live_allowed from workspaces where id=$1`, [A]).then((x) => x.rows[0]);
  const due = (tok) => db.query(`select count(*)::int n from store_subscriptions_due(50) where purchase_token=$1`, [tok]).then((x) => x.rows[0].n);
  assert.equal(await call(["google_play", "h-1", A, U1, "altin", "SUBSCRIPTION_STATE_ACTIVE", exp, true, "GPA.h", null]), "ok");
  // Ödeme alınamadı: askıya alındı (yenilenecek), paket kapanır
  assert.equal(await call(["google_play", "h-1", A, null, "altin", "SUBSCRIPTION_STATE_ON_HOLD", old, true, null, null]), "ok");
  assert.equal((await ws()).plan, "free");
  assert.equal(await due("h-1"), 0, "6 saat dolmadan sorulmaz");
  await db.query(`update store_subscriptions set updated_at = now() - interval '7 hours' where purchase_token='h-1'`);
  assert.equal(await due("h-1"), 1, "askıdaki abonelik 90 gün boyunca yeniden sorulur");
  // Askıdayken ikinci abonelik alınamaz (ödeme düzelince iki kez ücret), hesap silinemez
  assert.equal(await call(["google_play", "h-2", A, U1, "gumus", "SUBSCRIPTION_STATE_ACTIVE", exp, true, "GPA.h2", null]), "already_subscribed_store");
  assert.equal((await as(U1, `select delete_my_account() r`)).rows[0].r, "active_store_subscription", "askıdaki yenilenecek abonelik hesap silmeyi engeller");
  // Askıdayken sitede (Paddle) abone olursa ödeme kaynağı Paddle'a geçmez, kayda düşer
  assert.equal((await db.query(`select apply_subscription($1,'pro','active','sub_c','ctm_c',$2) r`, [A, exp])).rows[0].r, "store_subscription_active");
  assert.equal((await db.query(`select apply_subscription($1,'pro','active','sub_c','ctm_c',$2) r`, [A, exp])).rows[0].r, "store_subscription_active");
  let w = await ws();
  assert.deepEqual([w.plan, w.billing_source], ["free", "google_play"], "Paddle olayı paketi açmaz, ödeme kaynağı değişmez");
  const c = (await db.query(`select hits, source from billing_conflicts where workspace_id=$1 and reference='sub_c'`, [A])).rows[0];
  assert.deepEqual([c.hits, c.source], [2, "paddle"], "çakışma bir kez kaydedilir, tekrarlar sayılır");
  assert.equal((await as(U1, `select count(*)::int n from billing_conflicts`)).rows[0].n, 0, "çakışma kaydını yalnız platform yöneticisi görür");
  // Ödeme düzeldi: işçi yakalar, paket geri açılır
  assert.equal(await call(["google_play", "h-1", A, null, "altin", "SUBSCRIPTION_STATE_ACTIVE", exp, true, "GPA.h3", null]), "ok");
  w = await ws();
  assert.deepEqual([w.plan, w.billing_source, w.paid_live_allowed], ["altin", "google_play", true]);
  // Süresi geçmiş ve bitişten sonra hiç sorulmamış: 6 saat beklemeden (en fazla 10 dakikada bir) sorulur
  await db.query(`update store_subscriptions set expiry_at = now() - interval '1 minute', updated_at = now() - interval '20 minutes' where purchase_token='h-1'`);
  assert.equal(await due("h-1"), 1, "süresi geçen abonelik hemen sorulur");
  await db.query(`update store_subscriptions set updated_at = now() - interval '5 minutes' where purchase_token='h-1'`);
  assert.equal(await due("h-1"), 0, "10 dakikadan sık sorulmaz");
  // İptal edilmiş (yenilenmeyecek) Play aboneliği Paddle'ı engellemez
  assert.equal(await call(["google_play", "h-1", A, null, "altin", "SUBSCRIPTION_STATE_CANCELED", exp, false, null, null]), "ok");
  assert.equal((await db.query(`select apply_subscription($1,'pro','active','sub_d','ctm_d',$2) r`, [A, exp])).rows[0].r, "ok");
  assert.equal((await ws()).billing_source, "paddle");
  await db.query(`delete from billing_conflicts where workspace_id=$1`, [A]);
  await db.query(`delete from store_subscriptions where workspace_id=$1`, [A]);
  await db.query(`update workspaces set kind=$2, plan=$3, subscription_status=$4, paid_live_allowed=$5, status=$6, billing_source=$7, paddle_subscription_id=$8, current_period_end=$9 where id=$1`, [A, prev.kind, prev.plan, prev.subscription_status, prev.paid_live_allowed, prev.status, prev.billing_source, prev.paddle_subscription_id, prev.current_period_end]);
  console.log("ok 0078: askıdaki abonelik yeniden sorulur ve ikinci aboneliği engeller, süresi geçen hemen sorulur, Paddle mağaza aboneliğini ezmez");
}
console.log("TÜM DB TESTLERİ GEÇTİ");
