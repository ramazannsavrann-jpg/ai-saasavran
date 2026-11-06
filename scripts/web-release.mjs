// Derlenmiş arayüze (web/dist) yayın ayarlarını yazar:
//   config.json  — Supabase adresi ve herkese açık (anon/publishable) anahtar. Gizli anahtar ASLA buraya girmez.
//   _headers     — Cloudflare Pages güvenlik başlıkları (CSP, çerçeveleme yasağı vb.)
import { writeFileSync, existsSync } from "node:fs";

const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
if (!existsSync("web/dist/index.html")) throw new Error("Önce arayüzü derleyin: npm run build --prefix web");
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("SUPABASE_URL ve SUPABASE_ANON_KEY gerekli");
if (/service_role|sb_secret_/.test(SUPABASE_ANON_KEY) || JSON.stringify(SUPABASE_ANON_KEY).includes('"role":"service_role"')) {
  throw new Error("SUPABASE_ANON_KEY yerine gizli anahtar girilmiş. Herkese açık (anon / publishable) anahtarı kullanın.");
}
// JWT biçimli anahtarsa rolünü kontrol et
const parts = SUPABASE_ANON_KEY.split(".");
if (parts.length === 3) {
  const role = JSON.parse(Buffer.from(parts[1], "base64url").toString()).role;
  if (role !== "anon") throw new Error(`SUPABASE_ANON_KEY rolü "${role}"; "anon" olmalı.`);
}
const url = new URL(SUPABASE_URL);
if (url.protocol !== "https:") throw new Error("SUPABASE_URL https ile başlamalı");

writeFileSync("web/dist/config.json", JSON.stringify({
  supabaseUrl: url.origin, supabaseAnonKey: SUPABASE_ANON_KEY, environment: "production",
}));

const csp = [
  "default-src 'self'",
  `connect-src 'self' ${url.origin} ${url.origin.replace("https://", "wss://")}`,
  "img-src 'self' data:",
  "style-src 'self' 'unsafe-inline'", // React satır içi genişlik stilleri (grafik çubukları)
  "font-src 'self'",
  "script-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

writeFileSync("web/dist/_headers", `/*
  Content-Security-Policy: ${csp}
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains

/config.json
  Cache-Control: no-store

/assets/*
  Cache-Control: public, max-age=31536000, immutable
`);
console.log(`Yayın ayarları yazıldı: ${url.origin}`);
