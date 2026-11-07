// Canlı site kontrolü: yayından sonra GitHub Actions'ta çalışır. LIVE_URL yoksa atlanır.
// Hesap oluşturmaz, veri yazmaz; yalnızca sitenin açıldığını ve doğru yapılandırıldığını doğrular.
import { test, expect } from "@playwright/test";

const LIVE = process.env.LIVE_URL;
test.skip(!LIVE, "LIVE_URL tanımlı değil");

test("Canlı site: açılıyor, doğru yapılandırılmış, güvenlik başlıkları var", async ({ page, request }) => {
  const base = LIVE!.replace(/\/$/, "");

  const cfgRes = await request.get(`${base}/config.json`);
  expect(cfgRes.status()).toBe(200);
  const cfg = await cfgRes.json();
  expect(cfg.environment).toBe("production");
  expect(cfg.supabaseUrl).toMatch(/^https:\/\/[a-z0-9]+\.supabase\.co$/);
  expect(cfg.supabaseAnonKey.startsWith("sb_secret_")).toBe(false);

  const home = await request.get(`${base}/giris`);
  expect(home.status()).toBe(200);
  const h = home.headers();
  expect(h["content-security-policy"], "CSP başlığı yok").toContain("default-src 'self'");
  expect(h["x-frame-options"]).toBe("DENY");

  // Google "Publish app" için gereken sayfalar
  for (const path of ["/gizlilik", "/kosullar"]) expect((await request.get(`${base}${path}`)).status()).toBe(200);

  // Herkese açık statik sayfalar (JavaScript'siz okunabilir) ve bot dosyaları
  const landing = await (await request.get(`${base}/`)).text();
  expect(landing).toContain("are you in the answer?");
  expect(await (await request.get(`${base}/tr/`)).text()).toContain("Müşteriniz yapay zekâya sorduğunda");
  expect(landing).not.toContain('id="root"');
  for (const path of ["/guides/", "/guides/what-is-geo/", "/rehber/", "/rehber/geo-nedir/", "/llms.txt", "/sitemap.xml", "/robots.txt", "/terms/", "/privacy/", "/refund/", "/iade/", "/pricing/"]) expect((await request.get(`${base}${path}`)).status(), path).toBe(200);
  expect(await (await request.get(`${base}/refund/`)).text()).toContain("14-day money-back guarantee");
  // Uygulama adresleri uygulamayı döndürür
  expect(await (await request.get(`${base}/panel`)).text()).toContain('id="root"');

  // Doğrudan alt sayfa adresi (SPA yönlendirmesi) çalışıyor mu?
  expect((await request.get(`${base}/marka/olmayan-bir-marka`)).status()).toBe(200);

  // Supabase giriş sunucusu site anahtarını kabul ediyor mu? E-posta doğrulaması açık mı?
  const auth = await request.get(`${cfg.supabaseUrl}/auth/v1/settings`, { headers: { apikey: cfg.supabaseAnonKey } });
  expect(auth.status()).toBe(200);
  const settings = await auth.json();
  console.log(`E-posta doğrulaması: ${settings.mailer_autoconfirm ? "KAPALI" : "açık"}; e-posta ile kayıt: ${settings.external?.email ? "açık" : "KAPALI"}; Google ile giriş: ${settings.external?.google ? "açık" : "kapalı (Supabase'de ayarlanmadı)"}`);

  // Tarayıcıda gerçekten açılıyor mu (CSP uygulamayı bozuyor mu)?
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${base}/giris`);
  await expect(page.getByRole("heading", { name: "Giriş yap" })).toBeVisible();
  await page.goto(`${base}/durum`);
  await expect(page.getByText("gerçek müşteri kullanımına hazır değildir")).toBeVisible();
  await page.screenshot({ path: "e2e/screenshots/canli-durum.png", fullPage: true });
  await page.goto(`${base}/giris`);
  await page.screenshot({ path: "e2e/screenshots/canli-giris.png", fullPage: true });
  await page.goto(`${base}/`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("are you in the answer?");
  await page.screenshot({ path: "e2e/screenshots/canli-anasayfa.png", fullPage: true });
  expect(errors, `Tarayıcı hataları:\n${errors.join("\n")}`).toEqual([]);
});
