// Kaynak egemenliği ve kayıp nedeni kanıtları. LLM kullanmaz; yalnız kayıtlı cevaplar, kaynak adresleri ve
// marka sonuçlarından (mentions) hesaplanır. Çıktı "kanıt"tır, kesin neden değildir: arayüz bunu açıkça yazar.
// Yalnız canlı aramalı ölçümlerde anlamlıdır (kaynak adresi ancak o zaman vardır).

export interface InsightAnswer { id: string; prompt_id: string; cited_urls: string[] | null }
export interface InsightMention { response_id: string; brand_id: string; recommended: boolean; mentioned: boolean }
export interface InsightBrand { id: string; name: string; website: string | null; isTarget: boolean }

export type SourceOwner = "target" | "competitor" | "third_party";
export interface SourceRow {
  domain: string;
  /** Bu alan adının kaynak gösterildiği cevap sayısı */
  answers: number;
  owner: SourceOwner;
  ownerName: string | null;
  /** Bu kaynağın geçtiği cevaplarda önerilen markalar (çoktan aza) */
  supports: { name: string; isTarget: boolean; count: number }[];
  /** Bu kaynağın geçtiği cevaplardan kaçında hedef marka önerildi */
  targetRecommended: number;
}

export function domainOf(url: string | null | undefined): string {
  if (!url) return "";
  try { return new URL(url.includes("://") ? url : `https://${url}`).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; }
}
/** Kullanıcı adının adreste geçtiği platformlar: alan adı herkesin ortak alanıdır, sahiplik kanal/profil yolundan anlaşılır. */
const PROFILE_HOSTS = new Set(["youtube.com", "m.youtube.com", "instagram.com", "tiktok.com", "x.com", "twitter.com", "facebook.com", "linkedin.com"]);
/**
 * Kaynak anahtarı: normal sitelerde alan adı (www'suz); YouTube/Instagram gibi platformlarda alan adı + kanal/profil
 * (ör. youtube.com/@kanal). youtube.com/@ad, /c/ad, /user/ad aynı kanal sayılır (youtube.com/@ad); /channel/ID ayrı tutulur.
 * Kanal yolu olmayan platform adresi (ör. youtube.com/watch?v=…) yalnız alan adına iner ve kimseye ait sayılmaz.
 */
export function siteKey(url: string | null | undefined): string {
  const host = domainOf(url);
  if (!host) return "";
  const base = host.replace(/^m\./, "");
  if (!PROFILE_HOSTS.has(host) && !PROFILE_HOSTS.has(base)) return host;
  let path = "";
  try { path = new URL(url!.includes("://") ? url! : `https://${url}`).pathname; } catch { return base; }
  const seg = path.split("/").filter(Boolean).map((x) => decodeURIComponent(x).toLowerCase());
  if (!seg.length) return base;
  if (base === "youtube.com") {
    if (seg[0].startsWith("@")) return `${base}/${seg[0]}`;
    if ((seg[0] === "c" || seg[0] === "user") && seg[1]) return `${base}/@${seg[1]}`;
    if (seg[0] === "channel" && seg[1]) return `${base}/channel/${seg[1]}`;
    return base;
  }
  if (base === "linkedin.com") return seg[1] && ["company", "in"].includes(seg[0]) ? `${base}/${seg[0]}/${seg[1]}` : base;
  const reserved = new Set(["p", "reel", "reels", "explore", "stories", "watch", "video", "hashtag", "search", "share", "status", "i", "home", "intent"]);
  return reserved.has(seg[0]) ? base : `${base}/${seg[0].replace(/^@/, "")}`;
}
const sameSite = (domain: string, brandDomain: string) => !!brandDomain && (domain === brandDomain || (!brandDomain.includes("/") && domain.endsWith("." + brandDomain)));

function ownerOf(domain: string, brands: InsightBrand[]): { owner: SourceOwner; ownerName: string | null } {
  for (const b of brands) {
    if (sameSite(domain, siteKey(b.website))) return { owner: b.isTarget ? "target" : "competitor", ownerName: b.name };
  }
  return { owner: "third_party", ownerName: null };
}

function index(answers: InsightAnswer[], mentions: InsightMention[]) {
  const byResp = new Map<string, InsightMention[]>();
  for (const m of mentions) byResp.set(m.response_id, [...(byResp.get(m.response_id) ?? []), m]);
  return answers.map((a) => ({
    a,
    domains: [...new Set((a.cited_urls ?? []).map(siteKey).filter(Boolean))],
    ments: byResp.get(a.id) ?? [],
  }));
}

