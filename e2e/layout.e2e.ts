// Yerleşim testi: üst menü hiçbir genişlikte alt satıra kaymamalı, sayfa yana taşmamalı.
// Telefon (360), büyük telefon (412), telefonda "masaüstü sitesi" modu (980), küçük dizüstü (1180, 1366) denenir;
// yönetici hesabıyla (menüde en çok öğe) ve uzun çalışma alanı adıyla.
import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync } from "node:fs";
import { startStack } from "../scripts/stack/stack.mjs";

const SHOTS = "e2e/screenshots";
let stack: Awaited<ReturnType<typeof startStack>>;
test.beforeAll(async () => { mkdirSync(SHOTS, { recursive: true }); stack = await startStack({ quiet: true }); });
test.afterAll(async () => { await stack?.stop(); });

async function check(page: Page, where: string) {
  const r = await page.evaluate(() => {
    const bar = document.querySelector(".topbar")!.getBoundingClientRect();
    const wrapped = [...document.querySelectorAll<HTMLElement>(".topbar a, .bottomnav a")].filter((a) => a.offsetParent !== null)
      .filter((a) => {
        // Yalnız yazıya bakılır (simge ayrı satırda olabilir): yazı birden çok satıra bölünmüş mü?
        const tops = new Set<number>(); const w = document.createTreeWalker(a, NodeFilter.SHOW_TEXT);
        for (let n = w.nextNode(); n; n = w.nextNode()) { const range = document.createRange(); range.selectNodeContents(n); for (const x of range.getClientRects()) if (x.width > 1) tops.add(Math.round(x.top / 6)); }
        return tops.size > 1;
      })
      .map((a) => a.textContent);
    return { barH: Math.round(bar.height), over: document.documentElement.scrollWidth - window.innerWidth, wrapped };
  });
  expect(r.wrapped, `${where}: alt satıra kayan menü yazısı`).toEqual([]);
  expect(r.barH, `${where}: üst çubuk tek satır olmalı`).toBeLessThanOrEqual(72);
  expect(r.over, `${where}: sayfa yana taşıyor`).toBeLessThanOrEqual(0);
}

test("üst menü ve sayfalar hiçbir genişlikte taşmaz", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/kayit");
  await page.getByLabel("E-posta").fill("yerlesim@ornek.test");
  await page.getByLabel("Şifre").fill("Guclu-Sifre-2026");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Hesap oluştur" }).click();
  await page.getByLabel("İşletme adı").fill("AI SaaSavran (Growth Lab) Uzun Çalışma Alanı Adı");
  await page.getByRole("button", { name: "Çalışma alanını oluştur" }).click();
  await page.getByLabel("Marka adı").fill("Türk Hava Yolları Uzun Marka");
  await page.getByRole("button", { name: "Markayı ekle" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const brandUrl = page.url();

  const db = createClient(stack.url, stack.serviceKey, { auth: { persistSession: false } });
  const users = await db.auth.admin.listUsers();
  const uid = users.data.users.find((u) => u.email === "yerlesim@ornek.test")!.id;
  const ins = await db.from("platform_admins").insert({ user_id: uid });
  expect(ins.error).toBeNull();

  for (const width of [360, 412, 980, 1180, 1366]) {
    await page.setViewportSize({ width, height: 800 });
    for (const [name, url] of [["panel", "/panel"], ["marka", brandUrl], ["sorular", `${brandUrl.split("?")[0]}?sekme=sorular`], ["oneriler", `${brandUrl.split("?")[0]}?sekme=oneriler`], ["hesap", "/hesap"], ["durum", "/durum-ic"], ["yonetim", "/yonetim"]] as const) {
      await page.goto(url);
      await expect(page.locator(".topbar")).toBeVisible();
      await page.waitForLoadState("networkidle");
      await check(page, `${name} @${width}`);
    }
    await page.goto("/panel");
    await page.screenshot({ path: `${SHOTS}/40-ust-menu-${width}.png` });
  }
});
