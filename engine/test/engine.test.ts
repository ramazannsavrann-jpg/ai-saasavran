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
import { PLANS, SCENARIOS, planCost, freeTierCapacity, PAID_CAPS } from "../src/pricing.ts";

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
  assert.ok(Math.abs(r.costUsd - (0.0005 + 0.00025 + 0.01)) < 1e-9);
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

// ---------------- Site kontrolü ----------------
import { robotsBlocks, auditSite, analyzeHtml } from "../src/audit.ts";
import { buildRecommendations } from "../src/recommendations.ts";

test("robots.txt: bot özel grubu genel kuralı geçersiz kılar; Allow / Disallow uzunluk önceliği", () => {
  const r = "User-agent: *\nDisallow: /admin\n\nUser-agent: GPTBot\nDisallow: /\n\nUser-agent: PerplexityBot\nUser-agent: ClaudeBot\nDisallow: /\nAllow: /\n";
  assert.equal(robotsBlocks(r, "GPTBot"), true);
  assert.equal(robotsBlocks(r, "Google-Extended"), false); // genel grup sadece /admin
  assert.equal(robotsBlocks(r, "PerplexityBot"), false);   // Allow / eşit uzunlukta kazanır
  assert.equal(robotsBlocks("User-agent: *\nDisallow: /\n", "CCBot"), true);
  assert.equal(robotsBlocks("User-agent: *\nDisallow:\n", "CCBot"), false);
});

test("HTML analizi: başlık, açıklama, JSON-LD türleri, marka adı", () => {
  const h = analyzeHtml(`<html lang="tr"><head><title>Ali Usta Döner – Antalya</title><meta name="description" content="Antalya'da 1998'den beri odun ateşinde döner yapan aile işletmesi, paket servis ve masa.">
    <meta name="viewport" content="width=device-width"><script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Restaurant","name":"Ali Usta"},{"@type":"FAQPage"}]}</script></head><body><h1>Ali Usta</h1></body></html>`, ["Ali Usta Döner"]);
  assert.equal(h.nameInTitle, true);
  assert.ok(h.types.has("Restaurant") && h.types.has("FAQPage"));
  assert.equal(h.lang, "tr");
  assert.ok(h.metaDesc.length > 50);
});

test("Site kontrolü: engelli bot, eksik schema → başarısız kontroller; ulaşılamayan site", async () => {
  const pages: Record<string, [number, string]> = {
    "https://ornek.test/": [200, `<html><head><title>X</title></head><body>${"metin ".repeat(200)}</body></html>`],
    "https://ornek.test/robots.txt": [200, "User-agent: GPTBot\nDisallow: /\n"],
    "https://ornek.test/sitemap.xml": [404, ""],
    "https://ornek.test/llms.txt": [404, ""],
  };
  const fake = async (url: string) => { const [st, body] = pages[url] ?? [404, ""]; const r = new Response(body, { status: st }); Object.defineProperty(r, "url", { value: url }); return r; };
  const res = await auditSite("ornek.test", ["Ali Usta"], fake as any);
  const c = Object.fromEntries(res.checks.map((x) => [x.id, x]));
  assert.equal(res.status, "ok");
  assert.equal(c.ai_bots.ok, false);
  assert.match(c.ai_bots.detail, /GPTBot/);
  assert.equal(c.schema_org.ok, false);
  assert.equal(c.https.ok, true);
  assert.equal(c.sitemap.ok, false);
  const down = await auditSite("ornek.test", [], (async () => { throw new TypeError("fetch failed"); }) as any);
  assert.equal(down.status, "unreachable");
});

test("Öneriler: site hataları ve görünmediği sorular önceliğe göre sıralanır", () => {
  const recs = buildRecommendations({
    brandName: "Ali Usta", website: "ornek.test", city: "Antalya", sector: "Restoran / döner-kebap", aliases: [],
    activePrompts: 3, completedRuns: 1, autoWeekly: true, measurementType: "model_knowledge",
    prompts: [
      { prompt_text: "Antalya'da en iyi döner?", answers: 1, target_mentioned: 0, target_recommended: 0, top_competitor: "Kebapçı Halil" },
      { prompt_text: "Aile restoranı?", answers: 1, target_mentioned: 1, target_recommended: 0, top_competitor: null },
      { prompt_text: "Gece açık?", answers: 1, target_mentioned: 1, target_recommended: 1, top_competitor: null },
    ],
    audit: { status: "ok", checks: [{ id: "ai_bots", ok: false, severity: "high", title: "", detail: "GPTBot engelli" }, { id: "faq", ok: false, severity: "low", title: "", detail: "yok" }, { id: "llms_txt", ok: false, severity: "info", title: "", detail: "yok" }] },
  });
  const ids = recs.map((r) => r.id);
  assert.equal(recs[0].priority, "yüksek");
  assert.ok(ids.includes("audit_ai_bots") && ids.includes("absent_prompts") && ids.includes("mentioned_not_recommended") && ids.includes("more_prompts"));
  assert.ok(!ids.includes("audit_llms_txt"), "bilgi düzeyindeki kontrol öneri olmamalı");
  assert.match(recs.find((r) => r.id === "absent_prompts")!.why, /Kebapçı Halil/);
  assert.ok(ids.indexOf("audit_faq") > ids.indexOf("audit_ai_bots"));
});

