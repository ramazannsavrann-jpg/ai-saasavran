// Başarısız ölçüm telafisi (0044): işçi geçici hatayla sonuçsuz kalan müşteri ölçümlerini yeniden sıraya koyar,
// telafi ölçümü başarıyla bitince müşteriye bir kez "sonuçlarınız hazır" e-postası gönderir.
// E-postadaki sayılar yalnız kayıtlı gerçek sonuçlardan gelir; ek API çağrısı yok.
import type { SupabaseClient } from "@supabase/supabase-js";
import { SITE } from "./email.ts";

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;
const ENGINE: Record<string, string> = { openai: "ChatGPT", claude: "Claude", gemini: "Gemini", perplexity: "Perplexity" };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export interface EngineSummary { provider: string; answers: number; mentioned: number; recommended: number }

export function buildRecoveryEmail(lang: "en" | "tr", brand: { id: string; name: string }, rows: EngineSummary[]): { subject: string; html: string; text: string } {
  const tr = lang === "tr";
  const url = `${SITE}/marka/${brand.id}`;
  const line = (r: EngineSummary) => tr
    ? `${ENGINE[r.provider] ?? r.provider}: ${r.answers} cevabın ${r.mentioned} tanesinde anıldınız, ${r.recommended} tanesinde önerildiniz.`
    : `${ENGINE[r.provider] ?? r.provider}: mentioned in ${r.mentioned} and recommended in ${r.recommended} of ${r.answers} answers.`;
  const T = tr ? {
    subject: `${brand.name}: yapay zekâ görünürlük sonuçlarınız hazır`,
    hello: `Merhaba, sistemimizde yaptığımız iyileştirmelerin ardından ${brand.name} için ölçümünüzü yeniden çalıştırdık. Sonuçlarınız panelinizde hazır.`,
    sum: "Kısa özet",
    open: "Sonuçları gör",
    help: "Sonuçlarla ilgili bir sorunuz ya da görüşünüz olursa bu e-postayı yanıtlamanız yeterli. Her geri bildirimi okuyoruz.",
    foot: "Bu e-postayı, AI SaaSavran'da başlattığınız ölçüm tamamlandığı için bir kez aldınız.",
  } : {
    subject: `${brand.name}: your AI visibility results are ready`,
    hello: `Hi, after recent improvements to our system we ran your measurement for ${brand.name} again. Your results are ready in your dashboard.`,
    sum: "Quick summary",
    open: "See your results",
    help: "If you have any questions or feedback about the results, just reply to this email. We read every reply.",
    foot: "You received this one-time email because a measurement you started on AI SaaSavran has completed.",
  };
  const lines = rows.filter((r) => r.answers > 0).map(line);
  const html = `<!doctype html><html lang="${lang}"><body style="margin:0;background:#f4f6f5;font-family:Arial,Helvetica,sans-serif;color:#17211e">`
    + `<div style="max-width:560px;margin:0 auto;padding:24px 16px"><div style="background:#fff;border-radius:12px;padding:24px">`
    + `<p style="margin:0 0 12px;font-weight:700;color:#11705e;font-size:18px">AI SaaSavran</p>`
    + `<p style="margin:0 0 12px;font-size:15px">${esc(T.hello)}</p>`
    + (lines.length ? `<p style="margin:16px 0 4px;font-weight:700">${esc(T.sum)}</p><ul style="margin:0;padding-left:18px">${lines.map((l) => `<li style="margin:0 0 4px">${esc(l)}</li>`).join("")}</ul>` : "")
    + `<p style="margin:20px 0"><a href="${url}" style="background:#11705e;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">${esc(T.open)}</a></p>`
    + `<p style="margin:0 0 8px">${esc(T.help)}</p><p style="margin:16px 0 0;color:#5b6b66;font-size:12px">${esc(T.foot)}</p>`
    + `</div></div></body></html>`;
  const text = [T.hello, "", ...(lines.length ? [T.sum, ...lines.map((l) => `- ${l}`), ""] : []), `${T.open}: ${url}`, "", T.help, "", T.foot].join("\n");
  return { subject: T.subject, html, text };
}

/** Bir ölçümde hedef markanın motor bazında özeti (kayıtlı cevaplardan). */
export async function runSummary(db: SupabaseClient, runId: string, brandId: string): Promise<EngineSummary[]> {
  const { data, error } = await db.from("responses").select("provider, mentions!inner(brand_id, mentioned, recommended)").eq("run_id", runId).eq("mentions.brand_id", brandId);
  if (error) throw new Error(error.message);
  const by = new Map<string, EngineSummary>();
  for (const r of (data ?? []) as any[]) {
    const s = by.get(r.provider) ?? { provider: r.provider, answers: 0, mentioned: 0, recommended: 0 };
    const m = Array.isArray(r.mentions) ? r.mentions[0] : r.mentions;
    s.answers++; if (m?.mentioned) s.mentioned++; if (m?.recommended) s.recommended++;
    by.set(r.provider, s);
  }
  return [...by.values()];
}

/** Telafi gereken başarısız ölçümleri yeniden sıraya koyar. */
export async function scheduleRecovery(db: SupabaseClient): Promise<number> {
  const { data, error } = await db.rpc("schedule_recovery_runs", {});
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}

/** Başarıyla biten telafi ölçümleri için e-posta gönderir (ölçüm başına bir kez). */
export async function sendRecoveryEmails(db: SupabaseClient, apiKey: string | undefined, opts: { fetchFn?: FetchLike } = {}): Promise<{ sent: number; failed: number; skipped?: string }> {
  if (!apiKey) return { sent: 0, failed: 0, skipped: "no_resend_key" };
  const fetchFn = opts.fetchFn ?? fetch;
  const { data, error } = await db.rpc("pending_recovery_emails", { p_limit: 50 });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as { run_id: string; brand_id: string; brand_name: string; user_id: string; email: string; lang: string }[];
  let sent = 0, failed = 0;
  const done = new Set<string>();
  for (const r of rows) {
    const summary = await runSummary(db, r.run_id, r.brand_id);
    const m = buildRecoveryEmail(r.lang === "tr" ? "tr" : "en", { id: r.brand_id, name: r.brand_name }, summary);
    const res = await fetchFn("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "AI SaaSavran <report@aisaasavran.com>", to: [r.email], reply_to: "info@aisaasavran.com", subject: m.subject, html: m.html, text: m.text }),
    });
    if (res.ok) { sent++; done.add(r.run_id); }
    else { failed++; console.log("Telafi e-postası gönderilemedi:", res.status); if (res.status === 401 || res.status === 403) break; }
  }
  for (const id of done) {
    const { error: e } = await db.rpc("mark_recovery_notified", { p_run: id });
    if (e) throw new Error(e.message);
  }
  return { sent, failed };
}
