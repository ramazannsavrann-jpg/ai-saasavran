import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-ignore: düz JavaScript (statik site)
import { buildIndex, sectorOf, leaders, indexCsv } from "../../web/site/visibility-index.mjs";
// @ts-ignore
import { MEASUREMENTS } from "../../web/site/measurements.mjs";

const eng = (provider: string, type: string, answers: number, brands: [string, number, number][]) =>
  ({ provider, measurement_type: type, answers, at: "2026-11-18T10:00:00Z", brands: brands.map(([name, recommended, mentioned]) => ({ name, recommended, mentioned, first: 0 })) });

test("sektör: Türkçe ve İngilizce sorular doğru gruba düşer (büyük I dahil)", () => {
  assert.equal(sectorOf("Where should I shop for Black Friday deals this year?"), "retail");
  assert.equal(sectorOf("Which IVF clinic… Which Turkish hospital is best for IVF?"), "hospital");
  assert.equal(sectorOf("Telefon almadan önce hangi Türk YouTuber'ın incelemesini izlemeliyim?"), "youtube");
  assert.equal(sectorOf("Which carrier has the best Black Friday phone deals?"), "carriers");
  assert.equal(sectorOf("Uçakta ve yolculukta kullanmak için hangi kulak üstü kulaklığı önerirsin?"), "headphones");
  assert.equal(sectorOf("Hangi kalem daha iyi?"), "other");
});

test("toplam yalnız canlı aramalı cevaplardan; Gemini (model bilgisi) ayrı", () => {
  const items = [
    { lang: "tr", question: "En iyi televizyon hangisi?", at: "2026-11-18T10:00:00Z", engines: [
      eng("openai", "live_search", 4, [["LG", 4, 4], ["Samsung", 1, 2]]),
      eng("claude", "live_search", 4, [["LG", 1, 3], ["Samsung", 3, 4]]),
      eng("gemini", "model_knowledge", 4, [["Sony", 4, 4]]),
    ] },
  ];
  const idx = buildIndex(items);
  const s = idx.groups.find((g: any) => g.lang === "tr").sectors[0];
  assert.equal(s.key, "tv");
  assert.equal(s.live.n, 8);
  assert.deepEqual(s.live.list.map((b: any) => [b.name, b.rec]), [["LG", 5], ["Samsung", 4]]);
  assert.ok(!s.live.list.some((b: any) => b.name === "Sony"));
  assert.equal(s.gemini.list[0].name, "Sony");
  // 5/8 ile 4/8 arası 12,5 puan: başa baş değil
  assert.equal(leaders(s.live).length, 1);
  assert.match(indexCsv(idx), /tr,"TVs",live_search_all,"LG",5,7,8/);
});

test("10 puandan küçük fark başa baş", () => {
  assert.equal(leaders({ n: 20, list: [{ name: "A", rec: 10 }, { name: "B", rec: 9 }, { name: "C", rec: 7 }] }).length, 2);
  assert.equal(leaders({ n: 0, list: [] }).length, 0);
});

test("yayımlanan ölçümlerin en az %90'ı bir sektöre girer (haftalık yeni sorular yayını kırmasın)", () => {
  const idx = buildIndex(MEASUREMENTS.items);
  assert.ok(idx.other.length <= MEASUREMENTS.items.length * 0.1, `sektörsüz: ${idx.other.join(" | ")}`);
});