test("Canlı aramada sağlayıcı seçimi: ücretli kilit açıksa OpenAI, kapalıysa hiçbiri; aramasızda Gemini", async () => {
  const { chooseProvider } = await import("../src/worker.ts");
  const base = { GEMINI_API_KEY: "g", GEMINI_TIER: "free", OPENAI_API_KEY: "sk-x" };
  assert.equal(chooseProvider("live_search", { ...base, ALLOW_PAID_API: "true" }, ["A"], "s")?.config.provider, "openai");
  assert.equal(chooseProvider("live_search", { ...base, ALLOW_PAID_API: "false" }, ["A"], "s"), null);
  const mk = chooseProvider("model_knowledge", { ...base, ALLOW_PAID_API: "true" }, ["A"], "s");
  assert.equal(mk?.config.provider, "gemini");
  assert.equal(mk?.config.useSearch, false);
  assert.equal(mk?.config.billing, "free");
});

test("OpenAI en kötü durum maliyeti arama sınırını hesaba katar", () => {
  const worst = OPENAI_DEFAULT.price.perCall * (OPENAI_DEFAULT.worstCaseToolCalls ?? 1)
    + OPENAI_DEFAULT.worstCaseTokens.input / 1e6 * OPENAI_DEFAULT.price.inputPerMTok
    + OPENAI_DEFAULT.worstCaseTokens.output / 1e6 * OPENAI_DEFAULT.price.outputPerMTok;
  assert.ok(worst > 0.02 && worst < 0.03, String(worst));
  assert.equal(OPENAI_DEFAULT.model, "gpt-6-luna");
});

test("rules_v2: kalın başlıklı öneriler ve 'tek bir isim' gibi ifadeler öneri sayılır; ürün adı takma adla markaya bağlanır", () => {
  const brands = [
    { id: "is", name: "İş Bankası", aliases: ["İşCep"] },
    { id: "g", name: "Garanti BBVA", aliases: ["Garanti BBVA Mobil"] },
    { id: "a", name: "Akbank", aliases: [] },
    { id: "z", name: "Ziraat Bankası", aliases: [] },
  ];
  const text = "**Tek bir isim söylemem gerekirse: İşCep.** Genel kullanımda kapsamlı ve güçlü bir seçenek.\n\n**Garanti BBVA Mobil** — kullanımı kolay, kampanyaları zengin.\n\n**Akbank** — hızlı para transferi.\n\nZiraat Bankası'nın şube ağı geniştir ama uygulaması yavaş, önerilmez.";
  const h = Object.fromEntries(analyzeResponse({ promptId: "p", provider: "openai", answerText: text, citedUrls: [] }, brands).map((x) => [x.brandId, x]));
  assert.equal(h.is.recommended, true, "İşCep → İş Bankası önerildi");
  assert.equal(h.g.recommended, true, "kalın başlık öneri sayılır");
  assert.equal(h.a.recommended, true);
  assert.equal(h.z.mentioned, true);
  assert.equal(h.z.recommended, false, "olumsuz bağlam öneri değildir");
  assert.equal(h.is.rank, 1);
  assert.equal(h.g.rank, 2);
});

test("rules_v2: düz paragrafta yalnızca anılan marka öneri sayılmaz", () => {
  const h = analyzeResponse({ promptId: "p", provider: "openai", answerText: "Garanti BBVA 1946'da kurulmuş bir bankadır. Merkezi İstanbul'dadır.", citedUrls: [] }, [{ id: "g", name: "Garanti BBVA", aliases: [] }]);
  assert.equal(h[0].mentioned, true);
  assert.equal(h[0].recommended, false);
});

test("Marka adının ilk kelimesi tek başına geçince yakalanır (Garanti Bonus); yaygın kelime ve küçük harf yakalanmaz", () => {
  const brands = [{ id: "g", name: "Garanti BBVA", aliases: [] }, { id: "u", name: "Usta Eller Oto", aliases: [] }];
  const r = (t: string) => Object.fromEntries(analyzeResponse({ promptId: "p", provider: "x", answerText: t, citedUrls: [] }, brands).map((h) => [h.brandId, h]));
  assert.equal(r("Kampanyalar için Garanti Bonus, Yapı Kredi World gibi kartları karşılaştırın.").g.mentioned, true);
  assert.equal(r("Garanti'nin mobil uygulaması hızlıdır.").g.mentioned, true);
  assert.equal(r("Ürünün iki yıl garanti süresi var.").g.mentioned, false, "küçük harfli sıradan kelime marka değil");
  assert.equal(r("Usta bir tamirci bulun.").u.mentioned, false, "yaygın ilk kelime tek başına sayılmaz");
});

