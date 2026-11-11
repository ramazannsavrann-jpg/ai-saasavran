// Gerçek Google Shopping (SerpApi) bağlantı testi: en fazla 1 arama (ücretsiz pakette ayda 250 arama var).
// Kalan arama sorgusu ücretsizdir. Yalnız bu dosya ya da iş akışı değişince (ve elle) çalışır.
import { parseShopping, shoppingLocale, shoppingSearchesLeft } from "../engine/src/shopping.ts";

const key = process.env.SERPAPI_KEY;
if (!key) { console.log("ATLANDI: SERPAPI_KEY tanımlı değil."); process.exit(0); }
const before = await shoppingSearchesLeft(key);
console.log("Bu ay kalan arama:", before);
if (before !== null && before < 5) { console.log("Kalan arama az, test atlandı."); process.exit(0); }
const loc = shoppingLocale("TR");
const url = new URL("https://serpapi.com/search.json");
for (const [k, v] of Object.entries({ engine: "google_shopping", q: "koşu ayakkabısı", ...loc })) url.searchParams.set(k, v);
url.searchParams.set("api_key", key);
const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
const json: any = await res.json();
console.log("HTTP", res.status, "hata:", json.error ?? "yok");
console.log("Üst alanlar:", Object.keys(json).join(", "));
const first = (json.shopping_results ?? json.categorized_shopping_results?.[0]?.shopping_results ?? [])[0];
if (first) console.log("İlk sonucun alanları:", Object.keys(first).join(", "));
const items = parseShopping(json);
console.log("Okunan ürün sayısı:", items.length);
for (const it of items.slice(0, 5)) console.log(`${it.position}. ${it.title} | ${it.source} | ${it.price} | link:${it.link ? "var" : "yok"}`);
console.log("Test sonrası kalan arama:", await shoppingSearchesLeft(key));
if (!res.ok || items.length === 0) process.exit(1);
