import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTruthPrompt, parseTruth, judgeTruth, sourceType, sourceMix, truthSummary } from "../src/truth.ts";

const ANSWER = "Kafe Mavi 2015 yılında kuruldu ve Kadıköy'de hizmet veriyor. Hafta içi 09:00-22:00 açık. Kahve fiyatları 50 TL civarında.";
const brands = [{ id: "T", name: "Kafe Mavi", website: "kafemavi.com", isTarget: true }, { id: "R", name: "Rakip", website: "rakip.com", isTarget: false }];

test("İstem: bilgi kartı ve cevap veri olarak gömülür, alıntı istenir", () => {
  const p = buildTruthPrompt({ brand: "Kafe Mavi", factCard: "Kuruluş: 2009", answer: ANSWER });
  assert.ok(p.includes("FACTS: <<<Kuruluş: 2009>>>") && p.includes('"quote"') && p.includes("only FACTS decide"));
});

test("Okuma: uydurma alıntı, geçersiz durum atılır", () => {
  const out = parseTruth(JSON.stringify({ claims: [
    { claim: "2015'te kuruldu", status: "wrong", fact: "Kuruluş: 2009", quote: "2015 yılında kuruldu" },
    { claim: "Kadıköy'de", status: "correct", fact: "Kadıköy", quote: "KADIKÖY'DE hizmet veriyor" },
    { claim: "Ödül aldı", status: "wrong", fact: "x", quote: "en iyi kafe ödülünü aldı" },
    { claim: "Kahve 50 TL", status: "maybe", fact: "", quote: "50 TL civarında" },
  ] }), ANSWER)!;
  assert.deepEqual(out.map((c) => c.status), ["wrong", "correct"]);
  assert.equal(parseTruth("yok", ANSWER), null);
});

test("judgeTruth: maliyet web araması ücreti içermez", async () => {
  const body = { output: [{ type: "message", content: [{ type: "output_text", text: '{"claims":[{"claim":"2015","status":"wrong","fact":"2009","quote":"2015 yılında kuruldu"}]}' }] }], usage: { input_tokens: 700, output_tokens: 400 } };
  const r = await judgeTruth({ apiKey: "k", model: "m", price: { inputPerMTok: 0.1, outputPerMTok: 0.5, perCall: 0.01, source: "" } as never, brand: "Kafe Mavi", factCard: "Kuruluş 2009", answer: ANSWER, fetchFn: (async () => new Response(JSON.stringify(body))) as never });
  assert.equal(r.claims!.length, 1); assert.ok(r.costUsd > 0 && r.costUsd < 0.0005);
});

test("Kaynak türü: kendi/rakip site, kamu, ansiklopedi, forum, inceleme, pazar yeri, sosyal, haber, diğer", () => {
  const t = (u: string) => sourceType(u, brands);
  assert.equal(t("https://www.kafemavi.com/menu"), "own");
  assert.equal(t("https://rakip.com"), "competitor");
  assert.equal(t("https://www.tuik.gov.tr/x"), "official");
  assert.equal(t("https://data.gov.uk/x"), "official");
  assert.equal(t("https://metu.edu.tr"), "official");
  assert.equal(t("https://tr.wikipedia.org/wiki/X"), "encyclopedia");
  assert.equal(t("https://www.reddit.com/r/x"), "forum");
  assert.equal(t("https://eksisozluk.com/kafe"), "forum");
  assert.equal(t("https://www.sikayetvar.com/kafe"), "review");
  assert.equal(t("https://www.trendyol.com/x"), "marketplace");
  assert.equal(t("https://www.youtube.com/watch?v=1"), "social");
  assert.equal(t("https://www.hurriyet.com.tr/x"), "news");
  assert.equal(t("https://www.donanimhaber.com/haber/x"), "news");
  assert.equal(t("https://forum.donanimhaber.com/x"), "forum");
  assert.equal(t("https://bilinmeyen-blog.net/x"), "other");
});