test("rules_v2: 'Tek bir kart önereceksem ... X derim' öneri sayılır", () => {
  const h = analyzeResponse({ promptId: "p", provider: "x", answerText: "Tek bir kart önereceksem, yıllık aidat ödemek istemiyorsan Enpara Kredi Kartı derim.", citedUrls: [] }, [{ id: "e", name: "Enpara.com", aliases: ["Enpara"] }]);
  assert.equal(h[0].recommended, true);
});

test("Ortak kart programı başka bankanın adıyla geçince (TEB Bonus, VakıfBank Worldcard) yanlış markaya sayılmaz", async () => {
  const { GROWTH_TEST } = await import("../src/labs.ts");
  const g = { id: "g", name: GROWTH_TEST.brand.name, aliases: GROWTH_TEST.brand.aliases };
  const yk = GROWTH_TEST.competitors.find((c: any) => c.name === "Yapı Kredi") as any;
  const brands = [g, { id: "y", name: yk.name, aliases: yk.aliases }];
  const r = (t: string) => Object.fromEntries(analyzeResponse({ promptId: "p", provider: "x", answerText: t, citedUrls: [] }, brands).map((h) => [h.brandId, h.mentioned]));
  assert.deepEqual(r("TEB Bonus kart ve VakıfBank Worldcard kampanyalarına bakın."), { g: false, y: false });
  assert.deepEqual(r("Garanti Bonus ve Yapı Kredi World kampanyalarına bakın."), { g: true, y: true });
});

test("Takip edilmeyen adlar: TEB, QNB, VakıfBank bulunur; bilinen markalar ve sıradan kelimeler çıkmaz", async () => {
  const { untrackedNames } = await import("../src/metrics.ts");
  const texts = [
    "1. **Enpara Kredi Kartı** — aidatsız.\n2. **QNB** kart kampanyaları güçlü.\nAyrıca TEB Bonus ve VakıfBank Worldcard kampanyalarına bakın.",
    "Garanti Bonus, Akbank Axess ve QNB iyi seçenekler. Türkiye'de VakıfBank da yaygın. Kredi kartı seçerken dikkat edin. ([enpara.com](https://enpara.com/x))",
  ];
  const brands = [{ name: "Garanti BBVA", aliases: [] }, { name: "Akbank", aliases: [] }, { name: "Enpara.com", aliases: ["Enpara"] }];
  const names = untrackedNames(texts, brands).map((x) => x.name);
  assert.ok(names.includes("QNB"), names.join("|"));
  assert.ok(names.includes("VakıfBank"), names.join("|"));
  assert.ok(names.some((n) => n.startsWith("TEB")), names.join("|"));
  for (const bad of ["Garanti", "Garanti Bonus", "Akbank", "Akbank Axess", "Enpara", "Türkiye", "Kredi", "Ayrıca"]) assert.ok(!names.includes(bad), `${bad} çıkmamalı: ${names.join("|")}`);
});

test("Güncel paketler (Plus/Pro/Business): tipik %55+ kâr; tavan + komisyon fiyatın altında; kötü durum API'si tavana sığar", () => {
  for (const name of ["Plus", "Pro", "Business"]) {
    const plan = PLANS.findLast((p) => p.name.startsWith(name + " ("))!;
    const cap = PAID_CAPS[name];
    assert.ok(planCost(plan, SCENARIOS[0]).grossMarginPct > 55, name);
    assert.ok(cap + plan.priceUsd * SCENARIOS[1].paymentFeeRate + SCENARIOS[1].paymentFeeFixedUsd < plan.priceUsd, name);
    assert.ok(planCost(plan, SCENARIOS[1]).perEngineUsd.openai <= cap, `${name}: kötü durum ChatGPT harcaması tavanı aşıyor`);
  }
});

test("Haftalık özet içeriği: oranlar, geçen haftayla fark, rakip ve abonelikten çıkma bağlantısı (EN/TR)", async () => {
  const { buildDigest, isDigestTime } = await import("../src/email.ts");
  const row = { user_id: "u", lang: "en" as const, token: "t", brand_id: "b1", brand_name: "Acme <Dental>", workspace_name: "W",
    cur_n: 10, cur_mention: 6, cur_recommend: 3, prev_n: 10, prev_mention: 6, prev_recommend: 1, top_competitor: "Bright", top_competitor_rec: 7 };
  const en = buildDigest([row], "tok-1");
  assert.match(en.text, /Recommended: 30% \(last week 10%; \+20 pts\)/);
  assert.match(en.text, /Mentioned: 60% \(about the same as last week\)/);
  assert.match(en.text, /Most recommended competitor: Bright \(7 of 10 answers\)/);
  assert.match(en.html, /Acme &lt;Dental&gt;/);
  assert.match(en.html, /\/api\/unsubscribe\?t=tok-1/);
  const tr = buildDigest([{ ...row, lang: "tr", prev_n: 0 }], "x");
  assert.match(tr.text, /Önerilme: 30%\n/);
  assert.equal(isDigestTime(new Date("2026-11-09T06:30:00Z")), true);   // Pazartesi 09:30 İstanbul
  assert.equal(isDigestTime(new Date("2026-11-09T05:30:00Z")), false);  // 08:30
  assert.equal(isDigestTime(new Date("2026-11-10T07:00:00Z")), false);  // Salı
});

