// Uçtan uca mobil test: gerçek yığın (Postgres + Supabase Auth + PostgREST) + derlenmiş arayüz + ölçüm işçisi.
// GEMINI_API_KEY varsa ölçümler GERÇEK Gemini'ye (ücretsiz, aramasız) gider; yoksa testte sahte cevap kullanılır
// ve ekran görüntüsü adları bunu belirtir.

import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync } from "node:fs";
import { startStack } from "../scripts/stack/stack.mjs";
import { processNextRun } from "../engine/src/worker.ts";

const REAL = !!process.env.GEMINI_API_KEY;
const SHOTS = "e2e/screenshots";
const tag = REAL ? "gercek-gemini" : "test-cevabi";
let stack: Awaited<ReturnType<typeof startStack>>;

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  mkdirSync(SHOTS, { recursive: true });
  stack = await startStack({ quiet: true });
});
test.afterAll(async () => { await stack?.stop(); });

// Hata anında CI log'una ekrandaki metni ve tarayıcı hatalarını yaz (ekran görüntüsü indirilemediğinde teşhis için).
const browserLogs: string[] = [];
test.beforeEach(async ({ page }) => {
  browserLogs.length = 0;
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") browserLogs.push(`[console.${m.type()}] ${m.text()}`); });
  page.on("pageerror", (e) => browserLogs.push(`[pageerror] ${e.message}`));
  page.on("response", (r) => { if (r.status() >= 400) browserLogs.push(`[http ${r.status()}] ${r.request().method()} ${r.url()}`); });
});
test.afterEach(async ({ page }, info) => {
  if (info.status === info.expectedStatus) return;
  const text = await page.locator("body").innerText().catch(() => "(okunamadı)");
  console.log(`\n===== TEŞHİS: ${info.title} =====\nURL: ${page.url()}\n--- Ekran metni ---\n${text.slice(0, 2000)}\n--- Tarayıcı ---\n${browserLogs.slice(-30).join("\n")}\n=====`);
});

const svc = () => createClient(stack.url, stack.serviceKey, { auth: { persistSession: false } });

/** Kuyruktaki ölçümü işler. Gerçek anahtar varsa gerçek Gemini (aramasız, ücretsiz), yoksa sahte cevap. */
async function work(answers: string[]) {
  let i = 0;
  const fake = async () => new Response(JSON.stringify({
    candidates: [{ content: { parts: [{ text: answers[i++ % answers.length] }] }, finishReason: "STOP" }],
    usageMetadata: { promptTokenCount: 20, candidatesTokenCount: 120 },
  }), { status: 200 });
  const env = REAL
    ? { GEMINI_API_KEY: process.env.GEMINI_API_KEY, GEMINI_TIER: "free", ALLOW_PAID_API: "false" }
    : { GEMINI_API_KEY: "test", GEMINI_TIER: "free", ALLOW_PAID_API: "false" };
  return processNextRun({ db: svc(), env, fetchFn: REAL ? undefined : (fake as any), sleep: async () => {} });
}

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, "Sayfa yatay taşıyor").toBeLessThanOrEqual(1);
}
async function shot(page: Page, name: string) {
  await noHorizontalScroll(page);
  // Tam sayfa görüntüde sabit alt menü sayfanın ortasına biner; yalnızca görüntü için en alta alınır.
  await page.addStyleTag({ content: ".bottomnav{position:static!important}.shell{padding-bottom:0!important}" });
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
}

