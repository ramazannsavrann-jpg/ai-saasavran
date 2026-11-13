// GEO Otopilot: aisaasavran.com'un yapay zekâ görünürlüğünü ölçer, otomatik yapılabilecekleri yapar, kalanları sıraya koyar.
//
// Modlar (GEO_MODE):
//   light → ücretsiz: site denetimi + sayfa kontrolleri + değişen sayfaları IndexNow ile Bing/Yandex'e bildirme
//   full  → light + gerçek ölçüm: ChatGPT ve Claude (canlı arama, ücretli, çalıştırma başına GEO_CAP_USD tavanı) + Gemini (ücretsiz, aramasız)
// Kural (12 Kasım 2026): kendi markamız ücretli ölçümle 10 günde bir ölçülür → full mod yalnız ayın 1/11/21'inde ve elle çalışır.
// Herkese açık depoya yazılan raporda rakip adları yer almaz ("Rakip A/B…"); gerçek adlar yalnız Actions çıktısında (artifact) kalır.
// Uydurma veri yok: her sayı bu çalıştırmadaki gerçek bir istek ya da API cevabıdır.

import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { auditSite } from "../engine/src/audit.ts";
import { analyzeResponse, untrackedNames, normalize } from "../engine/src/metrics.ts";
import { OpenAIProvider, OPENAI_DEFAULT } from "../engine/src/providers/openai.ts";
import { ClaudeProvider, CLAUDE_DEFAULT } from "../engine/src/providers/claude.ts";
import { GeminiProvider, GEMINI_FREE_DEFAULT } from "../engine/src/providers/gemini.ts";
import type { Provider, ProviderConfig, ProviderResult } from "../engine/src/providers/types.ts";
// @ts-ignore — düz JS içerik dosyası
import { SITE } from "../web/site/content.mjs";

const env = process.env;
const MODE = env.GEO_MODE === "full" ? "full" : "light";
const DATA = env.GEO_DATA_DIR || "geo-data";
const DETAIL = env.GEO_DETAIL_DIR || "geo-detail";
const CAP_USD = Number(env.GEO_CAP_USD || "0.25");
const BASE: string = SITE.url;
const HOST = new URL(BASE).host;
const today = new Date().toISOString().slice(0, 10);
mkdirSync(DATA, { recursive: true });
mkdirSync(DETAIL, { recursive: true });

const readJson = <T>(f: string, d: T): T => { try { return JSON.parse(readFileSync(f, "utf8")) as T; } catch { return d; } };
interface State { pages: Record<string, string>; lastFull?: string }
const state = readJson<State>(join(DATA, "state.json"), { pages: {} });

async function get(url: string) {
  try {
    const r = await fetch(url, { redirect: "follow", headers: { "user-agent": "AISaaSavran-GEO-Autopilot/1.0 (+https://aisaasavran.com)" }, signal: AbortSignal.timeout(30_000) });
    return { status: r.status, text: await r.text() };
  } catch { return { status: 0, text: "" }; }
}

