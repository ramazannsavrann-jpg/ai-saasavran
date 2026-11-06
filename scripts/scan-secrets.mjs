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
];
let found = 0;
for (const f of files) {
  let txt; try { txt = readFileSync(f, "utf8"); } catch { continue; }
  for (const [name, re] of patterns) if (re.test(txt)) { console.error(`GİZLİ BİLGİ? ${f}: ${name}`); found++; }
  if (/^\.env($|\.)/.test(f.split("/").pop()) && !f.endsWith(".env.example")) { console.error(`.env dosyası repoda: ${f}`); found++; }
}
if (found) process.exit(1);
console.log(`Gizli bilgi taraması temiz (${files.length} dosya).`);
