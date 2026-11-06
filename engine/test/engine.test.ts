import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { analyzeResponse, normalize, summarize, wilson, type BrandRef } from "../src/metrics.ts";
import { BudgetGuard, BudgetExceeded, ResponseCache } from "../src/budget.ts";
import { MockProvider, MOCK_CONFIG } from "../src/providers/mock.ts";
import { GeminiProvider, parseGeminiResponse, resolveGroundingUrl, GEMINI_FREE_DEFAULT } from "../src/providers/gemini.ts";
import { parseOpenAIResponse, OPENAI_DEFAULT } from "../src/providers/openai.ts";
import { PerplexityProvider } from "../src/providers/perplexity.ts";
import { buildProviders, assertBillingAllowed, PaidApiBlocked } from "../src/providers/registry.ts";
import { type ProviderResult, classifyHttpError } from "../src/providers/types.ts";
import { runPrompts } from "../src/pipeline.ts";
import { InMemoryUsageGate } from "../src/usage.ts";
import { buildReportHeader, MixedOriginError } from "../src/report.ts";
import { PLANS, SCENARIOS, planCost, freeTierCapacity } from "../src/pricing.ts";

const brands: BrandRef[] = [
  { id: "us", name: "Ali Usta Döner", aliases: ["Ali Usta"], domain: "aliusta-demo.com" },
  { id: "c1", name: "Kebapçı Halil", aliases: [], domain: "halil-demo.com" },
  { id: "c2", name: "Şirin Döner", aliases: [] },
];
const DAY = "2026-11-06";
const gateWith = (calls = 1000, cap = 100) => new InMemoryUsageGate(() => ({ monthlyEngineCalls: calls, monthlyPaidCostCapUsd: cap }));
const cache = () => new ResponseCache<ProviderResult>(86_400_000);
const MOCK_ENV = {}; // mock ücretli işaretli ama mock olduğu için kilitten muaf

// ---------------- Metrikler ----------------
test("Türkçe normalizasyon: İ/ı/ş/ö", () => {
  assert.equal(normalize("ŞİRİN DÖNER"), "sirin doner");
  assert.equal(normalize("Kebapçı"), "kebapci");
});

test("listede geçen marka önerilmiş sayılır, sıra doğru", () => {
  const hits = analyzeResponse({
    promptId: "p1", provider: "mock",
    answerText: "Antalya'da öne çıkanlar:\n1. Kebapçı Halil – geniş menü\n2. Ali Usta Döner – uygun fiyat",
    citedUrls: ["https://www.aliusta-demo.com/menu"],
  }, brands);
  const us = hits.find((h) => h.brandId === "us")!;
  assert.deepEqual([us.mentioned, us.recommended, us.cited, us.rank], [true, true, true, 2]);
  assert.equal(hits.find((h) => h.brandId === "c1")!.rank, 1);
});

test("sıra, izlenmeyen markalar dahil gerçek liste sırasıdır; alt maddeler sayılmaz", () => {
  const text = [
    "Türkiye'de öne çıkan bankalar:",
    "1. **Ziraat Bankası** – en büyük kamu bankası",
    "   - Geniş şube ağı",
    "   - Kebapçı Halil ile anlaşmalı",
    "2. **Ali Usta Döner** – örnek",
    "3. Kebapçı Halil",
  ].join("\n");
  const hits = analyzeResponse({ promptId: "p", provider: "m", answerText: text, citedUrls: [] }, brands);
  assert.equal(hits.find((h) => h.brandId === "us")!.rank, 2);
  assert.equal(hits.find((h) => h.brandId === "c1")!.rank, 3);
});

test("olumsuz bağlam öneri sayılmaz", () => {
  const hits = analyzeResponse({ promptId: "p", provider: "m", answerText: "- Şirin Döner son yorumlara göre önerilmez.", citedUrls: [] }, brands);
  const c2 = hits.find((h) => h.brandId === "c2")!;
  assert.equal(c2.mentioned, true);
  assert.equal(c2.recommended, false);
});