// ---------------------------------------------------------------- 1) Sayfa kontrolleri
interface PageCheck { url: string; status: number; issues: string[]; hash: string; words: number }
const sitemap = await get(`${BASE}/sitemap.xml`);
const urls = [...sitemap.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
const llms = await get(`${BASE}/llms.txt`);
const pages: PageCheck[] = [];
for (const url of urls) {
  const r = await get(url);
  const html = r.text;
  const issues: string[] = [];
  if (r.status !== 200) issues.push(`HTTP ${r.status}`);
  const title = html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() ?? "";
  const desc = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1] ?? "";
  if (!title) issues.push("başlık yok"); else if (title.length > 70) issues.push(`başlık uzun (${title.length} karakter)`);
  if (desc.length < 50) issues.push("açıklama (meta description) kısa/yok"); else if (desc.length > 170) issues.push(`açıklama uzun (${desc.length})`);
  if (!/<h1[\s>]/i.test(html)) issues.push("h1 yok");
  if (!/application\/ld\+json/i.test(html)) issues.push("yapılandırılmış veri (JSON-LD) yok");
  if (!/rel="canonical"/i.test(html)) issues.push("canonical yok");
  const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const words = text.split(" ").filter(Boolean).length;
  if (words < 250 && !/\/(check|kontrol|pricing)\//.test(url)) issues.push(`az metin (~${words} kelime)`);
  const path = new URL(url).pathname;
  if (/\/(guides|rehber)\/.+/.test(path) && !llms.text.includes(url)) issues.push("llms.txt'de listelenmiyor");
  pages.push({ url, status: r.status, issues, words, hash: createHash("sha256").update(html).digest("hex").slice(0, 16) });
}

// ---------------------------------------------------------------- 2) Site denetimi (müşterilere verdiğimiz denetimin aynısı)
const audit = await auditSite(BASE, [SITE.name]);
const failedChecks = audit.checks.filter((c) => !c.ok && c.severity !== "info");

// ---------------------------------------------------------------- 3) IndexNow: değişen/yeni sayfaları Bing + Yandex'e bildir
// ChatGPT arama sonuçlarının büyük kısmı Bing dizininden gelir; Yandex Türkiye'de kullanılıyor. Ücretsiz.
const changed = pages.filter((p) => p.status === 200 && state.pages[p.url] !== p.hash).map((p) => p.url);
let indexnow = { sent: 0, status: 0, note: "değişen sayfa yok" };
if (changed.length > 0) {
  const keyFile = await get(`${BASE}/${SITE.indexnow}.txt`);
  if (keyFile.status !== 200 || keyFile.text.trim() !== SITE.indexnow) {
    indexnow = { sent: 0, status: keyFile.status, note: "anahtar dosyası sitede yok (site yayını bekleniyor)" };
  } else {
    try {
      const r = await fetch("https://api.indexnow.org/indexnow", {
        method: "POST", headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({ host: HOST, key: SITE.indexnow, keyLocation: `${BASE}/${SITE.indexnow}.txt`, urlList: changed }),
        signal: AbortSignal.timeout(30_000),
      });
      indexnow = { sent: changed.length, status: r.status, note: r.status === 200 || r.status === 202 ? "kabul edildi" : `hata: ${(await r.text()).slice(0, 120)}` };
      if (r.status === 200 || r.status === 202) for (const p of pages) if (changed.includes(p.url)) state.pages[p.url] = p.hash;
    } catch (e) { indexnow = { sent: 0, status: 0, note: `bağlantı hatası: ${(e as Error).message}` }; }
  }
}

// ---------------------------------------------------------------- 4) Gerçek ölçüm (yalnız full mod)
// Keşif soruları: müşterinin markamızı bilmeden soracağı sorular. Tanıma soruları: yapay zekâ bizi doğru tanıyor mu?
const QUESTIONS = [
  { id: "tr-arac", lang: "tr", kind: "discovery", q: "Bir markanın ChatGPT, Gemini ve Claude cevaplarında ne kadar görünür olduğunu ölçen araçlar hangileri? Kısa liste ver." },
  { id: "tr-geo", lang: "tr", kind: "discovery", q: "Türkiye'de yapay zekâ görünürlüğü (GEO) takibi için kullanılabilecek uygun fiyatlı yazılımlar hangileri?" },
  { id: "tr-ajans", lang: "tr", kind: "discovery", q: "Ajanslar müşterilerinin markasının yapay zekâ asistanlarında önerilip önerilmediğini hangi araçla takip edebilir?" },
  { id: "en-tools", lang: "en", kind: "discovery", q: "What are the best tools to track brand visibility in ChatGPT, Gemini and Claude? Give a short list." },
  { id: "en-smb", lang: "en", kind: "discovery", q: "Affordable AI search visibility (GEO) tracking tools for small businesses and agencies?" },
  { id: "en-compare", lang: "en", kind: "discovery", q: "Which tools measure how often AI assistants recommend my product compared with competitors?" },
  { id: "tr-tanima", lang: "tr", kind: "knowledge", q: "AI SaaSavran (aisaasavran.com) nedir, ne işe yarar?" },
  { id: "en-knows", lang: "en", kind: "knowledge", q: "What is AI SaaSavran (aisaasavran.com) and what does it do?" },
] as const;

const US = { id: "us", name: SITE.name, aliases: ["AISaaSavran", "aisaasavran.com", "aisaasavran", "SaaSavran"], domain: HOST };
interface Answer { engine: string; method: string; qid: string; kind: string; mentioned: boolean; recommended: boolean; cited: boolean; rank: number | null; correct?: boolean; domains: string[]; costUsd: number; text: string; error?: string }
const answers: Answer[] = [];
let spent = 0;
const engineStatus: Record<string, string> = {};

const worst = (c: ProviderConfig) => (c.useSearch ? c.price.perCall * (c.worstCaseToolCalls ?? 1) : 0)
  + c.worstCaseTokens.input / 1e6 * c.price.inputPerMTok + c.worstCaseTokens.output / 1e6 * c.price.outputPerMTok;
const hostOf = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };

