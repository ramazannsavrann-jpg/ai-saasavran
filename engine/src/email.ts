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

/** Hoş geldin e-postası: yeni kullanıcıya neler yapabileceğini anlatır (EN/TR). */
export function buildWelcome(lang: "en" | "tr"): { subject: string; html: string; text: string } {
  const tr = lang === "tr";
  const T = tr ? {
    subject: "AI SaaSavran'a hoş geldiniz: ilk adımlar",
    hello: "Hoş geldiniz! AI SaaSavran, müşterileriniz ChatGPT, Gemini ve Claude'a sorduğunda işletmenizin geçip geçmediğini ve rakiplerinizin yanında nerede durduğunu ölçer.",
    stepsTitle: "Başlamak için 3 adım",
    steps: [
      "Markanızı ekleyin: sektörünüzü ve şehrinizi seçin.",
      "Rakiplerinizi ve müşterilerinizin soracağı soruları ekleyin. Hazır soruları kullanabilir ya da \"Bana soru öner\" ile yapay zekâya taslak hazırlatabilirsiniz.",
      "İlk ölçümü başlatın. Sonra her hafta kendiliğinden ölçülür.",
    ],
    canTitle: "Raporda neler var",
    can: [
      "Kaç cevapta anıldığınız ve önerildiğiniz; rakiplerle karşılaştırma ve haftalık değişim (güven aralığıyla).",
      "Yapay zekânın baktığı kaynak siteler ve rakibinizi neden öne çıkardığı.",
      "Kayıp nedeni kartları ve yapılacaklar listesi; web sitenizin yapay zekâya uygunluk kontrolü.",
      "Her pazartesi e-postayla kısa özet.",
    ],
    paidTitle: "Ücretli paketlerde ayrıca",
    paid: [
      "ChatGPT ve Claude'un canlı web aramalı cevapları (müşterinin gördüğüne en yakın).",
      "Ürün takibi: yapay zekâ ürününüz hakkında doğru bilgi veriyor mu, Google Shopping'de kaçıncı sıradasınız.",
      "Paylaşılabilir rapor bağlantısı ve PDF; Pro'da ekip daveti ile yapay zekâ ajanları için API ve MCP.",
    ],
    cta: "Panele git", help: "Sorunuz olursa bu e-postayı yanıtlayın; size yardımcı olalım.",
    foot: "Bu e-postayı AI SaaSavran'a kaydolduğunuz için bir kez aldınız.",
  } : {
    subject: "Welcome to AI SaaSavran: getting started",
    hello: "Welcome! AI SaaSavran measures whether your business shows up when customers ask ChatGPT, Gemini and Claude, and where you stand next to your competitors.",
    stepsTitle: "3 steps to get started",
    steps: [
      "Add your brand: choose your industry and city.",
      "Add your competitors and the questions your customers would ask. Use the suggested questions or let the AI draft some with \"Suggest questions\".",
      "Start your first measurement. After that it runs automatically every week.",
    ],
    canTitle: "What the report shows",
    can: [
      "How often you're mentioned and recommended, compared with competitors, week over week (with confidence ranges).",
      "The websites the AI relied on and why it favoured a competitor.",
      "Loss cards and a to-do list; a check of how AI-ready your website is.",
      "A short summary by email every Monday.",
    ],
    paidTitle: "Paid plans also include",
    paid: [
      "ChatGPT and Claude answers with live web search (closest to what customers see).",
      "Product tracking: is the AI accurate about your product, and where you rank on Google Shopping.",
      "Shareable report links and PDF; on Pro, team invitations and API & MCP access for AI agents.",
    ],
    cta: "Go to your dashboard", help: "Questions? Just reply to this email and we'll help.",
    foot: "You received this one-time email because you signed up for AI SaaSavran.",
  };
  const li = (xs: string[]) => xs.map((x) => `<li style="margin:4px 0">${esc(x)}</li>`).join("");
  const html = `<!doctype html><html lang="${lang}"><body style="margin:0;background:#f4f6f5;font-family:Arial,sans-serif;color:#17211e">
<div style="max-width:560px;margin:0 auto;padding:24px 16px">
<p style="font-weight:bold;color:#11705e;font-size:18px;margin:0 0 16px">AI SaaSavran</p>
<p>${esc(T.hello)}</p>
<h2 style="font-size:16px;margin:20px 0 8px">${esc(T.stepsTitle)}</h2><ol style="padding-left:20px">${li(T.steps)}</ol>
<h2 style="font-size:16px;margin:20px 0 8px">${esc(T.canTitle)}</h2><ul style="padding-left:20px">${li(T.can)}</ul>
<h2 style="font-size:16px;margin:20px 0 8px">${esc(T.paidTitle)}</h2><ul style="padding-left:20px">${li(T.paid)}</ul>
<p style="margin:24px 0"><a href="${SITE}/panel" style="background:#11705e;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">${esc(T.cta)}</a></p>
<p>${esc(T.help)}</p>
<p style="color:#5b6b66;font-size:12px;margin-top:24px">${esc(T.foot)}</p>
</div></body></html>`;
  const text = [T.hello, "", T.stepsTitle, ...T.steps.map((s, i) => `${i + 1}. ${s}`), "", T.canTitle, ...T.can.map((s) => `- ${s}`), "", T.paidTitle, ...T.paid.map((s) => `- ${s}`), "", `${T.cta}: ${SITE}/panel`, "", T.help, "", T.foot].join("\n");
  return { subject: T.subject, html, text };
}

/** Bekleyen hoş geldin e-postalarını gönderir (her işçi çalışmasında; kişi başı bir kez). */
export async function sendWelcomeEmails(
  db: SupabaseClient, apiKey: string | undefined, opts: { fetchFn?: FetchLike; max?: number } = {},
): Promise<{ sent: number; failed: number; skipped?: string }> {
  if (!apiKey) return { sent: 0, failed: 0, skipped: "no_resend_key" };
  const fetchFn = opts.fetchFn ?? fetch;
  const { data, error } = await db.rpc("pending_welcome_emails", { p_limit: opts.max ?? 50 });
  if (error) throw new Error(error.message);
  let sent = 0, failed = 0;
  for (const u of (data ?? []) as { user_id: string; email: string; lang: string }[]) {
    const lang = u.lang === "tr" ? "tr" : "en";
    const m = buildWelcome(lang);
    const res = await fetchFn("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "AI SaaSavran <report@aisaasavran.com>", to: [u.email], reply_to: "info@aisaasavran.com", subject: m.subject, html: m.html, text: m.text }),
    });
    if (res.ok) { await db.rpc("mark_welcome_sent", { p_user: u.user_id, p_lang: lang }); sent++; }
    else { failed++; console.log("Hoş geldin e-postası gönderilemedi:", res.status); if (res.status === 401 || res.status === 403) break; }
  }
  return { sent, failed };
}