test("düz metinde anılma → belirsiz, öneri sayılmaz", () => {
  const hits = analyzeResponse({ promptId: "p", provider: "m", answerText: "Ali Usta Döner 1998'de kurulmuştur.", citedUrls: [] }, brands);
  const us = hits.find((h) => h.brandId === "us")!;
  assert.equal(us.ambiguous, true);
  assert.equal(us.recommended, false);
});

test("alt alan adı citation sayılır, benzer isimli alan sayılmaz", () => {
  const a = analyzeResponse({ promptId: "p", provider: "m", answerText: "x", citedUrls: ["https://blog.aliusta-demo.com/a"] }, brands);
  assert.equal(a.find((h) => h.brandId === "us")!.cited, true);
  const b = analyzeResponse({ promptId: "p", provider: "m", answerText: "x", citedUrls: ["https://notaliusta-demo.com"] }, brands);
  assert.equal(b.find((h) => h.brandId === "us")!.cited, false);
});

test("Wilson aralığı ve düşük örneklem uyarısı", () => {
  const w = wilson(5, 10);
  assert.ok(w.low > 0.2 && w.high < 0.8);
  const hit = (rec: boolean) => brands.map((b) => ({ brandId: b.id, mentioned: rec, recommended: rec && b.id === "us", ambiguous: false, cited: false, rank: null }));
  const s = summarize([hit(true), hit(false), hit(true)], ["us", "c1"]);
  const us = s.find((x) => x.brandId === "us")!;
  assert.equal(us.recommendationRate.value, 2 / 3);
  assert.equal(us.competitorShare, 1);
  assert.equal(us.lowConfidence, true);
});

// ---------------- Sağlayıcılar ----------------
test("Gemini: kaynak yönlendirme adresi gerçek alan adına çevrilir", () => {
  assert.equal(resolveGroundingUrl("https://vertexaisearch.cloud.google.com/grounding-api-redirect/x", "aliusta-demo.com"), "https://aliusta-demo.com");
  assert.equal(resolveGroundingUrl("https://vertexaisearch.cloud.google.com/grounding-api-redirect/x", "Antalya Rehberi"), null);
  assert.equal(resolveGroundingUrl("https://site.com/a", "x"), "https://site.com/a");
});

test("Gemini: kayıtlı cevap ayrıştırılır, ücretsiz katmanda maliyet 0, ücretli eşdeğer ayrıca hesaplanır", () => {
  const json = JSON.parse(readFileSync(new URL("./fixtures/gemini-grounded.json", import.meta.url), "utf8"));
  const r = parseGeminiResponse(json, "p1", GEMINI_FREE_DEFAULT);
  assert.equal(r.dataOrigin, "live_api");
  assert.equal(r.billing, "free");
  assert.equal(r.costUsd, 0);
  assert.ok(r.paidEquivalentUsd > 0.0142 && r.paidEquivalentUsd < 0.0143);
  assert.deepEqual(r.citedUrls, ["https://aliusta-demo.com", "https://tripadvisor.com.tr"]);
  assert.deepEqual(r.searchQueries, ["antalya en iyi döner"]);
  const us = analyzeResponse(r, brands).find((h) => h.brandId === "us")!;
  assert.deepEqual([us.recommended, us.cited, us.rank], [true, true, 2]);
});

test("Gemini: istek doğru uç noktaya, anahtar başlıkta, arama aracı açık gider; anahtar hata mesajına sızmaz", async () => {
  const json = JSON.parse(readFileSync(new URL("./fixtures/gemini-grounded.json", import.meta.url), "utf8"));
  let seen: { url: string; init: RequestInit } | undefined;
  const ok = new GeminiProvider("KEY123", GEMINI_FREE_DEFAULT, async (url, init) => {
    seen = { url, init };
    return new Response(JSON.stringify(json), { status: 200 });
  });
  await ok.ask("p1", "Antalya en iyi döner?");
  assert.equal(seen!.url, "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent");
  assert.equal((seen!.init.headers as Record<string, string>)["x-goog-api-key"], "KEY123");
  assert.ok(!seen!.url.includes("KEY123"), "anahtar URL'de olmamalı");
  assert.deepEqual(JSON.parse(seen!.init.body as string).tools, [{ google_search: {} }]);

  const bad = new GeminiProvider("KEY123", GEMINI_FREE_DEFAULT, async () => new Response("invalid key KEY123", { status: 400 }));
  await assert.rejects(bad.ask("p", "x"), (e: Error) => !e.message.includes("KEY123") && /HTTP 400/.test(e.message));
});

