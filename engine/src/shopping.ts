// Google Shopping görünürlüğü: SerpApi üzerinden Google Shopping arama sonuçlarını alır,
// kullanıcının ürününü ve rakip ürünlerini listede arar (sıra, fiyat, satıcı).
// Google'ın Shopping sonuçlarını okumak için resmi bir API'si yoktur; SerpApi bu sonuçları JSON olarak verir.
// SerpApi yalnız başarılı aramaları sayar; hesap bilgisi (kalan arama) sorgusu ücretsizdir ve kotadan düşmez.

import type { FetchLike } from "./providers/types.ts";
import { hasName, normalize } from "./metrics.ts";

export interface ShoppingItem {
  position: number;
  title: string;
  source: string | null;   // satıcı / mağaza
  price: string | null;
  extractedPrice: number | null;
  link: string | null;
}

export interface ShoppingTarget { id: string; name: string; brand?: string | null; kind: "own" | "rival" }

export interface ShoppingRow extends ShoppingItem { match: { id: string; kind: "own" | "rival" } | null }

export interface ShoppingResult {
  query: string;
  country: string;
  items: ShoppingRow[];          // en fazla 20
  own: { position: number; price: string | null; seller: string | null } | null;   // listedeki ilk eşleşme
  ownCount: number;              // listede ürününüzün kaç kez geçtiği (farklı satıcılar)
  rivals: { id: string; position: number; price: string | null; seller: string | null }[];
}

/** Ülke koduna göre Google ayarları. */
export function shoppingLocale(country?: string | null): { gl: string; hl: string; google_domain: string } {
  const c = (country || "TR").toUpperCase();
  if (c === "TR") return { gl: "tr", hl: "tr", google_domain: "google.com.tr" };
  const domains: Record<string, string> = { GB: "google.co.uk", DE: "google.de", FR: "google.fr", NL: "google.nl", ES: "google.es", IT: "google.it", AE: "google.ae", US: "google.com" };
  const langs: Record<string, string> = { DE: "de", FR: "fr", NL: "nl", ES: "es", IT: "it" };
  return { gl: c.toLowerCase(), hl: langs[c] ?? "en", google_domain: domains[c] ?? "google.com" };
}

/** Aranacak sorgu: kullanıcının yazdığı alışveriş sorgusu, yoksa marka + ürün adı. */
export function shoppingQuery(brand: string, product: string, custom?: string | null): string {
  const q = custom?.trim();
  if (q) return q.slice(0, 120);
  return normalize(product).includes(normalize(brand)) ? product : `${brand} ${product}`;
}

const STOP = new Set(["ve", "ile", "for", "the", "and", "de", "da"]);
function tokens(s: string): string[] { return normalize(s).split(" ").filter((t) => (t.length >= 2 || /^\d$/.test(t)) && !STOP.has(t)); }

/**
 * Bir ilan başlığı ürünle eşleşiyor mu? Ürün adının tüm anlamlı kelimeleri başlıkta geçmeli.
 * Marka verildiyse marka adı da başlıkta ya da satıcı adında geçmeli (aynı adlı başka markanın ürünü sayılmasın).
 */
export function titleMatches(title: string, target: { name: string; brand?: string | null }, source?: string | null): boolean {
  const t = normalize(title);
  const words = tokens(target.name);
  if (!words.length) return false;
  if (!words.every((w) => hasName(t, w))) return false;
  if (target.brand) {
    const b = normalize(target.brand);
    const inTitle = hasName(t, b);
    const inSource = !!source && normalize(source).includes(b);
    const brandInName = hasName(words.join(" "), b);
    if (!inTitle && !inSource && !brandInName) return false;
  }
  return true;
}

/** SerpApi google_shopping cevabını sade listeye çevirir (eski ve yeni sayfa düzenleri). */
export function parseShopping(json: any): ShoppingItem[] {
  const raw: any[] = Array.isArray(json?.shopping_results) && json.shopping_results.length ? json.shopping_results
    : Array.isArray(json?.categorized_shopping_results) ? json.categorized_shopping_results.flatMap((c: any) => c?.shopping_results ?? [])
    : Array.isArray(json?.inline_shopping_results) ? json.inline_shopping_results : [];
  const out: ShoppingItem[] = [];
  for (const r of raw) {
    const title = String(r?.title ?? "").trim();
    if (!title) continue;
    const ep = typeof r?.extracted_price === "number" ? r.extracted_price : null;
    out.push({
      position: out.length + 1,
      title: title.slice(0, 200),
      source: r?.source ? String(r.source).slice(0, 80) : null,
      price: r?.price ? String(r.price).slice(0, 40) : null,
      extractedPrice: ep,
      link: typeof r?.product_link === "string" ? r.product_link : typeof r?.link === "string" ? r.link : null,
    });
    if (out.length >= 20) break;
  }
  return out;
}