test("Müşteri akışı: kayıt → marka → rakip → soru → ölçüm → rapor", async ({ page }) => {
  await page.goto("/giris");
  await expect(page.getByRole("heading", { name: "Giriş yap" })).toBeVisible();
  await shot(page, "01-giris");

  // Kayıt
  await page.getByRole("link", { name: "Hesap oluştur" }).click();
  await expect(page.getByRole("heading", { name: "Hesap oluşturun" })).toBeVisible();
  await page.getByRole("button", { name: "Hesap oluştur" }).click();
  await expect(page.getByRole("alert")).toContainText("Geçerli bir e-posta");
  await page.getByLabel("E-posta").fill("ayse@ornek.test");
  await page.getByLabel("Şifre").fill("kisa");
  await page.getByRole("button", { name: "Hesap oluştur" }).click();
  await expect(page.getByRole("alert")).toContainText("en az 8 karakter");
  await page.getByLabel("Şifre").fill("Guclu-Sifre-2026");
  await page.getByRole("button", { name: "Hesap oluştur" }).click();
  await expect(page.getByRole("alert")).toContainText("aydınlatma metnini");
  await expect(page.getByRole("link", { name: "Aydınlatma metnini", exact: true })).toHaveAttribute("href", "/gizlilik");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Hesap oluştur" }).click();

  // Çalışma alanı
  await expect(page.getByRole("heading", { name: "Çalışma alanı oluşturun" })).toBeVisible();
  await shot(page, "02-calisma-alani");
  await page.getByLabel("İşletme adı").fill("Lezzet Durağı");
  await page.getByRole("button", { name: "Çalışma alanını oluştur" }).click();

  // Marka
  await expect(page.getByRole("heading", { name: "Marka ekleyin" })).toBeVisible();
  await page.getByLabel("Marka adı").fill("Lezzet Durağı Döner");
  await page.getByLabel("Diğer yazılışlar").fill("Lezzet Durağı");
  await page.getByLabel("Sektör").selectOption({ label: "Restoran / döner-kebap" });
  await page.getByLabel("Şehir veya ilçe").fill("Antalya");
  await shot(page, "03-marka-ekle");
  await page.getByRole("button", { name: "Markayı ekle" }).click();

  // Sorular: şablondan 3 öneri ekle
  await expect(page.getByRole("heading", { name: "Lezzet Durağı Döner" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Hazır sorular" })).toBeVisible();
  for (let k = 0; k < 3; k++) {
    await page.getByRole("button", { name: "Ekle", exact: true }).first().click();
    await expect(page.getByText(`${k + 1} / 10 aktif`)).toBeVisible();
  }
  await shot(page, "04-sorular");

  // Rakipler (Free: 2)
  await page.getByRole("tab", { name: "Rakipler" }).click();
  for (const name of ["Kebapçı Halil", "Şirin Döner"]) {
    await page.getByLabel("Rakip adı").fill(name);
    await page.getByRole("button", { name: "Rakibi ekle" }).click();
    await expect(page.getByText(name, { exact: true })).toBeVisible();
  }
  await expect(page.getByText("rakip sınırına ulaştınız")).toBeVisible();
  await shot(page, "05-rakipler");

  // Ölçüm 1
  await page.getByRole("tab", { name: "Rapor" }).click();
  await expect(page.getByText("Henüz tamamlanmış ölçüm yok")).toBeVisible();
  await page.getByRole("button", { name: "Ölçüm başlat" }).click();
  await expect(page.getByRole("status").filter({ hasText: "sırada" })).toBeVisible();
  await shot(page, "06-olcum-sirada");
  const r1 = await work([
    "Antalya'da öne çıkan döner noktaları:\n1. Kebapçı Halil\n2. Şirin Döner\n3. Lezzet Durağı Döner",
    "Uygun fiyatlı seçenekler:\n1. Şirin Döner\n2. Kebapçı Halil",
    "Aileler için:\n- Lezzet Durağı Döner\n- Kebapçı Halil",
  ]);
  expect(r1?.status, JSON.stringify(r1)).toBe("done");

  // Ölçüm 2 (grafikte eğilim için)
  await page.reload();
  await page.getByRole("button", { name: "Ölçüm başlat" }).click();
  await expect(page.getByRole("status").filter({ hasText: "sırada" })).toBeVisible();
  const r2 = await work([
    "Antalya'da sık önerilenler:\n1. Lezzet Durağı Döner\n2. Kebapçı Halil",
    "Bütçe dostu:\n1. Lezzet Durağı Döner\n2. Şirin Döner",
    "Lezzet Durağı Döner 2010'da açılmış bir işletmedir.",
  ]);
  expect(r2?.status, JSON.stringify(r2)).toBe("done");

  // Rapor
  await page.reload();
  await expect(page.getByRole("note").filter({ hasText: "Canlı web araması yapılmadı" })).toBeVisible();
  await expect(page.locator(".lead-sentence")).toContainText("cevabın");
  await expect(page.getByText("Kaynak gösterilme")).toBeVisible();
  await expect(page.getByText("Ölçülmedi", { exact: true })).toBeVisible();
  await expect(page.locator(".chart-line.chart-model_knowledge")).toHaveAttribute("stroke-dasharray", "6 5");
  await expect(page.getByText("Aramasız model bilgisi").first()).toBeVisible();
  await shot(page, `07-rapor-${tag}`);

  await page.getByRole("tab", { name: "Ölçümler" }).click();
  await expect(page.locator(".run").first()).toContainText("Tamamlandı");
  await shot(page, `08-olcumler-${tag}`);

  // Panel
  await page.getByRole("link", { name: "Panele dön" }).click();
  await expect(page.getByText("Bu ayki kullanım")).toBeVisible();
  await expect(page.getByText("Son ölçümde")).toBeVisible();
  await shot(page, `09-panel-${tag}`);

  // Durum sayfası
  await page.getByRole("navigation", { name: "Alt menü" }).getByRole("link", { name: "Durum" }).click();
  await expect(page.getByText("gerçek müşteri kullanımına hazır değildir")).toBeVisible();
  await shot(page, "10-urun-durumu");
});

test("Google ile giriş: düğme görünür ve doğru Google yetkilendirme adresine yönlendirir", async ({ page, request }) => {
  // 1) Düğme, giriş sunucusunun Google yetkilendirme adresine doğru parametrelerle gider (Google'a gidilmez)
  let authorizeUrl = "";
  await page.route("**/auth/v1/authorize**", (route) => {
    authorizeUrl = route.request().url();
    return route.fulfill({ status: 200, contentType: "text/html", body: "<p>yakalandı</p>" });
  });
  await page.goto("/giris");
  await page.getByRole("button", { name: "Google ile devam et" }).click();
  await expect.poll(() => authorizeUrl, { timeout: 15_000 }).not.toBe("");
  const a = new URL(authorizeUrl);
  expect(a.searchParams.get("provider")).toBe("google");
  expect(a.searchParams.get("redirect_to")).toBe("http://127.0.0.1:54321/panel");

  // 2) Giriş sunucusu Google'a doğru istemci ve geri dönüş adresiyle yönlendiriyor mu? (yönlendirme izlenmez)
  const res = await request.get(`/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent("http://127.0.0.1:54321/panel")}`, { maxRedirects: 0 });
  const body = res.status() >= 400 ? await res.text() : "";
  // Bazı geliştirme ortamları Google'a erişemez (giriş sunucusu Google ayarını indiremez); CI'da tam çalışır.
  test.skip(body.includes("openid-configuration") && !process.env.CI, "Bu ortamdan accounts.google.com erişilemiyor");
  expect(res.status(), body).toBe(302);
  const g = new URL(res.headers()["location"]);
  expect(g.hostname).toBe("accounts.google.com");
  expect(g.searchParams.get("client_id")).toBe("test-google-client-id");
  expect(g.searchParams.get("redirect_uri")).toBe("http://127.0.0.1:54321/auth/v1/callback");
  expect(g.searchParams.get("scope")).toContain("email");

  // 3) Kayıt sayfasında da var ve aydınlatma metni notu görünüyor
  await page.unroute("**/auth/v1/authorize**");
  await page.goto("/kayit");
  await expect(page.getByRole("button", { name: "Google ile devam et" })).toBeVisible();
  await expect(page.getByText("Google ile devam ederek")).toBeVisible();
  await shot(page, "12-kayit-google");
});

test("Banka sektörü: hazır sorular, örnek rakipler, düzenleme, gerçek sıra, cevabı göster, karanlık tema", async ({ page }) => {
  await page.goto("/kayit");
  await expect(page.getByRole("heading", { name: "Hesap oluşturun" })).toBeVisible();
  await page.getByLabel("E-posta").fill("banka@ornek.test");
  await page.getByLabel("Şifre").fill("Guclu-Sifre-2026");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Hesap oluştur" }).click();
  await page.getByLabel("İşletme adı").fill("Banka Deneme");
  await page.getByRole("button", { name: "Çalışma alanını oluştur" }).click();
  await page.getByLabel("Marka adı").fill("Garanti BBVA");
  await page.getByLabel("Sektör").selectOption({ label: "Banka / finans" });
  await page.getByRole("button", { name: "Markayı ekle" }).click();

  // Şehir olmadan da ulusal sektör soruları çıkar; restoran şablonu çıkmaz
  await expect(page.getByRole("heading", { name: "Hazır sorular" })).toBeVisible();
  await expect(page.getByText("Kredi kartı almak için hangi bankayı önerirsin?")).toBeVisible();
  for (let k = 0; k < 2; k++) {
    await page.getByRole("button", { name: "Ekle", exact: true }).first().click();
    await expect(page.getByText(`${k + 1} / 10 aktif`)).toBeVisible();
  }

  // Soru düzenleme
  await page.getByRole("button", { name: "Düzenle" }).nth(1).click();
  const qForm = page.getByRole("form", { name: "Soruyu düzenle" });
  await qForm.getByLabel("Soru").fill("Türkiye'de en iyi mobil bankacılık uygulaması hangisi sence?");
  await qForm.getByRole("button", { name: "Kaydet" }).click();
  await expect(page.getByText("Türkiye'de en iyi mobil bankacılık uygulaması hangisi sence?")).toBeVisible();

  // Örnek rakipler: kendi markası önerilmez
  await page.getByRole("tab", { name: "Rakipler" }).click();
  await expect(page.getByRole("heading", { name: "Bu sektörde bilinen markalar" })).toBeVisible();
  await expect(page.getByRole("button", { name: "+ Garanti BBVA" })).toHaveCount(0);
  await page.getByRole("button", { name: "+ Akbank" }).click();
  await expect(page.locator(".rows").getByText("Akbank", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "+ İş Bankası" }).click();
  await expect(page.locator(".rows").getByText("İş Bankası", { exact: true })).toBeVisible();
  // Rakip adını düzenle (yanlış yazım düzeltme)
  await page.locator(".rows li").filter({ hasText: "İş Bankası" }).getByRole("button", { name: "Düzenle" }).click();
  const cForm = page.getByRole("form", { name: "İş Bankası düzenle" });
  await cForm.getByLabel("Diğer yazılışlar").fill("İşbank, Türkiye İş Bankası");
  await cForm.getByRole("button", { name: "Kaydet" }).click();
  await expect(page.getByText("İşbank, Türkiye İş Bankası")).toBeVisible();
  await shot(page, "13-ornek-rakipler");

  // Marka düzenleme
  await page.getByRole("button", { name: "Düzenle" }).first().click();
  const bForm = page.getByRole("form", { name: "Markayı düzenle" });
  await bForm.getByLabel("Diğer yazılışlar").fill("Garanti, Garanti Bankası");
  await bForm.getByRole("button", { name: "Kaydet" }).click();
  await expect(page.getByRole("heading", { name: "Garanti BBVA", level: 1 })).toBeVisible();

  // Ölçüm: izlenmeyen Ziraat listede ilk sırada → Garanti'nin gerçek sırası 2 olmalı
  await page.getByRole("tab", { name: "Rapor" }).click();
  await page.getByRole("button", { name: "Ölçüm başlat" }).click();
  await expect(page.getByRole("status").filter({ hasText: "sırada" })).toBeVisible();
  const r = await work(["Öne çıkanlar:\n1. **Ziraat Bankası** – yaygın\n   - Akbank ile karşılaştırılır\n2. **Garanti BBVA** – mobil uygulaması güçlü\n3. İşbank"]);
  expect(r?.status).toBe("done");
  await page.reload();
  await expect(page.getByText("Önerildiniz, en iyi sıra 2").first()).toBeVisible();
  await page.getByRole("button", { name: "Cevabı göster" }).first().click();
  await expect(page.locator(".answer mark").first()).toHaveText("Garanti BBVA");
  await expect(page.locator(".answer-text").first()).toContainText("Ziraat Bankası");
  await expect(page.locator(".answer-text").first()).not.toContainText("**");
  await shot(page, "14-cevabi-goster");

  // Karanlık tema: karşılaştırma çubukları görünür olmalı
  await page.emulateMedia({ colorScheme: "dark" });
  await page.reload();
  const fill = await page.locator(".bar-target .bar-fill").first().evaluate((el) => getComputedStyle(el).backgroundColor);
  const track = await page.locator(".bar-target .bar-track").first().evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(fill).not.toBe(track);
  await shot(page, "15-rapor-karanlik");
});

test("Gizlilik ve koşullar sayfaları herkese açık, iletişim adresi ve taslak uyarısı var", async ({ page }) => {
  for (const [path, title] of [["/gizlilik", "Gizlilik politikası ve aydınlatma metni"], ["/kosullar", "Kullanım koşulları"]]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();
    await expect(page.getByText("Taslak metin")).toBeVisible();
    await expect(page.getByRole("link", { name: "aisaasavran@gmail.com" }).first()).toBeVisible();
  }
  await page.goto("/gizlilik");
  await expect(page.getByText("Google bu içerikleri kendi ürünlerini geliştirmek için kullanabilir")).toBeVisible();
  await shot(page, "16-gizlilik");
});

test("İzolasyon arayüzde: ikinci müşteri ilk müşterinin markasını göremez", async ({ page }) => {
  await page.goto("/kayit");
  await expect(page.getByRole("heading", { name: "Hesap oluşturun" })).toBeVisible();
  await page.getByLabel("E-posta").fill("baska@ornek.test");
  await page.getByLabel("Şifre").fill("Guclu-Sifre-2026");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Hesap oluştur" }).click();
  await expect(page.getByRole("heading", { name: "Çalışma alanı oluşturun" })).toBeVisible();
  const other = stack.sql(`select id from brands where name = 'Lezzet Durağı Döner'`);
  await page.goto(`/marka/${other}`);
  await expect(page.getByText("Marka bulunamadı veya bu markayı görme yetkiniz yok")).toBeVisible();
});

test("Demo Lab: simülasyon açıkça etiketli ve müşteriden ayrı", async ({ page }) => {
  // Platform yöneticisi + demo çalışma alanı (yalnızca sunucu tarafında oluşturulabilir)
  await page.goto("/kayit");
  await expect(page.getByRole("heading", { name: "Hesap oluşturun" })).toBeVisible();
  await page.getByLabel("E-posta").fill("yonetici@ornek.test");
  await page.getByLabel("Şifre").fill("Guclu-Sifre-2026");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Hesap oluştur" }).click();
  await expect(page.getByRole("heading", { name: "Çalışma alanı oluşturun" })).toBeVisible();
  const uid = stack.sql(`select id from auth.users where email = 'yonetici@ornek.test'`);
  stack.sql(`insert into platform_admins values ('${uid}')`);
  const demo = stack.sql(`insert into workspaces (name, kind, plan) values ('Demo Lab', 'demo_lab', 'agency_plus') returning id`).split("\n")[0];
  stack.sql(`insert into workspace_members values ('${demo}', '${uid}', 'owner', now())`);
  const brand = stack.sql(`insert into brands (workspace_id, name, city, sector, data_origin) values ('${demo}', 'Hayali Döner Evi', 'Örnekşehir', 'Restoran / döner-kebap', 'simulated') returning id`).split("\n")[0];
  stack.sql(`insert into brands (workspace_id, name, is_competitor, owner_brand_id, data_origin) values
    ('${demo}', 'Kurgu Kebap', true, '${brand}', 'simulated'), ('${demo}', 'Örnek Lahmacun', true, '${brand}', 'simulated')`);
  stack.sql(`insert into prompts (workspace_id, brand_id, text, intent) values
    ('${demo}', '${brand}', 'Örnekşehir''de en iyi döner hangisi?', 'local'),
    ('${demo}', '${brand}', 'Örnekşehir''de uygun fiyatlı döner?', 'comparison'),
    ('${demo}', '${brand}', 'Örnekşehir''de aile restoranı?', 'local'),
    ('${demo}', '${brand}', 'Örnekşehir''de gece açık dönerci?', 'purchase')`);
  const admin = createClient(stack.url, stack.anonKey, { auth: { persistSession: false } });
  await admin.auth.signInWithPassword({ email: "yonetici@ornek.test", password: "Guclu-Sifre-2026" });
  for (let k = 0; k < 4; k++) {
    const { error } = await admin.rpc("request_run", { p_brand: brand });
    expect(error).toBeNull();
    const r = await work(["x"]);
    expect(r?.status).toBe("done");
  }

  await page.goto("/demo-lab");
  await expect(page.getByRole("heading", { name: "Demo Lab" })).toBeVisible();
  await page.getByRole("button", { name: "Aç" }).click();
  await expect(page.getByRole("note").filter({ hasText: "simülasyondur" }).first()).toBeVisible();
  await page.getByRole("link", { name: /Hayali Döner Evi/ }).click();
  await expect(page.getByRole("note").filter({ hasText: "Simülasyon — gerçek veri değil" })).toBeVisible();
  await expect(page.locator(".chart-line.chart-simulated")).toBeVisible();
  await shot(page, "11-demo-lab-simulasyon");
});
