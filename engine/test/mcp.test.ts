import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-ignore: düz JavaScript (Cloudflare fonksiyonu)
import { handleMessage, TOOLS, PROTOCOL } from "../../functions/api/_mcp-lib.js";
// @ts-ignore
import { summarize, KEY, sha256hex } from "../../functions/api/_api-lib.js";

const deps = {
  listBrands: async () => [{ id: "11111111-1111-1111-1111-111111111111", name: "Kuzey Kafe" }],
  brandReport: async (id: string) => (id === "11111111-1111-1111-1111-111111111111" ? { brand: { name: "Kuzey Kafe" } } : null),
};

test("MCP: initialize, araç listesi, bildirimler, bilinmeyen yöntem", async () => {
  const init = await handleMessage({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: PROTOCOL, capabilities: {}, clientInfo: { name: "t", version: "1" } } }, deps);
  assert.equal(init.result.protocolVersion, PROTOCOL);
  assert.ok(init.result.capabilities.tools);
  assert.equal(await handleMessage({ jsonrpc: "2.0", method: "notifications/initialized" }, deps), null);
  const list = await handleMessage({ jsonrpc: "2.0", id: 2, method: "tools/list" }, deps);
  assert.deepEqual(list.result.tools.map((t: any) => t.name), ["list_brands", "get_brand_report"]);
  assert.ok(TOOLS.every((t: any) => t.annotations.readOnlyHint));
  assert.equal((await handleMessage({ jsonrpc: "2.0", id: 3, method: "resources/list" }, deps)).error.code, -32601);
  assert.equal((await handleMessage({ jsonrpc: "1.0", id: 4, method: "x" }, deps)).error.code, -32600);
});

test("MCP: araç çağrıları; bulunamayan marka ve eksik argüman hata olarak döner", async () => {
  const lb = await handleMessage({ jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "list_brands", arguments: {} } }, deps);
  assert.equal(lb.result.structuredContent.brands[0].name, "Kuzey Kafe");
  const rep = await handleMessage({ jsonrpc: "2.0", id: 6, method: "tools/call", params: { name: "get_brand_report", arguments: { brand_id: "11111111-1111-1111-1111-111111111111" } } }, deps);
  assert.equal(rep.result.structuredContent.brand.name, "Kuzey Kafe");
  const nf = await handleMessage({ jsonrpc: "2.0", id: 7, method: "tools/call", params: { name: "get_brand_report", arguments: { brand_id: "22222222-2222-2222-2222-222222222222" } } }, deps);
  assert.equal(nf.result.isError, true);
  const miss = await handleMessage({ jsonrpc: "2.0", id: 8, method: "tools/call", params: { name: "get_brand_report", arguments: {} } }, deps);
  assert.equal(miss.result.isError, true);
  assert.equal((await handleMessage({ jsonrpc: "2.0", id: 9, method: "tools/call", params: { name: "yok" } }, deps)).error.code, -32602);
});

test("API: anahtar biçimi, özet hesaplama", async () => {
  assert.ok(KEY.test("aisv_" + "a".repeat(64)));
  assert.ok(!KEY.test("aisv_kisa"));
  assert.equal((await sha256hex("abc")).length, 64);
  const at1 = "2026-11-01T00:00:00Z", at2 = "2026-11-08T00:00:00Z";
  const row = (run_id: string, run_at: string, brand_id: string, brand_name: string, is_target: boolean, n: number, rec: number) =>
    ({ run_id, run_at, provider: "openai", model: "m", brand_id, brand_name, is_target, n, mentioned: n, recommended: rec, cited: 0 });
  const s = summarize({ brand: { name: "Kuzey" }, vis: { live_search: [row("r1", at1, "a", "Kuzey", true, 4, 1), row("r2", at2, "a", "Kuzey", true, 4, 3), row("r2", at2, "b", "Güney", false, 4, 2)], model_knowledge: [] }, questions: [], sources: [] });
  const m = s.measurements.live_search;
  assert.equal(m.latest_at, at2);
  assert.deepEqual(m.brands.map((b: any) => [b.name, b.recommend_rate]), [["Kuzey", 0.75], ["Güney", 0.5]]);
  assert.deepEqual(m.history.map((h: any) => h.recommend_rate), [0.25, 0.75]);
  assert.equal(s.measurements.model_knowledge, undefined);
});
