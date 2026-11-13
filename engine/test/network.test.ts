import { test } from "node:test";
import assert from "node:assert/strict";
import { sourceNetwork } from "../src/network.ts";

test("Kaynak ağı: motor sayısına göre sıralı; rakip kalesi, sizin kaleniz, ortak kaynak", () => {
  const brands = [{ id: "T", name: "Biz", website: "biz.com", isTarget: true }, { id: "R", name: "Rakip", website: "rakip.com", isTarget: false }];
  const answers = [
    { id: "a1", provider: "openai", cited_urls: ["https://rehber.com/1", "https://forum.net/x"] },
    { id: "a2", provider: "claude", cited_urls: ["https://rehber.com/2", "https://haber.com/y"] },
    { id: "a3", provider: "openai", cited_urls: ["https://haber.com/z", "https://www.rehber.com/3"] },
    { id: "a4", provider: "gemini", cited_urls: ["https://forum.net/q"] },
  ];
  const ments = [
    { response_id: "a1", brand_id: "R", recommended: true }, { response_id: "a2", brand_id: "R", recommended: true },
    { response_id: "a3", brand_id: "T", recommended: true }, { response_id: "a3", brand_id: "R", recommended: true },
    { response_id: "a2", brand_id: "T", recommended: false },
  ];
  const net = sourceNetwork(answers, ments, brands);
  assert.deepEqual(net.map((n) => [n.domain, n.engines.length, n.answers, n.role]), [
    ["rehber.com", 2, 3, "shared"], ["forum.net", 2, 2, "rival"], ["haber.com", 2, 2, "yours"],
  ]);
  assert.deepEqual(net[0].brands.map((b) => [b.name, b.count]), [["Rakip", 3], ["Biz", 1]]);
});