test("rules_v3: marka adı başka kelimenin başıysa eşleşmez; Türkçe ek ve alan adı eşleşir; olumsuz liste satırı öneri sayılmaz", async () => {
  const { analyzeResponse, hasName, normalize } = await import("../src/metrics.ts");
  const brands = [{ id: "ada", name: "Ada", aliases: [] }, { id: "nova", name: "Nova", aliases: [] }, { id: "gar", name: "Garanti", aliases: [] }];
  const run = (t: string) => Object.fromEntries(analyzeResponse({ promptId: "1", provider: "x", answerText: t, citedUrls: [] }, brands).map((h) => [h.brandId, h]));
  let r = run("En iyi seçenekler:\n1. Adalet Sigorta\n2. Novartis\n3. Garanti'nin kartı");
  assert.equal(r.ada.mentioned, false); assert.equal(r.nova.mentioned, false);
  assert.equal(r.gar.mentioned, true); assert.equal(r.gar.rank, 3);
  r = run("- Nova: kullanıcılar memnun değil, tavsiye etmem\n- Garantinin uygulaması iyi");
  assert.equal(r.nova.mentioned, true); assert.equal(r.nova.recommended, false);
  assert.equal(r.gar.recommended, true);
  assert.ok(hasName(normalize("Kaynak: garanti.com.tr sitesi"), "garanti"));
  assert.ok(hasName(normalize("Ada."), "ada"));
  assert.ok(!hasName(normalize("Adalar ilçesi"), "ada"));
});

test("Kaynak egemenliği ve kayıp nedeni kartı: kaynak sahibi, desteklenen marka ve kanıtlar", async () => {
  const { sourceDominance, lossCards } = await import("../src/insights.ts");
  const brands = [
    { id: "t", name: "Biz", website: "https://biz.com", isTarget: true },
    { id: "c1", name: "Rakip A", website: "rakipa.com", isTarget: false },
    { id: "c2", name: "Rakip B", website: null, isTarget: false },
  ];
  const answers = [
    { id: "r1", prompt_id: "p1", cited_urls: ["https://www.rakipa.com/guide", "https://inceleme.org/x", "https://inceleme.org/y"] },
    { id: "r2", prompt_id: "p1", cited_urls: ["https://help.rakipa.com/a"] },
    { id: "r3", prompt_id: "p2", cited_urls: ["https://biz.com/", "https://inceleme.org/z"] },
    { id: "r4", prompt_id: "p3", cited_urls: [] },
  ];
  const m = (response_id: string, brand_id: string, recommended: boolean, mentioned = recommended) => ({ response_id, brand_id, recommended, mentioned });
  const mentions = [
    m("r1", "t", false), m("r1", "c1", true), m("r1", "c2", true),
    m("r2", "t", false, true), m("r2", "c1", true),
    m("r3", "t", true), m("r3", "c1", false),
    m("r4", "t", false), m("r4", "c2", true),
  ];
  const dom = sourceDominance(answers, mentions, brands);
  const rakip = dom.find((d) => d.domain === "rakipa.com")!;
  assert.deepEqual([rakip.answers, rakip.owner, rakip.ownerName, rakip.targetRecommended], [1, "competitor", "Rakip A", 0]);
  assert.equal(dom.find((d) => d.domain === "help.rakipa.com")!.owner, "competitor");
  const inc = dom.find((d) => d.domain === "inceleme.org")!;
  assert.equal(inc.answers, 2, "aynı cevapta iki kez geçen alan adı bir sayılır");
  assert.equal(inc.owner, "third_party");
  assert.deepEqual(inc.supports.map((s) => `${s.name}:${s.count}`).sort(), ["Biz:1", "Rakip A:1", "Rakip B:1"]);
  assert.equal(dom.find((d) => d.domain === "biz.com")!.owner, "target");

  const cards = lossCards(answers, mentions, brands);
  assert.deepEqual(cards.map((c) => c.promptId).sort(), ["p1", "p3"], "önerildiğimiz soru (p2) kart üretmez");
  const p1 = cards.find((c) => c.promptId === "p1")!;
  assert.deepEqual(p1.winners, [{ name: "Rakip A", count: 2 }, { name: "Rakip B", count: 1 }]);
  assert.deepEqual(p1.evidence, ["competitor_own_site_cited", "target_site_not_cited", "third_party_sources", "mentioned_not_recommended"]);
  assert.deepEqual(cards.find((c) => c.promptId === "p3")!.evidence, ["no_sources", "absent"], "kaynak yoksa neden üretilmez");
});

