import { test } from "node:test";
import assert from "node:assert/strict";
import { discoverySeeds, parseDiscovery, cleanQuestions, guessIntent, serpGoogle } from "../src/discovery.ts";

test("Tohumlar: Türkçe/İngilizce, şehirli/şehirsiz, en fazla 3", () => {
  assert.deepEqual(discoverySeeds({ sector: "diş kliniği", city: "Antalya", lang: "tr" }), ["en iyi diş kliniği", "Antalya diş kliniği", "diş kliniği nasıl seçilir"]);
  assert.deepEqual(discoverySeeds({ sector: "running shoes", lang: "en" }), ["best running shoes", "running shoes recommendations", "how to choose running shoes"]);
});

test("Ayrıştırma ve temizleme: önce gerçek sorular, tekrar ve mevcut sorular atılır", () => {
  const j = { related_questions: [{ question: "Antalya'da en iyi diş kliniği hangisi?" }, { question: "İmplant fiyatları ne kadar?" }],
    related_searches: [{ query: "antalya diş kliniği yorumlar" }, { query: "implant" }, { query: "İmplant fiyatları ne kadar" }] };
  const f = parseDiscovery(j, "seed");
  assert.equal(f.length, 5);
  const c = cleanQuestions(f, ["Antalya'da en iyi diş kliniği hangisi"]);
  assert.deepEqual(c.map((x) => [x.text, x.source]), [["İmplant fiyatları ne kadar?", "paa"], ["antalya diş kliniği yorumlar", "related"]]);
  assert.deepEqual(parseDiscovery({}, "s"), []);
});

test("Amaç tahmini", () => {
  assert.equal(guessIntent("İmplant fiyatları ne kadar?"), "purchase");
  assert.equal(guessIntent("En iyi diş kliniği hangisi?"), "comparison");
  assert.equal(guessIntent("Antalya diş kliniği", "Antalya"), "local");
  assert.equal(guessIntent("İmplant ağrılı mı?"), "informational");
});

test("SerpApi çağrısı: dil/ülke parametreleri; sonuç yok hata değil; kota hatası", async () => {
  let url = "";
  const ok = await serpGoogle("en iyi kafe", { apiKey: "k", lang: "tr", fetchFn: (async (u: string) => { url = u; return new Response(JSON.stringify({ error: "Google hasn't returned any results for this query." })); }) as never });
  assert.ok(url.includes("hl=tr") && url.includes("gl=tr") && url.includes("engine=google"));
  assert.deepEqual(parseDiscovery(ok, "s"), []);
  await assert.rejects(serpGoogle("x", { apiKey: "k", lang: "en", fetchFn: (async () => new Response("", { status: 429 })) as never }), /hakkı doldu/);
});

test("İşçi: kota düşükse keşif bekler; yeterliyse 3 arama yapılır, temiz sorular kaydedilir", async () => {
  const { processPromptDiscovery } = await import("../src/worker.ts");
  const mk = (left: number) => {
    const st = { upserts: [] as unknown[], updates: [] as unknown[] };
    const q = (table: string) => {
      const b: Record<string, unknown> = {};
      for (const k of ["select", "eq"]) b[k] = () => b;
      b.then = (res: (v: unknown) => void) => res({ data: table === "prompts" ? [{ text: "en iyi kafe hangisi" }] : [], error: null });
      b.upsert = async (rows: unknown) => { st.upserts.push(rows); return { data: null, error: null }; };
      b.update = (row: unknown) => { st.updates.push(row); return { eq: async () => ({ data: null, error: null }) }; };
      return b;
    };
    const db = { from: q, rpc: async () => ({ data: [{ run_id: "R", brand_id: "B", workspace_id: "W", brand_name: "Kafe", sector: "kafe", city: null, country: null, lang: "tr" }], error: null }) };
    let calls = 0;
    const fetchFn = async (u: string) => {
      if (u.includes("account.json")) return new Response(JSON.stringify({ total_searches_left: left }));
      calls++;
      return new Response(JSON.stringify({ related_questions: [{ question: "En iyi kafe hangisi?" }, { question: `Kafede ne içilir ${calls}?` }], related_searches: [{ query: "kafe önerisi istanbul" }] }));
    };
    return { st, db, fetchFn, calls: () => calls };
  };
  const low = mk(52);
  assert.deepEqual(await processPromptDiscovery({ db: low.db, env: { SERPAPI_KEY: "k" }, fetchFn: low.fetchFn } as never), [{ runId: "R", status: "serpapi_quota_low" }]);
  assert.equal(low.calls(), 0);
  const ok = mk(200);
  const out = await processPromptDiscovery({ db: ok.db, env: { SERPAPI_KEY: "k" }, fetchFn: ok.fetchFn } as never) as { found: number }[];
  assert.equal(ok.calls(), 3);
  assert.equal(out[0].found, 4, "mevcut soru ve tekrarlar atıldı: 3 farklı soru + 1 ilgili arama");
  assert.equal((ok.st.updates[0] as { searches: number }).searches, 3);
});
