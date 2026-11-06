// Yayın ayarlarını kontrol eder. HİÇBİR anahtar değerini yazdırmaz; yalnızca türünü ve çalışıp çalışmadığını söyler.
// GitHub Actions'ta "Ayar kontrolü" işi olarak çalışır; sonuç iş özetine (Summary) de yazılır.

import { spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";

const env = process.env;
const rows = [];
const add = (name, ok, msg) => rows.push({ name, ok, msg });

function keyKind(v) {
  if (!v) return "missing";
  if (v.startsWith("sb_publishable_")) return "publishable";
  if (v.startsWith("sb_secret_")) return "secret";
  const p = v.split(".");
  if (p.length === 3) {
    try { const role = JSON.parse(Buffer.from(p[1], "base64url").toString()).role; return role === "anon" ? "anon" : role === "service_role" ? "service_role" : `jwt:${role}`; } catch {}
  }
  if (v.startsWith("http")) return "url";
  if (v.startsWith("postgres")) return "db_url";
  return "unknown";
}
const KIND_TEXT = {
  publishable: "Publishable (herkese açık) anahtar", anon: "anon (herkese açık) anahtar",
  secret: "Secret (gizli) anahtar", service_role: "service_role (gizli) anahtar",
  url: "bir web adresi", db_url: "bir veritabanı bağlantı adresi", unknown: "tanınmayan bir değer",
};

async function http(url, headers) {
  try { const r = await fetch(url, { headers, signal: AbortSignal.timeout(15000) }); return r.status; } catch (e) { return `bağlantı hatası (${e.name})`; }
}

// --- SUPABASE_URL
let base = null;
if (!env.SUPABASE_URL) add("SUPABASE_URL", false, "Eksik");
else {
  try {
    const u = new URL(env.SUPABASE_URL.trim());
    if (u.protocol !== "https:" || !u.hostname.endsWith(".supabase.co")) add("SUPABASE_URL", false, `Beklenen biçim https://<proje>.supabase.co; girilen değer ${KIND_TEXT[keyKind(env.SUPABASE_URL)] ?? "farklı"}`);
    else { base = u.origin; add("SUPABASE_URL", true, "Biçim doğru"); }
  } catch { add("SUPABASE_URL", false, `Adres değil; girilen değer ${KIND_TEXT[keyKind(env.SUPABASE_URL)]}`); }
}

// --- SUPABASE_ANON_KEY
const ak = keyKind(env.SUPABASE_ANON_KEY);
if (ak === "missing") add("SUPABASE_ANON_KEY", false, "Eksik");
else if (ak === "publishable" || ak === "anon") {
  const s = base ? await http(`${base}/auth/v1/settings`, { apikey: env.SUPABASE_ANON_KEY }) : "URL olmadan test edilemedi";
  add("SUPABASE_ANON_KEY", s === 200, s === 200 ? `${KIND_TEXT[ak]}, Supabase kabul etti` : `${KIND_TEXT[ak]}, ama Supabase kabul etmedi (${s})`);
} else add("SUPABASE_ANON_KEY", false, `YANLIŞ: buraya ${KIND_TEXT[ak] ?? ak} girilmiş. Publishable (sb_publishable_) veya anon anahtarı olmalı.`);

// --- SUPABASE_SERVICE_ROLE_KEY
const sk = keyKind(env.SUPABASE_SERVICE_ROLE_KEY);
if (sk === "missing") add("SUPABASE_SERVICE_ROLE_KEY", false, "Eksik");
else if (sk === "secret" || sk === "service_role") {
  const s = base ? await http(`${base}/auth/v1/admin/users?per_page=1`, { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` }) : "URL olmadan test edilemedi";
  add("SUPABASE_SERVICE_ROLE_KEY", s === 200, s === 200 ? `${KIND_TEXT[sk]}, Supabase kabul etti` : `${KIND_TEXT[sk]}, ama Supabase kabul etmedi (${s})`);
} else add("SUPABASE_SERVICE_ROLE_KEY", false, `YANLIŞ: buraya ${KIND_TEXT[sk] ?? sk} girilmiş. Secret (sb_secret_) veya service_role anahtarı olmalı.`);

// --- SUPABASE_DB_URL
const db = env.SUPABASE_DB_URL?.trim();
if (!db) add("SUPABASE_DB_URL", false, "Eksik");
else if (!db.startsWith("postgres")) add("SUPABASE_DB_URL", false, `YANLIŞ: postgresql:// ile başlamalı; girilen değer ${KIND_TEXT[keyKind(db)]}`);
else if (/\[YOUR-PASSWORD\]|YOUR-PASSWORD/i.test(db)) add("SUPABASE_DB_URL", false, "[YOUR-PASSWORD] yazısı şifreyle değiştirilmemiş");
else if (/@db\.[a-z0-9]+\.supabase\.co/.test(db)) add("SUPABASE_DB_URL", false, "Doğrudan bağlantı adresi girilmiş; GitHub buna bağlanamaz. Connect → Session pooler adresini kullanın.");
else {
  const r = spawnSync("psql", ["-X", "-A", "-t", db, "-c", "select 1"], { encoding: "utf8", timeout: 20000 });
  const err = (r.stderr || "").split(db).join("***");
  if (r.status === 0) add("SUPABASE_DB_URL", true, "Veritabanına bağlanıldı");
  else if (/password authentication failed/i.test(err)) add("SUPABASE_DB_URL", false, "Şifre yanlış (veritabanı şifresi, Supabase hesap şifresi değil)");
  else if (/Tenant or user not found/i.test(err)) add("SUPABASE_DB_URL", false, "Kullanıcı adı yanlış; Session pooler adresini olduğu gibi kopyalayın");
  else add("SUPABASE_DB_URL", false, `Bağlanılamadı: ${err.split("\n")[0].slice(0, 160)}`);
}

// --- Cloudflare
if (!env.CLOUDFLARE_ACCOUNT_ID) add("CLOUDFLARE_ACCOUNT_ID", false, "Eksik");
else add("CLOUDFLARE_ACCOUNT_ID", /^[a-f0-9]{32}$/.test(env.CLOUDFLARE_ACCOUNT_ID.trim()), /^[a-f0-9]{32}$/.test(env.CLOUDFLARE_ACCOUNT_ID.trim()) ? "Biçim doğru" : "Biçim yanlış (32 karakterlik harf-rakam olmalı)");
if (!env.CLOUDFLARE_API_TOKEN) add("CLOUDFLARE_API_TOKEN", false, "Eksik");
else {
  const s = await http("https://api.cloudflare.com/client/v4/user/tokens/verify", { authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN.trim()}` });
  add("CLOUDFLARE_API_TOKEN", s === 200, s === 200 ? "Cloudflare kabul etti" : `Cloudflare kabul etmedi (${s})`);
}

// --- Gemini (yalnızca var mı)
add("GEMINI_API_KEY", !!env.GEMINI_API_KEY, env.GEMINI_API_KEY ? "Var" : "Eksik");

const lines = rows.map((r) => `${r.ok ? "✅" : "❌"} ${r.name}: ${r.msg}`);
console.log(lines.join("\n"));
if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, `## Ayar kontrolü\n\n${lines.map((l) => `- ${l}`).join("\n")}\n`);