test("Koşul haritası ve aksiyon etkisi: niyete göre toplama, küçük örneklem işareti, aralıklar ayrışmadıkça 'belirsiz'", async () => {
  const { conditionMap, actionImpact } = await import("../src/insights.ts");
  const run = [
    { intent: "purchase", answers: 2, target_mentioned: 2, target_recommended: 2, top_competitor: "A", top_competitor_recs: 1 },
    { intent: "purchase", answers: 2, target_mentioned: 1, target_recommended: 1, top_competitor: "B", top_competitor_recs: 2 },
    { intent: "local", answers: 2, target_mentioned: 0, target_recommended: 0, top_competitor: "A", top_competitor_recs: 2 },
  ];
  const map = conditionMap([run, run]);
  assert.deepEqual(map.map((m) => [m.key, m.answers, m.recommended, m.topCompetitor, m.lowSample]), [["purchase", 8, 6, "B", true], ["local", 4, 0, "A", true]]);
  const pts = [{ at: "2026-11-01T10:00:00Z", k: 2, n: 50 }, { at: "2026-11-08T10:00:00Z", k: 4, n: 50 }, { at: "2026-11-15T10:00:00Z", k: 30, n: 50 }];
  assert.equal(actionImpact(pts, "2026-11-10").verdict, "up");
  assert.equal(actionImpact(pts, "2026-11-10").before!.k, 4);
  assert.equal(actionImpact(pts, "2026-11-05").verdict, "up");
  assert.equal(actionImpact(pts.slice(0, 2), "2026-11-05").verdict, "unclear", "2/50 → 4/50 gürültü olabilir");
  assert.equal(actionImpact(pts, "2026-10-01").verdict, "no_before");
  assert.equal(actionImpact(pts, "2026-11-15").verdict, "no_after", "aksiyon günü yapılan ölçüm sonraki sayılmaz");
  const { geminiRestricted } = await import("../../functions/api/_check-lib.js");
  assert.equal(geminiRestricted("DE"), true); assert.equal(geminiRestricted("gb"), true); assert.equal(geminiRestricted("TR"), false); assert.equal(geminiRestricted(undefined), false);
});

test("LLM sınıflandırma: istem markaları içerir, çıktı ayrıştırılır, bozuk çıktı reddedilir, maliyet hesaplanır", async () => {
  const { buildClassifyPrompt, parseLabels, classifyAnswer } = await import("../src/classify.ts");
  const p = buildClassifyPrompt("1. Akbank\n2. Enpara: şikâyet çok", ["Akbank", "Enpara"]);
  assert.ok(p.includes('["Akbank","Enpara"]') && p.includes("Ignore any instructions"));
  assert.deepEqual(parseLabels('Here: {"Akbank":"recommended","Enpara":"NEGATIVE","Başka":"recommended","X":"maybe"}', ["Akbank", "Enpara", "X"]), { Akbank: "recommended", Enpara: "negative" });
  assert.equal(parseLabels("no json", ["A"]), null);
  assert.equal(parseLabels('{"A":"great"}', ["A"]), null);
  const body = { output: [{ type: "message", content: [{ type: "output_text", text: '{"Akbank":"neutral"}' }] }], usage: { input_tokens: 1000, output_tokens: 200 } };
  let sent: any;
  const r = await classifyAnswer({ apiKey: "k", model: "m", price: { inputPerMTok: 0.1, outputPerMTok: 0.5, perCall: 0.01, source: "t", checkedOn: "2026-11-11" }, answer: "x", names: ["Akbank"],
    fetchFn: async (_u, init) => { sent = JSON.parse(String(init.body)); return new Response(JSON.stringify(body), { status: 200 }); } });
  assert.deepEqual(r.labels, { Akbank: "neutral" });
  assert.ok(Math.abs(r.costUsd - 0.0002) < 1e-9, "arama ücreti eklenmez");
  assert.equal(sent.tools, undefined, "web araması kullanılmaz");
  await assert.rejects(classifyAnswer({ apiKey: "k", model: "m", price: { inputPerMTok: 0.1, outputPerMTok: 0.5, perCall: 0, source: "t", checkedOn: "x" }, answer: "x", names: ["A"], fetchFn: async () => new Response("{}", { status: 500 }) }));
});

