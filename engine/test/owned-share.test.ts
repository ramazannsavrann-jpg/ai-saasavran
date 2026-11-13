import { test } from "node:test";
import assert from "node:assert/strict";
import { ownedSourceShare, siteKey, sourceDominance } from "../src/insights.ts";

test("siteKey: YouTube kanal adresleri normalize edilir; başka kanal 'sizin siteniz' sayılmaz", () => {
  assert.equal(siteKey("https://www.youtube.com/@AISaaSavran/videos"), "youtube.com/@aisaasavran");
  assert.equal(siteKey("https://youtube.com/c/aisaasavran"), "youtube.com/@aisaasavran");
  assert.equal(siteKey("https://m.youtube.com/user/AISaaSavran"), "youtube.com/@aisaasavran");
  assert.equal(siteKey("https://www.youtube.com/channel/UCabc"), "youtube.com/channel/ucabc");
  assert.equal(siteKey("https://www.youtube.com/watch?v=xyz"), "youtube.com", "video adresinde kanal yok");
  assert.equal(siteKey("youtube.com/@aisaasavran"), "youtube.com/@aisaasavran", "marka web sitesi alanı şemasız");
  assert.equal(siteKey("https://www.instagram.com/lezzetduragi/"), "instagram.com/lezzetduragi");
  assert.equal(siteKey("https://www.instagram.com/p/ABC123/"), "instagram.com");
  assert.equal(siteKey("https://blog.ornek.com/yazi"), "blog.ornek.com");
});

test("Kendi site payı: kendi / rakip / üçüncü taraf; motor bazında; aynı cevapta tekrar sayılmaz", () => {
  const brands = [
    { id: "A", name: "Kanal A", website: "https://youtube.com/@kanala", isTarget: true },
    { id: "B", name: "Kanal B", website: "youtube.com/@kanalb", isTarget: false },
    { id: "C", name: "Site C", website: "https://www.sitec.com", isTarget: false },
  ];
  const s = ownedSourceShare([
    { id: "1", prompt_id: "p", provider: "openai", cited_urls: ["https://www.youtube.com/@kanala", "https://youtube.com/c/kanala/videos", "https://rehber.com/x"] },
    { id: "2", prompt_id: "p", provider: "claude", cited_urls: ["https://youtube.com/@kanalb", "https://sitec.com/a", "https://www.youtube.com/watch?v=1"] },
    { id: "3", prompt_id: "p", provider: "claude", cited_urls: [] },
  ], brands);
  assert.deepEqual({ total: s.total, own: s.own, competitor: s.competitor, thirdParty: s.thirdParty }, { total: 5, own: 1, competitor: 2, thirdParty: 2 });
  assert.equal(s.answersCitingOwn, 1); assert.equal(s.answersWithSources, 2);
  assert.deepEqual(s.byEngine.find((e) => e.provider === "claude"), { provider: "claude", total: 3, own: 0, competitor: 2, thirdParty: 1 });
});

test("Kaynak egemenliği YouTube kanallarını ayrı satır olarak gösterir (youtube.com tek satıra yığılmaz)", () => {
  const rows = sourceDominance([{ id: "1", prompt_id: "p", cited_urls: ["https://youtube.com/@kanala", "https://youtube.com/@kanalb"] }], [],
    [{ id: "A", name: "Kanal A", website: "youtube.com/@kanala", isTarget: true }]);
  assert.deepEqual(rows.map((r) => [r.domain, r.owner]).sort(), [["youtube.com/@kanala", "target"], ["youtube.com/@kanalb", "third_party"]]);
});
