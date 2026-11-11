// Derlenmiş arayüze (web/dist) yayın ayarlarını yazar:
//   config.json  — Supabase adresi ve herkese açık (anon/publishable) anahtar. Gizli anahtar ASLA buraya girmez.
//   _headers     — Cloudflare Pages güvenlik başlıkları (CSP, çerçeveleme yasağı vb.)
import { writeFileSync, existsSync, readFileSync } from "node:fs";

const { SUPABASE_URL, SUPABASE_ANON_KEY, PADDLE_CLIENT_TOKEN } = process.env;
if (!existsSync("web/dist/index.html") || !existsSync("web/dist/app/index.html")) throw new Error("Önce arayüzü derleyin: npm run build --prefix web");
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

// Paddle: herkese açık istemci anahtarı (client-side token) ve fiyat kimlikleri. Sunucu API anahtarı ASLA buraya girmez.
let paddle = null;
if (PADDLE_CLIENT_TOKEN) {
  if (!/^(live|test)_[A-Za-z0-9]+$/.test(PADDLE_CLIENT_TOKEN)) throw new Error("PADDLE_CLIENT_TOKEN 'live_' ile başlayan istemci anahtarı olmalı (sunucu API anahtarı değil).");
  // Paddle kurulum adımının ürettiği güncel katalog varsa o, yoksa depodaki kayıtlı katalog
  const catalog = JSON.parse(readFileSync(process.env.PADDLE_CATALOG_FILE && existsSync(process.env.PADDLE_CATALOG_FILE) ? process.env.PADDLE_CATALOG_FILE : "billing/paddle-catalog.json", "utf8"));
  const env = PADDLE_CLIENT_TOKEN.startsWith("test_") ? "sandbox" : "production";
  if ((env === "sandbox") !== (catalog.env === "sandbox")) throw new Error("Paddle istemci anahtarı ile katalog ortamı uyuşmuyor");
  paddle = { clientToken: PADDLE_CLIENT_TOKEN, environment: env, prices: catalog.prices };
}
writeFileSync("web/dist/config.json", JSON.stringify({
  supabaseUrl: url.origin, supabaseAnonKey: SUPABASE_ANON_KEY, environment: "production", paddle,
}));

const csp = [
  "default-src 'self'",
  // Cloudflare Web Analytics (çerezsiz ziyaret sayımı) alan adına otomatik eklenir
  // Paddle (ödeme penceresi): cdn.paddle.com betiği, buy.paddle.com çerçevesi
  `connect-src 'self' ${url.origin} ${url.origin.replace("https://", "wss://")} https://cloudflareinsights.com https://*.paddle.com`,
  "img-src 'self' data: https://*.paddle.com",
  "style-src 'self' 'unsafe-inline' https://cdn.paddle.com", // React satır içi genişlik stilleri (grafik çubukları)
  "font-src 'self'",
  "script-src 'self' https://static.cloudflareinsights.com https://cdn.paddle.com",
  "frame-src https://buy.paddle.com https://sandbox-buy.paddle.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

writeFileSync("web/dist/_headers", `/*
  Content-Security-Policy: ${csp}
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(self "https://buy.paddle.com")
  Strict-Transport-Security: max-age=31536000; includeSubDomains

/config.json
  Cache-Control: no-store

/assets/*
  Cache-Control: public, max-age=31536000, immutable
`);
console.log(`Yayın ayarları yazıldı: ${url.origin}; ödeme: ${paddle ? paddle.environment : "kapalı"}`);