test("OpenAI: Responses API cevabı ayrıştırılır, arama çağrısı başına ücret eklenir", () => {
  const r = parseOpenAIResponse({
    output: [
      { type: "web_search_call", action: { query: "antalya döner" } },
      { type: "message", content: [{ type: "output_text", text: "1. Ali Usta Döner", annotations: [{ type: "url_citation", url: "https://aliusta-demo.com/" }] }] },
    ],
    usage: { input_tokens: 5000, output_tokens: 500 },
  }, "p1", OPENAI_DEFAULT);
  assert.equal(r.billing, "paid");
  assert.ok(Math.abs(r.costUsd - (0.001 + 0.000625 + 0.01)) < 1e-9);
  assert.deepEqual(r.citedUrls, ["https://aliusta-demo.com/"]);
});

test("Perplexity: doğrulanmamış adaptör sahte cevap vermez, hata verir", async () => {
  await assert.rejects(new PerplexityProvider().ask(), /doğrulanmadı/);
});

// ---------------- Ücretli API kilidi ----------------
test("Kayıt defteri: ALLOW_PAID_API kapalıyken yalnızca ücretsiz Gemini açılır", () => {
  const { providers, status } = buildProviders({ GEMINI_API_KEY: "g", OPENAI_API_KEY: "o" });
  assert.deepEqual(providers.map((p) => [p.config.provider, p.config.billing]), [["gemini", "free"]]);
  assert.match(status.find((s) => s.provider === "openai")!.reason, /ALLOW_PAID_API kapalı/);
  const paidGemini = buildProviders({ GEMINI_API_KEY: "g", GEMINI_TIER: "paid" });
  assert.equal(paidGemini.providers.length, 0);
  assert.equal(buildProviders({}).providers.length, 0);
});

test("İkinci savunma: ücretli sağlayıcı kayıt defteri atlansa da çağrılamaz", async () => {
  const paid = new MockProvider({}, { ...MOCK_CONFIG, provider: "openai" });
  assert.throws(() => assertBillingAllowed(paid, {}), PaidApiBlocked);
  const out = await runPrompts({ workspaceId: "w", provider: paid, prompts: [{ id: "p", text: "x" }], repetitions: 1,
    guard: new BudgetGuard(1), cache: cache(), gate: gateWith(), env: {}, day: DAY });
  assert.equal(out.stop, "paid_api_blocked");
  assert.equal(paid.calls, 0);
});

// ---------------- Akış, bütçe, kota ----------------
test("Görev bütçesi: tavan aşılacaksa çağrı yapılmaz", async () => {
  const g = new BudgetGuard(0.05);
  assert.throws(() => g.reserve(0.06), BudgetExceeded);
  const provider = new MockProvider();
  const prompts = Array.from({ length: 10 }, (_, i) => ({ id: `p${i}`, text: `soru ${i}` }));
  const out = await runPrompts({ workspaceId: "w", provider, prompts, repetitions: 1, guard: g, cache: cache(), gate: gateWith(), env: MOCK_ENV, day: DAY });
  assert.equal(out.stop, "run_budget");
  assert.ok(g.spentUsd <= 0.05);
  assert.equal(provider.calls + out.skipped, 10);
});

test("Önbellek: aynı gün aynı soru tekrar ücretlenmez", async () => {
  const provider = new MockProvider();
  const c = cache(), gate = gateWith();
  const prompts = [{ id: "p1", text: "Antalya en iyi döner" }];
  await runPrompts({ workspaceId: "w", provider, prompts, repetitions: 2, guard: new BudgetGuard(1), cache: c, gate, env: MOCK_ENV, day: DAY });
  const second = await runPrompts({ workspaceId: "w", provider, prompts, repetitions: 2, guard: new BudgetGuard(1), cache: c, gate, env: MOCK_ENV, day: DAY });
  assert.equal(provider.calls, 2);
  assert.equal(second.cacheHits, 2);
});

