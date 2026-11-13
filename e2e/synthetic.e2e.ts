// Günlük "sahte müşteri" testi: CANLI sitede gerçek bir müşteri gibi dolaşır, sonra her şeyi siler.
// Yapay zekâ çağrısı YAPMAZ (ölçüm başlatılmaz, ücretsiz kontrol gönderilmez) → maliyet sıfır.
// Çalışması için SYNTH_URL, SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekir; yoksa atlanır.
import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const BASE = process.env.SYNTH_URL?.replace(/\/$/, "");
const SB_URL = process.env.SUPABASE_URL, SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
test.skip(!BASE || !SB_URL || !SB_KEY, "SYNTH_URL / Supabase anahtarları tanımlı değil");
test.describe.configure({ mode: "serial" });

const svc = () => createClient(SB_URL!, SB_KEY!, { auth: { persistSession: false } });
const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
const email = `sentetik-test+${stamp}@aisaasavran.com`;
const password = `Sentetik-${stamp}-${Math.random().toString(36).slice(2, 8)}`;
let userId = "";
const cleanup: (() => Promise<unknown>)[] = [];

const logs: string[] = [];
test.beforeEach(async ({ page }) => {
  page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));
  page.on("response", (r) => { if (r.status() >= 500) logs.push(`[http ${r.status()}] ${r.request().method()} ${r.url()}`); });
});
test.afterEach(async ({ page }, info) => {
  if (info.status === info.expectedStatus) return;
  const text = await page.locator("body").innerText().catch(() => "(okunamadı)");
  console.log(`\n===== TEŞHİS: ${info.title} =====\nURL: ${page.url()}\n${text.slice(0, 1500)}\n${logs.slice(-20).join("\n")}\n=====`);
});

test.beforeAll(async () => {
  const { data, error } = await svc().auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { lang: "tr", synthetic: true } });
  if (error) throw error;
  userId = data.user!.id;
});

test.afterAll(async () => {
  for (const f of cleanup.reverse()) await f().catch((e) => console.log("temizlik hatası:", e?.message ?? e));
  const db = svc();
  if (userId) {
    const { data: ws } = await db.from("workspace_members").select("workspace_id").eq("user_id", userId);
    for (const w of ws ?? []) await db.from("workspaces").delete().eq("id", w.workspace_id);
    const { error } = await db.auth.admin.deleteUser(userId);
    if (error) console.log("kullanıcı silinemedi:", error.message);
  }
});

test("1. Ana sayfa ve ücretsiz kontrol formu açılıyor (gönderilmez)", async ({ page }) => {
  await page.goto(`${BASE}/`);
  await expect(page).toHaveTitle(/SaaSavran/);
  await page.goto(`${BASE}/tr/kontrol/`);
  await expect(page.locator("form").first()).toBeVisible();
  for (const p of ["/gizlilik", "/kosullar", "/llms.txt"]) expect((await page.request.get(`${BASE}${p}`)).status(), p).toBe(200);
});

test("2. Giriş → çalışma alanı → marka → soru → rakip → rapor sekmesi", async ({ page }) => {
  await page.goto(`${BASE}/giris`);
  await page.getByLabel("E-posta").fill(email);
  await page.getByLabel("Şifre").fill(password);
  await page.getByRole("button", { name: "Giriş yap", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Çalışma alanı oluşturun" })).toBeVisible({ timeout: 30_000 });
  await page.getByLabel("İşletme adı").fill("Sentetik Test Kafe");
  await page.getByRole("button", { name: "Çalışma alanını oluştur" }).click();

  await expect(page.getByRole("heading", { name: "Marka ekleyin" })).toBeVisible();
  await page.getByLabel("Marka adı").fill("Sentetik Kafe");
  await page.getByLabel("Şehir veya ilçe").fill("Antalya");
  await page.getByRole("button", { name: "Markayı ekle" }).click();

  await expect(page.getByRole("heading", { name: "Sentetik Kafe" })).toBeVisible();
  await page.getByRole("button", { name: "Ekle", exact: true }).first().click();
  await expect(page.getByText(/1 \/ \d+ aktif/)).toBeVisible();

  await page.getByRole("tab", { name: "Rakipler" }).click();
  await page.getByLabel("Rakip adı").fill("Örnek Rakip Kafe");
  await page.getByRole("button", { name: "Rakibi ekle" }).click();
  await expect(page.getByText("Örnek Rakip Kafe", { exact: true })).toBeVisible();

  await page.getByRole("tab", { name: "Rapor" }).click();
  await expect(page.getByText("Henüz tamamlanmış ölçüm yok")).toBeVisible();
  await expect(page.getByRole("button", { name: "Ölçüm başlat" })).toBeVisible(); // basılmaz: yapay zekâ maliyeti yok
});

test("3. Hesap sayfası açılıyor (şifre değiştirme, paket)", async ({ page }) => {
  await page.goto(`${BASE}/giris`);
  await page.getByLabel("E-posta").fill(email);
  await page.getByLabel("Şifre").fill(password);
  await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
  await expect(page.getByText("Sentetik Kafe").first()).toBeVisible({ timeout: 30_000 });
  await page.goto(`${BASE}/hesap`);
  await expect(page.getByRole("heading", { name: "Şifre değiştir" })).toBeVisible();
  await expect(page.getByText(/Free|Ücretsiz/).first()).toBeVisible();
});

test("4. Paylaşılan rapor (Demo Lab, hayali marka) girişsiz açılıyor; PDF düğmesi var", async ({ page }) => {
  const db = svc();
  const { data: demo } = await db.from("workspaces").select("id").eq("kind", "demo_lab").limit(1).single();
  const { data: brand } = await db.from("brands").select("id,name").eq("workspace_id", demo!.id).eq("is_competitor", false)
    .in("id", (await db.from("runs").select("brand_id").eq("workspace_id", demo!.id).eq("status", "done")).data!.map((r) => r.brand_id)).limit(1).single();
  const { data: share, error } = await db.from("report_shares").insert({ workspace_id: demo!.id, brand_id: brand!.id, created_by: userId, expires_at: new Date(Date.now() + 3600_000).toISOString() }).select("id,token").single();
  if (error) throw error;
  cleanup.push(() => db.from("report_shares").delete().eq("id", share!.id));
  await page.goto(`${BASE}/rapor/${share!.token}`);
  await expect(page.getByRole("heading", { name: brand!.name, level: 1 })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "PDF olarak kaydet" })).toBeVisible();
});
