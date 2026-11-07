// Haftalık e-posta özeti: içerik üretimi (EN/TR) ve Resend ile gönderim.
// Uydurma veri yok: yalnız son 7 gündeki gerçek ölçümler; önceki hafta verisi varsa karşılaştırma.
import type { SupabaseClient } from "@supabase/supabase-js";

export interface DigestRow {
  user_id: string; lang: "en" | "tr"; token: string | null; brand_id: string; brand_name: string; workspace_name: string;
  cur_n: number; cur_mention: number; cur_recommend: number; prev_n: number; prev_mention: number; prev_recommend: number;
  top_competitor: string | null; top_competitor_rec: number | null;
}
export const SITE = "https://aisaasavran.com";
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const pct = (k: number, n: number) => (n ? Math.round((100 * k) / n) : 0);

function change(lang: "en" | "tr", cur: number, prev: number | null): string {
  if (prev === null) return "";
  const d = cur - prev;
  if (Math.abs(d) < 5) return lang === "tr" ? " (geçen haftayla aynı)" : " (about the same as last week)";
  return lang === "tr" ? ` (geçen hafta %${prev}; ${d > 0 ? "+" : ""}${d} puan)` : ` (last week ${prev}%; ${d > 0 ? "+" : ""}${d} pts)`;
}

export function buildDigest(rows: DigestRow[], token: string): { subject: string; html: string; text: string } {
  const lang = rows[0].lang === "tr" ? "tr" : "en";
  const T = lang === "tr"
    ? { subject: "Haftalık yapay zekâ görünürlük özetiniz", hello: "Bu haftaki ölçümlerinizin özeti:", rec: "Önerilme", men: "Anılma", answers: "cevap",
        comp: (n: string, k: number, total: number) => `En çok önerilen rakip: ${n} (${total} cevabın ${k}'inde)`,
        open: "Raporu aç", foot: "Bu e-postayı AI SaaSavran hesabınız olduğu için aldınız.", unsub: "Haftalık özeti kapat",
        note: "Yapay zekâ cevapları sorudan soruya değişir; oranları raporda güven aralığıyla görürsünüz." }
    : { subject: "Your weekly AI visibility summary", hello: "Here's a summary of this week's measurements:", rec: "Recommended", men: "Mentioned", answers: "answers",
        comp: (n: string, k: number, total: number) => `Most recommended competitor: ${n} (${k} of ${total} answers)`,
        open: "Open report", foot: "You're receiving this because you have an AI SaaSavran account.", unsub: "Turn off the weekly summary",
        note: "AI answers vary from one request to the next; the report shows rates with confidence ranges." };
  const unsubUrl = `${SITE}/api/unsubscribe?t=${encodeURIComponent(token)}`;
  const blocks = rows.map((r) => {
    const rec = pct(r.cur_recommend, r.cur_n), men = pct(r.cur_mention, r.cur_n);
    const prevRec = r.prev_n ? pct(r.prev_recommend, r.prev_n) : null, prevMen = r.prev_n ? pct(r.prev_mention, r.prev_n) : null;
    const lines = [
      `${T.rec}: ${rec}%${change(lang, rec, prevRec)}`,
      `${T.men}: ${men}%${change(lang, men, prevMen)}`,
      `${r.cur_n} ${T.answers}`,
      ...(r.top_competitor && (r.top_competitor_rec ?? 0) > 0 ? [T.comp(r.top_competitor, r.top_competitor_rec!, r.cur_n)] : []),
    ];
    const url = `${SITE}/marka/${r.brand_id}`;
    return {
      text: `${r.brand_name} (${r.workspace_name})\n${lines.map((l) => `- ${l}`).join("\n")}\n${T.open}: ${url}`,
      html: `<tr><td style="padding:16px 0;border-top:1px solid #e3e8e6"><p style="margin:0 0 6px;font-size:17px;font-weight:700">${esc(r.brand_name)}</p>`
        + `<p style="margin:0 0 8px;color:#5b6b66;font-size:13px">${esc(r.workspace_name)}</p>`
        + lines.map((l) => `<p style="margin:0 0 4px">${esc(l)}</p>`).join("")
        + `<p style="margin:10px 0 0"><a href="${url}" style="color:#11705e;font-weight:600">${T.open}</a></p></td></tr>`,
    };
  });
  const text = `${T.hello}\n\n${blocks.map((b) => b.text).join("\n\n")}\n\n${T.note}\n\n${T.foot}\n${T.unsub}: ${unsubUrl}\n`;
  const html = `<!doctype html><html lang="${lang}"><body style="margin:0;background:#f4f6f5;font-family:Arial,Helvetica,sans-serif;color:#17211e">`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:12px;padding:24px">`
    + `<tr><td><p style="margin:0 0 4px;font-weight:700;color:#11705e">AI SaaSavran</p><p style="margin:0 0 8px;font-size:15px">${T.hello}</p></td></tr>`
    + blocks.map((b) => b.html).join("")
    + `<tr><td style="padding-top:16px;color:#5b6b66;font-size:12px"><p style="margin:0 0 8px">${T.note}</p><p style="margin:0">${T.foot} <a href="${unsubUrl}" style="color:#5b6b66">${T.unsub}</a></p></td></tr>`
    + `</table></td></tr></table></body></html>`;
  return { subject: T.subject, html, text };
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

/** Pazartesi 09:00 (İstanbul) sonrası mı? */
export function isDigestTime(now = new Date()): boolean {
  const ist = new Date(now.getTime() + 3 * 3600_000);
  return ist.getUTCDay() === 1 && ist.getUTCHours() >= 9;
}

export async function sendWeeklyDigests(
  db: SupabaseClient, apiKey: string, opts: { fetchFn?: FetchLike; force?: boolean; max?: number } = {},
): Promise<{ sent: number; failed: number; skipped?: string }> {
  if (!opts.force && !isDigestTime()) return { sent: 0, failed: 0, skipped: "not_monday_morning" };
  const fetchFn = opts.fetchFn ?? fetch;
  const { data, error } = await db.rpc("weekly_digest");
  if (error) throw new Error(error.message);
  const byUser = new Map<string, DigestRow[]>();
  for (const r of (data ?? []) as DigestRow[]) byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r]);
  let sent = 0, failed = 0;
  for (const [uid, rows] of [...byUser].slice(0, opts.max ?? 200)) {
    const { data: u } = await db.auth.admin.getUserById(uid);
    const email = u?.user?.email;
    if (!email) continue;
    const { data: tok } = await db.rpc("ensure_email_token", { p_user: uid });
    const token = String(tok ?? rows[0].token ?? "");
    const m = buildDigest(rows, token);
    const unsub = `${SITE}/api/unsubscribe?t=${encodeURIComponent(token)}`;
    const res = await fetchFn("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "AI SaaSavran <report@aisaasavran.com>", to: [email], reply_to: "info@aisaasavran.com",
        subject: m.subject, html: m.html, text: m.text,
        headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      }),
    });
    if (res.ok) { await db.rpc("mark_weekly_sent", { p_user: uid }); sent++; }
    else { failed++; console.log("Haftalık özet gönderilemedi:", res.status, (await res.text()).slice(0, 200)); if (res.status === 401 || res.status === 403) break; }
  }
  return { sent, failed };
}