test("Müşteri kotası: aylık çağrı kotası dolunca durur ve workspace duraklatılır", async () => {
  const gate = gateWith(3, 100);
  const provider = new MockProvider();
  const prompts = Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, text: `s${i}` }));
  const out = await runPrompts({ workspaceId: "w1", provider, prompts, repetitions: 1, guard: new BudgetGuard(10), cache: cache(), gate, env: MOCK_ENV, day: DAY });
  assert.equal(out.stop, "monthly_call_quota");
  assert.equal(provider.calls, 3);
  assert.equal(gate.snapshot("w1").paused, "monthly_call_quota");
  // Başka müşteri etkilenmez
  const other = await runPrompts({ workspaceId: "w2", provider, prompts: prompts.slice(0, 1), repetitions: 1, guard: new BudgetGuard(10), cache: cache(), gate, env: MOCK_ENV, day: DAY });
  assert.equal(other.stop, "completed");
});

test("Maliyet tavanı: aylık ücretli tavan aşılacaksa otomatik durur", async () => {
  const gate = gateWith(1000, 0.05); // mock en kötü durum ~0.016 $/çağrı
  const provider = new MockProvider();
  const prompts = Array.from({ length: 10 }, (_, i) => ({ id: `p${i}`, text: `s${i}` }));
  const out = await runPrompts({ workspaceId: "w", provider, prompts, repetitions: 1, guard: new BudgetGuard(10), cache: cache(), gate, env: MOCK_ENV, day: DAY });
  assert.equal(out.stop, "monthly_cost_cap");
  assert.ok(gate.snapshot("w").paidUsd <= 0.05);
});

test("Ücretsiz katman: günlük sağlayıcı sınırı dolunca durur; ücretsiz çağrılar ücretli maliyete yazılmaz", async () => {
  const freeCfg = { ...MOCK_CONFIG, billing: "free" as const, freeDailyCallLimit: 2 };
  const provider = new MockProvider({}, freeCfg);
  const gate = gateWith(1000, 0);
  const prompts = Array.from({ length: 4 }, (_, i) => ({ id: `p${i}`, text: `s${i}` }));
  const out = await runPrompts({ workspaceId: "w", provider, prompts, repetitions: 1, guard: new BudgetGuard(0.01), cache: cache(), gate, env: {}, day: DAY });
  assert.equal(out.stop, "provider_free_daily_limit");
  assert.equal(provider.calls, 2);
  const snap = gate.snapshot("w");
  assert.deepEqual([snap.freeCalls, snap.paidUsd, snap.paused], [2, 0, null]);
});

test("Ücretsiz katmanda arama + 429 → desteklenmeyen özellik; tekrar denemeden durur", async () => {
  let calls = 0;
  const provider = new GeminiProvider("k", GEMINI_FREE_DEFAULT, async () => { calls++; return new Response('{"error":{"code":429,"status":"RESOURCE_EXHAUSTED"}}', { status: 429 }); });
  const out = await runPrompts({ workspaceId: "w", provider, prompts: [{ id: "p", text: "x" }, { id: "q", text: "y" }], repetitions: 1,
    guard: new BudgetGuard(1), cache: cache(), gate: gateWith(), env: {}, day: DAY, sleep: async () => {} });
  assert.equal(out.stop, "unsupported_feature");
  assert.equal(out.errorClass, "unsupported_feature");
  assert.equal(calls, 1);
});

test("Ücretsiz katmanda aramasız 429 → kota aşımı; ücretliye geçmeden durur", async () => {
  let calls = 0;
  const provider = new GeminiProvider("k", { ...GEMINI_FREE_DEFAULT, useSearch: false }, async () => { calls++; return new Response("quota", { status: 429 }); });
  const out = await runPrompts({ workspaceId: "w", provider, prompts: [{ id: "p", text: "x" }, { id: "q", text: "y" }], repetitions: 1,
    guard: new BudgetGuard(1), cache: cache(), gate: gateWith(), env: {}, day: DAY, sleep: async () => {} });
  assert.equal(out.stop, "quota_exceeded");
  assert.equal(calls, 1);
});

