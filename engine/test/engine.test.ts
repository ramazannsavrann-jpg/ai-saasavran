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
    assert.ok(cap + plan.priceUsd * SCENARIOS[1].paymentFeeRate < plan.priceUsd, name);
    assert.ok(planCost(plan, SCENARIOS[1]).perEngineUsd.openai <= cap, `${name}: kötü durum ChatGPT harcaması tavanı aşıyor`);
  }
});
