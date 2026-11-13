import { test } from "node:test";
import assert from "node:assert/strict";
import { processEngineConflicts, processTruthChecks } from "../src/worker.ts";

const resp = (text: string) => new Response(JSON.stringify({ output: [{ type: "message", content: [{ type: "output_text", text }] }], usage: { input_tokens: 900, output_tokens: 200 } }));
function fakeDb(state: { inserts: { table: string; row: Record<string, unknown> }[]; rpc: string[] }, data: Record<string, unknown>) {
  const q = (table: string) => {
    const b: Record<string, unknown> = {};
    for (const k of ["select", "eq", "gte", "order", "limit"]) b[k] = () => b;
    b.single = async () => ({ data: data[`${table}.single`] ?? null, error: null });
    b.then = (res: (v: unknown) => void) => res({ data: data[`${table}.select`] ?? [], error: null });
    b.insert = async (row: Record<string, unknown>) => { state.inserts.push({ table, row }); return { data: null, error: null }; };
    return b;
  };
  return {
    from: q,
    rpc: async (fn: string) => { state.rpc.push(fn); return { data: data[fn] ?? null, error: null }; },
    auth: { admin: { getUserById: async () => ({ data: { user: { email: "u@example.com" } } }) } },
  };
}
const env = { OPENAI_API_KEY: "k", ALLOW_PAID_API: "true", RESEND_API_KEY: "r" };

test("İşçi: çelişki bulunur, maliyet çalışma alanına yazılır", async () => {
  const st = { inserts: [] as { table: string; row: Record<string, unknown> }[], rpc: [] as string[] };
  const db = fakeDb(st, { pending_engine_conflicts: [{ workspace_id: "W", brand_id: "B", prompt_id: "P", brand_name: "Kafe Mavi", answers: [{ provider: "openai", answer: "Fiyat 85 TL." }, { provider: "claude", answer: "Fiyat 120 TL." }] }] });
  const out = await processEngineConflicts({ db: db as never, env, fetchFn: (async () => resp('{"conflicts":[{"topic":"Fiyat","sides":[{"engine":"openai","quote":"85 TL"},{"engine":"claude","quote":"120 TL"}]}]}')) as never });
  assert.deepEqual([out.done, out.found], [1, 1]);
  assert.ok(st.rpc.includes("record_aux_call"));
  assert.equal(st.inserts[0].table, "engine_conflicts");
});

test("İşçi: yeni yanlış bilgi müşteriye e-postayla bildirilir, Growth Lab'e gönderilmez", async () => {
  const pending = [{ response_id: "R", workspace_id: "W", brand_id: "B", run_id: "U", prompt_id: "P", provider: "openai", brand_name: "Kafe Mavi", fact_card: "Kuruluş 2009", answer_text: "Kafe Mavi 2015 yılında kuruldu." }];
  const judge = resp('{"claims":[{"claim":"2015 yılında kuruldu","status":"wrong","fact":"Kuruluş 2009","quote":"2015 yılında kuruldu"}]}');
  for (const [kind, expectMail] of [["business", 1], ["growth_lab", 0]] as const) {
    const st = { inserts: [] as { table: string; row: Record<string, unknown> }[], rpc: [] as string[] };
    const db = fakeDb(st, { pending_truth_checks: pending, "truth_checks.select": [], "workspaces.single": { kind }, drop_alert_recipients: [{ user_id: "U1", lang: "tr" }], ensure_email_token: "tok" });
    const mails: string[] = [];
    const fetchFn = async (url: string, init?: RequestInit) => { if (url.includes("resend")) { mails.push(String(init?.body)); return new Response("{}"); } return judge.clone(); };
    const out = await processTruthChecks({ db: db as never, env, fetchFn: fetchFn as never });
    assert.equal(out.newWrong, 1); assert.equal(mails.length, expectMail, kind);
    if (expectMail) assert.match(mails[0], /yeni bir yanl/);
  }
});
