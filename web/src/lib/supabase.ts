import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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

/** Supabase/Postgres hatalarını kullanıcıya gösterilecek Türkçe metne çevirir. */
export function friendlyError(e: unknown): string {
  const m = (e as { message?: string })?.message ?? String(e);
  if (/Invalid login credentials/i.test(m)) return "E-posta veya şifre hatalı.";
  if (/Anonymous sign-ins are disabled|missing email|email.*(invalid|required)/i.test(m)) return "Geçerli bir e-posta adresi girin.";
  if (/User already registered/i.test(m)) return "Bu e-posta ile zaten bir hesap var. Giriş yapmayı deneyin.";
  if (/Password should be at least/i.test(m)) return "Şifre en az 8 karakter olmalı.";
  if (/Email not confirmed/i.test(m)) return "E-posta adresiniz henüz doğrulanmadı. Gelen kutunuzu kontrol edin.";
  if (/rate limit/i.test(m)) return "Çok fazla deneme yapıldı. Birkaç dakika sonra tekrar deneyin.";
  if (/Failed to fetch|NetworkError/i.test(m)) return "Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.";
  if (/duplicate key/i.test(m)) return "Bu kayıt zaten var.";
  // Veritabanı kurallarımız zaten Türkçe mesaj döndürür
  return m.replace(/^.*?ERROR:\s*/, "");
}

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