if (MODE === "full") {
  const engines: { name: string; p: Provider }[] = [];
  const paid = env.ALLOW_PAID_API === "true";
  if (env.OPENAI_API_KEY && paid) engines.push({ name: "ChatGPT", p: new OpenAIProvider(env.OPENAI_API_KEY, { ...OPENAI_DEFAULT, searchCountry: "TR" }) });
  else engineStatus.ChatGPT = env.OPENAI_API_KEY ? "ücretli izin kapalı" : "anahtar yok";
  if (env.ANTHROPIC_API_KEY && paid) engines.push({ name: "Claude", p: new ClaudeProvider(env.ANTHROPIC_API_KEY, { ...CLAUDE_DEFAULT, searchCountry: "TR" }) });
  else engineStatus.Claude = env.ANTHROPIC_API_KEY ? "ücretli izin kapalı" : "anahtar yok";
  if (env.GEMINI_API_KEY) engines.push({ name: "Gemini", p: new GeminiProvider(env.GEMINI_API_KEY, { ...GEMINI_FREE_DEFAULT, billing: "free", useSearch: false }) });
  else engineStatus.Gemini = "anahtar yok";

  for (const { name, p } of engines) {
    let ok = 0, fail = 0;
    for (const q of QUESTIONS) {
      if (p.config.billing === "paid" && spent + worst(p.config) > CAP_USD) { fail++; answers.push({ engine: name, method: "-", qid: q.id, kind: q.kind, mentioned: false, recommended: false, cited: false, rank: null, domains: [], costUsd: 0, text: "", error: `atlandı: ${CAP_USD} $ tavan` }); continue; }
      let r: ProviderResult | null = null; let err = "";
      for (let attempt = 1; attempt <= 2 && !r; attempt++) {
        try { r = await p.ask(q.id, q.q); }
        catch (e) { err = `${(e as { kind?: string }).kind ?? "hata"}: ${(e as Error).message.slice(0, 160)}`; if ((e as { kind?: string }).kind !== "transient") break; await new Promise((s) => setTimeout(s, 10_000)); }
      }
      if (!r) { fail++; answers.push({ engine: name, method: "-", qid: q.id, kind: q.kind, mentioned: false, recommended: false, cited: false, rank: null, domains: [], costUsd: 0, text: "", error: err }); continue; }
      ok++; spent += r.costUsd;
      const [hit] = analyzeResponse({ promptId: q.id, provider: name, answerText: r.answerText, citedUrls: r.citedUrls }, [US]);
      const t = normalize(r.answerText);
      // Tanıma sorusunda "doğru tanıyor": adı geçiyor + ne yaptığımızı (yapay zekâ cevaplarında görünürlük ölçümü) anlatıyor
      const correct = q.kind === "knowledge" ? hit.mentioned && /(chatgpt|gemini|claude|yapay zeka|ai assistant|llm)/.test(t) && /(gorunur|visib|olc|measur|track|takip)/.test(t) : undefined;
      answers.push({ engine: name, method: r.method, qid: q.id, kind: q.kind, mentioned: hit.mentioned, recommended: hit.recommended, cited: hit.cited || r.citedUrls.some((u) => hostOf(u).endsWith(HOST)), rank: hit.rank, correct, domains: [...new Set(r.citedUrls.map(hostOf).filter(Boolean))], costUsd: r.costUsd, text: r.answerText });
    }
    engineStatus[name] = `${ok} cevap${fail ? `, ${fail} başarısız` : ""}`;
  }
  state.lastFull = today;
}