/** Rakip Kaynak Egemenliği: her kaynak alan adı kaç cevapta kullanıldı, kime ait, o cevaplarda kim önerildi. */
export function sourceDominance(answers: InsightAnswer[], mentions: InsightMention[], brands: InsightBrand[], limit = 15): SourceRow[] {
  const rows = new Map<string, { answers: number; rec: Map<string, number> }>();
  for (const { domains, ments } of index(answers, mentions)) {
    for (const d of domains) {
      const r = rows.get(d) ?? { answers: 0, rec: new Map<string, number>() };
      r.answers++;
      for (const m of ments) if (m.recommended) r.rec.set(m.brand_id, (r.rec.get(m.brand_id) ?? 0) + 1);
      rows.set(d, r);
    }
  }
  const target = brands.find((b) => b.isTarget);
  return [...rows.entries()].map(([domain, r]) => ({
    domain, answers: r.answers, ...ownerOf(domain, brands),
    supports: brands.map((b) => ({ name: b.name, isTarget: b.isTarget, count: r.rec.get(b.id) ?? 0 }))
      .filter((x) => x.count > 0).sort((x, y) => y.count - x.count || x.name.localeCompare(y.name)),
    targetRecommended: target ? r.rec.get(target.id) ?? 0 : 0,
  })).sort((x, y) => y.answers - x.answers || x.domain.localeCompare(y.domain)).slice(0, limit);
}

export type LossEvidence =
  | "competitor_own_site_cited"   // rakibin kendi sitesi kaynak gösterildi
  | "target_site_not_cited"       // hedef markanın sitesi hiç kaynak gösterilmedi
  | "target_site_cited_anyway"    // hedefin sitesi kaynak gösterildi ama yine de önerilmedi
  | "third_party_sources"         // cevap üçüncü taraf sitelere dayandı
  | "mentioned_not_recommended"   // anıldı ama önerilmedi
  | "absent"                      // cevapta hiç yok
  | "no_sources";                 // cevapta kaynak yok (kanıt üretilemez)

export interface LossCard {
  promptId: string;
  answers: number;
  targetRecommended: number;
  targetMentioned: number;
  /** Bu soruda önerilen rakipler (çoktan aza) */
  winners: { name: string; count: number }[];
  /** Bu sorunun cevaplarında kullanılan kaynaklar (çoktan aza) */
  sources: { domain: string; count: number; owner: SourceOwner; ownerName: string | null }[];
  targetSiteCited: number;
  evidence: LossEvidence[];
}

/**
 * Kayıp Nedeni Kartı: hedef markanın HİÇ önerilmediği ve en az bir rakibin önerildiği sorular için kanıt listesi.
 * Kanıt yoksa ("no_sources") kart yine döner ama neden üretmez.
 */
export function lossCards(answers: InsightAnswer[], mentions: InsightMention[], brands: InsightBrand[]): LossCard[] {
  const target = brands.find((b) => b.isTarget);
  if (!target) return [];
  const byPrompt = new Map<string, ReturnType<typeof index>>();
  for (const row of index(answers, mentions)) byPrompt.set(row.a.prompt_id, [...(byPrompt.get(row.a.prompt_id) ?? []), row]);
  const cards: LossCard[] = [];
  for (const [promptId, rows] of byPrompt) {
    const tm = (f: (m: InsightMention) => boolean) => rows.filter((r) => r.ments.some((m) => m.brand_id === target.id && f(m))).length;
    const targetRecommended = tm((m) => m.recommended), targetMentioned = tm((m) => m.mentioned);
    const winners = brands.filter((b) => !b.isTarget).map((b) => ({
      name: b.name, count: rows.filter((r) => r.ments.some((m) => m.brand_id === b.id && m.recommended)).length,
    })).filter((w) => w.count > 0).sort((x, y) => y.count - x.count || x.name.localeCompare(y.name));
    if (targetRecommended > 0 || winners.length === 0) continue;
    const counts = new Map<string, number>();
    for (const r of rows) for (const d of r.domains) counts.set(d, (counts.get(d) ?? 0) + 1);
    const sources = [...counts.entries()].map(([domain, count]) => ({ domain, count, ...ownerOf(domain, brands) }))
      .sort((x, y) => y.count - x.count || x.domain.localeCompare(y.domain)).slice(0, 8);
    const targetSiteCited = rows.filter((r) => r.domains.some((d) => sameSite(d, domainOf(target.website)))).length;
    const evidence: LossEvidence[] = [];
    if (sources.length === 0) evidence.push("no_sources");
    else {
      if (sources.some((s) => s.owner === "competitor")) evidence.push("competitor_own_site_cited");
      if (target.website) evidence.push(targetSiteCited > 0 ? "target_site_cited_anyway" : "target_site_not_cited");
      if (sources.some((s) => s.owner === "third_party")) evidence.push("third_party_sources");
    }
    evidence.push(targetMentioned > 0 ? "mentioned_not_recommended" : "absent");
    cards.push({ promptId, answers: rows.length, targetRecommended, targetMentioned, winners, sources, targetSiteCited, evidence });
  }
  return cards;
}

