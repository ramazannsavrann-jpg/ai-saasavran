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
