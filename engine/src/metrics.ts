// AI SaaSavran — görünürlük metrikleri (LLM gerektirmeyen, deterministik çekirdek)
// Not: "recommended" kararı burada kural tabanlıdır (rules_v3: tam kelime eşleşmesi + liste/başlık + öneri ifadeleri). Belirsiz durumlar
// "ambiguous" olarak işaretlenir ve yalnızca bunlar ucuz bir LLM sınıflandırıcısına gider.

export interface BrandRef {
  id: string;
  name: string;
  aliases: string[];
  domain?: string; // ör. "aliusta.com.tr"
  /** Ürün gibi çok kelimeli adlarda ilk kelimeyle (çoğu zaman marka adı) tek başına eşleşmeyi kapatır. */
  exactOnly?: boolean;
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
  "onermiyorum", "onermiyoruz", "onermem", "onerilmez", "tavsiye etmem", "tavsiye etmiyorum", "uzak durun", "kacinin", "kapandi", "kapali",
  "sikayet", "memnun degil", "not recommend", "don t recommend", "wouldn t recommend", "avoid", "closed",
];

// Türkçe çekim ekleri (normalize edilmiş hâlde): "Garantinin", "Akbanka", "Enparadan", "Migroslar"
const TR_SUFFIX = /^(?:y?[iu]|[nsy]?[iu]n|y?[ae]|[dt][ae]n?|l[ae]r(?:[iu]n?)?|l[iu]|s[iu]|y?l[ae]|ki|c[ae])$/;

/**
 * Normalize edilmiş metinde marka adı tam kelime olarak geçiyor mu? (rules_v3)
 * Kabul: tam kelime ("akbank"), alan adı ("akbank.com.tr"), ya da en az 4 harfli adın Türkçe ekli hâli ("garantinin").
 * Ret: başka bir kelimenin başı ("Ada" ≠ "Adalet", "Nova" ≠ "Novartis").
 */
export function hasName(normalizedText: string, needle: string): boolean {
  const t = ` ${normalizedText} `;
  let from = 0;
  for (;;) {
    const i = t.indexOf(` ${needle}`, from);
    if (i < 0) return false;
    const end = i + 1 + needle.length;
    const sp = t.indexOf(" ", end);
    const rest = t.slice(end, sp < 0 ? undefined : sp).replace(/\.+$/, "");
    if (rest === "" || rest.startsWith(".") || (needle.length >= 4 && TR_SUFFIX.test(rest))) return true;
    from = i + 1;
  }
}

// Satır başı listeleme ("1. X", "- X", "**X**", "### X") → öneri listesi işareti
const LIST_LINE = /^\s*(\d+[.)]|[-*•]\s|\*\*|#{2,4}\s)/;

// Öneri ifadeleri (rules_v2): aynı cümlede marka + bu ifade → öneri sayılır
const RECOMMEND_CUES = [
  "oneririm", "oneriyorum", "oneririz", "tavsiye ederim", "tavsiye ediyorum", "tek bir isim", "tek isim",
  "onereceksem", "onerecek olsam", "tavsiyem", "onerim", "derim", "secerdim", "tercih ederdim",
  "en iyi secenek", "en iyi tercih", "en guclu secenek", "ilk tercih", "one cikiyor", "one cikan", "en cok onerilen",
  "i recommend", "i d recommend", "best option", "top pick", "my pick",
];

// Marka adının ilk kelimesi tek başına geçtiğinde de (büyük harfle) markayı yakala: "Garanti Bonus" → Garanti BBVA.
// Yaygın kelimeler hariç (yanlış eşleşmeyi önlemek için).
const COMMON_FIRST_WORDS = new Set([
  "yeni", "usta", "büyük", "küçük", "merkez", "türk", "türkiye", "ilk", "en", "iyi", "ana", "hızlı", "güzel", "altın", "yıldız",
  "best", "the", "new", "first", "smart", "super", "global", "best", "open", "google",
]);
function firstWordPattern(name: string): RegExp | null {
  const words = name.trim().split(/\s+/);
  if (words.length < 2) return null;
  const w = words[0];
  if (w.length < 4 || COMMON_FIRST_WORDS.has(w.toLocaleLowerCase("tr-TR"))) return null;
  if (w[0] !== w[0].toLocaleUpperCase("tr-TR")) return null;
  const esc = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\p{L}\\p{N}])${esc}(?=$|[^\\p{L}\\p{N}]|'|’)`, "u");
}

