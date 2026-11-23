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
  await page.getByRole("button", { name: "İlk ölçümü başlat" }).click();
  await expect(page.getByText(/Ölçüm (sırada|sürüyor)/)).toBeVisible();

  // Ölçümü test cevaplarıyla işle (gerçek API yok)
  const fake = async () => new Response(JSON.stringify({
    candidates: [{ content: { parts: [{ text: "Antalya'da Mobil Döner ve Rakip Kebap öne çıkıyor. Mobil Döner'i öneririm." }] }, finishReason: "STOP" }],
    usageMetadata: { promptTokenCount: 20, candidatesTokenCount: 120 },
  }), { status: 200 });
  const db = createClient(stack.url, stack.serviceKey, { auth: { persistSession: false } });
  await processNextRun({ db, env: { GEMINI_API_KEY: "test", GEMINI_TIER: "free", ALLOW_PAID_API: "false" }, fetchFn: fake as never, sleep: async () => {} });
  await page.reload();
  await expect(page.getByText("Yapay zekâlar sizi önerdi", { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/\d+ cevabın \d+'\p{L}+ önerildiniz/u)).toBeVisible();
  await expect(page.getByRole("button", { name: "Şimdi ölç" })).toBeVisible();
  await noOverflow(page); await shot(page, "04-ana-sayfa-sonuc");

  await page.getByRole("navigation", { name: "Alt menü" }).getByRole("link", { name: "Rapor" }).click();
  await expect(page.getByText(/Son ölçümde yapay zekâ cevaplarının %\d+'\p{L}+ önerildiniz/u)).toBeVisible();
  await expect(page.getByText(/Güven puanı \d+\/100/)).toBeVisible();
  await noOverflow(page); await shot(page, "05a-rapor-ozet");
  await page.getByRole("tab", { name: "Sorular" }).click();
  await expect(page.getByText(/\d+ \/ \d+ soru ölçülüyor/)).toBeVisible();
  await page.getByRole("button", { name: "Soru ekle" }).click();
  await page.getByLabel("Müşterinizin yapay zekâya soracağı soru").fill("Antalya'da gece açık döner nerede yenir?");
  await page.getByRole("button", { name: "Soruyu ekle" }).click();
  await expect(page.getByText("Antalya'da gece açık döner nerede yenir?")).toBeVisible();
  await expect(page.getByText(/Önerildiniz|Adınız geçti|Adınız geçmedi/).first()).toBeVisible();
  await page.getByRole("button", { name: /Antalya'da gece açık döner/ }).click();
  await page.getByRole("button", { name: "Soruyu sil" }).click();
  await page.getByRole("button", { name: "Sil", exact: true }).click();
  await expect(page.getByText("Antalya'da gece açık döner nerede yenir?")).toBeHidden();
  await noOverflow(page); await shot(page, "05b-rapor-sorular");
  await page.getByRole("tab", { name: "Rakipler" }).click();
  await page.getByPlaceholder("Rakip adı ekleyin").fill("Rakip Kebap");
  await page.getByRole("button", { name: "Ekle" }).click();
  await expect(page.getByText("Rakip Kebap").first()).toBeVisible();
  await noOverflow(page); await shot(page, "05-rakipler");

  const nav = page.getByRole("navigation", { name: "Alt menü" });
  await nav.getByRole("link", { name: "Öneriler" }).click();
  await expect(page.getByRole("heading", { name: "Öneriler" })).toBeVisible();
  await expect(page.locator("article.card").first()).toBeVisible();
  await noOverflow(page); await shot(page, "05c-oneriler");
  await page.getByRole("button", { name: "Web sitesini ekle" }).click();
  await expect(page.getByRole("heading", { name: "İşletme bilgileri" })).toBeVisible();
  await page.getByLabel("Web sitesi").fill("mobildoner.example");
  await page.getByLabel("Diğer yazılışlar").fill("Mobil Doner");
  await page.getByLabel("Doğru bilgi kartı").fill("Her gün 10:00-02:00 açığız. Paket servis var.");
  await noOverflow(page); await shot(page, "05f-isletme-bilgileri");
  await page.getByRole("button", { name: "Kaydet" }).click();
  await expect(page.getByRole("heading", { name: "Öneriler" })).toBeVisible();
  await expect(page.getByText("Markaya web sitesi ekleyin")).toBeHidden();
  const step = page.getByRole("button", { name: /Adım adım yap/ }).first();
  if (await step.count()) {
    await step.click();
    await expect(page.getByText(/görevden 0 tanesi bitti/)).toBeVisible();
    await page.locator("article.card input[type=checkbox]").first().check();
    await expect(page.getByText(/görevden 1 tanesi bitti/)).toBeVisible();
  } else {
    await page.getByRole("tab", { name: "Yaptıklarım" }).click();
  }
  await page.getByRole("button", { name: "Yaptığım bir işi ekle" }).click();
  await page.getByLabel("Yaptığınız iş").fill("Menüye fiyat ekledik");
  await page.getByRole("button", { name: "Kaydet" }).click();
  await expect(page.getByText("Menüye fiyat ekledik")).toBeVisible();
  await expect(page.getByText(/öncesinde ölçüm yok|sonraki ölçüm bekleniyor/).first()).toBeVisible();
  await noOverflow(page); await shot(page, "05d-yaptiklarim");
  await page.getByRole("tab", { name: "İçerik" }).click();
  await expect(page.getByText("İçerik planları ücretli paketlerde açık.")).toBeVisible();
  await page.getByRole("tab", { name: "Site" }).click();
  await expect(page.getByRole("button", { name: "Siteyi şimdi kontrol et" })).toBeVisible();
  await noOverflow(page); await shot(page, "05e-site");

  await page.getByRole("navigation", { name: "Alt menü" }).getByRole("link", { name: "Bildirimler" }).click();
  await expect(page.getByText("Ölçümleriniz")).toBeVisible();
  await expect(page.getByText("Ölçüm bitti", { exact: true })).toBeVisible();
  await shot(page, "06-bildirimler");

  await page.getByRole("navigation", { name: "Alt menü" }).getByRole("link", { name: "Hesap" }).click();
  await expect(page.getByText("mobil@ornek.test")).toBeVisible();
  await expect(page.getByText("Bu ayki kullanım", { exact: false })).toBeVisible();
  await expect(page.getByLabel("Dil")).toBeVisible();
  await page.getByRole("button", { name: "Şifre değiştir" }).click();
  await page.getByLabel("Yeni şifre", { exact: true }).fill("Yeni-Sifre-2026");
  await page.getByLabel("Yeni şifre (tekrar)").fill("Yeni-Sifre-2026");
  await page.getByRole("button", { name: "Şifreyi kaydet" }).click();
  await expect(page.getByText("Şifreniz değiştirildi.")).toBeVisible();
  await shot(page, "07-hesap");
  await page.getByRole("button", { name: "Hesap ve veriler" }).click();
  await page.getByRole("button", { name: "Hesabımı kalıcı olarak sil" }).click();
  await expect(page.getByRole("link", { name: "Ücretsiz başla" })).toBeVisible(); // silinen hesap hatırlanmaz
  expect(stack.sql(`select count(*) from auth.users where email = 'mobil@ornek.test'`).trim()).toBe("0");
});