// ---------------------------------------------------------------- 5) Analiz → aksiyonlar
const disc = answers.filter((a) => a.kind === "discovery" && !a.error);
const know = answers.filter((a) => a.kind === "knowledge" && !a.error);
const competitors = untrackedNames(disc.map((a) => a.text), [{ name: US.name, aliases: US.aliases }], 15);
const compNorm = competitors.map((c) => normalize(c.name).replace(/\s+/g, ""));
const DIRECTORY = /(producthunt|alternativeto|g2\.com|capterra|getapp|saasworthy|saashub|futurepedia|theresanaiforthat|toolify|crunchbase|betalist|indiehackers|aitoolsdirectory|topai|softwaresuggest|sourceforge|trustradius|appsumo|aixploria|insidr)/;
const FORUM = /(reddit\.com|quora\.com|stackexchange|news\.ycombinator)/;
const SOCIAL = /(youtube\.com|linkedin\.com|medium\.com|x\.com|twitter\.com|substack\.com|dev\.to)/;
const domainCount = new Map<string, number>();
for (const a of disc) for (const d of a.domains) domainCount.set(d, (domainCount.get(d) ?? 0) + 1);
const sources = [...domainCount.entries()].sort((a, b) => b[1] - a[1]).map(([d, n]) => {
  const kind = d.endsWith(HOST) ? "bizim site" : DIRECTORY.test(d) ? "dizin" : FORUM.test(d) ? "forum" : SOCIAL.test(d) ? "sosyal/video" : "blog/haber";
  // Rakibin kendi sitesi ise adını herkese açık rapora yazma
  const isComp = kind === "blog/haber" && compNorm.some((c) => c.length >= 4 && d.replace(/[^a-z0-9]/g, "").includes(c));
  return { domain: d, publicDomain: isComp ? "(rakip sitesi)" : d, count: n, kind: isComp ? "rakip sitesi" : kind };
});

const forClaude: string[] = [];   // site içinde yapılacaklar (zamanlanmış Claude görevi yapar, PR açar)
const forUser: string[] = [];     // senin yapacakların (hesap/gönderi gerektirenler)
for (const c of failedChecks) forClaude.push(`Denetim: ${c.title} — ${c.detail}`);
for (const p of pages) if (p.issues.length) forClaude.push(`Sayfa ${new URL(p.url).pathname}: ${p.issues.join(", ")}`);
const qText = (id: string) => QUESTIONS.find((q) => q.id === id)!.q;
for (const q of QUESTIONS.filter((q) => q.kind === "discovery")) {
  const rows = disc.filter((a) => a.qid === q.id);
  if (rows.length && !rows.some((a) => a.mentioned)) forClaude.push(`İçerik boşluğu (${q.lang.toUpperCase()}): hiçbir motor bizi anmadı → bu soruya doğrudan cevap veren rehber/SSS: "${q.q}"`);
}
if (know.length && !know.some((a) => a.correct)) {
  forClaude.push("Varlık tanınırlığı: motorlar AI SaaSavran'ı tanımıyor/yanlış anlatıyor → llms.txt, Organization şeması ve 'Hakkımızda' metni tek ve tutarlı bir tanımla güçlendirilmeli");
  forUser.push("Aynı tek cümlelik tanımı (\"AI SaaSavran, markaların ChatGPT, Gemini ve Claude'da ne kadar önerildiğini ölçer\") YouTube, LinkedIn, Product Hunt ve Indie Hackers profillerinin 'hakkında' alanına yapıştır (metni Claude hazırlar)");
}
for (const s of sources.filter((s) => s.kind === "dizin").slice(0, 5)) forUser.push(`${s.domain} yapay zekânın kaynak gösterdiği bir araç dizini (${s.count} cevapta) → AI SaaSavran'ı ücretsiz listelet (form metnini Claude hazırlar)`);
for (const s of sources.filter((s) => s.kind === "forum").slice(0, 3)) forUser.push(`${s.domain} kaynak gösteriliyor (${s.count} cevapta) → ilgili başlığa yardımcı, reklamsız bir cevap yaz (taslağı Claude hazırlar)`);
for (const s of sources.filter((s) => s.kind === "blog/haber").slice(0, 5)) forUser.push(`${s.domain} "en iyi araçlar" türü kaynak (${s.count} cevapta) → yazara eklenme isteği e-postası gönder (taslağı Claude hazırlar)`);

