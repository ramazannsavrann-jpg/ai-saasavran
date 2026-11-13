import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { BOTS, cidrsFrom, detectBot, inCidr, verifyBotIp, cleanPath } from "../../functions/api/_bot-lib.js";
import { onRequestPost } from "../../functions/api/ai-bot.js";
import { onRequest } from "../../functions/_middleware.js";

test("Bot tanıma: kullanıcı aracısından doğru bot; ChatGPT-User GPTBot sanılmaz; normal tarayıcı bot değil", () => {
  const ua = (s: string) => detectBot(`Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ${s}; +https://x)`)?.name ?? null;
  assert.equal(ua("OAI-SearchBot/1.0"), "OAI-SearchBot");
  assert.equal(ua("ChatGPT-User/1.0"), "ChatGPT-User");
  assert.equal(ua("GPTBot/1.3"), "GPTBot");
  assert.equal(ua("Claude-User/1.0"), "Claude-User");
  assert.equal(ua("ClaudeBot/1.0"), "ClaudeBot");
  assert.equal(ua("Perplexity-User/1.0"), "Perplexity-User");
  assert.equal(detectBot("Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile Safari/537.36"), null);
  assert.equal(detectBot(""), null);
  assert.ok(BOTS.every((b) => ["search", "user", "training"].includes(b.kind)));
});

test("IP doğrulama: CIDR eşleşmesi, liste biçiminden bağımsız okuma, liste alınamazsa doğrulanmamış", async () => {
  assert.equal(inCidr("20.171.206.5", "20.171.206.0/24"), true);
  assert.equal(inCidr("20.171.207.5", "20.171.206.0/24"), false);
  assert.equal(inCidr("2001:db8::1", "20.171.206.0/24"), false);
  assert.deepEqual(cidrsFrom({ prefixes: [{ ipv4Prefix: "20.171.206.0/24" }, { ipv6Prefix: "2a03::/32" }] }), ["20.171.206.0/24"]);
  const bot = detectBot("OAI-SearchBot/1.0");
  const ok = async () => new Response(JSON.stringify({ prefixes: [{ ipv4Prefix: "20.171.206.0/24" }] }));
  assert.equal(await verifyBotIp(bot, "20.171.206.9", ok as never), true);
  assert.equal(await verifyBotIp(bot, "1.2.3.4", ok as never), false);
  assert.equal(await verifyBotIp(bot, "20.171.206.9", (async () => new Response("", { status: 500 })) as never), false);
  assert.equal(await verifyBotIp(detectBot("ClaudeBot/1.0"), "20.171.206.9", ok as never), false, "listesi olmayan bot doğrulanmış sayılmaz");
  assert.equal(cleanPath("/a?b=1"), "/a");
});

const env = { SUPABASE_URL: "https://db.test", SUPABASE_SERVICE_ROLE_KEY: "svc" };
const KEY = "552ec134-8c6a-4ffe-a923-2697cd66bf65";
function withFetch(fn: (url: string, init?: RequestInit) => Response) {
  const orig = globalThis.fetch; const calls: { url: string; body: string }[] = [];
  globalThis.fetch = (async (u: string, i?: RequestInit) => { calls.push({ url: String(u), body: String(i?.body ?? "") }); return fn(String(u), i); }) as never;
  return { calls, restore: () => { globalThis.fetch = orig; } };
}

test("/api/ai-bot: bot adı sunucuda belirlenir, IP saklanmaz; bot olmayan istek sayılmaz", async () => {
  const f = withFetch((u) => (u.includes("openai.com") ? new Response(JSON.stringify({ prefixes: [{ ipv4Prefix: "20.171.206.0/24" }] })) : new Response("true")));
  try {
    const req = (b: unknown) => new Request("https://aisaasavran.com/api/ai-bot", { method: "POST", body: JSON.stringify(b) });
    assert.equal((await onRequestPost({ request: req({ k: KEY, ua: "Mozilla/5.0; OAI-SearchBot/1.0", ip: "20.171.206.9", path: "/fiyat?x=1", status: 200 }), env } as never)).status, 204);
    const rpc = f.calls.find((c) => c.url.includes("record_ai_bot"))!;
    assert.deepEqual(JSON.parse(rpc.body), { p_key: KEY, p_bot: "OAI-SearchBot", p_path: "/fiyat", p_status: 200, p_verified: true });
    assert.ok(!rpc.body.includes("20.171.206.9"), "IP veritabanına gitmez");
    const n = f.calls.length;
    await onRequestPost({ request: req({ k: KEY, ua: "Mozilla/5.0 Chrome", ip: "1.1.1.1", path: "/" }), env } as never);
    assert.equal(f.calls.length, n, "insan ziyareti bildirilmez");
    assert.equal((await onRequestPost({ request: req({ k: "kötü", ua: "GPTBot" }), env } as never)).status, 400);
  } finally { f.restore(); }
});

