// Uygulamada Google ile giriş: Google sayfası sistem tarayıcısında açılır (Google, uygulama içi web görünümünde girişe izin vermez),
// dönüşte com.aisaasavran.app://giris?code=… adresi uygulamayı açar; kod oturuma çevrilir (PKCE).
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { sb } from "../lib/supabase";

export const OAUTH_REDIRECT = "com.aisaasavran.app://giris";
/** Supabase'in döndüğü adres: sitedeki küçük sayfa kodu uygulamaya iletir (site adresi zaten izinli, ayar değişikliği gerekmez). */
export const OAUTH_BRIDGE = "https://aisaasavran.com/uygulama-giris/";
export const GOOGLE_AVAILABLE = Capacitor.isNativePlatform();

/** Dönüş adresinden kodu ya da hatayı çıkarır. Başka bir adresse null. */
export function parseOAuthReturn(url: string): { code?: string; error?: string } | null {
  if (!url.startsWith(OAUTH_REDIRECT)) return null;
  const q = new URLSearchParams(url.slice(url.indexOf("?") + 1).split("#")[0]);
  const h = url.includes("#") ? new URLSearchParams(url.slice(url.indexOf("#") + 1)) : new URLSearchParams();
  const error = q.get("error_description") ?? q.get("error") ?? h.get("error_description") ?? h.get("error") ?? undefined;
  const code = q.get("code") ?? undefined;
  return { code, error };
}

export async function googleSignIn(): Promise<void> {
  const { data, error } = await sb().auth.signInWithOAuth({ provider: "google", options: { redirectTo: OAUTH_BRIDGE, skipBrowserRedirect: true } });
  if (error) throw error;
  if (!data.url) throw new Error("oauth_no_url");
  await Browser.open({ url: data.url, presentationStyle: "popover" });
}

/** Uygulama açılışında bir kez: dönüş adresini dinler. onDone(hata) — hata yoksa oturum açıldı. */
export function initOAuthReturn(onDone: (err: string | null) => void) {
  if (!GOOGLE_AVAILABLE) return;
  void App.addListener("appUrlOpen", async ({ url }) => {
    const r = parseOAuthReturn(url);
    if (!r) return;
    await Browser.close().catch(() => undefined);
    if (r.error || !r.code) { onDone(r.error ?? "oauth_no_code"); return; }
    const { error } = await sb().auth.exchangeCodeForSession(r.code);
    onDone(error ? error.message : null);
  });
}