// ---------------- Koşullu Görünürlük Haritası ----------------
export interface ConditionInput { intent: string; answers: number; target_mentioned: number; target_recommended: number; top_competitor: string | null; top_competitor_recs: number }
export interface ConditionRow {
  key: string; answers: number; recommended: number; mentioned: number;
  low: number; high: number;            // önerilme oranının %95 Wilson aralığı
  topCompetitor: string | null;
  lowSample: boolean;                   // 20'den az cevap: yorum yapılmaz
}
import { wilson } from "./metrics.ts";

/** Soruları bir koşula (bugün: soru niyeti) göre gruplar; birden çok ölçüm verilirse cevapları toplar. */
export function conditionMap(runs: ConditionInput[][], minSample = 20): ConditionRow[] {
  const acc = new Map<string, { answers: number; rec: number; men: number; comp: Map<string, number> }>();
  for (const rows of runs) for (const r of rows) {
    const a = acc.get(r.intent) ?? { answers: 0, rec: 0, men: 0, comp: new Map<string, number>() };
    a.answers += r.answers; a.rec += r.target_recommended; a.men += r.target_mentioned;
    if (r.top_competitor) a.comp.set(r.top_competitor, (a.comp.get(r.top_competitor) ?? 0) + r.top_competitor_recs);
    acc.set(r.intent, a);
  }
  return [...acc.entries()].map(([key, a]) => ({
    key, answers: a.answers, recommended: a.rec, mentioned: a.men, ...wilson(a.rec, a.answers),
    topCompetitor: [...a.comp.entries()].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))[0]?.[0] ?? null,
    lowSample: a.answers < minSample,
  })).sort((x, y) => (y.answers ? y.recommended / y.answers : 0) - (x.answers ? x.recommended / x.answers : 0) || x.key.localeCompare(y.key));
}

// ---------------- Aksiyon ve Sonuç Takibi ----------------
export interface ImpactPoint { at: string; k: number; n: number }
export type ImpactVerdict = "no_before" | "no_after" | "up" | "down" | "unclear";
export interface Impact {
  before: (ImpactPoint & { low: number; high: number }) | null;
  after: (ImpactPoint & { low: number; high: number }) | null;
  verdict: ImpactVerdict;
}
/**
 * Aksiyon tarihinden önceki son ölçüm ile sonraki en güncel ölçümü karşılaştırır.
 * "up"/"down" yalnız güven aralıkları ayrışıyorsa verilir; aksi hâlde "unclear" (fark gürültü olabilir).
 * Nedensellik iddiası içermez.
 */
export function actionImpact(points: ImpactPoint[], doneOn: string): Impact {
  const sorted = [...points].sort((a, b) => a.at.localeCompare(b.at));
  const cut = doneOn.slice(0, 10);
  const b = sorted.filter((p) => p.at.slice(0, 10) < cut).pop() ?? null;
  const a = sorted.filter((p) => p.at.slice(0, 10) > cut).pop() ?? null;
  const w = (p: ImpactPoint | null) => (p ? { ...p, ...wilson(p.k, p.n) } : null);
  const before = w(b), after = w(a);
  const verdict: ImpactVerdict = !before ? "no_before" : !after ? "no_after" : after.low > before.high ? "up" : after.high < before.low ? "down" : "unclear";
  return { before, after, verdict };
}

// ---------------- Ürün görünürlüğü ve ürün önerilme oranı ----------------
import { analyzeResponse, hasName, normalize, type BrandRef } from "./metrics.ts";

export interface ProductAnswer { id: string; prompt_id: string; provider: string; answer_text: string; cited_urls: string[] | null }
export interface ProductVisibility {
  productId: string;
  /** Motor bazında: ürün adının geçtiği ve önerildiği cevap sayısı (Wilson aralığıyla) */
  engines: { provider: string; answers: number; mentioned: number; recommended: number; low: number; high: number }[];
  /** Ürünün hiç önerilmediği ve bir rakip markanın önerildiği sorular için kanıt kartları */
  losses: LossCard[];
  /** Ürünün geçtiği soruların kimlikleri */
  promptsMentioned: string[];
}

