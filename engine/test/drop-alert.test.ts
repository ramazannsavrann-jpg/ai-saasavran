import { test } from "node:test";
import assert from "node:assert/strict";
import { detectDrop, twoPropZ, buildDropEmail, processDropAlerts, type PromptRow } from "../src/alerts.ts";

const row = (id: string, answers: number, rec: number, comp: string | null = null): PromptRow =>
  ({ prompt_id: id, prompt_text: `Soru ${id}`, answers, target_recommended: rec, top_competitor: comp });

test("z-testi: eşit oranda 0, düşüşte negatif", () => {
  assert.equal(twoPropZ(10, 20, 10, 20), 0);
  assert.ok(twoPropZ(15, 20, 3, 20) < -3);
});

test("Düşüş: büyük ve belirgin düşüşte uyarı; kaybedilen soru ve yerine gelen rakip", () => {
  const prev = [row("a", 5, 4), row("b", 5, 4), row("c", 5, 3), row("d", 5, 3)];
  const now = [row("a", 5, 0, "Rakip X"), row("b", 5, 1), row("c", 5, 1), row("d", 5, 0, "Rakip Y")];
  const d = detectDrop("openai", prev, now)!;
  assert.ok(d); assert.deepEqual(d.prev, { k: 14, n: 20 }); assert.deepEqual(d.now, { k: 2, n: 20 });
  assert.deepEqual(d.lost, [{ prompt: "Soru a", instead: "Rakip X" }, { prompt: "Soru d", instead: "Rakip Y" }]);
});

test("Düşüş: küçük fark, küçük örneklem veya artış uyarı vermez", () => {
  assert.equal(detectDrop("openai", [row("a", 20, 10)], [row("a", 20, 8)]), null, "10 puan altı");
  assert.equal(detectDrop("openai", [row("a", 6, 5)], [row("a", 6, 0)]), null, "10 cevabın altı");
  assert.equal(detectDrop("openai", [row("a", 20, 5)], [row("a", 20, 15)]), null, "artış");
  assert.equal(detectDrop("openai", [row("a", 12, 5)], [row("a", 12, 3)]), null, "16 puan ama belirgin değil");
});

test("Düşüş: yalnız ortak sorular karşılaştırılır (yeni eklenen soru düşüş sayılmaz)", () => {
  const prev = [row("a", 10, 8), row("b", 10, 8)];
  const now = [row("a", 10, 8), row("b", 10, 8), row("yeni1", 10, 0), row("yeni2", 10, 0)];
  assert.equal(detectDrop("openai", prev, now), null);
});

test("E-posta: iki dil, kapatma bağlantısı, HTML kaçışı", () => {
  const d = detectDrop("claude", [row("a", 10, 9), row("b", 10, 9)], [row("a", 10, 0, "<Rakip>"), row("b", 10, 2)])!;
  const tr = buildDropEmail("tr", { id: "B1", name: "Marka" }, [d], "tok");
  assert.match(tr.subject, /düşüş/); assert.match(tr.text, /Claude: önerilme %90 → %10/); assert.match(tr.text, /k=drop&t=tok/);
  assert.ok(tr.html.includes("&lt;Rakip&gt;") && !tr.html.includes("<Rakip>"));
  assert.match(buildDropEmail("en", { id: "B1", name: "Brand" }, [d], "tok").subject, /drop in AI recommendations/);
});

test("İşçi: düşüşte e-posta gider ve kontrol kaydedilir; önceki ölçüm yoksa e-posta yok ama kayıt var", async () => {
  const calls: { fn: string; args: unknown }[] = [];
  const prevRows = [row("a", 10, 9), row("b", 10, 8)], nowRows = [row("a", 10, 1, "Rakip"), row("b", 10, 1)];
  const db = {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args });
      if (fn === "pending_drop_checks") return { data: [
        { run_id: "R2", prev_run_id: "R1", brand_id: "B", brand_name: "Marka", workspace_id: "W", measurement_type: "live_search", providers: ["openai"] },
        { run_id: "R9", prev_run_id: null, brand_id: "B2", brand_name: "İlk", workspace_id: "W", measurement_type: "live_search", providers: ["openai"] },
      ], error: null };
      if (fn === "run_prompt_results") return { data: args.p_run === "R1" ? prevRows : nowRows, error: null };
      if (fn === "drop_alert_recipients") return { data: [{ user_id: "U", lang: "tr" }], error: null };
      if (fn === "ensure_email_token") return { data: "tok", error: null };
      return { data: null, error: null };
    },
    auth: { admin: { getUserById: async () => ({ data: { user: { email: "kisi@example.com" } } }) } },
  };
  const sent: string[] = [];
  const fetchFn = async (_u: string, init?: RequestInit) => { sent.push(String(init?.body)); return new Response("{}", { status: 200 }); };
  const out = await processDropAlerts(db as never, "key", { fetchFn });
  assert.deepEqual(out, { checked: 2, alerts: 1, sent: 1, failed: 0 });
  assert.equal(sent.length, 1); assert.match(sent[0], /kisi@example.com/);
  const rec = calls.filter((c) => c.fn === "record_drop_check").map((c) => c.args as Record<string, unknown>);
  assert.deepEqual(rec.map((r) => [r.p_run, r.p_alerted, r.p_sent]), [["R2", true, 1], ["R9", false, 0]]);
});
