import { test } from "node:test";
import assert from "node:assert/strict";
import { matchShopping, parseShopping, searchShopping, shoppingLocale, shoppingQuery, titleMatches, ShoppingError } from "../src/shopping.ts";

const SAMPLE = {
  shopping_results: [
    { position: 1, title: "Marka C Hızlı 3 Erkek Koşu Ayakkabısı", source: "Mağaza X", price: "2.499,00 TL", extracted_price: 2499, product_link: "https://example.com/1" },
    { position: 2, title: "Marka A Rüzgar 2 Koşu Ayakkabısı Siyah", source: "Mağaza Y", price: "1.999,00 TL", extracted_price: 1999, product_link: "https://example.com/2" },
    { position: 3, title: "Marka B Rüzgar 2 Taklit", source: "Mağaza Z", price: "499 TL" },
    { position: 4, title: "Marka A Rüzgar 2'yi alın", source: "Marka A Resmi Mağaza", price: "1.899 TL" },
    { title: "" },
  ],
};

test("Shopping: SerpApi cevabı sade listeye çevrilir (boş başlık atlanır, sıra yeniden verilir)", () => {
  const items = parseShopping(SAMPLE);
  assert.equal(items.length, 4);
  assert.deepEqual(items.map((i) => i.position), [1, 2, 3, 4]);
  assert.equal(items[0].extractedPrice, 2499);
  assert.equal(items[2].link, null);
  // yeni düzen: kategorili sonuçlar
  assert.equal(parseShopping({ categorized_shopping_results: [{ shopping_results: SAMPLE.shopping_results.slice(0, 2) }] }).length, 2);
  assert.equal(parseShopping({}).length, 0);
});

test("Shopping: başlık eşleşmesi tüm kelimeleri ve markayı ister; Türkçe ekleri tanır", () => {
  assert.equal(titleMatches("Marka A Rüzgar 2 Koşu Ayakkabısı", { name: "Rüzgar 2", brand: "Marka A" }), true);
  assert.equal(titleMatches("Marka B Rüzgar 2 Taklit", { name: "Rüzgar 2", brand: "Marka A" }), false, "başka markanın aynı adlı ürünü");
  assert.equal(titleMatches("Rüzgar 2 koşu", { name: "Rüzgar 2", brand: "Marka A" }, "Marka A Resmi Mağaza"), true, "marka satıcı adında");
  assert.equal(titleMatches("Marka A Rüzgar 3", { name: "Rüzgar 2", brand: "Marka A" }), false, "farklı model numarası");
  // 12 Kasım canlı kontrolü: kitap/kılavuz ve aksesuar ilanları ürünün kendisi sayılmaz
  assert.equal(titleMatches("Sony WH-1000XM6 User Guide: Comprehensive Setup", { name: "WH-1000XM6", brand: "Sony" }), false, "kılavuz kitabı");
  assert.equal(titleMatches("Sony WH-1000XM6 için Kulak Yastığı Süngeri", { name: "WH-1000XM6", brand: "Sony" }), false, "yedek yastık");
  assert.equal(titleMatches("WH-1000XM6 Uyumlu Taşıma Kılıfı", { name: "WH-1000XM6", brand: "Sony" }), false, "kılıf");
  assert.equal(titleMatches("Sony WH-1000XM6 Kulak Üstü Bluetooth Kulaklık Gümüş", { name: "WH-1000XM6", brand: "Sony" }), true);
  assert.equal(titleMatches("WH-1000XM6 The Best Noise Cancelling Wireless Headphones", { name: "WH-1000XM6", brand: "Sony" }), true, "model kodu markasız da yeterli");
  assert.equal(titleMatches("Sony Wh-1000XM5 Kulak Üstü Kulaklık", { name: "WH-1000XM6", brand: "Sony" }), false, "önceki model");
  assert.equal(titleMatches("Marka A Kılıf Pro Taşıma Çantası", { name: "Kılıf Pro", brand: "Marka A" }), true, "ürün adının kendisi aksesuar kelimesi içeriyorsa");
  assert.equal(titleMatches("Marka A Rüzgar 2'yi alın", { name: "Rüzgar 2", brand: "Marka A" }), true);
});

test("Shopping: kendi ürününüz ve rakip ürün sırası, fiyatı, satıcısı bulunur", () => {
  const r = matchShopping(parseShopping(SAMPLE), [
    { id: "own", name: "Rüzgar 2", brand: "Marka A", kind: "own" },
    { id: "riv", name: "Hızlı 3", brand: "Marka C", kind: "rival" },
  ], "koşu ayakkabısı", "TR");
  assert.deepEqual(r.own, { position: 2, price: "1.999,00 TL", seller: "Mağaza Y" });
  assert.equal(r.ownCount, 2);
  assert.deepEqual(r.rivals, [{ id: "riv", position: 1, price: "2.499,00 TL", seller: "Mağaza X" }]);
  assert.equal(r.items[2].match, null);
  const none = matchShopping(parseShopping(SAMPLE), [{ id: "own", name: "Fırtına", brand: "Marka A", kind: "own" }], "q", "TR");
  assert.equal(none.own, null);
  assert.equal(none.ownCount, 0);
});

test("Shopping: sorgu ve ülke ayarları", () => {
  assert.equal(shoppingQuery("Marka A", "Rüzgar 2"), "Marka A Rüzgar 2");
  assert.equal(shoppingQuery("Marka A", "Marka A Rüzgar 2"), "Marka A Rüzgar 2");
  assert.equal(shoppingQuery("Marka A", "Rüzgar 2", "  erkek koşu ayakkabısı "), "erkek koşu ayakkabısı");
  assert.deepEqual(shoppingLocale(null), { gl: "tr", hl: "tr", google_domain: "google.com.tr" });
  assert.equal(shoppingLocale("DE").hl, "de");
  assert.equal(shoppingLocale("BR").google_domain, "google.com");
});

test("Shopping: SerpApi hataları sınıflanır; sonuç yoksa boş liste", async () => {
  const fake = (status: number, body: unknown) => (async () => new Response(JSON.stringify(body), { status })) as any;
  assert.deepEqual(await searchShopping({ apiKey: "k", query: "q", fetchFn: fake(200, { error: "Google hasn't returned any results for this query." }) }), []);
  await assert.rejects(searchShopping({ apiKey: "k", query: "q", fetchFn: fake(401, { error: "Invalid API key." }) }), (e: ShoppingError) => e.kind === "auth");
  await assert.rejects(searchShopping({ apiKey: "k", query: "q", fetchFn: fake(429, { error: "Your account has run out of searches." }) }), (e: ShoppingError) => e.kind === "quota");
  await assert.rejects(searchShopping({ apiKey: "k", query: "q", fetchFn: fake(500, {}) }), (e: ShoppingError) => e.kind === "transient");
  let url = "";
  const ok = (async (u: string) => { url = u; return new Response(JSON.stringify(SAMPLE), { status: 200 }); }) as any;
  assert.equal((await searchShopping({ apiKey: "k", query: "koşu ayakkabısı", country: "TR", fetchFn: ok })).length, 4);
  assert.match(url, /engine=google_shopping/);
  assert.match(url, /gl=tr/);
});
