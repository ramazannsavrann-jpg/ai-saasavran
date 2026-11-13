// Eğitim videoları için ekran görüntüleri: CANLI sitede geçici bir hesapla dolaşır, ekranları kaydeder, sonra her şeyi siler.
// Yapay zekâ çağrısı YAPMAZ (ölçüm başlatılmaz). Rapor ekranları, hayali verili Demo Lab markasından alınır ve
// ekranda marka adları "Marka A/B/C" ile değiştirilir (videoda "Örnek veri" etiketi bulunur).
// Gerekli: SYNTH_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY. Dil: EGITIM_LANG=tr|en. Çıktı: egitim-ekran/<dil>/*.jpg
import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync } from "node:fs";
import { SimulatedProvider } from "../engine/src/providers/simulated.ts";
import { analyzeResponse } from "../engine/src/metrics.ts";

const BASE = process.env.SYNTH_URL?.replace(/\/$/, "");
const SB_URL = process.env.SUPABASE_URL, SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const LANG = (process.env.EGITIM_LANG === "en" ? "en" : "tr") as "tr" | "en";
const tr = LANG === "tr";
test.skip(!BASE || !SB_URL || !SB_KEY, "anahtarlar tanımlı değil");
test.describe.configure({ mode: "serial" });

const OUT = `egitim-ekran/${LANG}`; mkdirSync(OUT, { recursive: true });
const svc = () => createClient(SB_URL!, SB_KEY!, { auth: { persistSession: false } });
const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
const email = `sentetik-egitim+${LANG}${stamp}@aisaasavran.com`;
const password = `Egitim-${stamp}-${Math.random().toString(36).slice(2, 8)}`;
const DEMO_BRAND = "Gülümse Diş Kliniği";
const A = tr ? "Marka A" : "Brand A", B = tr ? "Marka B" : "Brand B", C = tr ? "Marka C" : "Brand C";
let userId = "", demoWs = "", demoBrandId = "";

