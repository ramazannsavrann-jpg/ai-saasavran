import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeResponse } from "../src/metrics.ts";

const hit = (name: string, aliases: string[], text: string) =>
  analyzeResponse({ promptId: "p", provider: "x", answerText: text, citedUrls: [] }, [{ id: "b", name, aliases }])[0].mentioned;

test("Seattle Coffee Study: şehir adı tek başına marka sayılmaz (video ölçümü hatası)", () => {
  assert.equal(hit("Seattle Coffee Study (video)", [], "Seattle has many good cafes. Try Espresso Vivace."), false);
  assert.equal(hit("Seattle Coffee Study (video)", [], "Seattle Coffee Works is near Pike Place."), false);
  // Ad "(video)" eki taşıdığı için cevapta tam ad geçmez; sayılması için takma ad ("Seattle Coffee Study") tanımlanmalı
  assert.equal(hit("Seattle Coffee Study (video)", [], "Seattle Coffee Study is a video series."), false);
  assert.equal(hit("Seattle Coffee Study (video)", ["Seattle Coffee Study"], "Seattle Coffee Study is a video series."), true);
});

test("Tam ad ve tanımlı takma ad sayılır; genel kelime tek başına sayılmaz", () => {
  assert.equal(hit("Garanti BBVA", [], "Garanti Bonus kartını karşılaştırın."), false);
  assert.equal(hit("Garanti BBVA", ["Garanti Bonus"], "Garanti Bonus kartını karşılaştırın."), true);
  assert.equal(hit("Garanti BBVA", ["Garanti"], "Ürünün iki yıl garanti süresi var."), false);
});
