// Android imza anahtarını (upload key) gizli Supabase Storage kovasında saklar.
// İlk çalıştırmada anahtar yoksa üretir ve yükler; sonraki çalıştırmalarda aynısını indirir.
// Anahtar ve şifreleri asla repoya, loga veya sohbete yazılmaz. Kova yalnız service role ile erişilebilir (public değil).
// Kullanım: node scripts/android/keystore.mjs <keystore-dosyası> <şifre-env-dosyası>
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, appendFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

const [ksPath = "android.keystore", envPath = "android-signing.env"] = process.argv.slice(2);
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) { console.error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY yok"); process.exit(1); }
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const BUCKET = "uygulama-imza", KS = "android/upload.keystore", PW = "android/upload.json", ALIAS = "upload";

const { data: buckets } = await sb.storage.listBuckets();
if (!buckets?.some((b) => b.id === BUCKET)) {
  const { error } = await sb.storage.createBucket(BUCKET, { public: false });
  if (error && !/exist/i.test(error.message)) throw error;
}
const { data: b } = await sb.storage.getBucket(BUCKET);
if (b?.public) throw new Error("İmza kovası herkese açık olmamalı");

let ks = await sb.storage.from(BUCKET).download(KS);
let pw = await sb.storage.from(BUCKET).download(PW);
let secrets;
if (ks.error || pw.error) {
  if (!ks.error !== !pw.error) throw new Error("Kovada anahtar ya da şifre dosyasından yalnız biri var; elle inceleyin, üzerine yazılmadı.");
  console.log("İmza anahtarı yok; yeni anahtar üretiliyor (yalnız ilk kez).");
  secrets = { storePassword: randomBytes(24).toString("base64url"), keyPassword: "", alias: ALIAS };
  secrets.keyPassword = secrets.storePassword; // PKCS12'de iki şifre aynı olmalı
  if (existsSync(ksPath)) throw new Error(`${ksPath} zaten var`);
  execFileSync("keytool", ["-genkeypair", "-v", "-storetype", "PKCS12", "-keystore", ksPath, "-alias", ALIAS, "-keyalg", "RSA", "-keysize", "2048",
    "-validity", "10000", "-storepass", secrets.storePassword, "-keypass", secrets.keyPassword,
    "-dname", "CN=AI SaaSavran, O=AI SaaSavran, L=Antalya, C=TR"], { stdio: "ignore" });
  const up1 = await sb.storage.from(BUCKET).upload(KS, readFileSync(ksPath), { contentType: "application/octet-stream", upsert: false });
  if (up1.error) throw up1.error;
  const up2 = await sb.storage.from(BUCKET).upload(PW, JSON.stringify(secrets), { contentType: "application/json", upsert: false });
  if (up2.error) throw up2.error;
} else {
  writeFileSync(ksPath, Buffer.from(await ks.data.arrayBuffer()));
  secrets = JSON.parse(await pw.data.text());
  console.log("Kayıtlı imza anahtarı indirildi.");
}
if (process.env.GITHUB_ACTIONS) { console.log(`::add-mask::${secrets.storePassword}`); console.log(`::add-mask::${secrets.keyPassword}`); }
writeFileSync(envPath, `KS_PASS=${secrets.storePassword}\nKEY_PASS=${secrets.keyPassword}\nKEY_ALIAS=${secrets.alias}\n`, { mode: 0o600 });

const list = execFileSync("keytool", ["-list", "-v", "-keystore", ksPath, "-alias", secrets.alias, "-storepass", secrets.storePassword]).toString();
const sha = (list.match(/SHA256:\s*([0-9A-F:]+)/) || [])[1];
if (!sha) throw new Error("SHA-256 parmak izi okunamadı");
console.log(`Upload anahtarı SHA-256: ${sha}`);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `sha256=${sha}\n`);
