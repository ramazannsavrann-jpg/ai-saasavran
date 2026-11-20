// 20 Kasım mantık denetimi: gerçek cevap kalıplarında yanlış "önerilmedi" / yanlış "önerildi" hataları
import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeResponse } from "../src/metrics.ts";

const B = (id: string, name: string, aliases: string[] = []) => ({ id, name, aliases });
const run = (text: string, brands: ReturnType<typeof B>[]) =>
  Object.fromEntries(analyzeResponse({ promptId: "p", provider: "openai", answerText: text, citedUrls: [] }, brands).map((h) => [h.brandId, h]));

test("aynı satırdaki başka markanın olumsuzluğu bulaşmaz", () => {
  const r = run("1. Akbank — güçlü uygulama; Enpara'dan ise uzak durun.\n2. Enpara", [B("a", "Akbank"), B("e", "Enpara")]);
  assert.equal(r.a.recommended, true); assert.equal(r.a.rank, 1);
  assert.equal(r.e.recommended, false);
});

test("olumlu anlamdaki kelimeler olumsuz sayılmaz", () => {
  assert.equal(run("1. Wise - avoids hidden fees\n2. Revolut", [B("w", "Wise")]).w.recommended, true);
  assert.equal(run("1. Trendyol: şikayet oranı düşük\n2. Hepsiburada", [B("t", "Trendyol")]).t.recommended, true);
  assert.equal(run("1. Rixos: kapalı havuzu ile öne çıkıyor\n2. Titanic", [B("r", "Rixos")]).r.recommended, true);
  assert.equal(run("1. Chime - few complaints, top pick\n2. Ally", [B("c", "Chime")]).c.recommended, true);
});

test("gerçek olumsuzluk hâlâ yakalanır", () => {
  assert.equal(run("1. X Bank: çok şikayet var, tavsiye etmem", [B("x", "X Bank")]).x.recommended, false);
  assert.equal(run("- Y Shop: avoid it, many complaints", [B("y", "Y Shop")]).y.recommended, false);
  assert.equal(run("- Z Cafe permanently closed", [B("z", "Z Cafe")]).z.recommended, false);
});

test("olumsuz başlık altındaki liste maddeleri öneri sayılmaz", () => {
  const r = run("Önerilerim:\n1. Akbank\n\nKaçınmanız gerekenler:\n1. X Bank\n2. Y Bank", [B("a", "Akbank"), B("x", "X Bank"), B("y", "Y Bank")]);
  assert.equal(r.a.recommended, true); assert.equal(r.x.recommended, false); assert.equal(r.y.recommended, false);
  const e = run("Top picks:\n- Ally\n\nBanks to avoid:\n- Bad Bank", [B("a", "Ally"), B("b", "Bad Bank")]);
  assert.equal(e.a.recommended, true); assert.equal(e.b.recommended, false);
});

test("gündelik kelime olan marka adı küçük harfle ya da -li ekiyle sayılmaz", () => {
  const g = [B("g", "Garanti BBVA", ["Garanti"])];
  assert.equal(run("1. Hepsiburada: 2 yıl garantili ürünler", g).g.mentioned, false);
  assert.equal(run("Ürüne 2 yıl garanti verilir.", g).g.mentioned, false);
  assert.equal(run("- Garanti'nin uygulaması iyi", g).g.mentioned, true);
  assert.equal(run("1. Getir\n2. Yemeksepeti", [B("gt", "Getir")]).gt.recommended, true);
  assert.equal(run("Siparişi kapına getir diyorsan hızlı market seç.", [B("gt", "Getir")]).gt.mentioned, false);
});

test("'X yerine Y' cümlesinde X önerilmiş sayılmaz", () => {
  const r = run("Getir yerine Migros Sanal Market'i öneririm.", [B("g", "Getir"), B("m", "Migros Sanal Market")]);
  assert.equal(r.g.recommended, false); assert.equal(r.m.recommended, true);
  const e = run("I recommend Ally instead of Chase.", [B("a", "Ally"), B("c", "Chase")]);
  assert.equal(e.a.recommended, true); assert.equal(e.c.recommended, false);
});

test("ayrı numaralı listelerde sıra kendi listesinde sayılır", () => {
  const r = run("Bütçe dostu:\n1. Xiaomi\n2. Realme\n\nPremium:\n1. Apple\n2. Samsung", [B("ap", "Apple"), B("x", "Xiaomi"), B("s", "Samsung")]);
  assert.equal(r.x.rank, 1); assert.equal(r.ap.rank, 1); assert.equal(r.s.rank, 2);
  const one = run("1. A Co\n2. B Co\n3. C Co", [B("c", "C Co")]);
  assert.equal(one.c.rank, 3);
});
