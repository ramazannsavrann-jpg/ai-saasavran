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
const sameSite = (domain: string, brandDomain: string) => !!brandDomain && (domain === brandDomain || domain.endsWith("." + brandDomain));

function ownerOf(domain: string, brands: InsightBrand[]): { owner: SourceOwner; ownerName: string | null } {
  for (const b of brands) {
    if (sameSite(domain, domainOf(b.website))) return { owner: b.isTarget ? "target" : "competitor", ownerName: b.name };
  }
  return { owner: "third_party", ownerName: null };
}

function index(answers: InsightAnswer[], mentions: InsightMention[]) {
  const byResp = new Map<string, InsightMention[]>();
  for (const m of mentions) byResp.set(m.response_id, [...(byResp.get(m.response_id) ?? []), m]);
  return answers.map((a) => ({
    a,
    domains: [...new Set((a.cited_urls ?? []).map(domainOf).filter(Boolean))],
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
    { id: product.id, name: product.name, aliases: [...(product.aliases ?? []), ...(bare.length >= 3 ? [bare] : [])], domain: "" },
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
    return { id: p.id, name: p.name, aliases: [...full, ...(bare.length >= 3 ? [bare] : [])], domain: "" };
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
