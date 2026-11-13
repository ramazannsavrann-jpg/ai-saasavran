import { test } from "node:test";
import assert from "node:assert/strict";
import { trafficSummary, snippet } from "../src/traffic.ts";
import { cleanPath } from "../../functions/api/ai-visit.js";

test("Ziyaretçi özeti: son 30 gün / önceki 30 gün, kaynak payı, sayfalar, 8 haftalık dilim", () => {
  const rows = [
    { day: "2026-11-13", source: "chatgpt" as const, path: "/", visits: 5 },
    { day: "2026-11-10", source: "chatgpt" as const, path: "/fiyat", visits: 3 },
    { day: "2026-11-01", source: "gemini" as const, path: "/", visits: 2 },
    { day: "2026-10-01", source: "chatgpt" as const, path: "/", visits: 4 },
    { day: "2026-08-01", source: "claude" as const, path: "/", visits: 9 },
  ];
  const s = trafficSummary(rows, "2026-11-13");
  assert.equal(s.last30, 10); assert.equal(s.prev30, 4);
  assert.deepEqual(s.bySource.map((x) => [x.source, x.visits]), [["chatgpt", 8], ["gemini", 2]]);
  assert.deepEqual(s.topPages[0], { path: "/", visits: 7 });
  assert.equal(s.weekly.length, 8);
  assert.equal(s.weekly[7].visits, 8, "son hafta: 13 ve 10 Kasım");
  assert.equal(s.weekly.reduce((a, w) => a + w.visits, 0), 14, "8 hafta = 56 gün, Ağustos dışarıda");
});

test("Sayfa yolu: sorgu atılır, e-posta ve uzun sayılar maskelenir", () => {
  assert.equal(cleanPath("/urun?id=5#x"), "/urun");
  assert.equal(cleanPath("/u/ali@ornek.com/siparis/12345678"), "/u/(gizli)/siparis/(sayı)");
  assert.equal(cleanPath("fiyat"), "/fiyat");
  assert.ok(cleanPath("/" + "a".repeat(500)).length <= 201);
});

test("Kod parçası", () => {
  assert.equal(snippet("abc"), '<script async src="https://aisaasavran.com/t.js" data-site="abc"></script>');
});

test("t.js: yalnız yapay zekâdan gelen ziyarette ve oturumda bir kez bildirir", async () => {
  const { readFileSync } = await import("node:fs");
  const vm = await import("node:vm");
  const code = readFileSync(new URL("../../web/public/t.js", import.meta.url), "utf8");
  const run = (referrer: string, href: string, store: Map<string, string> = new Map()) => {
    const sent: string[] = [];
    const ctx = {
      document: { currentScript: { getAttribute: (n: string) => (n === "data-site" ? "KEY" : null) }, referrer },
      location: { href, pathname: new URL(href).pathname },
      sessionStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) },
      navigator: { sendBeacon: (_u: string, b: { text?: string; s?: string }) => { sent.push(b.s ?? ""); return true; } },
      Blob: class { s: string; constructor(p: string[]) { this.s = p.join(""); } },
      URL, JSON,
    };
    vm.runInNewContext(code, ctx);
    return sent;
  };
  assert.match(run("https://chatgpt.com/", "https://site.com/fiyat?x=1")[0], /"s":"chatgpt","p":"\/fiyat"/);
  assert.match(run("", "https://site.com/?utm_source=perplexity.ai")[0], /"s":"perplexity"/);
  assert.match(run("https://gemini.google.com/app", "https://site.com/")[0], /"s":"gemini"/);
  assert.equal(run("https://www.google.com/", "https://site.com/").length, 0, "normal Google araması sayılmaz");
  assert.equal(run("", "https://site.com/").length, 0);
  const store = new Map<string, string>();
  run("https://claude.ai/", "https://site.com/", store);
  assert.equal(run("https://claude.ai/", "https://site.com/b", store).length, 0, "aynı oturumda ikinci kez yok");
});

test("Görünürlük × ziyaretçi: haftalık eşleme, ölçümsüz hafta null, 4 haftadan az veride yön oranı yok", async () => {
  const { visibilityVsVisits } = await import("../src/traffic.ts");
  const P = (at: string, k: number, n: number) => ({ at, recommend: { k, n } });
  const V = (day: string, visits: number, source = "chatgpt" as const) => ({ day, source, path: "/", visits });
  const today = "2026-11-14";
  const pts = [P("2026-10-20T10:00:00Z", 2, 10), P("2026-10-27T10:00:00Z", 3, 10), P("2026-11-03T10:00:00Z", 5, 10), P("2026-11-12T10:00:00Z", 6, 10)];
  const vis = [V("2026-10-21", 10), V("2026-10-28", 14), V("2026-11-04", 20), V("2026-11-13", 25), V("2026-11-13", 99, "gemini" as never)];
  const r = visibilityVsVisits(pts, vis, "chatgpt", today);
  assert.equal(r.weeks.length, 8);
  assert.deepEqual(r.weeks.at(-1), { start: "2026-11-08", visits: 25, rate: 0.6, n: 10 });
  assert.equal(r.weeks[0].rate, null);
  assert.equal(r.aligned, 1, "üç geçişin üçü de aynı yönde");
  assert.equal(visibilityVsVisits(pts.slice(0, 2), vis, "chatgpt", today).aligned, null);
});
