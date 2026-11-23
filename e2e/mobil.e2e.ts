// Mobil uygulama ekranları (Capacitor içindeki web kodu) yerel sunucuya karşı, telefon boyutunda.
// Derleme: MOBILE_API_BASE="" MOBILE_OUT=dist-mobile-test vite build -c vite.mobile.config.ts (test kendisi yapar)
import { test, expect } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync, renameSync, existsSync } from "node:fs";
import { join } from "node:path";
import { startStack } from "../scripts/stack/stack.mjs";
import { processNextRun } from "../engine/src/worker.ts";
import { createClient } from "@supabase/supabase-js";

const SHOTS = "e2e/screenshots/mobil";
const OUT = join(process.cwd(), "web", "dist-mobile-test");
let stack: Awaited<ReturnType<typeof startStack>>;
test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  mkdirSync(SHOTS, { recursive: true });
  execSync("npx vite build -c vite.mobile.config.ts", { cwd: "web", env: { ...process.env, MOBILE_API_BASE: "", MOBILE_OUT: "dist-mobile-test" }, stdio: "ignore" });
  if (existsSync(join(OUT, "mobile.html"))) renameSync(join(OUT, "mobile.html"), join(OUT, "index.html"));
  stack = await startStack({ quiet: true, webDir: OUT });
  stack.sql("update plans set monthly_runs = 4 where id = 'free';");
});
test.afterAll(async () => { await stack?.stop(); });

const shot = (page: import("@playwright/test").Page, n: string) => page.screenshot({ path: `${SHOTS}/${n}.png` });
const noOverflow = async (page: import("@playwright/test").Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);

test("Mobil: kayıt → işletme kurulumu → ölçüm → rakip → bildirimler → hesap silme", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Markanız yapay zekâlarda öneriliyor mu?" })).toBeVisible();
  await noOverflow(page); await shot(page, "01-karsilama");
  await page.getByRole("link", { name: "Ücretsiz başla" }).click();
  await page.getByLabel("E-posta").fill("mobil@ornek.test");
  await page.getByLabel("Şifre (en az 8 karakter)").fill("Guclu-Sifre-2026");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Hesap aç" }).click();

  await expect(page.getByRole("heading", { name: "İşletmenizi ekleyin" })).toBeVisible();
  await page.getByLabel("İşletme veya marka adı").fill("Mobil Döner");
  await page.getByLabel("Şehir").fill("Antalya");
  await page.getByLabel("Ne satıyorsunuz?").fill("döner");
  await noOverflow(page); await shot(page, "02-kurulum");
  await page.getByRole("button", { name: "Devam et" }).click();

  await expect(page.getByText("Henüz ölçüm yok")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Alt menü" })).toBeVisible();
  await noOverflow(page); await shot(page, "03-ana-sayfa-bos");
  await page.getByRole("button", { name: "Yeni ölçüm başlat" }).click();
  await expect(page.getByText(/Ölçüm (sırada|çalışıyor)/)).toBeVisible();

  // Ölçümü test cevaplarıyla işle (gerçek API yok)
  const fake = async () => new Response(JSON.stringify({
    candidates: [{ content: { parts: [{ text: "Antalya'da Mobil Döner ve Rakip Kebap öne çıkıyor. Mobil Döner'i öneririm." }] }, finishReason: "STOP" }],
    usageMetadata: { promptTokenCount: 20, candidatesTokenCount: 120 },
  }), { status: 200 });
  const db = createClient(stack.url, stack.serviceKey, { auth: { persistSession: false } });
  await processNextRun({ db, env: { GEMINI_API_KEY: "test", GEMINI_TIER: "free", ALLOW_PAID_API: "false" }, fetchFn: fake as never, sleep: async () => {} });
  await page.reload();
  await expect(page.getByText("Yapay zekâ cevaplarında önerilme oranı")).toBeVisible({ timeout: 20_000 });
  await noOverflow(page); await shot(page, "04-ana-sayfa-sonuc");

  await page.getByRole("navigation", { name: "Alt menü" }).getByRole("link", { name: "Rakipler" }).click();
  await page.getByPlaceholder("Rakip adı ekleyin").fill("Rakip Kebap");
  await page.getByRole("button", { name: "Ekle" }).click();
  await expect(page.getByText("Rakip Kebap").first()).toBeVisible();
  await noOverflow(page); await shot(page, "05-rakipler");

  await page.getByRole("navigation", { name: "Alt menü" }).getByRole("link", { name: "Bildirimler" }).click();
  await expect(page.getByText("Ölçüm geçmişi")).toBeVisible();
  await expect(page.getByText("Ölçüm tamamlandı")).toBeVisible();
  await shot(page, "06-bildirimler");

  await page.getByRole("navigation", { name: "Alt menü" }).getByRole("link", { name: "Hesap" }).click();
  await expect(page.getByText("mobil@ornek.test")).toBeVisible();
  await expect(page.getByText("Bu ayki kullanım", { exact: false })).toBeVisible();
  await shot(page, "07-hesap");
  await page.getByRole("button", { name: "Hesabımı sil" }).click();
  await page.getByRole("button", { name: "Hesabımı kalıcı olarak sil" }).click();
  await expect(page.getByRole("link", { name: "Ücretsiz başla" })).toBeVisible(); // silinen hesap hatırlanmaz
  expect(stack.sql(`select count(*) from auth.users where email = 'mobil@ornek.test'`).trim()).toBe("0");
});
