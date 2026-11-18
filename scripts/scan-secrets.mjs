// Repoya girebilecek dosyalarda API anahtarı kalıplarını arar. Bulursa CI'ı düşürür.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const files = execSync("git ls-files 2>/dev/null || find . -type f -not -path './node_modules/*' -not -path './.git/*'", { encoding: "utf8" })
  .split("\n").filter((f) => f && !f.includes("node_modules") && !f.endsWith("package-lock.json"));
const patterns = [
  ["Google API anahtarı", /AIza[0-9A-Za-z_\-]{35}/],
  ["OpenAI anahtarı", /sk-(proj-)?[A-Za-z0-9_\-]{20,}/],
  ["Perplexity anahtarı", /pplx-[A-Za-z0-9]{20,}/],
  ["Anthropic anahtarı", /sk-ant-[A-Za-z0-9_\-]{20,}/],
  ["JWT / Supabase servis anahtarı", /eyJ[A-Za-z0-9_\-]{20,}\.eyJ[A-Za-z0-9_\-]{20,}/],
  ["Özel anahtar", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["Supabase gizli anahtarı", /sb_secret_[A-Za-z0-9_\-]{20,}/],
  ["Postgres bağlantı adresi (şifreli)", /postgres(ql)?:\/\/[^:\s]+:[^@\s]{8,}@[a-z0-9.-]*supabase/],
  ["Cloudflare API anahtarı", /CLOUDFLARE_API_TOKEN\s*=\s*[A-Za-z0-9_\-]{30,}/],
  // 18 Kasım denetimi: kullanılan diğer servisler + kişisel e-posta
  ["Paddle API anahtarı", /pdl_(live|sdbx)_apikey_[A-Za-z0-9_]{20,}/],
  ["Paddle webhook gizli anahtarı", /pdl_ntfset_[A-Za-z0-9_]{20,}/],
  ["Resend anahtarı", /\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{16,}/],
  ["SerpApi anahtarı", /SERPAPI_KEY\s*[=:]\s*["']?[a-f0-9]{64}/],
  ["Turnstile gizli anahtarı", /TURNSTILE_SECRET\w*\s*[=:]\s*["']?0x4[A-Za-z0-9_\-]{20,}/],
  ["GitHub anahtarı", /\b(gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,})/],
  ["YouTube/Google OAuth yenileme anahtarı", /\b1\/\/0[A-Za-z0-9_\-]{40,}/],
  ["Kişisel e-posta adresi", /[A-Za-z0-9._%+-]+@(gmail|hotmail|outlook|yahoo|icloud|yandex)\.(com|com\.tr)\b/],
];
let found = 0;
for (const f of files) {
  let txt; try { txt = readFileSync(f, "utf8"); } catch { continue; }
  for (const [name, re] of patterns) if (re.test(txt)) { console.error(`GİZLİ BİLGİ? ${f}: ${name}`); found++; }
  if (/^\.env($|\.)/.test(f.split("/").pop()) && !f.endsWith(".env.example")) { console.error(`.env dosyası repoda: ${f}`); found++; }
}
if (found) process.exit(1);
console.log(`Gizli bilgi taraması temiz (${files.length} dosya).`);
