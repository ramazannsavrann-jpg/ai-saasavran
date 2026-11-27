// Telefon bildirimleri (mobil uygulama, 24 Kasım): biten ölçüm için Firebase Cloud Messaging (HTTP v1) ile kısa bildirim.
// Metinlerde rakip dili yok (23 Kasım kararı). Hizmet hesabı yalnız GitHub Secrets'ta (FCM_SERVICE_ACCOUNT); yoksa hiçbir şey gönderilmez.
import { createSign } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;
export interface ServiceAccount { project_id: string; client_email: string; private_key: string; token_uri?: string }

/** Ölçüm türüne göre bildirim metni. Haftalık otomatik ölçüm ile kullanıcının başlattığı ölçüm ayrılır. */
export function pushText(lang: "tr" | "en", trigger: string, brand: string): { title: string; body: string } {
  if (trigger === "weekly") return lang === "en"
    ? { title: "Weekly measurement done", body: `${brand}: you can review your results.` }
    : { title: "Haftalık ölçüm yapıldı", body: `${brand}: sonuçlarınızı inceleyebilirsiniz.` };
  return lang === "en"
    ? { title: "Your results are ready", body: `${brand}: the measurement you started is done.` }
    : { title: "Sorgunuz hazır", body: `${brand}: başlattığınız ölçüm bitti, sonuçlarınızı inceleyebilirsiniz.` };
}

const b64u = (s: string | Buffer) => Buffer.from(s).toString("base64url");

/** Hizmet hesabıyla kısa ömürlü erişim anahtarı (OAuth 2, JWT). */
export async function fcmAccessToken(sa: ServiceAccount, fetchFn: FetchLike = fetch, now = Date.now()): Promise<string> {
  const iat = Math.floor(now / 1000);
  const head = b64u(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64u(JSON.stringify({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/firebase.messaging", aud: sa.token_uri ?? "https://oauth2.googleapis.com/token", iat, exp: iat + 3600 }));
  const sig = createSign("RSA-SHA256").update(`${head}.${claim}`).sign(sa.private_key);
  const res = await fetchFn(sa.token_uri ?? "https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${head}.${claim}.${b64u(sig)}` }).toString(),
  });
  if (!res.ok) throw new Error(`FCM erişim anahtarı alınamadı: ${res.status}`);
  return String(((await res.json()) as { access_token?: string }).access_token ?? "");
}

interface PendingPush { run_id: string; brand_name: string; trigger: string; token: string | null; lang: string | null }

/** Bekleyen ölçüm bildirimlerini gönderir; geçersiz cihaz anahtarlarını siler. Hizmet hesabı yoksa yalnız sayar, göndermez. */
export async function processRunPushes(db: SupabaseClient, saJson: string | undefined, opts: { fetchFn?: FetchLike } = {}): Promise<{ runs: number; sent: number; failed: number; removed: number } | "kapalı"> {
  if (!saJson) return "kapalı";
  const fetchFn = opts.fetchFn ?? fetch;
  const sa = JSON.parse(saJson) as ServiceAccount;
  const { data, error } = await db.rpc("pending_run_pushes", { p_limit: 100 });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as PendingPush[];
  const byRun = new Map<string, PendingPush[]>();
  for (const r of rows) byRun.set(r.run_id, [...(byRun.get(r.run_id) ?? []), r]);
  if (!byRun.size) return { runs: 0, sent: 0, failed: 0, removed: 0 };
  const access = await fcmAccessToken(sa, fetchFn);
  let sent = 0, failed = 0, removed = 0;
  for (const [runId, list] of byRun) {
    let n = 0;
    for (const r of list.filter((x) => x.token)) {
      const t = pushText(r.lang === "en" ? "en" : "tr", r.trigger, r.brand_name);
      const res = await fetchFn(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
        method: "POST", headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message: { token: r.token, notification: t, data: { path: "/ana", run: runId }, android: { priority: "normal", notification: { channel_id: "olcumler" } } } }),
      });
      if (res.ok) { n++; sent++; continue; }
      failed++;
      // Uygulama silinmiş ya da anahtar yenilenmiş: kaydı kaldır
      const body = res.status === 400 ? await res.text().catch(() => "") : "";
      if (res.status === 404 || /registration token/i.test(body)) { await db.rpc("drop_push_device", { p_token: r.token }); removed++; }
      else console.log("Bildirim gönderilemedi:", res.status);
    }
    const { error: e2 } = await db.rpc("record_run_push", { p_run: runId, p_sent: n });
    if (e2) throw new Error(e2.message);
  }
  return { runs: byRun.size, sent, failed, removed };
}
