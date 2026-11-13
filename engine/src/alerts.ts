// Düşüş uyarısı: biten ölçüm, aynı markanın aynı türdeki önceki ölçümüyle motor bazında karşılaştırılır.
// Uyarı yalnız düşüş hem büyük (≥10 puan) hem istatistiksel olarak belirgin olduğunda (iki oran z-testi, %95) gider.
// LLM ve ek API çağrısı yok; yalnız kayıtlı sonuçlar. Uydurma veri yok.
import type { SupabaseClient } from "@supabase/supabase-js";
import { SITE } from "./email.ts";

export interface PromptRow { prompt_id: string; prompt_text: string; answers: number; target_recommended: number; top_competitor: string | null }
export interface EngineDrop {
  provider: string;
  prev: { k: number; n: number }; now: { k: number; n: number };
  /** Oran puanı farkı (negatif = düşüş) ve z değeri */
  delta: number; z: number;
  /** Önceki ölçümde önerilip bu ölçümde hiç önerilmeyen sorular ve yerine en çok önerilen rakip */
  lost: { prompt: string; instead: string | null }[];
}

export const DROP_MIN_N = 10, DROP_MIN_PTS = 0.10;

/** İki oran z-testi (birleşik oran). Düşüşte negatif. */
export function twoPropZ(k1: number, n1: number, k2: number, n2: number): number {
  if (!n1 || !n2) return 0;
  const p = (k1 + k2) / (n1 + n2);
  const se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2));
  return se ? (k2 / n2 - k1 / n1) / se : 0;
}

/** Tek motor için düşüş var mı; yalnız iki ölçümde de bulunan sorular karşılaştırılır (soru seti değiştiyse adil olsun). */
export function detectDrop(provider: string, prevRows: PromptRow[], nowRows: PromptRow[]): EngineDrop | null {
  const prevBy = new Map(prevRows.map((r) => [r.prompt_id, r]));
  const common = nowRows.filter((r) => prevBy.has(r.prompt_id));
  const sum = (rs: PromptRow[], f: (r: PromptRow) => number) => rs.reduce((a, r) => a + f(r), 0);
  const prevCommon = common.map((r) => prevBy.get(r.prompt_id)!);
  const prev = { k: sum(prevCommon, (r) => r.target_recommended), n: sum(prevCommon, (r) => r.answers) };
  const now = { k: sum(common, (r) => r.target_recommended), n: sum(common, (r) => r.answers) };
  if (prev.n < DROP_MIN_N || now.n < DROP_MIN_N) return null;
  const delta = now.k / now.n - prev.k / prev.n;
  const z = twoPropZ(prev.k, prev.n, now.k, now.n);
  if (delta > -DROP_MIN_PTS || z > -1.96) return null;
  const lost = common
    .filter((r) => r.target_recommended === 0 && (prevBy.get(r.prompt_id)!.target_recommended ?? 0) > 0)
    .map((r) => ({ prompt: r.prompt_text, instead: r.top_competitor }));
  return { provider, prev, now, delta, z, lost };
}

const ENGINE: Record<string, string> = { openai: "ChatGPT", claude: "Claude", gemini: "Gemini", perplexity: "Perplexity", simulated: "Simülasyon" };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const pc = (k: number, n: number) => Math.round((100 * k) / n);