function sentences(line: string): string[] {
  return line.split(/(?<=[!?])\s+|(?<=[a-zçğıöşü)\]*][.])\s+/i).filter(Boolean);
}

export function analyzeResponse(resp: AIResponse, brands: BrandRef[]): BrandHit[] {
  const lines = resp.answerText.split(/\n+/);
  // İlk kelime iki ayrı markada aynıysa ("Marka A" / "Marka B", "Samsung Galaxy" / "Samsung Pay") tek başına ilk kelime hiçbirine sayılmaz
  const firstOf = (n: string) => n.trim().split(/\s+/)[0].toLocaleLowerCase("tr-TR");
  const firstCount = new Map<string, number>();
  for (const b of brands) if (b.name.trim().includes(" ")) firstCount.set(firstOf(b.name), (firstCount.get(firstOf(b.name)) ?? 0) + 1);
  // Başka bir markanın tek kelimelik adı/takma adı bu markanın ilk kelimesiyle aynıysa ilk kelime tek başına bu markaya sayılmaz
  const singleOwner = new Map<string, Set<string>>();
  for (const b of brands) for (const n of [b.name, ...b.aliases]) if (!n.trim().includes(" ")) {
    const k = n.trim().toLocaleLowerCase("tr-TR"); singleOwner.set(k, (singleOwner.get(k) ?? new Set()).add(b.id));
  }
  const otherOwns = (word: string, id: string) => [...(singleOwner.get(word) ?? [])].some((x) => x !== id);

  const hits = brands.map((b): BrandHit => {
    const needles = [b.name, ...b.aliases].map(normalize).filter((n) => n.length >= 2);
    const fw = firstOf(b.name);
    const first = b.exactOnly || (firstCount.get(fw) ?? 0) > 1 || otherOwns(fw, b.id) ? null : firstWordPattern(b.name);
    const containsBrand = (text: string) => {
      const t = normalize(text);
      return needles.some((n) => hasName(t, n)) || (!!first && first.test(text));
    };

    const mentionLines = lines.filter(containsBrand);
    const mentioned = mentionLines.length > 0;
    const negative = mentionLines.some((l) => NEGATIVE.some((w) => normalize(l).includes(w)));
    const inList = mentionLines.some((l) => LIST_LINE.test(l));
    const cueSentence = mentionLines.some((l) => sentences(l).some((sn) => {
      const n = normalize(sn);
      return containsBrand(sn) && RECOMMEND_CUES.some((c) => n.includes(c)) && !NEGATIVE.some((w) => n.includes(w));
    }));

    const cited =
      !!b.domain &&
      resp.citedUrls.some((u) => {
        const h = hostOf(u);
        return !!h && (h === b.domain || h.endsWith("." + b.domain));
      });

    let recommended = false;
    let ambiguous = false;
    if (mentioned && cueSentence) recommended = true;
    else if (mentioned && !negative && inList) recommended = true;
    else if (mentioned && !negative && !inList) ambiguous = true; // düz metinde geçiyor: öneri mi, bilgi mi?

    return { brandId: b.id, mentioned, recommended, ambiguous, cited, rank: null };
  });

  // Sıralama: cevaptaki GERÇEK liste sırası (izlenmeyen markalar da sayılır).
  // Numaralı liste varsa o esas alınır; yoksa girintisiz madde işaretleri. Alt maddeler (özellik açıklamaları) sayılmaz.
  const numbered = lines.filter((l) => /^\s{0,1}(#{2,4}\s+)?(\*\*)?\d+[.)]\s+/.test(l));
  const bullets = lines.filter((l) => /^\s{0,1}[-*•]\s+/.test(l));
  const headings = lines.filter((l) => /^\s{0,1}(\*\*|#{2,4}\s)/.test(l));
  const items = numbered.length > 0 ? numbered : bullets.length > 0 ? bullets : headings;
  for (const h of hits) {
    if (!h.recommended) continue;
    const b = brands.find((x) => x.id === h.brandId)!;
    const n = [b.name, ...b.aliases].map(normalize).filter((x) => x.length >= 2);
    const fw = firstWordPattern(b.name);
    const i = items.findIndex((line) => n.some((x) => hasName(normalize(line), x)) || (!!fw && fw.test(line)));
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

/**
 * Aynı sorunun tekrarları bağımsız değildir (Growth Lab, 18 Kasım: 4.736 tekrar çiftinde sonuç yalnız %15 değişti, ICC ≈ 0,67).
 * Aralık bu yüzden "etkin örneklem" ile hesaplanır: n_eff = n / (1 + (m − 1)·ICC), m = küme (soru × motor) başına cevap.
 */
export const REPEAT_ICC = 0.67;
export function effectiveN(n: number, clusters?: number, icc = REPEAT_ICC): number {
  if (!clusters || clusters <= 0 || clusters >= n) return n;
  const m = n / clusters;
  return n / (1 + (m - 1) * icc);
}
/** Soru (küme) bazında düzeltilmiş Wilson aralığı. clusters verilmezse düz Wilson. */
export function clusteredWilson(k: number, n: number, clusters?: number, icc = REPEAT_ICC): { low: number; high: number } {
  const ne = effectiveN(n, clusters, icc);
  return ne >= n ? wilson(k, n) : wilson((k * ne) / n, ne);
}
/** Küçük örneklem: 20 cevaptan az ya da (biliniyorsa) 10 farklı sorudan az. */
export const MIN_PROMPTS = 10;
export function isLowSample(n: number, prompts?: number): boolean {
  return n < MIN_SAMPLE || (prompts !== undefined && prompts < MIN_PROMPTS);
}
/**
 * İki oran "başa baş" mı? Fark 10 puandan küçükse ya da aralıklar çakışıyorsa sıra verilmez (18 Kasım ölçüm standardı).
 */
export const TIE_POINTS = 0.10;
export function isTie(a: { k: number; n: number; clusters?: number }, b: { k: number; n: number; clusters?: number }): boolean {
  if (!a.n || !b.n) return false;
  const pa = a.k / a.n, pb = b.k / b.n;
  if (Math.abs(pa - pb) < TIE_POINTS) return true;
  const ia = clusteredWilson(a.k, a.n, a.clusters), ib = clusteredWilson(b.k, b.n, b.clusters);
  return ia.low <= ib.high && ib.low <= ia.high;
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

// ---------------- Takip edilmeyen adlar (kullanıcıya "bu kim?" diye sorulur) ----------------
const GENERIC_CAPS = new Set([
  "türkiye", "türk", "ancak", "bu", "bunlar", "bunun", "şu", "eğer", "örneğin", "ayrıca", "kısaca", "sonuç", "sonuçta", "not", "genel",
  "özellikle", "tek", "en", "iyi", "ve", "veya", "ya", "da", "de", "hangi", "neden", "nasıl", "ne", "kim", "evet", "hayır", "ama", "fakat",
  "kredi", "kart", "kartı", "kartlar", "banka", "bankası", "bankalar", "mobil", "uygulama", "uygulaması", "bankacılık", "hesap", "faiz",
  "kampanya", "kampanyalar", "avantaj", "avantajlar", "artı", "eksi", "öneri", "öneriler", "önerim", "kaynak", "kaynaklar", "güncel",
  "istanbul", "ankara", "izmir", "antalya", "bursa", "kadıköy", "beşiktaş", "ocak", "şubat", "mart", "nisan", "mayıs", "haziran",
  "temmuz", "ağustos", "eylül", "ekim", "kasım", "aralık", "pazartesi", "salı", "çarşamba", "perşembe", "cuma", "cumartesi", "pazar",
  "the", "this", "if", "for", "and", "or", "but", "best", "top", "note", "pros", "cons", "summary", "yes", "no", "chatgpt", "openai",
  "google", "gemini", "ai", "seo", "kobi", "tl", "usd", "ios", "android", "app", "store", "play",
  // Teknik özellik kısaltmaları marka değildir (17 Kasım incelemesi: RAM/GB/GPU aday listesine giriyordu)
  "ram", "rom", "gb", "tb", "mb", "gpu", "cpu", "npu", "ssd", "hdd", "nvme", "usb", "usb-c", "oled", "amoled", "lcd", "led", "hdr",
  "nfc", "gps", "lte", "5g", "4g", "4k", "8k", "hd", "fhd", "qhd", "uhd", "mah", "hz", "wifi", "wi-fi", "bluetooth", "ip67", "ip68",
  "anc", "esim", "faq", "pdf", "api", "vs", "pc", "tv", "diy",
]);
/** "16GB", "5000mAh", "120Hz", "50MP" gibi birimli sayılar */
const SPEC_RE = /^\d+([.,]\d+)?\s?(gb|tb|mb|mah|hz|mp|w|mm|cm|inç|inch|k|g|nm)$/iu;
const NAME_RE = /(?:\p{Lu}[\p{L}\p{N}&.+-]*)(?:\s+(?:\p{Lu}[\p{L}\p{N}&.+-]*))*/gu;

/**
 * Cevaplarda geçen, takip edilmeyen marka benzeri adları sayar (ör. "TEB", "QNB", "VakıfBank").
 * Bilinen markalar, takma adları ve ilk kelime eşleşmeleri hariç tutulur. Kural tabanlıdır; kullanıcı onayıyla kullanılır.
 */
export function untrackedNames(texts: string[], brands: { name: string; aliases: string[] }[], limit = 12): { name: string; count: number }[] {
  const known = brands.flatMap((b) => [b.name, ...b.aliases]).map(normalize).filter(Boolean);
  const firsts = brands.map((b) => firstWordPattern(b.name)).filter((x): x is RegExp => !!x);
  const counts = new Map<string, { name: string; count: number; strong: boolean }>();
  for (const raw of texts) {
    const text = raw.replace(/\[([^\]]*)\]\([^)]*\)/g, " ").replace(/https?:\/\/\S+/g, " ").replace(/[*_#`>]/g, " ");
    for (const line of text.split(/\n+/)) {
      const listLine = /^\s*(\d+[.)]|[-•])\s+/.test(raw.split("\n").find((l) => l.includes(line.trim().slice(0, 20))) ?? "");
      for (const sentence of line.split(/(?<=[.!?:;])\s+/)) {
        for (const m of sentence.matchAll(NAME_RE)) {
          let name = m[0].replace(/['’].*$/u, "").replace(/[.\-+&]+$/u, "").trim();
          // Baştaki/sondaki genel kelimeleri ayıkla ("En iyi Enpara" → "Enpara", "Akbank Mobil" → "Akbank")
          const words = name.split(/\s+/).filter((w) => !GENERIC_CAPS.has(w.toLocaleLowerCase("tr-TR")) && !SPEC_RE.test(w));
          // "TEB Bonus", "VakıfBank Worldcard": kısaltma ya da birleşik yazılmış ilk kelime markanın kendisidir
          if (words.length > 1 && (/^[\p{Lu}\p{N}]{2,6}$/u.test(words[0]) || /\p{Ll}\p{Lu}/u.test(words[0]))) words.splice(1);
          name = words.join(" ");
          if (name.length < 2 || words.length === 0 || words.length > 3) continue;
          const n = normalize(name);
          if (!n || known.some((k) => ` ${n} `.includes(` ${k} `) || ` ${k} `.includes(` ${n} `))) continue;
          if (firsts.some((re) => re.test(name))) continue;
          // Cümle başı: kaldırılan ** / * işaretlerinin ve madde/numara işaretlerinin ardından gelen ilk kelime
          const atStart = (m.index ?? 0) <= (sentence.match(/^[\s\d.)\-•–]*/u)?.[0].length ?? 0);
          const acronym = /^[\p{Lu}\p{N}]{2,6}$/u.test(name);
          const camel = /\p{Ll}\p{Lu}/u.test(name);
          // Liste satırının başındaki kelime ancak başlık gibi tek başına duruyorsa ad sayılır ("2. Kronotrop: …", "- EspressoLab (Alsancak)").
          // Ardından küçük harfli kelime geliyorsa cümlenin ilk kelimesidir ("- Ders çalışmak için:", "* Kafeler genelde …").
          const phraseStart = atStart && /^\s+\p{Ll}/u.test(sentence.slice((m.index ?? 0) + m[0].length));
          const strong = acronym || camel || words.length > 1 || !atStart || (listLine && !phraseStart);
          const key = n;
          const v = counts.get(key) ?? { name, count: 0, strong: false };
          v.count++; v.strong ||= strong; counts.set(key, v);
        }
      }
    }
  }
  return [...counts.values()].filter((v) => v.strong && (v.count >= 2 || /\p{Ll}\p{Lu}|^[\p{Lu}\p{N}]{2,6}$/u.test(v.name)))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "tr")).slice(0, limit).map(({ name, count }) => ({ name, count }));
}

const RELATION_RE = /(?<!\p{L})(?:(?:version|edition|brand|line|arm|tier|concept|division|subsidiary|sister|parent|part|owned|operated|run|premium)(?!\p{L})[^.\n]{0,30}?(?<!\p{L})(?:of|by)|markas[ıi]|kolu|surumu|versiyonu|bunyesinde|catisi altinda|kardes|grubuna|grubundan|ait)(?!\p{L})/iu;

/**
 * Takip edilmeyen bir ad, cevapta bilinen bir markanın alt markası / üst şirketi gibi anlatılıyor mu?
 * Ör. "Mars Athletic / MAC Platinum … The upscale, premium version of MACFit." → "MACFit".
 * Yalnız öneri içindir: kullanıcı onaylamadan hiçbir şey birleştirilmez.
 */
export function relatedBrand(texts: string[], name: string, brands: { name: string; aliases: string[] }[]): string | null {
  const n = normalize(name);
  if (!n) return null;
  const hits = new Map<string, number>();
  for (const raw of texts) {
    const text = raw.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
    // Cevabı maddelere böl: en üst düzey madde/numara satırı ya da boş satır yeni bölüm başlatır; alt maddeler aynı bölümde kalır
    const items: string[] = [];
    let cur = "";
    for (const line of text.split("\n")) {
      if (/^ ?(?:[-*•]|\d+[.)])\s+/.test(line) || line.trim() === "") { if (cur.trim()) items.push(cur); cur = ""; }
      cur += line + "\n";
    }
    if (cur.trim()) items.push(cur);
    for (const item of items) {
      for (const part of item.split(/(?<=[.!?])\s+(?=\p{Lu})/u)) {
        const segN = normalize(item);
        if (!segN.includes(n)) break;
        const partN = normalize(part.replace(/[*_#`>]/g, " "));
        for (const b of brands) {
          for (const k of [b.name, ...b.aliases]) {
            const kn = normalize(k);
            if (kn.length < 3 || kn === n || n.includes(kn) || kn.includes(n)) continue;
            const at = partN.indexOf(kn);
            if (at < 0) continue;
            const near = partN.slice(Math.max(0, at - 45), at + kn.length + 45);
            if (RELATION_RE.test(near)) hits.set(b.name, (hits.get(b.name) ?? 0) + 1);
          }
        }
      }
    }
  }
  let best: string | null = null, max = 0;
  for (const [k, v] of hits) if (v > max) { best = k; max = v; }
  return best;
}