async function shot(page: Page, name: string, full = false) {
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${name}.jpg`, type: "jpeg", quality: 92, fullPage: full });
}
async function rename(page: Page) {
  await page.evaluate(({ A, B, C }) => {
    const map: [RegExp, string][] = [[/Gülümse Diş Kliniği/g, A], [/Gülümse/g, A], [/Beyaz Kalem Diş/g, B], [/Beyaz Kalem/g, B],
      [/Ağız Sağlığı Merkezi/g, C], [/gulumse[a-z]*/gi, "marka-a"], [/beyazkalem[a-z]*/gi, "marka-b"], [/agizsagligi[a-z]*/gi, "marka-c"]];
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n: Node | null; while ((n = w.nextNode())) { let t = n.nodeValue ?? ""; for (const [r, s] of map) t = t.replace(r, s); if (t !== n.nodeValue) n.nodeValue = t; }
  }, { A, B, C });
}
async function login(page: Page) {
  await page.goto(`${BASE}/giris`);
  await page.evaluate((l) => localStorage.setItem("lang", l), LANG); await page.reload();
  await page.locator("input[type=email]").fill(email);
  await page.locator("input[type=password]").fill(password);
  await page.locator("form button[type=submit]").first().click();
}

test.beforeAll(async () => {
  const db = svc();
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { lang: LANG, synthetic: true } });
  if (error) throw error; userId = data.user!.id;
  const { data: ws } = await db.from("workspaces").select("id").eq("kind", "demo_lab").limit(1).single(); demoWs = ws!.id;
  const { data: b } = await db.from("brands").select("id").eq("workspace_id", demoWs).eq("name", DEMO_BRAND).single(); demoBrandId = b!.id;
});

test.afterAll(async () => {
  const db = svc(); if (!userId) return;
    const { data: ws } = await db.from("workspace_members").select("workspace_id").eq("user_id", userId);
  for (const w of ws ?? []) {
    const { data: k } = await db.from("workspaces").select("kind").eq("id", w.workspace_id).single();
    if (k && k.kind !== "demo_lab" && k.kind !== "growth_lab") await db.from("workspaces").delete().eq("id", w.workspace_id);
  }
  const { error } = await db.auth.admin.deleteUser(userId); if (error) console.log("kullanıcı silinemedi:", error.message);
});

test("Eğitim 2-4: kayıt, çalışma alanı, marka, sorular, rakipler, ölçüm düğmeleri", async ({ page }) => {
  await page.goto(`${BASE}/kayit`);
  await page.evaluate((l) => localStorage.setItem("lang", l), LANG); await page.reload();
  await shot(page, "b01_kayit");
  await page.locator("input[type=email]").fill(tr ? "marka.a@example.com" : "brand.a@example.com");
  await page.locator("input[type=password]").first().fill("••••••••••");
  await shot(page, "b02_kayit_dolu"); // gönderilmez
  await login(page);
  await expect(page.getByRole("heading", { name: tr ? "Çalışma alanı oluşturun" : "Create a workspace" })).toBeVisible({ timeout: 30_000 });
  await shot(page, "b03_calisma_alani");
  await page.getByLabel(tr ? "İşletme adı" : "Business name").fill(A); await shot(page, "b04_calisma_alani_dolu");
  await page.getByRole("button", { name: tr ? "Çalışma alanını oluştur" : "Create workspace" }).click();
  await expect(page.getByRole("heading", { name: tr ? "Marka ekleyin" : "Add a brand" })).toBeVisible();
  await shot(page, "b05_marka");
  await page.getByLabel(tr ? "Marka adı" : "Brand name").fill(A);
  const sel = page.getByLabel(tr ? "Sektör" : "Sector");
  const opts = await sel.locator("option").allTextContents();
  const o = opts.find((x) => /Klinik|Clinic|sağlık|health/i.test(x)); if (o) await sel.selectOption({ label: o });
  await page.getByLabel(tr ? "Şehir veya ilçe" : "City or area").fill(tr ? "Antalya" : "London");
  await shot(page, "b06_marka_dolu");
  await page.getByRole("button", { name: tr ? "Markayı ekle" : "Add brand" }).click();
  await expect(page.getByRole("heading", { name: A })).toBeVisible({ timeout: 30_000 });
  await shot(page, "b07_marka_sayfasi"); await shot(page, "b07_marka_sayfasi_tam", true);
  await page.getByRole("tab", { name: tr ? "Sorular" : "Questions" }).click(); await shot(page, "b08_sorular"); await shot(page, "b08_sorular_tam", true);
  const add = page.getByRole("button", { name: tr ? "Ekle" : "Add", exact: true });
  for (let i = 0; i < 3 && (await add.count()) > 0; i++) { await add.first().click(); await page.waitForTimeout(700); }
  await shot(page, "b09_sorular_eklendi"); await shot(page, "b09_sorular_eklendi_tam", true);
  await page.getByRole("tab", { name: tr ? "Rakipler" : "Competitors" }).click(); await shot(page, "b10_rakipler");
  await page.getByLabel(tr ? "Rakip adı" : "Competitor name").fill(B); await shot(page, "b11_rakip_dolu");
  await page.getByRole("button", { name: tr ? "Rakibi ekle" : "Add competitor" }).click(); await page.waitForTimeout(800);
  await page.getByLabel(tr ? "Rakip adı" : "Competitor name").fill(C);
  await page.getByRole("button", { name: tr ? "Rakibi ekle" : "Add competitor" }).click(); await page.waitForTimeout(800);
  await shot(page, "b12_rakipler_eklendi"); await shot(page, "b12_rakipler_eklendi_tam", true);
  await page.getByRole("tab", { name: tr ? "Rapor" : "Report" }).click(); await shot(page, "b13_rapor_bos"); await shot(page, "b13_rapor_bos_tam", true);
});

test("Eğitim 5-10: rapor sekmeleri (geçici markaya simülasyon verisi, adlar Marka A/B/C)", async ({ page }) => {
  const db = svc();
  const { data: mem } = await db.from("workspace_members").select("workspace_id").eq("user_id", userId);
  const ws = mem![0].workspace_id;
  const { data: brand } = await db.from("brands").select("id,name,aliases").eq("workspace_id", ws).eq("name", A).eq("is_competitor", false).single();
  const { data: comps } = await db.from("brands").select("id,name,aliases").eq("owner_brand_id", brand!.id);
  const { data: prompts } = await db.from("prompts").select("id,text").eq("brand_id", brand!.id).eq("active", true);
  const refs = [brand!, ...(comps ?? [])].map((b) => ({ id: b.id, name: b.name, aliases: b.aliases ?? [] }));
  const SRC = ["https://rehber.example.com/en-iyi-klinikler", "https://yorumlar.example.com/klinik-yorumlari", "https://karsilastirma.example.com/liste"];
  const weeks = 6, now = Date.now();
  for (let w = weeks - 1; w >= 0; w--) {
    const at = new Date(now - w * 7 * 86_400_000).toISOString();
    const boost = -0.25 + ((weeks - 1 - w) / (weeks - 1)) * 0.45;
    const { data: run, error: e1 } = await db.from("runs").insert({ workspace_id: ws, brand_id: brand!.id, status: "done", data_origin: "simulated", measurement_type: "simulated",
      max_cost_usd: 1, prompts_total: prompts!.length, calls_ok: prompts!.length, stop_reason: "completed", provider: "mock", model: "simulasyon-v1", trigger: "seed",
      created_at: at, started_at: at, finished_at: at }).select("id").single();
    if (e1) throw e1;
    const sim = new SimulatedProvider(refs.map((r) => r.name), `${brand!.id}|w${w}`, { target: brand!.name, boost });
    for (const [k, p] of prompts!.entries()) {
      const res = await sim.ask(p.id, p.text);
      const { data: resp, error: e2 } = await db.from("responses").insert({ workspace_id: ws, run_id: run!.id, prompt_id: p.id, provider: "mock", model: res.model, method: "simulation",
        repetition: 1, answer_text: res.answerText, cited_urls: [SRC[k % 3], SRC[(k + 1) % 3]], data_origin: "simulated", measurement_type: "simulated", billing: "free", created_at: at }).select("id").single();
      if (e2) throw e2;
      const rows = analyzeResponse(res, refs).map((h) => ({ response_id: resp!.id, workspace_id: ws, brand_id: h.brandId, mentioned: h.mentioned, recommended: h.recommended, cited: false, rank: h.rank, classifier: "rules_v2" }));
      if (rows.length) { const { error: e3 } = await db.from("mentions").insert(rows); if (e3) throw e3; }
    }
  }
  await login(page);
  await expect(page).not.toHaveURL(/\/giris/, { timeout: 30_000 });
  for (const [k, n] of [["rapor", "c01_rapor"], ["oneriler", "c02_oneriler"], ["rakipler", "c03_rakipler"], ["sorular", "c04_sorular"], ["urunler", "c05_urunler"], ["olcumler", "c06_olcumler"]] as const) {
    await page.goto(`${BASE}/marka/${brand!.id}?sekme=${k}`);
    await page.waitForLoadState("networkidle"); await page.waitForTimeout(2500);
    await shot(page, n); await shot(page, `${n}_tam`, true);
  }
});