test("Kaynak karışımı: tüm cevaplar ve rakibin öne geçtiği cevaplar ayrı", () => {
  const answers = [
    { id: "a1", cited_urls: ["https://reddit.com/r/1", "https://reddit.com/r/2", "https://kafemavi.com"] },
    { id: "a2", cited_urls: ["https://eksisozluk.com/x", "https://hurriyet.com.tr/y"] },
  ];
  const ments = [{ response_id: "a1", brand_id: "T", recommended: true }, { response_id: "a2", brand_id: "R", recommended: true }, { response_id: "a2", brand_id: "T", recommended: false }];
  const m = sourceMix(answers, ments, brands);
  assert.equal(m.total, 4, "aynı cevapta aynı site bir kez");
  assert.deepEqual(m.types.map((x) => [x.type, x.count]), [["forum", 2], ["news", 1], ["own", 1]]);
  assert.equal(m.lost.total, 2);
  assert.deepEqual(m.lost.types.map((x) => x.type), ["forum", "news"]);
});

test("Özet: başarısız kontrol sayılmaz, aynı yanlış iddia bir kez listelenir (en yenisi)", () => {
  const c = (at: string, p: string, claims: { claim: string; status: "correct" | "wrong" | "unverifiable" }[], failed = false) =>
    ({ provider: p, created_at: at, failed, claims: claims.map((x) => ({ ...x, fact: "f", quote: "q" })) });
  const s = truthSummary([
    c("2026-11-10", "openai", [{ claim: "2015'te kuruldu", status: "wrong" }, { claim: "Kadıköy", status: "correct" }]),
    c("2026-11-12", "claude", [{ claim: "2015'te  KURULDU", status: "wrong" }, { claim: "Ödül", status: "unverifiable" }]),
    c("2026-11-12", "openai", [], true),
  ]);
  assert.deepEqual([s.checks, s.correct, s.wrong, s.unverifiable], [2, 1, 2, 1]);
  assert.equal(s.wrongClaims.length, 1); assert.equal(s.wrongClaims[0].provider, "claude");
});

test("Rehber ve kampanya: bilgi kartıyla çelişen iddia yüksek öncelikli madde ve görev listesi olur", async () => {
  const { buildRecommendations } = await import("../src/recommendations.ts");
  const { campaignFor } = await import("../src/campaign.ts");
  const input = { brandName: "Kafe Mavi", website: "kafemavi.com", city: null, sector: null, aliases: ["KM"], activePrompts: 12, completedRuns: 2, autoWeekly: true,
    measurementType: "live_search" as const, prompts: [], audit: null, lang: "tr" as const, wrongBrandClaims: [{ claim: "2015'te kuruldu", fact: "Kuruluş: 2009" }] };
  const r = buildRecommendations(input).find((x) => x.id === "truth_wrong")!;
  assert.equal(r.priority, "yüksek");
  assert.ok(campaignFor(r, input)![0].includes("2015'te kuruldu"));
});

test("Kaynaksız istatistik: marka cümlesindeki yüzde/milyon/sıralama iddiası; fiyat, saat, teknik özellik ve kaynaklı cevap sayılmaz", async () => {
  const { statFlags } = await import("../src/truth.ts");
  const A = "Kafe Mavi İstanbul'daki kafelerin %40'ından fazlasını geride bırakıyor. Kafe Mavi'de filtre kahve 85 TL. Kafe Mavi 09:00'da açılır. Kahve Durağı 2 milyon müşteriye ulaştı. Kafe Mavi pazar lideri konumunda ve 1,5 milyon kullanıcıya hizmet veriyor.";
  const f = statFlags(A, ["Kafe Mavi"], { cited: 0 });
  assert.deepEqual(f.map((x) => x.value), ["%40", "1,5 milyon"]);
  assert.equal(statFlags(A, ["Kafe Mavi"], { cited: 3 }).filter((x) => x.kind === "unsourced_stat").length, 0, "kaynak gösterildiyse kaynaksız değildir");
  assert.equal(statFlags("Galaxy S26 Ultra 200MP kamera, 5000 mAh pil ve 60W şarj sunar.", ["Galaxy"], { cited: 0 }).length, 0);
});