/**
 * Ürün görünürlüğü: ürün adı markanın mevcut ölçüm cevaplarında aranır (ek API çağrısı yok).
 * Eşleştirme marka ile aynı kurallarla yapılır (tam kelime, liste = öneri, olumsuz ifade hariç).
 * Rakipler MARKA düzeyindedir: "ürün yerine hangi rakip marka önerildi" sorusunu cevaplar, rakip ÜRÜN karşılaştırması değildir.
 */
export function productVisibility(
  answers: ProductAnswer[],
  product: { id: string; name: string; aliases?: string[] },
  brand: { name: string; website: string | null },
  competitors: { id: string; name: string; aliases?: string[]; website: string | null }[],
): ProductVisibility {
  // Ürün adı marka adıyla başlıyorsa markasız hâli de aranır ("Bianchi Oltre" → "Oltre")
  const lowerBrand = brand.name.toLocaleLowerCase("tr-TR");
  const bare = product.name.toLocaleLowerCase("tr-TR").startsWith(lowerBrand + " ") ? product.name.slice(brand.name.length + 1).trim() : "";
  const refs: BrandRef[] = [
    { id: product.id, name: product.name, aliases: [...(product.aliases ?? []), ...(bare.length >= 3 ? [bare] : [])], domain: "", exactOnly: true },
    ...competitors.map((c) => ({ id: c.id, name: c.name, aliases: c.aliases ?? [], domain: domainOf(c.website) })),
  ];
  const mentions: InsightMention[] = [];
  const per = new Map<string, { answers: number; mentioned: number; recommended: number }>();
  const promptsMentioned = new Set<string>();
  for (const a of answers) {
    const hits = analyzeResponse({ promptId: a.prompt_id, provider: a.provider, answerText: a.answer_text, citedUrls: a.cited_urls ?? [] }, refs);
    const e = per.get(a.provider) ?? { answers: 0, mentioned: 0, recommended: 0 };
    e.answers++;
    for (const h of hits) {
      mentions.push({ response_id: a.id, brand_id: h.brandId, mentioned: h.mentioned, recommended: h.recommended });
      if (h.brandId === product.id) {
        if (h.mentioned) { e.mentioned++; promptsMentioned.add(a.prompt_id); }
        if (h.recommended) e.recommended++;
      }
    }
    per.set(a.provider, e);
  }
  const insightBrands: InsightBrand[] = [
    { id: product.id, name: product.name, website: brand.website, isTarget: true },
    ...competitors.map((c) => ({ id: c.id, name: c.name, website: c.website, isTarget: false })),
  ];
  return {
    productId: product.id,
    engines: [...per.entries()].map(([provider, e]) => ({ provider, ...e, ...wilson(e.recommended, e.answers) })).sort((x, y) => x.provider.localeCompare(y.provider)),
    losses: lossCards(answers, mentions, insightBrands),
    promptsMentioned: [...promptsMentioned],
  };
}

// ---------------- Markalı / markasız soru ayrımı ----------------
// Soruda markanın kendi adı geçiyorsa ("X güvenilir mi?") yapay zekâ o markadan neredeyse her zaman söz eder; bu, oranları şişirir.
// Bu yüzden markalı sorular ayrı raporlanır. Rakip adı geçen sorular ("Y'ye alternatifler") markasız sayılır ama işaretlenir.

export type PromptKind = "branded" | "competitor_named" | "unbranded";
export function promptKind(text: string, brand: { name: string; aliases?: string[] }, competitors: { name: string; aliases?: string[] }[] = []): PromptKind {
  const t = normalize(text);
  const names = (b: { name: string; aliases?: string[] }) => [b.name, ...(b.aliases ?? [])].map(normalize).filter((n) => n.length >= 2);
  if (names(brand).some((n) => hasName(t, n))) return "branded";
  if (competitors.some((c) => names(c).some((n) => hasName(t, n)))) return "competitor_named";
  return "unbranded";
}

export interface KindSplit { kind: "branded" | "unbranded"; prompts: number; answers: number; recommended: number; mentioned: number; low: number; high: number }
/** Soru bazlı sonuçları markalı ve markasız olarak ayırır; her grup için önerilme oranı ve Wilson aralığı. */
export function splitByKind(
  rows: { prompt_text: string; answers: number; target_mentioned: number; target_recommended: number }[],
  brand: { name: string; aliases?: string[] },
): KindSplit[] {
  const acc = { branded: { prompts: 0, answers: 0, recommended: 0, mentioned: 0 }, unbranded: { prompts: 0, answers: 0, recommended: 0, mentioned: 0 } };
  for (const r of rows) {
    const k = promptKind(r.prompt_text, brand) === "branded" ? acc.branded : acc.unbranded;
    k.prompts++; k.answers += r.answers; k.recommended += r.target_recommended; k.mentioned += r.target_mentioned;
  }
  return (["unbranded", "branded"] as const).filter((k) => acc[k].prompts > 0).map((k) => ({ kind: k, ...acc[k], ...wilson(acc[k].recommended, acc[k].answers) }));
}