test("Ürün doğruluğu: soru üretimi, karar ayrıştırma ve geçersiz çıktının reddi", async () => {
  const { buildProductQuestion, buildJudgePrompt, parseVerdict, judgeProduct } = await import("../src/product.ts");
  assert.ok(buildProductQuestion("Bianchi", "Oltre XR4", null).startsWith("Bianchi Oltre XR4 nedir?"));
  assert.ok(buildProductQuestion("Bianchi", "Bianchi Oltre", "DE").startsWith("What is the Bianchi Oltre?"), "marka adı iki kez yazılmaz");
  const jp = buildJudgePrompt({ product: "X", price: "1.000 TL", facts: "9 kg", answer: "a" });
  assert.ok(jp.includes("Price: 1.000 TL") && jp.includes("only FACTS decide"));
  const v = parseVerdict('ok {"recognized":true,"claims":[{"claim":"8 kg","status":"WRONG","fact":"9 kg"},{"claim":"","status":"correct"},{"claim":"x","status":"maybe"},{"claim":"alüminyum","status":"unverifiable"}]}')!;
  assert.equal(v.recognized, true);
  assert.deepEqual(v.claims, [{ claim: "8 kg", status: "wrong", fact: "9 kg" }, { claim: "alüminyum", status: "unverifiable", fact: "" }]);
  assert.equal(parseVerdict('{"claims":[]}'), null, "recognized zorunlu");
  assert.equal(parseVerdict("metin"), null);
  const body = { output: [{ type: "message", content: [{ type: "output_text", text: '{"recognized":false,"claims":[]}' }] }], usage: { input_tokens: 2000, output_tokens: 400 } };
  const r = await judgeProduct({ apiKey: "k", model: "m", price: { inputPerMTok: 0.1, outputPerMTok: 0.5, perCall: 0.01, source: "t", checkedOn: "x" }, product: "X", facts: "9 kg karbon", answer: "a", fetchFn: async () => new Response(JSON.stringify(body), { status: 200 }) });
  assert.equal(r.verdict.recognized, false);
  assert.ok(Math.abs(r.costUsd - 0.0004) < 1e-9);
});

// ---------------- Claude (Anthropic) ----------------
import { parseClaudeResponse, ClaudeProvider, CLAUDE_DEFAULT } from "../src/providers/claude.ts";

test("Claude: Messages API cevabı ayrıştırılır; ara cümle atılır, arama başına ücret eklenir", () => {
  const r = parseClaudeResponse({
    content: [
      { type: "text", text: "Arayacağım." },
      { type: "server_tool_use", name: "web_search", input: { query: "antalya döner" } },
      { type: "web_search_tool_result", content: [{ type: "web_search_result", url: "https://aliusta-demo.com/" }] },
      { type: "text", text: "1. Ali Usta Döner", citations: [{ type: "web_search_result_location", url: "https://aliusta-demo.com/" }] },
      { type: "text", text: " 2. Demo Döner" },
    ],
    usage: { input_tokens: 4000, cache_read_input_tokens: 1000, output_tokens: 500, server_tool_use: { web_search_requests: 1 } },
  }, "p1", CLAUDE_DEFAULT);
  assert.equal(r.answerText, "1. Ali Usta Döner 2. Demo Döner");
  assert.equal(r.provider, "claude");
  assert.equal(r.billing, "paid");
  assert.equal(r.inputTokens, 5000);
  assert.ok(Math.abs(r.costUsd - (0.0005 + 0.00025 + 0.01)) < 1e-9);
  assert.deepEqual(r.citedUrls, ["https://aliusta-demo.com/"]);
  assert.deepEqual(r.searchQueries, ["antalya döner"]);
});

test("Claude: istek biçimi doğru, anahtar hata mesajına sızmaz, kredi bitince kota hatası", async () => {
  let seen: { url: string; init: RequestInit } | undefined;
  const ok = new ClaudeProvider("sk-ant-KEY9", CLAUDE_DEFAULT, async (url, init) => {
    seen = { url, init };
    return new Response(JSON.stringify({ content: [{ type: "text", text: "cevap" }], usage: { input_tokens: 10, output_tokens: 5 } }), { status: 200 });
  });
  const r = await ok.ask("p", "soru");
  assert.equal(seen!.url, "https://api.anthropic.com/v1/messages");
  const h = seen!.init.headers as Record<string, string>;
  assert.equal(h["x-api-key"], "sk-ant-KEY9");
  assert.equal(h["anthropic-version"], "2023-06-01");
  const body = JSON.parse(seen!.init.body as string);
  assert.equal(body.model, "claude-haiku-5-5");
  assert.deepEqual(body.tools[0], { type: "web_search_20250305", name: "web_search", max_uses: 2, user_location: { type: "approximate", country: "TR", timezone: "Europe/Istanbul" } });
  assert.equal(r.costUsd, (10 / 1e6) * 0.10 + (5 / 1e6) * 0.50);

  const noSearch = new ClaudeProvider("k", { ...CLAUDE_DEFAULT, useSearch: false }, async (_u, init) => {
    assert.equal(JSON.parse(init.body as string).tools, undefined);
    return new Response(JSON.stringify({ content: [{ type: "text", text: "x" }] }), { status: 200 });
  });
  assert.equal((await noSearch.ask("p", "s")).method, "api_no_search");

  const broke = new ClaudeProvider("sk-ant-KEY9", CLAUDE_DEFAULT, async () =>
    new Response('{"error":{"message":"Your credit balance is too low (sk-ant-KEY9)"}}', { status: 400 }));
  await assert.rejects(broke.ask("p", "x"), (e: Error & { kind?: string }) => e.kind === "quota_exceeded" && !e.message.includes("KEY9"));
  const bad = new ClaudeProvider("k", CLAUDE_DEFAULT, async () => new Response("invalid x-api-key", { status: 401 }));
  await assert.rejects(bad.ask("p", "x"), (e: Error & { kind?: string }) => e.kind === "auth_error");
});