test("Eski bilgi: güncel bağlamda eski yıl işaretlenir, tarihsel bilgi işaretlenmez", async () => {
  const { statFlags, statSummary } = await import("../src/truth.ts");
  const now = new Date("2026-11-13");
  assert.equal(statFlags("Kafe Mavi 2009'da kuruldu.", ["Kafe Mavi"], { cited: 1, now }).length, 0);
  const f = statFlags("2021 itibarıyla Kafe Mavi'nin en yeni şubesi Moda'dadır.", ["Kafe Mavi"], { cited: 1, now });
  assert.equal(f[0].kind, "old_date"); assert.equal(f[0].value, "2021");
  const s = statSummary([{ answer_text: "Kafe Mavi %30 büyüdü.", cited_urls: [], provider: "openai" }, { answer_text: "Başka bir şey.", cited_urls: [] }], ["Kafe Mavi"], now);
  assert.deepEqual([s.unsourced, s.answersWithFlags, s.examples[0].provider], [1, 1, "openai"]);
});

test("Çelişki: her taraf kendi cevabında birebir geçmeli; tek taraflı çelişki atılır", async () => {
  const { parseConflicts, buildConflictPrompt } = await import("../src/truth.ts");
  const answers = [{ provider: "openai", answer: "Kafe Mavi'de filtre kahve 85 TL." }, { provider: "claude", answer: "Kafe Mavi filtre kahveyi 120 TL'ye satıyor." }];
  assert.ok(buildConflictPrompt("Kafe Mavi", answers).includes("ANSWER from claude"));
  const out = parseConflicts(JSON.stringify({ conflicts: [
    { topic: "Filtre kahve fiyatı", sides: [{ engine: "openai", quote: "filtre kahve 85 TL" }, { engine: "claude", quote: "120 TL'ye satıyor" }] },
    { topic: "Uydurma", sides: [{ engine: "openai", quote: "filtre kahve 85 TL" }, { engine: "claude", quote: "200 TL" }] },
    { topic: "Yanlış motor", sides: [{ engine: "openai", quote: "85 TL" }, { engine: "gemini", quote: "85 TL" }] },
  ] }), answers)!;
  assert.deepEqual(out.map((c) => c.topic), ["Filtre kahve fiyatı"]);
  assert.equal(parseConflicts("yok", answers), null);
});

test("Yeni yanlış bilgi: daha önce görülmüş (büyük/küçük harf farkıyla) iddia yeni sayılmaz; e-posta iki dilde ve kaçışlı", async () => {
  const { newWrongClaims, buildWrongInfoEmail } = await import("../src/truth.ts");
  const W = (claim: string, status: "wrong" | "correct" = "wrong") => ({ claim, status, fact: "f", quote: "q" });
  const nw = newWrongClaims([W("2015'te KURULDU"), W("Paket servis yok"), W("Kadıköy'de", "correct"), W("paket servis yok")], [W("2015'te kuruldu")]);
  assert.deepEqual(nw.map((c) => c.claim), ["Paket servis yok"]);
  const m = buildWrongInfoEmail("tr", { id: "B", name: "Kafe <Mavi>" }, [{ ...nw[0], provider: "openai" }], "https://aisaasavran.com", "tok");
  assert.match(m.subject, /yeni bir yanlış bilgi/); assert.match(m.text, /ChatGPT: "Paket servis yok"/); assert.match(m.text, /k=drop&t=tok/);
  assert.ok(m.html.includes("Kafe &lt;Mavi&gt;"));
  assert.match(buildWrongInfoEmail("en", { id: "B", name: "X" }, [{ ...nw[0], provider: "claude" }], "https://a", "t").subject, /new wrong information/);
});