// ---------------- Rakip ürün karşılaştırması ----------------
export interface ProductCompareRow { id: string; name: string; isOwn: boolean; byEngine: Record<string, { answers: number; mentioned: number; recommended: number; low: number; high: number }>; headToHead: { bothMentioned: number; ownWins: number; rivalWins: number } | null }

export interface RivalReason { rivalId: string; quotes: { provider: string; answerId: string; text: string }[]; answers: number }

/** Bir cevabı cümlelere/satırlara böler (liste maddeleri ayrı satır sayılır). */
function sentences(text: string): string[] {
  return text.replace(/\*\*/g, "").split(/\n+|(?<=[.!?])\s+(?=[A-ZÇĞİÖŞÜ0-9"“])/).map((x) => x.replace(/^[\s\-*•#>\d.)]+/, "").trim()).filter((x) => x.length >= 12);
}

/**
 * "Rakip ürün neden önerildi?": rakip ürünün önerildiği ama sizinkinin önerilmediği cevaplardan, rakip ürün adının
 * geçtiği cümleleri alıntılar. Yorum yapmaz, cevabın kendi sözlerini gösterir; ek API çağrısı yok.
 */
export function rivalReasons(
  answers: ProductAnswer[],
  own: { id: string; name: string },
  rivals: { id: string; name: string; rival_brand?: string | null }[],
  brand: { name: string },
  maxQuotes = 3,
): RivalReason[] {
  const out: RivalReason[] = [];
  const ownRow = { id: own.id, name: own.name };
  for (const r of rivals) {
    const quotes: RivalReason["quotes"] = [];
    let n = 0;
    const names = [r.name, ...(r.rival_brand && !normalize(r.name).startsWith(normalize(r.rival_brand)) ? [`${r.rival_brand} ${r.name}`] : [])].map(normalize);
    for (const a of answers) {
      const rows = compareProducts([a], ownRow, [r], brand);
      const e = (row: ProductCompareRow) => row.byEngine[a.provider];
      const o = rows.find((x) => x.isOwn)!, x = rows.find((y) => !y.isOwn)!;
      if (!e(x)?.recommended || e(o)?.recommended) continue;
      n++;
      if (quotes.length >= maxQuotes) continue;
      const hit = sentences(a.answer_text).find((sn) => names.some((nm) => hasName(normalize(sn), nm)));
      if (hit) quotes.push({ provider: a.provider, answerId: a.id, text: hit.length > 280 ? `${hit.slice(0, 277)}…` : hit });
    }
    out.push({ rivalId: r.id, quotes, answers: n });
  }
  return out;
}

/**
 * Kendi ürünü ve rakip ürünler aynı cevaplarda aranır. Her ürün için motor bazında anılma ve önerilme;
 * rakipler için "ikisi aynı cevapta geçtiğinde kim önerildi" sayımı. Ek API çağrısı yok; kural tabanlı.
 */
export function compareProducts(
  answers: ProductAnswer[],
  own: { id: string; name: string },
  rivals: { id: string; name: string; rival_brand?: string | null }[],
  brand: { name: string },
): ProductCompareRow[] {
  const lowerBrand = brand.name.toLocaleLowerCase("tr-TR");
  const bareOf = (name: string, b: string | null | undefined) => {
    const lb = (b ?? "").toLocaleLowerCase("tr-TR");
    const n = name.toLocaleLowerCase("tr-TR");
    for (const pre of [lowerBrand, lb].filter(Boolean)) if (n.startsWith(pre + " ")) return name.slice(pre.length + 1).trim();
    return "";
  };
  const refs: BrandRef[] = [own, ...rivals].map((p) => {
    const bare = bareOf(p.name, (p as { rival_brand?: string | null }).rival_brand);
    const full = (p as { rival_brand?: string | null }).rival_brand && !p.name.toLocaleLowerCase("tr-TR").startsWith(((p as { rival_brand?: string | null }).rival_brand ?? "").toLocaleLowerCase("tr-TR"))
      ? [`${(p as { rival_brand?: string | null }).rival_brand} ${p.name}`] : [];
    return { id: p.id, name: p.name, aliases: [...full, ...(bare.length >= 3 ? [bare] : [])], domain: "", exactOnly: true };
  });
  const stats = new Map<string, Map<string, { answers: number; mentioned: number; recommended: number }>>();
  const h2h = new Map<string, { bothMentioned: number; ownWins: number; rivalWins: number }>(rivals.map((r) => [r.id, { bothMentioned: 0, ownWins: 0, rivalWins: 0 }]));
  for (const a of answers) {
    const hits = analyzeResponse({ promptId: a.prompt_id, provider: a.provider, answerText: a.answer_text, citedUrls: a.cited_urls ?? [] }, refs);
    const by = new Map(hits.map((h) => [h.brandId, h]));
    for (const r of refs) {
      const m = stats.get(r.id) ?? new Map(); const e = m.get(a.provider) ?? { answers: 0, mentioned: 0, recommended: 0 };
      const h = by.get(r.id); e.answers++; if (h?.mentioned) e.mentioned++; if (h?.recommended) e.recommended++;
      m.set(a.provider, e); stats.set(r.id, m);
    }
    const o = by.get(own.id);
    for (const r of rivals) {
      const x = by.get(r.id), t = h2h.get(r.id)!;
      if (o?.mentioned && x?.mentioned) {
        t.bothMentioned++;
        if (o.recommended && !x.recommended) t.ownWins++;
        if (x.recommended && !o.recommended) t.rivalWins++;
      }
    }
  }
  return [{ ...own, isOwn: true }, ...rivals.map((r) => ({ id: r.id, name: r.rival_brand && !r.name.toLocaleLowerCase("tr-TR").startsWith(r.rival_brand.toLocaleLowerCase("tr-TR")) ? `${r.rival_brand} ${r.name}` : r.name, isOwn: false }))].map((p) => ({
    id: p.id, name: p.name, isOwn: p.isOwn,
    byEngine: Object.fromEntries([...(stats.get(p.id) ?? new Map()).entries()].map(([k, e]) => [k, { ...e, ...wilson(e.recommended, e.answers) }])),
    headToHead: p.isOwn ? null : h2h.get(p.id) ?? null,
  }));
}

// ---------------- Nereden satın alınır: cevaplarda kaynak gösterilen satış siteleri ----------------
const MARKETPLACES = ["trendyol.com", "hepsiburada.com", "n11.com", "amazon.com.tr", "amazon.com", "amazon.de", "amazon.co.uk", "amazon.fr", "amazon.it", "amazon.es",
  "ciceksepeti.com", "pazarama.com", "akakce.com", "cimri.com", "epey.com", "mediamarkt.com.tr", "teknosa.com", "vatanbilgisayar.com", "decathlon.com.tr",
  "ebay.com", "walmart.com", "bestbuy.com", "target.com", "etsy.com", "aliexpress.com", "idealo.de", "otto.de", "zalando.com", "argos.co.uk", "currys.co.uk"];
export const isMarketplace = (domain: string) => MARKETPLACES.some((m) => domain === m || domain.endsWith("." + m));

/** Ürünün geçtiği cevaplarda kaynak gösterilen satış siteleri ve ürünün kendi sitesinin kaynak gösterilme sayısı. */
export function shoppingSources(answers: ProductAnswer[], productId: string, productName: string, brand: { name: string; website: string | null }): { marketplaces: { domain: string; answers: number }[]; ownSite: number; productAnswers: number } {
  const vis = productVisibility(answers, { id: productId, name: productName }, brand, []);
  const ids = new Set(vis.promptsMentioned);
  const own = domainOf(brand.website);
  const counts = new Map<string, number>();
  let ownSite = 0, productAnswers = 0;
  for (const a of answers) {
    if (!ids.has(a.prompt_id)) continue;
    const t = normalize(a.answer_text);
    const names = [productName, ...(productName.toLocaleLowerCase("tr-TR").startsWith(brand.name.toLocaleLowerCase("tr-TR") + " ") ? [productName.slice(brand.name.length + 1)] : [])].map(normalize);
    if (!names.some((n) => n.length >= 3 && hasName(t, n))) continue;
    productAnswers++;
    const ds = new Set((a.cited_urls ?? []).map(domainOf).filter(Boolean));
    if (own && [...ds].some((d) => d === own || d.endsWith("." + own))) ownSite++;
    for (const d of ds) if (isMarketplace(d)) counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  return { marketplaces: [...counts.entries()].map(([domain, n]) => ({ domain, answers: n })).sort((x, y) => y.answers - x.answers), ownSite, productAnswers };
}

// ---------------- Motor karşılaştırması ve motorlar arası tutarsızlık ----------------
export interface EngineVisRow { provider: string; brand_id: string; brand_name: string; is_target: boolean; n: number; mentioned: number; recommended: number }
export interface EngineCell { k: number; n: number; mentioned: number; rate: number; low: number; high: number; /** Takip edilen markaların o motordaki tüm önerileri içindeki pay (0–1) */ share: number }
export type GapLevel = "clear" | "large" | "none";
export interface EngineCompareRow {
  brandId: string; name: string; isTarget: boolean;
  byEngine: Record<string, EngineCell>;
  /** En yüksek ve en düşük önerilme oranı arasındaki fark (0–1) */
  gap: number;
  /** clear: güven aralıkları ayrışıyor (fark ölçüm oynaklığıyla açıklanamaz); large: fark ≥ 40 puan ama örneklem küçük; none */
  level: GapLevel;
  high: string | null; low: string | null;
  /** Bir motor hiç anmıyor, diğeri öneriyor */
  ignoredBy: string[];
}

/**
 * Aynı ölçümde motorları yan yana koyar. Ek API çağrısı yok.
 * Tutarsızlık "clear" ancak iki motorun Wilson aralıkları ayrışıyorsa verilir; aksi hâlde küçük örneklemde fark "large" olarak işaretlenir.
 * Bir cevap birden fazla marka önerebilir; oranlar pazar payı değildir.
 */
export function engineComparison(rows: EngineVisRow[]): EngineCompareRow[] {
  const engines = [...new Set(rows.map((r) => r.provider))];
  const byBrand = new Map<string, EngineCompareRow>();
  for (const r of rows) {
    const b = byBrand.get(r.brand_id) ?? { brandId: r.brand_id, name: r.brand_name, isTarget: r.is_target, byEngine: {}, gap: 0, level: "none" as GapLevel, high: null, low: null, ignoredBy: [] };
    b.byEngine[r.provider] = { k: r.recommended, n: r.n, mentioned: r.mentioned, rate: r.n ? r.recommended / r.n : 0, ...wilson(r.recommended, r.n), share: 0 };
    byBrand.set(r.brand_id, b);
  }
  for (const e of engines) {
    const total = [...byBrand.values()].reduce((a, b) => a + (b.byEngine[e]?.k ?? 0), 0);
    for (const b of byBrand.values()) if (b.byEngine[e]) b.byEngine[e].share = total ? b.byEngine[e].k / total : 0;
  }
  const out: EngineCompareRow[] = [];
  for (const b of byBrand.values()) {
    const cells = engines.filter((e) => b.byEngine[e] && b.byEngine[e].n > 0).map((e) => [e, b.byEngine[e]] as const);
    if (cells.length >= 2) {
      const hi = cells.reduce((a, c) => (c[1].rate > a[1].rate ? c : a));
      const lo = cells.reduce((a, c) => (c[1].rate < a[1].rate ? c : a));
      b.gap = hi[1].rate - lo[1].rate;
      b.high = hi[0]; b.low = lo[0];
      b.level = hi[1].low > lo[1].high ? "clear" : b.gap >= 0.4 ? "large" : "none";
      b.ignoredBy = cells.filter(([, c]) => c.mentioned === 0).map(([e]) => e).filter(() => cells.some(([, c]) => c.k > 0));
    }
    out.push(b);
  }
  return out.sort((x, y) => Number(y.isTarget) - Number(x.isTarget) || y.gap - x.gap || x.name.localeCompare(y.name));
}

/** Motor başına en çok kaynak gösterilen alan adları ve yalnız o motorun baktığı siteler. */
export function sourcesByEngine(answers: { provider: string; cited_urls: string[] | null }[], top = 5): { provider: string; answers: number; domains: { domain: string; count: number; only: boolean }[] }[] {
  const per = new Map<string, { answers: number; counts: Map<string, number> }>();
  for (const a of answers) {
    const e = per.get(a.provider) ?? { answers: 0, counts: new Map() };
    e.answers++;
    for (const d of new Set((a.cited_urls ?? []).map(siteKey).filter(Boolean))) e.counts.set(d, (e.counts.get(d) ?? 0) + 1);
    per.set(a.provider, e);
  }
  const used = (p: string, d: string) => (per.get(p)?.counts.get(d) ?? 0) > 0;
  return [...per.entries()].map(([provider, e]) => ({
    provider, answers: e.answers,
    domains: [...e.counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, top)
      .map(([domain, count]) => ({ domain, count, only: [...per.keys()].every((p) => p === provider || !used(p, domain)) })),
  })).sort((a, b) => a.provider.localeCompare(b.provider));
}

// ---------------- Görünürlük tahmini ----------------
export interface ForecastInput { at: string; k: number; n: number }
export interface Forecast {
  /** Tahmin edilen önerilme oranı (0–1) ve aralığı, `days` gün sonrası için */
  value: number; low: number; high: number; days: number;
  /** Haftalık eğim (oran puanı / hafta) ve eğilimin belirgin olup olmadığı */
  perWeek: number; trend: "up" | "down" | "flat";
  points: number; spanDays: number;
}
/**
 * Doğrusal eğilim tahmini (ağırlıklı en küçük kareler; ağırlık = cevap sayısı). Gerçek ölçüm değildir.
 * En az 4 ölçüm ve 14 günlük süre yoksa null döner. Eğilim, eğimin %95 aralığı sıfırı dışlıyorsa "up"/"down"; yoksa "flat".
 */
export function visibilityForecast(pts: ForecastInput[], days = 30, minPoints = 4, minSpanDays = 14): Forecast | null {
  const xs = pts.filter((p) => p.n > 0).map((p) => ({ t: Date.parse(p.at) / 86_400_000, y: p.k / p.n, w: p.n })).sort((a, b) => a.t - b.t);
  if (xs.length < minPoints) return null;
  const t0 = xs[0].t, span = xs[xs.length - 1].t - t0;
  if (span < minSpanDays) return null;
  const W = xs.reduce((a, p) => a + p.w, 0);
  const mt = xs.reduce((a, p) => a + p.w * (p.t - t0), 0) / W, my = xs.reduce((a, p) => a + p.w * p.y, 0) / W;
  const sxx = xs.reduce((a, p) => a + p.w * (p.t - t0 - mt) ** 2, 0);
  const sxy = xs.reduce((a, p) => a + p.w * (p.t - t0 - mt) * (p.y - my), 0);
  const b = sxx > 0 ? sxy / sxx : 0, a = my - b * mt;
  const resid = xs.reduce((acc, p) => acc + p.w * (p.y - (a + b * (p.t - t0))) ** 2, 0) / Math.max(1, W * (xs.length - 2) / xs.length);
  const seB = sxx > 0 ? Math.sqrt(resid / sxx) : Infinity;
  const tf = xs[xs.length - 1].t - t0 + days;
  const yf = a + b * tf;
  // Tahmin aralığı: model belirsizliği + son ölçümün örneklem belirsizliği
  const last = xs[xs.length - 1];
  const seFit = Math.sqrt(resid * (1 / W + (tf - mt) ** 2 / (sxx || 1)));
  const seSample = Math.sqrt(Math.max(last.y * (1 - last.y), 0.01) / last.w);
  const half = 1.96 * Math.sqrt(seFit ** 2 + seSample ** 2);
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const trend: Forecast["trend"] = b - 1.96 * seB > 0 ? "up" : b + 1.96 * seB < 0 ? "down" : "flat";
  return { value: clamp(yf), low: clamp(yf - half), high: clamp(yf + half), days, perWeek: b * 7, trend, points: xs.length, spanDays: Math.round(span) };
}


// ---------------- Kendi site payı (owned-source share) ----------------
export interface OwnedShare {
  /** Kaynak gösterimi toplamı (her cevapta her site bir kez) */
  total: number; own: number; competitor: number; thirdParty: number;
  /** Sitenizin kaynak gösterildiği cevap sayısı ve kaynak gösteren toplam cevap */
  answersCitingOwn: number; answersWithSources: number;
  byEngine: { provider: string; total: number; own: number; competitor: number; thirdParty: number }[];
}
/** Yapay zekânın gösterdiği kaynakların ne kadarı sizin siteniz, rakiplerin siteleri ve üçüncü taraf siteler. Yalnız canlı aramada anlamlı. */
export function ownedSourceShare(answers: (InsightAnswer & { provider?: string })[], brands: InsightBrand[]): OwnedShare {
  const out: OwnedShare = { total: 0, own: 0, competitor: 0, thirdParty: 0, answersCitingOwn: 0, answersWithSources: 0, byEngine: [] };
  const eng = new Map<string, OwnedShare["byEngine"][number]>();
  for (const a of answers) {
    const keys = [...new Set((a.cited_urls ?? []).map(siteKey).filter(Boolean))];
    if (!keys.length) continue;
    out.answersWithSources++;
    const e = eng.get(a.provider ?? "") ?? { provider: a.provider ?? "", total: 0, own: 0, competitor: 0, thirdParty: 0 };
    let citesOwn = false;
    for (const k of keys) {
      const o = ownerOf(k, brands).owner;
      out.total++; e.total++;
      if (o === "target") { out.own++; e.own++; citesOwn = true; } else if (o === "competitor") { out.competitor++; e.competitor++; } else { out.thirdParty++; e.thirdParty++; }
    }
    if (citesOwn) out.answersCitingOwn++;
    eng.set(e.provider, e);
  }
  out.byEngine = [...eng.values()].sort((x, y) => x.provider.localeCompare(y.provider));
  return out;
}
