// .aab dosyasını Google Play'de bir test kanalına (varsayılan: dahili test) yükler ve yayınlar.
// Kullanım: node scripts/android/play-upload.mjs <dosya.aab> [kanal]
// Gerekli: GOOGLE_SERVICE_ACCOUNT (hizmet hesabı JSON). Play Console'da hesaba
// "Test kanallarına sürüm yayınlama" izni verilmiş olmalı. Üretim kanalına yükleme yapılmaz.
// İsteğe bağlı: RELEASE_NOTES_TR (sürüm notu, Türkçe).
import { createSign } from "node:crypto";
import { readFileSync, appendFileSync } from "node:fs";

const PKG = "com.aisaasavran.app";
const [file, track = "internal"] = process.argv.slice(2);
const ALLOWED = ["internal", "alpha", "beta"]; // üretim (production) bilerek yok: sahibin onayıyla elle
const log = (s) => { console.log(s); if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, s + "\n"); };

if (!file) { log("Kullanım: play-upload.mjs <dosya.aab> [kanal]"); process.exit(2); }
if (!ALLOWED.includes(track)) { log(`Kanal izinli değil: ${track} (yalnız ${ALLOWED.join(", ")})`); process.exit(2); }
const sa = process.env.GOOGLE_SERVICE_ACCOUNT;
if (!sa) { log("GOOGLE_SERVICE_ACCOUNT yok: Play'e yükleme atlandı."); process.exit(1); }

async function token(j) {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const iat = Math.floor(Date.now() / 1000);
  const u = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({ iss: j.client_email, scope: "https://www.googleapis.com/auth/androidpublisher", aud: "https://oauth2.googleapis.com/token", iat, exp: iat + 3000 })}`;
  const sig = createSign("RSA-SHA256").update(u).sign(j.private_key).toString("base64url");
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${u}.${sig}` }) });
  if (!r.ok) throw new Error(`Erişim anahtarı alınamadı (HTTP ${r.status})`);
  return (await r.json()).access_token;
}

const at = await token(JSON.parse(sa));
const H = { Authorization: `Bearer ${at}` };
const API = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PKG}`;
async function call(method, url, body, headers = {}) {
  const r = await fetch(url, { method, headers: { ...H, ...headers }, body });
  const t = await r.text();
  let j = {}; try { j = JSON.parse(t || "{}"); } catch { /* boş */ }
  if (!r.ok) {
    const msg = String(j?.error?.message ?? t).slice(0, 400);
    if (r.status === 403) throw new Error(`İzin yok (HTTP 403). Play Console → Kullanıcılar ve izinler → hizmet hesabı → "Test kanallarına sürüm yayınlama" işaretli mi? Ayrıntı: ${msg}`);
    throw new Error(`HTTP ${r.status}: ${msg}`);
  }
  return j;
}

try {
  const edit = await call("POST", `${API}/edits`, "{}", { "content-type": "application/json" });
  const bundle = await call("POST", `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${PKG}/edits/${edit.id}/bundles?uploadType=media`, readFileSync(file), { "content-type": "application/octet-stream" });
  const vc = String(bundle.versionCode);
  const notes = process.env.RELEASE_NOTES_TR?.trim();
  await call("PUT", `${API}/edits/${edit.id}/tracks/${track}`, JSON.stringify({
    track,
    releases: [{ name: `1.0.${vc}`, versionCodes: [vc], status: "completed", ...(notes ? { releaseNotes: [{ language: "tr-TR", text: notes.slice(0, 500) }] } : {}) }],
  }), { "content-type": "application/json" });
  await call("POST", `${API}/edits/${edit.id}:commit`);
  log(`Google Play: 1.0.${vc} (versionCode ${vc}) "${track}" kanalına yüklendi ve yayınlandı.`);
} catch (e) {
  log(`Google Play yüklemesi başarısız: ${e.message}`);
  process.exit(1);
}