test("Kayıt defteri: Claude yalnız ALLOW_PAID_API açıkken ve anahtar varken açılır", async () => {
  const { chooseProvider } = await import("../src/worker.ts");
  const off = buildProviders({ ANTHROPIC_API_KEY: "sk-ant-x" });
  assert.equal(off.providers.length, 0);
  assert.match(off.status.find((s) => s.provider === "claude")!.reason, /ALLOW_PAID_API kapalı/);
  const on = buildProviders({ ANTHROPIC_API_KEY: "sk-ant-x", ALLOW_PAID_API: "true" });
  assert.deepEqual(on.providers.map((p) => [p.config.provider, p.config.billing, p.config.useSearch]), [["claude", "paid", true]]);
  // Canlı aramada varsayılan hâlâ ChatGPT; Claude yalnız OpenAI yoksa seçilir
  assert.equal(chooseProvider("live_search", { OPENAI_API_KEY: "sk-o", ANTHROPIC_API_KEY: "sk-ant-x", ALLOW_PAID_API: "true" }, ["A"], "s")?.config.provider, "openai");
  assert.equal(chooseProvider("live_search", { ANTHROPIC_API_KEY: "sk-ant-x", ALLOW_PAID_API: "true" }, ["A"], "s")?.config.provider, "claude");
});

test("Claude: en kötü durum çağrı maliyeti 6 sentin altında ve istem 100K token sınırının altında", () => {
  const c = CLAUDE_DEFAULT;
  const worst = c.price.perCall * (c.worstCaseToolCalls ?? 1) + c.worstCaseTokens.input / 1e6 * c.price.inputPerMTok + c.worstCaseTokens.output / 1e6 * c.price.outputPerMTok;
  assert.ok(worst < 0.06, String(worst));
  assert.ok(c.worstCaseTokens.input < 100_000);
});

test("Ürün görünürlüğü: ürün adı mevcut cevaplarda aranır, motor bazında sayılır, önerilmediği sorularda kanıt kartı çıkar", async () => {
  const { productVisibility } = await import("../src/insights.ts");
  const answers = [
    { id: "a1", prompt_id: "p1", provider: "openai", answer_text: "Öneriler:\n1. Bianchi Oltre XR4\n2. Rakip Bisiklet Aero", cited_urls: ["https://inceleme.org/a"] },
    { id: "a2", prompt_id: "p1", provider: "openai", answer_text: "Bu bütçede Oltre XR4 iyi bir seçenek değil, tavsiye etmem.\n\nDaha uygun seçenek:\n- Rakip Bisiklet Aero", cited_urls: ["https://rakip.com/aero"] },
    { id: "a3", prompt_id: "p2", provider: "openai", answer_text: "En iyi seçenek:\n- Rakip Bisiklet Aero", cited_urls: ["https://rakip.com/aero"] },
    { id: "a4", prompt_id: "p2", provider: "claude", answer_text: "Seçenekler:\n- Oltre XR4\n- Rakip Bisiklet", cited_urls: [] },
  ];
  const v = productVisibility(answers, { id: "pr", name: "Bianchi Oltre XR4" }, { name: "Bianchi", website: "bianchi.com" }, [{ id: "c", name: "Rakip Bisiklet", website: "rakip.com" }]);
  const oa = v.engines.find((e) => e.provider === "openai")!;
  assert.deepEqual([oa.answers, oa.mentioned, oa.recommended], [3, 2, 1], "markasız ad da eşleşir; olumsuz anılma öneri sayılmaz");
  const cl = v.engines.find((e) => e.provider === "claude")!;
  assert.deepEqual([cl.answers, cl.mentioned, cl.recommended], [1, 1, 1]);
  assert.deepEqual(v.promptsMentioned.sort(), ["p1", "p2"]);
  assert.equal(v.losses.length, 0, "ürün her iki soruda da en az bir kez önerildiyse kayıp kartı çıkmaz");
  const v2 = productVisibility(answers.slice(1, 3), { id: "pr", name: "Bianchi Oltre XR4" }, { name: "Bianchi", website: "bianchi.com" }, [{ id: "c", name: "Rakip Bisiklet", website: "rakip.com" }]);
  assert.deepEqual(v2.losses.map((l) => l.promptId).sort(), ["p1", "p2"]);
  assert.ok(v2.losses[0].evidence.includes("competitor_own_site_cited"));
});