/** Listede kendi ürününüzü ve rakip ürünleri işaretler. Bir ilan yalnız bir ürüne eşlenir (önce kendi ürününüz). */
export function matchShopping(items: ShoppingItem[], targets: ShoppingTarget[], query: string, country: string): ShoppingResult {
  const ordered = [...targets].sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "own" ? -1 : 1));
  const rows: ShoppingRow[] = items.map((it) => {
    const m = ordered.find((t) => titleMatches(it.title, t, it.source));
    return { ...it, match: m ? { id: m.id, kind: m.kind } : null };
  });
  const ownRows = rows.filter((r) => r.match?.kind === "own");
  const first = ownRows[0];
  const rivals: ShoppingResult["rivals"] = [];
  for (const t of targets.filter((x) => x.kind === "rival")) {
    const r = rows.find((x) => x.match?.id === t.id);
    if (r) rivals.push({ id: t.id, position: r.position, price: r.price, seller: r.source });
  }
  return {
    query, country, items: rows,
    own: first ? { position: first.position, price: first.price, seller: first.source } : null,
    ownCount: ownRows.length, rivals,
  };
}

export class ShoppingError extends Error {
  readonly kind: "auth" | "quota" | "transient" | "bad_response";
  constructor(message: string, kind: "auth" | "quota" | "transient" | "bad_response") { super(message); this.kind = kind; }
}

/** Google Shopping araması (SerpApi). Hata durumunda ShoppingError fırlatır. */
export async function searchShopping(o: { apiKey: string; query: string; country?: string | null; fetchFn?: FetchLike }): Promise<ShoppingItem[]> {
  const loc = shoppingLocale(o.country);
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google_shopping");
  url.searchParams.set("q", o.query);
  url.searchParams.set("gl", loc.gl);
  url.searchParams.set("hl", loc.hl);
  url.searchParams.set("google_domain", loc.google_domain);
  url.searchParams.set("api_key", o.apiKey);
  let res: Response;
  try { res = await (o.fetchFn ?? fetch)(url.toString(), { signal: AbortSignal.timeout(60_000) }); }
  catch (e) { throw new ShoppingError(`bağlantı: ${(e as Error).message}`, "transient"); }
  const json = await res.json().catch(() => null) as any;
  if (res.status === 401 || res.status === 403) throw new ShoppingError("SerpApi anahtarı geçersiz", "auth");
  if (res.status === 429) throw new ShoppingError("SerpApi aylık arama hakkı doldu", "quota");
  if (!res.ok) throw new ShoppingError(`SerpApi HTTP ${res.status}`, "transient");
  if (json?.error) {
    const msg = String(json.error);
    // Sonuç bulunamaması hata değildir: boş liste
    if (/hasn't returned any results|no results/i.test(msg)) return [];
    if (/run out of searches|plan.*limit/i.test(msg)) throw new ShoppingError(msg.slice(0, 160), "quota");
    if (/invalid api key/i.test(msg)) throw new ShoppingError("SerpApi anahtarı geçersiz", "auth");
    throw new ShoppingError(msg.slice(0, 160), "bad_response");
  }
  return parseShopping(json);
}

/** Bu ay kalan SerpApi arama hakkı (ücretsiz sorgu; kotadan düşmez). Okunamazsa null. */
export async function shoppingSearchesLeft(apiKey: string, fetchFn?: FetchLike): Promise<number | null> {
  try {
    const res = await (fetchFn ?? fetch)(`https://serpapi.com/account.json?api_key=${encodeURIComponent(apiKey)}`, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) return null;
    const j = await res.json() as any;
    const n = j?.total_searches_left ?? j?.plan_searches_left;
    return typeof n === "number" ? n : null;
  } catch { return null; }
}
