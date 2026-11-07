import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { L, isEn } from "./i18n";

export interface RuntimeConfig { supabaseUrl: string; supabaseAnonKey: string; environment: string }

let client: SupabaseClient | null = null;
let config: RuntimeConfig | null = null;

/** Yapılandırma derleme anında değil, çalışma anında /config.json'dan okunur. */
export async function initSupabase(): Promise<RuntimeConfig> {
  const res = await fetch("/config.json", { cache: "no-store" });
  config = (await res.json()) as RuntimeConfig;
  if (!config.supabaseUrl || !config.supabaseAnonKey) throw new Error("not_configured");
  client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: "saasavran-auth" },
  });
  return config;
}

export function sb(): SupabaseClient {
  if (!client) throw new Error("Supabase başlatılmadı");
  return client;
}
export function runtimeConfig() { return config; }

/** Giriş sunucusunda hangi giriş yöntemleri açık? (Google ayarı yapılmadan düğme gösterilmez.) */
let providers: Promise<{ google: boolean }> | null = null;
export function authProviders(): Promise<{ google: boolean }> {
  if (!providers) {
    providers = fetch(`${config!.supabaseUrl}/auth/v1/settings`, { headers: { apikey: config!.supabaseAnonKey } })
      .then((r) => (r.ok ? r.json() : {}))
      .then((j: { external?: Record<string, boolean> }) => ({ google: !!j.external?.google }))
      .catch(() => ({ google: false }));
  }
  return providers;
}

/** Supabase/Postgres hatalarını kullanıcıya gösterilecek Türkçe metne çevirir. */
export function friendlyError(e: unknown): string {
  const m = (e as { message?: string })?.message ?? String(e);
  if (/Invalid login credentials/i.test(m)) return L("E-posta veya şifre hatalı.", "Wrong email or password.");
  if (/Anonymous sign-ins are disabled|missing email|email.*(invalid|required)/i.test(m)) return L("Geçerli bir e-posta adresi girin.", "Enter a valid email address.");
  if (/User already registered/i.test(m)) return L("Bu e-posta ile zaten bir hesap var. Giriş yapmayı deneyin.", "An account with this email already exists. Try signing in.");
  if (/Password should be at least/i.test(m)) return L("Şifre en az 8 karakter olmalı.", "Password must be at least 8 characters.");
  if (/Email not confirmed/i.test(m)) return L("E-posta adresiniz henüz doğrulanmadı. Gelen kutunuzu kontrol edin.", "Your email isn't confirmed yet. Check your inbox.");
  if (/rate limit/i.test(m)) return L("Çok fazla deneme yapıldı. Birkaç dakika sonra tekrar deneyin.", "Too many attempts. Try again in a few minutes.");
  if (/Failed to fetch|NetworkError/i.test(m)) return L("Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.", "Can't reach the server. Check your internet connection.");
  if (/duplicate key/i.test(m)) return L("Bu kayıt zaten var.", "This record already exists.");
  if (/provider is not enabled|Unsupported provider/i.test(m)) return L("Google ile giriş henüz açık değil.", "Sign-in with Google isn't enabled yet.");
  // Veritabanı kurallarımız Türkçe mesaj döndürür; İngilizce arayüzde çevrilir
  const clean = m.replace(/^.*?ERROR:\s*/, "");
  return isEn() ? (DB_EN.find(([re]) => re.test(clean))?.[1](clean) ?? clean) : clean;
}

const num = (m: string) => m.match(/\d+/)?.[0] ?? "";
const DB_EN: [RegExp, (m: string) => string][] = [
  [/zaten bekleyen bir ölçüm/, () => "A measurement for this brand is already queued."],
  [/son bir saat içinde kontrol/, () => "This site was checked in the last hour."],
  [/Canlı aramalı ölçüm bu hesapta kapalı/, () => "Live-search measurement is off for this account."],
  [/En fazla 5 çalışma alanı/, () => "You can create up to 5 workspaces."],
  [/Geçersiz ad/, () => "Invalid name."],
  [/Marka bulunamadı/, () => "Brand not found."],
  [/Oturum gerekli/, () => "Please sign in."],
  [/en fazla \d+ marka/, (m) => `Plan limit: up to ${num(m)} brands.`],
  [/en fazla \d+ rakip/, (m) => `Plan limit: up to ${num(m)} competitors.`],
  [/en fazla \d+ aktif soru/, (m) => `Plan limit: up to ${num(m)} active questions per brand.`],
  [/Soru 5–300 karakter/, () => "A question must be 5–300 characters."],
  [/Yetki yok/, () => "You don't have permission for this."],
  [/Çalışma alanı durduruldu/, () => "This workspace is paused."],
  [/Önce en az bir soru ekleyin/, () => "Add at least one question first."],
  [/Önce markaya web sitesi ekleyin/, () => "Add a website to the brand first."],
  [/Ücretli kullanım tavanına ulaşıldı/, () => "The paid usage cap has been reached."],
];

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
