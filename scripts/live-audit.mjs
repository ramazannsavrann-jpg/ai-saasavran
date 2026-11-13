// Canlı site denetimi: aisaasavran.com üzerinde gerçek isteklerle her parçayı dener ve okunur bir rapor yazar.
// Hesap açmaz, ödeme yapmaz, müşteri verisine dokunmaz. Ücretsiz kontrolü bir kez çalıştırır (5 ücretsiz Gemini sorgusu).
const BASE = (process.env.LIVE_URL || "https://aisaasavran.com").replace(/\/$/, "");
const results = [];
const add = (area, name, ok, note = "") => { results.push({ area, name, ok, note }); console.log(`${ok === true ? "✅" : ok === false ? "❌" : "⚠️"} [${area}] ${name}${note ? ` — ${note}` : ""}`); };
async function get(path, opts = {}) {
  const r = await fetch(path.startsWith("http") ? path : BASE + path, { redirect: "manual", ...opts, signal: AbortSignal.timeout(60_000) });
  const text = await r.text();
  let json = null; try { json = JSON.parse(text); } catch { /* düz metin */ }
  return { status: r.status, headers: r.headers, text, json };
}
async function step(area, name, fn) {
  try { const v = await fn(); if (v === undefined || v === true) add(area, name, true); else if (v === "warn") add(area, name, null); else add(area, name, !!v.ok, v.note ?? ""); }
  catch (e) { add(area, name, false, String(e.message || e).slice(0, 160)); }
}

// 1) Herkese açık sayfalar
await step("Site", "İngilizce ana sayfa açılıyor", async () => { const r = await get("/"); return { ok: r.status === 200 && r.text.includes("are you in the answer?"), note: `HTTP ${r.status}` }; });
await step("Site", "Türkçe ana sayfa açılıyor", async () => { const r = await get("/tr/"); return { ok: r.status === 200 && r.text.includes("Müşteriniz yapay zekâya sorduğunda"), note: `HTTP ${r.status}` }; });
await step("Site", "Fiyatlar 29 / 149 / 449 $", async () => { const r = await get("/pricing/"); const ok = ["$29", "$149", "$449"].every((p) => r.text.includes(p)) && !r.text.includes("$20") && !r.text.includes("$249"); return { ok, note: ok ? "" : "eski ya da eksik fiyat" }; });
await step("Site", "Ücretsiz kontrol sayfası", async () => { const r = await get("/tr/kontrol/"); return { ok: r.status === 200, note: `HTTP ${r.status}` }; });
for (const p of ["/robots.txt", "/sitemap.xml", "/llms.txt", "/gizlilik", "/kosullar", "/refund/"])
  await step("Site", `${p} açılıyor`, async () => { const r = await get(p); return { ok: r.status === 200, note: `HTTP ${r.status}` }; });
for (const p of ["/giris", "/kayit", "/panel", "/hesap", "/yonetim", "/rapor/00000000-0000-0000-0000-000000000000", "/davet/00000000-0000-0000-0000-000000000000"])
  await step("Uygulama", `${p} uygulama sayfası yükleniyor`, async () => { const r = await get(p); return { ok: r.status === 200 && r.text.includes('id="root"'), note: `HTTP ${r.status}` }; });

// 2) Yapılandırma ve güvenlik
await step("Güvenlik", "Yayın ayarları (config.json)", async () => {
  const r = await get("/config.json"); const c = r.json ?? {};
  const ok = c.environment === "production" && /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(c.supabaseUrl) && !String(c.supabaseAnonKey).startsWith("sb_secret_");
  return { ok, note: `ödeme: ${c.paddle ? `${c.paddle.environment}, ${Object.keys(c.paddle.prices ?? {}).join("/")}` : "kapalı"}` };
});
await step("Güvenlik", "Güvenlik başlıkları (CSP, çerçeve, HSTS)", async () => {
  const r = await get("/giris"); const h = (k) => r.headers.get(k) ?? "";
  const ok = h("content-security-policy").includes("default-src 'self'") && h("x-frame-options") === "DENY" && h("strict-transport-security").includes("max-age") && h("x-content-type-options") === "nosniff";
  return { ok };
});