export function buildDropEmail(lang: "en" | "tr", brand: { id: string; name: string }, drops: EngineDrop[], token: string): { subject: string; html: string; text: string } {
  const tr = lang === "tr";
  const subject = tr ? `${brand.name}: yapay zekâ önerilerinde düşüş` : `${brand.name}: drop in AI recommendations`;
  const url = `${SITE}/marka/${brand.id}`;
  const unsub = `${SITE}/api/unsubscribe?k=drop&t=${encodeURIComponent(token)}`;
  const blocks = drops.map((d) => {
    const head = tr
      ? `${ENGINE[d.provider] ?? d.provider}: önerilme %${pc(d.prev.k, d.prev.n)} → %${pc(d.now.k, d.now.n)} (${d.prev.n} ve ${d.now.n} cevap)`
      : `${ENGINE[d.provider] ?? d.provider}: recommended ${pc(d.prev.k, d.prev.n)}% → ${pc(d.now.k, d.now.n)}% (${d.prev.n} and ${d.now.n} answers)`;
    const lost = d.lost.slice(0, 5).map((l) => tr
      ? `"${l.prompt}"${l.instead ? `: yerinize ${l.instead} önerildi` : ": bu soruda artık önerilmiyorsunuz"}`
      : `"${l.prompt}"${l.instead ? `: ${l.instead} was recommended instead` : ": you're no longer recommended here"}`);
    return { head, lost, more: Math.max(0, d.lost.length - 5) };
  });
  const T = tr
    ? { hello: `Son ölçümde ${brand.name} markasının önerilme oranı bir önceki ölçüme göre belirgin şekilde düştü.`, lostTitle: "Kaybedilen sorular:", more: (n: number) => `ve ${n} soru daha`,
        note: "Yalnız iki ölçümde de sorulan sorular karşılaştırıldı. Düşüş hem 10 puandan büyük hem istatistiksel olarak belirgin olduğu için bu e-postayı aldınız; yapay zekâ cevapları yine de ölçümden ölçüme oynar.",
        open: "Raporu aç", unsub: "Düşüş uyarılarını kapat" }
    : { hello: `In the latest measurement, ${brand.name}'s recommendation rate dropped clearly compared with the previous one.`, lostTitle: "Questions lost:", more: (n: number) => `and ${n} more`,
        note: "Only questions asked in both measurements were compared. You got this email because the drop is both over 10 points and statistically significant; AI answers still vary between measurements.",
        open: "Open report", unsub: "Turn off drop alerts" };
  const text = [T.hello, "", ...blocks.flatMap((b) => [`- ${b.head}`, ...(b.lost.length ? [`  ${T.lostTitle}`, ...b.lost.map((l) => `  · ${l}`), ...(b.more ? [`  · ${T.more(b.more)}`] : [])] : [])]),
    "", T.note, "", `${T.open}: ${url}`, `${T.unsub}: ${unsub}`, ""].join("\n");
  const html = `<!doctype html><html lang="${lang}"><body style="margin:0;background:#f4f6f5;font-family:Arial,Helvetica,sans-serif;color:#17211e">`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:12px;padding:24px"><tr><td>`
    + `<p style="margin:0 0 4px;font-weight:700;color:#11705e">AI SaaSavran</p><p style="margin:0 0 12px;font-size:15px">${esc(T.hello)}</p>`
    + blocks.map((b) => `<p style="margin:12px 0 4px;font-weight:700;color:#b3261e">${esc(b.head)}</p>`
      + (b.lost.length ? `<p style="margin:0 0 4px">${esc(T.lostTitle)}</p><ul style="margin:0;padding-left:18px">${b.lost.map((l) => `<li style="margin:0 0 4px">${esc(l)}</li>`).join("")}${b.more ? `<li>${esc(T.more(b.more))}</li>` : ""}</ul>` : "")).join("")
    + `<p style="margin:16px 0"><a href="${url}" style="color:#11705e;font-weight:600">${esc(T.open)}</a></p>`
    + `<p style="margin:0 0 8px;color:#5b6b66;font-size:12px">${esc(T.note)}</p><p style="margin:0;font-size:12px"><a href="${unsub}" style="color:#5b6b66">${esc(T.unsub)}</a></p>`
    + `</td></tr></table></td></tr></table></body></html>`;
  return { subject, html, text };
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;
interface Pending { run_id: string; prev_run_id: string | null; brand_id: string; brand_name: string; workspace_id: string; measurement_type: string; providers: string[] }

/** Bekleyen ölçümleri kontrol eder; belirgin düşüş varsa üyelere e-posta gönderir. Resend anahtarı yoksa kontrol yine kaydedilir, e-posta gitmez. */
export async function processDropAlerts(db: SupabaseClient, apiKey: string | undefined, opts: { fetchFn?: FetchLike; max?: number } = {}): Promise<{ checked: number; alerts: number; sent: number; failed: number }> {
  const fetchFn = opts.fetchFn ?? fetch;
  const { data, error } = await db.rpc("pending_drop_checks", { p_limit: opts.max ?? 50 });
  if (error) throw new Error(error.message);
  let checked = 0, alerts = 0, sent = 0, failed = 0;
  for (const p of (data ?? []) as Pending[]) {
    const drops: EngineDrop[] = [];
    if (p.prev_run_id) {
      for (const prov of p.providers ?? []) {
        const [a, b] = await Promise.all([
          db.rpc("run_prompt_results", { p_run: p.prev_run_id, p_provider: prov }),
          db.rpc("run_prompt_results", { p_run: p.run_id, p_provider: prov }),
        ]);
        if (a.error || b.error) throw new Error((a.error ?? b.error)!.message);
        const d = detectDrop(prov, (a.data ?? []) as PromptRow[], (b.data ?? []) as PromptRow[]);
        if (d) drops.push(d);
      }
    }
    let n = 0;
    if (drops.length && apiKey) {
      const { data: rec, error: e2 } = await db.rpc("drop_alert_recipients", { p_workspace: p.workspace_id });
      if (e2) throw new Error(e2.message);
      for (const r of (rec ?? []) as { user_id: string; lang: string }[]) {
        const { data: u } = await db.auth.admin.getUserById(r.user_id);
        const email = u?.user?.email;
        if (!email) continue;
        const { data: tok } = await db.rpc("ensure_email_token", { p_user: r.user_id });
        const token = String(tok ?? "");
        const m = buildDropEmail(r.lang === "tr" ? "tr" : "en", { id: p.brand_id, name: p.brand_name }, drops, token);
        const unsub = `${SITE}/api/unsubscribe?k=drop&t=${encodeURIComponent(token)}`;
        const res = await fetchFn("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "AI SaaSavran <report@aisaasavran.com>", to: [email], reply_to: "info@aisaasavran.com",
            subject: m.subject, html: m.html, text: m.text,
            headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
          }),
        });
        if (res.ok) { n++; sent++; } else { failed++; console.log("Düşüş uyarısı gönderilemedi:", res.status); }
      }
    }
    if (drops.length) alerts++;
    const detail = drops.length ? { drops: drops.map((d) => ({ provider: d.provider, prev: d.prev, now: d.now, z: Math.round(d.z * 100) / 100, lost: d.lost.length })) } : null;
    const { error: e3 } = await db.rpc("record_drop_check", { p_run: p.run_id, p_prev: p.prev_run_id, p_brand: p.brand_id, p_alerted: drops.length > 0, p_sent: n, p_detail: detail });
    if (e3) throw new Error(e3.message);
    checked++;
  }
  return { checked, alerts, sent, failed };
}
