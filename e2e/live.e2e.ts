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

  // Doğrudan alt sayfa adresi (SPA yönlendirmesi) çalışıyor mu?
  expect((await request.get(`${base}/marka/olmayan-bir-marka`)).status()).toBe(200);

  // Supabase giriş sunucusu site anahtarını kabul ediyor mu? E-posta doğrulaması açık mı?
  const auth = await request.get(`${cfg.supabaseUrl}/auth/v1/settings`, { headers: { apikey: cfg.supabaseAnonKey } });
  expect(auth.status()).toBe(200);
  const settings = await auth.json();
  console.log(`E-posta doğrulaması: ${settings.mailer_autoconfirm ? "KAPALI" : "açık"}; e-posta ile kayıt: ${settings.external?.email ? "açık" : "KAPALI"}`);

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
  expect(errors, `Tarayıcı hataları:\n${errors.join("\n")}`).toEqual([]);
});