// 3) Sunucu fonksiyonları
await step("API", "Ülke tespiti (/api/geo)", async () => { const r = await get("/api/geo"); return { ok: r.status === 200 && typeof r.json?.geminiFree === "boolean", note: `ülke: ${r.json?.country || "?"}` }; });
await step("API", "Bugünün ölçümü (/api/example)", async () => {
  const r = await get("/api/example");
  if (r.status === 404) return { ok: null, note: "bugün gösterilecek ölçüm yok" };
  const x = r.json ?? {}; const ok = r.status === 200 && x.brands?.length >= 2 && x.brands.every((b) => /^[A-H]$/.test(b.label)) && !/https?:\/\//.test(r.text);
  return { ok, note: ok ? `soru: "${x.question}", ${x.answers} cevap, ${x.brands.length} marka (harfle)` : `HTTP ${r.status}` };
});
await step("API", "Geçersiz rapor bağlantısı reddediliyor", async () => { const r = await get("/api/report?t=00000000-0000-0000-0000-000000000000"); return { ok: r.status === 404, note: `HTTP ${r.status}` }; });
await step("API", "Soru önerisi girişsiz reddediliyor", async () => { const r = await get("/api/suggest", { method: "POST", body: "{}" }); return { ok: r.status === 401, note: r.status === 405 || r.status === 404 ? "henüz yayında değil" : `HTTP ${r.status}` }; });
await step("API", "MCP sunucusu anahtarsız reddediliyor", async () => { const r = await get("/api/mcp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }) }); return { ok: r.status === 401, note: r.status === 404 || r.status === 405 ? "henüz yayında değil" : `HTTP ${r.status}` }; });
await step("API", "REST API anahtarsız reddediliyor", async () => { const r = await get("/api/v1/brands"); return { ok: r.status === 401, note: r.status === 404 ? "henüz yayında değil" : `HTTP ${r.status}` }; });
await step("Ödeme", "Paddle bildirimi sahte imzayı reddediyor", async () => { const r = await get("/api/paddle/webhook", { method: "POST", headers: { "Paddle-Signature": "ts=1;h1=deadbeef" }, body: "{}" }); return { ok: r.status === 401, note: `HTTP ${r.status}` }; });
await step("Ödeme", "Abonelik portalı girişsiz reddediliyor", async () => { const r = await get("/api/paddle/portal", { method: "POST", body: "{}" }); return { ok: r.status === 401, note: `HTTP ${r.status}` }; });
await step("E-posta", "Abonelikten çıkma geçersiz bağlantıyı reddediyor", async () => { const r = await get("/api/unsubscribe?t=gecersiz"); return { ok: r.status === 400, note: `HTTP ${r.status}` }; });

// 4) Ücretsiz kontrol: gerçek Gemini ile uçtan uca (5 ücretsiz sorgu)
await step("Ücretsiz kontrol", "Gerçek Gemini ile kontrol çalışıyor", async () => {
  const r = await get("/api/check", { method: "POST", headers: { "content-type": "application/json", "x-aisv-test": "live-audit" }, body: JSON.stringify({ lang: "tr", brand: "AI SaaSavran", category: "yapay zekâ görünürlük ölçüm aracı", city: "", website: "aisaasavran.com" }) });
  if (r.status === 429) return { ok: null, note: `sınır: ${r.json?.error} (kişi başı 30 günde 2 kontrol ya da günlük tavan)` };
  if (r.status === 451) return { ok: null, note: "test makinesinin ülkesinde ücretsiz Gemini kapalı" };
  const x = r.json ?? {};
  return { ok: r.status === 200 && x.total > 0, note: r.status === 200 ? `${x.total} cevap, ${x.mentioned} anılma, ${x.recommended} öneri; diğer adlar: ${(x.others ?? []).length}` : `HTTP ${r.status} ${r.json?.error ?? ""}` };
});

// 5) Giriş ayarları (Supabase Auth, herkese açık ayar uç noktası)
await step("Giriş", "Google ile giriş açık, e-posta doğrulaması zorunlu", async () => {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return "warn";
  const r = await get(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_ANON_KEY } });
  const s = r.json ?? {};
  return { ok: r.status === 200 && s.external?.google === true && s.mailer_autoconfirm === false, note: `google: ${s.external?.google}, e-posta otomatik onay: ${s.mailer_autoconfirm}, kayıt açık: ${!s.disable_signup}` };
});

const fail = results.filter((r) => r.ok === false), warn = results.filter((r) => r.ok === null);
console.log(`\nÖZET: ${results.length} kontrol, ${results.length - fail.length - warn.length} başarılı, ${warn.length} uyarı, ${fail.length} hata`);
if (process.env.GITHUB_STEP_SUMMARY) {
  const { appendFileSync } = await import("node:fs");
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Canlı site denetimi\n\n| | Alan | Kontrol | Not |\n|---|---|---|---|\n${results.map((r) => `| ${r.ok === true ? "✅" : r.ok === false ? "❌" : "⚠️"} | ${r.area} | ${r.name} | ${r.note.replace(/\|/g, "/")} |`).join("\n")}\n\n**${results.length - fail.length - warn.length} başarılı, ${warn.length} uyarı, ${fail.length} hata**\n`);
}
process.exit(fail.length ? 1 : 0);