test("Hata sınıflandırması: 5 sınıf + geçersiz istek", () => {
  const free = { searchRequested: false, freeTier: true };
  assert.equal(classifyHttpError(400, '{"error":{"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT"}}', free), "auth_error");
  assert.equal(classifyHttpError(403, '{"error":{"status":"PERMISSION_DENIED"}}', free), "auth_error");
  assert.equal(classifyHttpError(404, '{"error":{"message":"This model models/gemini-2.5-flash-lite is no longer available to new users."}}', free), "model_not_found");
  assert.equal(classifyHttpError(429, "Quota exceeded for metric: x, limit: 0, model: y", free), "unsupported_feature");
  assert.equal(classifyHttpError(429, "Quota exceeded, limit: 500", free), "quota_exceeded");
  assert.equal(classifyHttpError(400, "Search Grounding is not supported for this model", free), "unsupported_feature");
  assert.equal(classifyHttpError(503, "overloaded", free), "transient");
  assert.equal(classifyHttpError(400, "bad json", free), "invalid_request");
});

test("Ağ hatası (fetch patlar) → geçici; sınırlı tekrar", async () => {
  let calls = 0;
  const provider = new GeminiProvider("k", GEMINI_FREE_DEFAULT, async () => { calls++; throw new TypeError("fetch failed"); });
  const out = await runPrompts({ workspaceId: "w", provider, prompts: [{ id: "p", text: "x" }], repetitions: 1,
    guard: new BudgetGuard(1), cache: cache(), gate: gateWith(), env: {}, day: DAY, sleep: async () => {} });
  assert.equal(calls, 3);
  assert.equal(out.errors[0].kind, "transient");
});

test("Arka arkaya 3 başarısız soru → akış durur (kontrolsüz deneme yok)", async () => {
  let calls = 0;
  const provider = new GeminiProvider("k", GEMINI_FREE_DEFAULT, async () => { calls++; return new Response("bad", { status: 400 }); });
  const prompts = Array.from({ length: 10 }, (_, i) => ({ id: `p${i}`, text: `s${i}` }));
  const out = await runPrompts({ workspaceId: "w", provider, prompts, repetitions: 1,
    guard: new BudgetGuard(1), cache: cache(), gate: gateWith(), env: {}, day: DAY, sleep: async () => {} });
  assert.equal(out.stop, "too_many_failures");
  assert.equal(calls, 3);
});

test("Geçici hata (5xx): sınırlı tekrar dener, sonsuz döngü yok", async () => {
  let calls = 0;
  const provider = new GeminiProvider("k", GEMINI_FREE_DEFAULT, async () => { calls++; return new Response("x", { status: 503 }); });
  const out = await runPrompts({ workspaceId: "w", provider, prompts: [{ id: "p", text: "x" }], repetitions: 1,
    guard: new BudgetGuard(1), cache: cache(), gate: gateWith(), env: {}, day: DAY, maxRetries: 99, sleep: async () => {} });
  assert.equal(calls, 3); // 1 + en fazla 2 tekrar
  assert.equal(out.errors.length, 1);
});

// ---------------- Rapor dürüstlüğü ----------------
test("Rapor: simüle sonuç açıkça etiketlenir, gerçek ile karıştırılamaz, boş rapor üretilmez", async () => {
  const sim = await new MockProvider().ask("p");
  const h = buildReportHeader([sim], []);
  assert.equal(h.origin, "simulated");
  assert.match(h.label, /SİMÜLASYON/);
  const live = { ...sim, dataOrigin: "live_api" as const };
  assert.throws(() => buildReportHeader([sim, live], []), MixedOriginError);
  assert.throws(() => buildReportHeader([], []), /Sonuç yok/);
  assert.ok(buildReportHeader([live], []).warnings.some((w) => /API/.test(w)));
});

// ---------------- Fiyatlandırma ----------------
test("Fiyat: yeni Starter tipik senaryoda kârlı, eski Starter kötü durumda zarar ediyor", () => {
  const [oldStarter, newStarter] = PLANS;
  assert.ok(planCost(newStarter, SCENARIOS[0]).grossMarginPct > 60);
  assert.ok(planCost(oldStarter, SCENARIOS[1]).grossMarginPct < 0);
  assert.equal(Math.round(planCost(newStarter, SCENARIOS[0]).engineCallsPerMonth), 650);
  assert.equal(freeTierCapacity(newStarter), 62);
});
