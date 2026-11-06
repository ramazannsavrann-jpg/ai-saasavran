// AI SaaSavran — görünürlük metrikleri (LLM gerektirmeyen, deterministik çekirdek)
// Not: "recommended" kararı burada kural tabanlıdır (rules_v1). Belirsiz durumlar
// "ambiguous" olarak işaretlenir ve yalnızca bunlar ucuz bir LLM sınıflandırıcısına gider.

export interface BrandRef {
  id: string;
  name: string;
  aliases: string[];
  domain?: string; // ör. "aliusta.com.tr"
}

export interface AIResponse {
  promptId: string;
  provider: string;
  answerText: string;
  citedUrls: string[];
}

export interface BrandHit {
  brandId: string;
  mentioned: boolean;
  recommended: boolean;
  ambiguous: boolean; // kurallar karar veremedi → LLM'e gönder
  cited: boolean;
  rank: number | null;
}

// Türkçe büyük/küçük harf ve aksan normalizasyonu ("İ" → "i", "ı" → "i", "Ş" → "s")
export function normalize(s: string): string {
  return s
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9\s.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

// Olumsuz bağlam: "X'ten uzak durun", "X önermiyorum", "X kapandı"
const NEGATIVE = [
  "onermiyorum", "onerilmez", "uzak durun", "kacinin", "kapandi", "kapali",
  "sikayet", "not recommend", "avoid", "closed",
];

// Satır başı listeleme ("1. X", "- X", "**X**") → öneri listesi işareti
const LIST_LINE = /^\s*(\d+[.)]|[-*•])\s+/;

export function analyzeResponse(resp: AIResponse, brands: BrandRef[]): BrandHit[] {
  const lines = resp.answerText.split(/\n+/);

  const hits = brands.map((b): BrandHit => {
    const needles = [b.name, ...b.aliases].map(normalize).filter((n) => n.length >= 2);
    const containsBrand = (text: string) => {
      const t = ` ${normalize(text)} `;
      return needles.some((n) => t.includes(` ${n} `) || t.includes(` ${n}`));
    };

    const mentionLines = lines.filter(containsBrand);
    const mentioned = mentionLines.length > 0;
    const negative = mentionLines.some((l) => NEGATIVE.some((w) => normalize(l).includes(w)));
    const inList = mentionLines.some((l) => LIST_LINE.test(l));

    const cited =
      !!b.domain &&
      resp.citedUrls.some((u) => {
        const h = hostOf(u);
        return !!h && (h === b.domain || h.endsWith("." + b.domain));
      });

    let recommended = false;
    let ambiguous = false;
    if (mentioned && !negative && inList) recommended = true;
    else if (mentioned && !negative && !inList) ambiguous = true; // düz metinde geçiyor: öneri mi, bilgi mi?

    return { brandId: b.id, mentioned, recommended, ambiguous, cited, rank: null };
  });

  // Sıralama: cevaptaki GERÇEK liste sırası (izlenmeyen markalar da sayılır).
  // Numaralı liste varsa o esas alınır; yoksa girintisiz madde işaretleri. Alt maddeler (özellik açıklamaları) sayılmaz.
  const numbered = lines.filter((l) => /^\s{0,1}\d+[.)]\s+/.test(l));
  const items = numbered.length > 0 ? numbered : lines.filter((l) => /^\s{0,1}[-*•]\s+/.test(l));
  for (const h of hits) {
    if (!h.recommended) continue;
    const b = brands.find((x) => x.id === h.brandId)!;
    const n = [b.name, ...b.aliases].map(normalize).filter((x) => x.length >= 2);
    const i = items.findIndex((line) => n.some((x) => ` ${normalize(line)} `.includes(` ${x}`)));
    h.rank = i >= 0 ? i + 1 : null;
  }
  return hits;
}

// Wilson güven aralığı — tek cevaba bakıp kesin sonuç çıkarmamak için
export function wilson(successes: number, n: number, z = 1.96): { low: number; high: number } {
  if (n === 0) return { low: 0, high: 1 };
  const p = successes / n;
  const denom = 1 + (z * z) / n;
  const center = (p + (z * z) / (2 * n)) / denom;
  const margin = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom;
  return { low: Math.max(0, center - margin), high: Math.min(1, center + margin) };
}

export interface Rate { value: number; low: number; high: number; n: number }

export interface BrandSummary {
  brandId: string;
  mentionRate: Rate;
  recommendationRate: Rate;
  citationRate: Rate;
  competitorShare: number; // önerilerdeki pay (bizim + rakipler = 1)
  lowConfidence: boolean;  // örneklem küçük → raporda uyarı
}

const MIN_SAMPLE = 20;

export function summarize(allHits: BrandHit[][], brandIds: string[]): BrandSummary[] {
  const n = allHits.length;
  const rate = (k: number): Rate => ({ value: n ? k / n : 0, ...wilson(k, n), n });

  const recTotals = new Map<string, number>();
  for (const id of brandIds) {
    recTotals.set(id, allHits.filter((hs) => hs.find((h) => h.brandId === id)?.recommended).length);
  }
  const allRecs = [...recTotals.values()].reduce((a, b) => a + b, 0);

  return brandIds.map((id) => {
    const get = (f: (h: BrandHit) => boolean) =>
      allHits.filter((hs) => { const h = hs.find((x) => x.brandId === id); return !!h && f(h); }).length;
    return {
      brandId: id,
      mentionRate: rate(get((h) => h.mentioned)),
      recommendationRate: rate(recTotals.get(id)!),
      citationRate: rate(get((h) => h.cited)),
      competitorShare: allRecs ? recTotals.get(id)! / allRecs : 0,
      lowConfidence: n < MIN_SAMPLE,
    };
  });
}
