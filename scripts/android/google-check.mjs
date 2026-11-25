// Google ayarlarını denetler (değer yazdırmadan): GOOGLE_SERVICES_JSON paket adı ve GOOGLE_SERVICE_ACCOUNT ile
// FCM ve Google Play için erişim anahtarı alınabiliyor mu. Yalnız sonuç (tamam/hata) yazılır.
import { createSign } from "node:crypto";
const out = [];
const gs = process.env.GOOGLE_SERVICES_JSON, sa = process.env.GOOGLE_SERVICE_ACCOUNT;
if (!gs) out.push("GOOGLE_SERVICES_JSON: YOK");
else {
  try {
    const j = JSON.parse(gs);
    const pk = (j.client ?? []).map((c) => c?.client_info?.android_client_info?.package_name);
    out.push(`GOOGLE_SERVICES_JSON: ${pk.includes("com.aisaasavran.app") ? "tamam (paket adı doğru)" : "HATA: paket adı com.aisaasavran.app değil"}`);
  } catch { out.push("GOOGLE_SERVICES_JSON: HATA (geçerli JSON değil; dosyanın tamamı yapıştırılmamış olabilir)"); }
}
async function token(j, scope) {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const iat = Math.floor(Date.now() / 1000);
  const u = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({ iss: j.client_email, scope, aud: "https://oauth2.googleapis.com/token", iat, exp: iat + 600 })}`;
  const sig = createSign("RSA-SHA256").update(u).sign(j.private_key).toString("base64url");
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${u}.${sig}` }) });
  if (!r.ok) return null;
  return (await r.json()).access_token ?? null;
}
if (!sa) out.push("GOOGLE_SERVICE_ACCOUNT: YOK");
else {
  try {
    const j = JSON.parse(sa);
    if (j.type !== "service_account") out.push("GOOGLE_SERVICE_ACCOUNT: HATA (hizmet hesabı anahtarı değil; yanlış dosya olabilir)");
    else {
      out.push(`GOOGLE_SERVICE_ACCOUNT: tamam (proje: ${j.project_id})`);
      out.push(`  FCM erişimi: ${(await token(j, "https://www.googleapis.com/auth/firebase.messaging")) ? "tamam" : "HATA"}`);
      const at = await token(j, "https://www.googleapis.com/auth/androidpublisher");
      out.push(`  Google Play erişim anahtarı: ${at ? "alınabiliyor" : "HATA"}`);
      if (at) {
        // Play Console izni: uygulamanın abonelik ve tek seferlik ürünlerini okuyabiliyor mu (yalnız okuma)
        const PKG = "com.aisaasavran.app";
        const get = (u) => fetch(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PKG}/${u}`, { headers: { Authorization: `Bearer ${at}` } });
        const s = await get("subscriptions");
        if (s.ok) { const d = await s.json(); out.push(`  Play Console izni: tamam · abonelikler: ${(d.subscriptions ?? []).map((x) => `${x.productId}(${(x.basePlans ?? []).map((b) => `${b.basePlanId}:${b.state}`).join(",")})`).join(" ") || "yok"}`); }
        else { const e = await s.json().catch(() => ({})); out.push(`  Play Console izni: HENÜZ YOK (HTTP ${s.status}: ${String(e?.error?.message ?? "").slice(0, 300)})`); }
        const o = await get("oneTimeProducts");
        if (o.ok) { const d = await o.json(); out.push(`  Tek seferlik ürünler: ${(d.oneTimeProducts ?? []).map((x) => x.productId).join(" ") || "yok"}`); }
      }
    }
  } catch { out.push("GOOGLE_SERVICE_ACCOUNT: HATA (geçerli JSON değil; dosyanın tamamı yapıştırılmamış olabilir)"); }
}
console.log(out.join("\n"));
if (process.env.GITHUB_STEP_SUMMARY) (await import("node:fs")).appendFileSync(process.env.GITHUB_STEP_SUMMARY, "```\n" + out.join("\n") + "\n```\n");