test("Ara katman: bot isteği cevabı bekletmeden sayılır, insan isteği ve /api/ yolları sayılmaz, hata durumu iletilir", async () => {
  const f = withFetch(() => new Response("true"));
  try {
    const run = async (url: string, ua: string, status = 200) => {
      const waits: Promise<unknown>[] = [];
      const res = await onRequest({ request: new Request(url, { headers: { "user-agent": ua, "cf-connecting-ip": "9.9.9.9" } }), env, next: async () => new Response("ok", { status }), waitUntil: (p: Promise<unknown>) => waits.push(p) } as never);
      await Promise.all(waits);
      return res;
    };
    assert.equal((await run("https://aisaasavran.com/tr/", "ClaudeBot/1.0")).status, 200);
    assert.deepEqual(JSON.parse(f.calls.at(-1)!.body), { p_key: KEY, p_bot: "ClaudeBot", p_path: "/tr/", p_status: 200, p_verified: false });
    await run("https://aisaasavran.com/yok", "GPTBot/1.3", 404);
    assert.equal(JSON.parse(f.calls.at(-1)!.body).p_status, 404);
    const n = f.calls.filter((c) => c.url.includes("record_ai_bot")).length;
    await run("https://aisaasavran.com/", "Mozilla/5.0 Chrome");
    await run("https://aisaasavran.com/api/example", "GPTBot/1.3");
    assert.equal(f.calls.filter((c) => c.url.includes("record_ai_bot")).length, n);
  } finally { f.restore(); }
});

test("WordPress eklentisi: bot isteğinde doğru bildirim, insan isteğinde yok (PHP varsa)", (t) => {
  try { execFileSync("php", ["-v"]); } catch { t.skip("php yok"); return; }
  const stub = `<?php
define('ABSPATH', '/'); $H = array(); $SENT = array();
function add_action($h, $f) { global $H; $H[$h][] = $f; }
function get_option($k, $d = '') { return '${KEY}'; }
function is_admin() { return false; }
function wp_json_encode($v) { return json_encode($v); }
function wp_remote_post($u, $a) { global $SENT; $SENT[] = array($u, $a); }
function esc_url($s) { return $s; } function esc_attr($s) { return $s; }
function register_setting() {} function add_options_page() {}
$_SERVER['HTTP_USER_AGENT'] = getenv('UA'); $_SERVER['REQUEST_URI'] = '/hizmetler?utm=1'; $_SERVER['REMOTE_ADDR'] = '20.171.206.9';
require '${process.cwd()}/integrations/wordpress/ai-saasavran-bot-sayaci/ai-saasavran-bot-sayaci.php';
foreach ($H['shutdown'] as $f) $f();
ob_start(); foreach ($H['wp_head'] as $f) $f(); $head = ob_get_clean();
echo json_encode(array('sent' => $SENT, 'head' => $head));`;
  const run = (ua: string) => JSON.parse(execFileSync("php", ["-r", stub.replace(/^<\?php/, "")], { env: { ...process.env, UA: ua } }).toString());
  const bot = run("Mozilla/5.0; OAI-SearchBot/1.0");
  assert.equal(bot.sent.length, 1);
  assert.equal(bot.sent[0][0], "https://aisaasavran.com/api/ai-bot");
  assert.equal(bot.sent[0][1].blocking, false);
  assert.deepEqual(JSON.parse(bot.sent[0][1].body), { k: KEY, ua: "Mozilla/5.0; OAI-SearchBot/1.0", ip: "20.171.206.9", path: "/hizmetler", status: 200 });
  assert.match(bot.head, /t\.js" data-site="552ec134/);
  assert.equal(run("Mozilla/5.0 Chrome/130").sent.length, 0);
});

test("Bot özeti: tür, doğrulanan, hata, eksik arama botu; liste functions ile aynı", async () => {
  const { botSummary, BOT_META, workerCode } = await import("../src/traffic.ts");
  assert.deepEqual(Object.keys(BOT_META).sort(), BOTS.map((b) => b.name).sort());
  for (const b of BOTS) assert.equal(BOT_META[b.name].kind, b.kind, b.name);
  const s = botSummary([
    { day: "2026-11-13", bot: "OAI-SearchBot", path: "/", hits: 10, verified: 9, errors: 0 },
    { day: "2026-11-10", bot: "GPTBot", path: "/blog/", hits: 4, verified: 0, errors: 2 },
    { day: "2026-09-01", bot: "ClaudeBot", path: "/", hits: 99, verified: 0, errors: 0 },
  ], "2026-11-13");
  assert.equal(s.total, 14); assert.equal(s.errors, 2);
  assert.deepEqual(s.bots.map((b) => [b.bot, b.kind, b.verified]), [["OAI-SearchBot", "search", 9], ["GPTBot", "training", 0]]);
  assert.deepEqual(s.missingSearch, ["Claude-SearchBot", "PerplexityBot"]);
  assert.deepEqual(botSummary([], "2026-11-13").missingSearch, [], "veri yoksa uyarı da yok");
  // Arayüzde gösterilen Cloudflare kodu ile depodaki şablonun bot listesi aynı
  const { readFileSync } = await import("node:fs");
  const tpl = readFileSync("integrations/cloudflare/worker.js", "utf8").match(/BOT_RE = (\/.*\/i);/)![1];
  assert.ok(workerCode("K").includes(`BOT_RE = ${tpl};`));
});