// ---------------------------------------------------------------- 6) Kayıt ve rapor
const byEngine: Record<string, { asked: number; mentioned: number; recommended: number; cited: number; knows: boolean | null }> = {};
for (const a of answers.filter((x) => !x.error)) {
  const e = (byEngine[a.engine] ??= { asked: 0, mentioned: 0, recommended: 0, cited: 0, knows: null });
  if (a.kind === "discovery") { e.asked++; if (a.mentioned) e.mentioned++; if (a.recommended) e.recommended++; if (a.cited) e.cited++; }
  else e.knows = (e.knows ?? false) || !!a.correct;
}
const summary = {
  date: today, mode: MODE, costUsd: Number(spent.toFixed(4)), capUsd: CAP_USD,
  pages: pages.length, pagesWithIssues: pages.filter((p) => p.issues.length).length,
  auditPassed: audit.checks.filter((c) => c.ok).length, auditTotal: audit.checks.length,
  indexnow, engines: byEngine, engineStatus,
  competitorCount: competitors.length, topSources: sources.slice(0, 10).map((s) => ({ domain: s.publicDomain, kind: s.kind, count: s.count })),
};
writeFileSync(join(DATA, "state.json"), JSON.stringify(state, null, 2));
appendFileSync(join(DATA, "history.jsonl"), JSON.stringify(summary) + "\n");
writeFileSync(join(DATA, "latest.json"), JSON.stringify({ ...summary, forClaude, forUser, pageIssues: pages.filter((p) => p.issues.length).map((p) => ({ url: p.url, issues: p.issues })),
  answers: answers.map(({ text, domains, ...a }) => ({ ...a, domains: domains.map((d) => sources.find((s) => s.domain === d)?.publicDomain ?? d), preview: a.mentioned ? text.slice(0, 300) : undefined })),
  questions: QUESTIONS }, null, 2));
// Gerçek rakip adları ve tam cevaplar: yalnız Actions artifact'ına (depoya yazılmaz)
writeFileSync(join(DETAIL, `detay-${today}.json`), JSON.stringify({ competitors, sources, answers }, null, 2));

const pct = (n: number, d: number) => (d ? `${Math.round((100 * n) / d)}%` : "-");
const history = readFileSync(join(DATA, "history.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l)).filter((h) => h.mode === "full");
const prev = history.length >= 2 ? history[history.length - 2] : null;
let md = `# GEO Otopilot raporu — ${today}\n\nMod: **${MODE === "full" ? "tam ölçüm" : "ücretsiz kontrol"}** · Harcanan: **${summary.costUsd} $** (tavan ${CAP_USD} $)\n\n`;
md += `## Otomatik yapılanlar\n- IndexNow (Bing + Yandex): ${indexnow.sent} sayfa bildirildi — ${indexnow.note}\n- ${pages.length} sayfa kontrol edildi, ${summary.pagesWithIssues} sayfada sorun var\n- Site denetimi: ${summary.auditPassed}/${summary.auditTotal} kontrol geçti\n\n`;
if (MODE === "full") {
  md += `## Yapay zekâda görünürlüğümüz (6 keşif sorusu, TR + EN)\n| Motor | Andı | Önerdi | Sitemizi kaynak gösterdi | Bizi doğru tanıyor mu | Önceki ölçüm (andı) |\n|---|---|---|---|---|---|\n`;
  for (const [e, v] of Object.entries(byEngine)) md += `| ${e} | ${v.mentioned}/${v.asked} | ${v.recommended}/${v.asked} | ${v.cited}/${v.asked} | ${v.knows === null ? "-" : v.knows ? "evet" : "hayır"} | ${prev?.engines?.[e] ? `${prev.engines[e].mentioned}/${prev.engines[e].asked}` : "ilk ölçüm"} |\n`;
  for (const [e, s] of Object.entries(engineStatus)) if (!byEngine[e]) md += `| ${e} | çalışmadı: ${s} | | | | |\n`;
  md += `\nCevaplarda ${competitors.length} rakip marka geçti (adlar herkese açık raporda gizli). En çok kaynak gösterilen siteler:\n`;
  for (const s of sources.slice(0, 8)) md += `- ${s.publicDomain} — ${s.kind}, ${s.count} cevap\n`;
  md += `\nGemini ücretsiz katmanda **aramasız** (model bilgisi) ölçülür; yeni bir markanın orada çıkması aylar sürebilir.\n\n`;
}
md += `## Claude'un sitede yapacakları (sonraki zamanlanmış görev, PR olarak)\n${forClaude.length ? forClaude.map((x) => `- ${x}`).join("\n") : "- Sorun yok"}\n\n`;
md += `## Senin yapacakların (akşam, toplu)\n${forUser.length ? forUser.map((x, i) => `${i + 1}. ${x}`).join("\n") : "- Bu sefer yok"}\n`;
writeFileSync(join(DATA, "latest.md"), md);
if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, md);
console.log(md);