test("Markalı soru ayrımı: kendi adı geçen soru markalı, rakip adı geçen işaretli; oranlar ayrı hesaplanır", async () => {
  const { promptKind, splitByKind } = await import("../src/insights.ts");
  const b = { name: "Ada Kebap", aliases: ["Ada"] };
  assert.equal(promptKind("Ada Kebap güvenilir mi?", b), "branded");
  assert.equal(promptKind("Ada'nın menüsü nasıl?", b), "branded", "Türkçe ekli ad");
  assert.equal(promptKind("Adalar'da en iyi kebap?", b), "unbranded", "başka kelimenin başı eşleşmez");
  assert.equal(promptKind("Yıldız Döner'e alternatifler neler?", b, [{ name: "Yıldız Döner" }]), "competitor_named");
  assert.equal(promptKind("Antalya'da en iyi kebap hangisi?", b, [{ name: "Yıldız Döner" }]), "unbranded");
  const split = splitByKind([
    { prompt_text: "Ada Kebap güvenilir mi?", answers: 2, target_mentioned: 2, target_recommended: 2 },
    { prompt_text: "Antalya'da en iyi kebap?", answers: 2, target_mentioned: 0, target_recommended: 0 },
    { prompt_text: "Ucuz kebap nerede?", answers: 2, target_mentioned: 1, target_recommended: 1 },
  ], b);
  assert.deepEqual(split.map((x) => [x.kind, x.prompts, x.answers, x.recommended]), [["unbranded", 2, 4, 1], ["branded", 1, 2, 2]]);
});

test("Rakip ürün karşılaştırması: aynı cevaplarda yan yana sayım ve ikili karşılaşma", async () => {
  const { compareProducts } = await import("../src/insights.ts");
  const answers = [
    { id: "a1", prompt_id: "p1", provider: "openai", answer_text: "Öneriler:\n1. Oltre XR4\n2. Aero 5", cited_urls: [] },
    { id: "a2", prompt_id: "p1", provider: "openai", answer_text: "Oltre XR4 pahalı, tavsiye etmem.\n\nDaha iyisi:\n- Rakip Bisiklet Aero 5", cited_urls: [] },
    { id: "a3", prompt_id: "p2", provider: "claude", answer_text: "Seçenekler:\n- Aero 5", cited_urls: [] },
  ];
  const rows = compareProducts(answers, { id: "o", name: "Bianchi Oltre XR4" }, [{ id: "r", name: "Aero 5", rival_brand: "Rakip Bisiklet" }], { name: "Bianchi" });
  const own = rows.find((r) => r.isOwn)!, rival = rows.find((r) => !r.isOwn)!;
  assert.equal(rival.name, "Rakip Bisiklet Aero 5");
  assert.deepEqual([own.byEngine.openai.mentioned, own.byEngine.openai.recommended], [2, 1]);
  assert.deepEqual([rival.byEngine.openai.mentioned, rival.byEngine.openai.recommended], [2, 2]);
  assert.deepEqual([rival.byEngine.claude.mentioned, rival.byEngine.claude.recommended], [1, 1]);
  assert.equal(own.byEngine.claude.mentioned, 0);
  assert.deepEqual(rival.headToHead, { bothMentioned: 2, ownWins: 0, rivalWins: 1 });
});

test("AI alışveriş: ürünün geçtiği cevaplarda satış siteleri ve kendi site sayımı", async () => {
  const { shoppingSources, isMarketplace } = await import("../src/insights.ts");
  assert.ok(isMarketplace("www.trendyol.com".replace(/^www\./, "")) && isMarketplace("smile.amazon.com") && !isMarketplace("rakip.com"));
  const answers = [
    { id: "a1", prompt_id: "p1", provider: "openai", answer_text: "Öneriler:\n- Oltre XR4", cited_urls: ["https://www.trendyol.com/x", "https://bianchi.com/oltre", "https://hepsiburada.com/y"] },
    { id: "a2", prompt_id: "p1", provider: "openai", answer_text: "Başka bir bisiklet: Aero 5", cited_urls: ["https://www.trendyol.com/z"] },
    { id: "a3", prompt_id: "p2", provider: "claude", answer_text: "Bianchi Oltre XR4 iyi bir seçim", cited_urls: ["https://www.trendyol.com/q"] },
  ];
  const r = shoppingSources(answers, "o", "Bianchi Oltre XR4", { name: "Bianchi", website: "https://bianchi.com" });
  assert.equal(r.productAnswers, 2, "ürünün geçmediği cevap sayılmaz");
  assert.equal(r.ownSite, 1);
  assert.deepEqual(r.marketplaces, [{ domain: "trendyol.com", answers: 2 }, { domain: "hepsiburada.com", answers: 1 }]);
});
