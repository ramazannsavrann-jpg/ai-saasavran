// TruthGuard ve marka algısı ekranları: ücretli paketteki bir müşteri, canlı aramalı ölçüm, bilgi kartı ve doğruluk kontrolü.
// Veri sunucu anahtarıyla doğrudan yazılır (ücretli API çağrısı yok); ekran gerçek arayüz ve gerçek veritabanıyla çizilir.
import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync } from "node:fs";
import { startStack } from "../scripts/stack/stack.mjs";

const SHOTS = "e2e/screenshots";
let stack: Awaited<ReturnType<typeof startStack>>;
test.describe.configure({ mode: "serial" });
test.beforeAll(async () => { mkdirSync(SHOTS, { recursive: true }); stack = await startStack({ quiet: true }); });
test.afterAll(async () => { await stack?.stop(); });
const svc = () => createClient(stack.url, stack.serviceKey, { auth: { persistSession: false } });
const must = <T,>(r: { data: T; error: { message: string } | null }) => { if (r.error) throw new Error(r.error.message); return r.data; };

const A1 = "Kafe Mavi 2015 yılında kuruldu ve Kadıköy'de hizmet veriyor. Hafta içi 09:00-22:00 açık. Sakin ortamı ve kaliteli kahvesiyle öne çıkıyor; fiyatlar biraz yüksek. Alternatif olarak Kahve Durağı da önerilir.";
const A2 = "Moda'da çalışmak için Kahve Durağı ve Kafe Mavi iyi seçenekler. Kafe Mavi'de filtre kahve 120 TL civarında, paket servis yok. Kafe Mavi müşterilerin %72'si tarafından tavsiye ediliyor.";

test("TruthGuard: ücretli pakette bilgi kartı, yanlış iddialar, kaynak türleri ve marka algısı görünür; Free'de yalnız tanıtım", async ({ page }) => {
  await page.goto("/kayit");
  await page.getByLabel("E-posta").fill("truth@ornek.test");
  await page.getByLabel("Şifre").fill("Guclu-Sifre-2026");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Hesap oluştur" }).click();
  await page.getByLabel("İşletme adı").fill("Kafe Mavi İşletme");
  await page.getByRole("button", { name: "Çalışma alanını oluştur" }).click();
  await page.getByLabel("Marka adı").fill("Kafe Mavi");
  await page.getByRole("button", { name: "Markayı ekle" }).click();
  await expect(page.getByRole("heading", { name: "Kafe Mavi", level: 1 })).toBeVisible();

  const db = svc();
  const brand = must(await db.from("brands").select("id,workspace_id").eq("name", "Kafe Mavi").single()) as { id: string; workspace_id: string };
  const ws = brand.workspace_id;
  must(await db.from("brands").update({ website: "kafemavi.com", fact_card: "Kuruluş: 2009. Şube: Kadıköy ve Moda. Hafta içi 08:00–22:00. Filtre kahve 85 TL. Paket servis var." }).eq("id", brand.id));
  const comp = must(await db.from("brands").insert({ workspace_id: ws, name: "Kahve Durağı", website: "kahveduragi.com", is_competitor: true, owner_brand_id: brand.id, data_origin: "live_api" }).select("id").single()) as { id: string };
  const prompts = must(await db.from("prompts").insert([
    { workspace_id: ws, brand_id: brand.id, text: "Kadıköy'de en iyi kafe hangisi?", intent: "local", language: "tr" },
    { workspace_id: ws, brand_id: brand.id, text: "Moda'da çalışmak için sakin kafe önerir misin?", intent: "local", language: "tr" },
  ]).select("id")) as { id: string }[];
  const run = must(await db.from("runs").insert({ workspace_id: ws, brand_id: brand.id, status: "done", data_origin: "live_api", measurement_type: "live_search", provider: "openai", max_cost_usd: 1, prompts_total: 2, trigger: "manual", finished_at: new Date().toISOString() }).select("id").single()) as { id: string };
  const base = { workspace_id: ws, run_id: run.id, provider: "openai", model: "gpt-test", method: "api_with_search", data_origin: "live_api", measurement_type: "live_search" };
  const resp = must(await db.from("responses").insert([
    { ...base, prompt_id: prompts[0].id, repetition: 1, answer_text: A1, cited_urls: ["https://eksisozluk.com/kafe-mavi", "https://www.tripadvisor.com.tr/x", "https://kafemavi.com/menu"] },
    { ...base, prompt_id: prompts[1].id, repetition: 1, answer_text: A2, cited_urls: [] },
    { ...base, prompt_id: prompts[1].id, repetition: 2, answer_text: "Kahve Durağı öneririm.", cited_urls: ["https://www.reddit.com/r/istanbul/x", "https://www.instagram.com/p/abc", "https://kahveduragi.com"] },
  ]).select("id")) as { id: string }[];
  const P1 = { sentiment: "positive", traits: [{ trait: "high_quality", quote: "kaliteli kahvesiyle öne çıkıyor" }, { trait: "expensive", quote: "fiyatlar biraz yüksek" }] };
  must(await db.from("mentions").insert([
    { response_id: resp[0].id, workspace_id: ws, brand_id: brand.id, mentioned: true, recommended: true, cited: true, rank: 1, classifier: "llm:test", perception: P1 },
    { response_id: resp[0].id, workspace_id: ws, brand_id: comp.id, mentioned: true, recommended: true, cited: false, rank: 2, classifier: "llm:test" },
    { response_id: resp[1].id, workspace_id: ws, brand_id: brand.id, mentioned: true, recommended: false, cited: false, rank: null, classifier: "llm:test", perception: { sentiment: "neutral", traits: [] } },
    { response_id: resp[1].id, workspace_id: ws, brand_id: comp.id, mentioned: true, recommended: true, cited: true, rank: 1, classifier: "llm:test" },
    { response_id: resp[2].id, workspace_id: ws, brand_id: brand.id, mentioned: false, recommended: false, cited: false, rank: null, classifier: "llm:test" },
    { response_id: resp[2].id, workspace_id: ws, brand_id: comp.id, mentioned: true, recommended: true, cited: true, rank: 1, classifier: "llm:test" },
  ]));
  must(await db.from("truth_checks").insert([
    { workspace_id: ws, brand_id: brand.id, run_id: run.id, response_id: resp[0].id, prompt_id: prompts[0].id, provider: "openai", claims: [
      { claim: "2015 yılında kuruldu", status: "wrong", fact: "Kuruluş: 2009", quote: "2015 yılında kuruldu" },
      { claim: "Kadıköy'de hizmet veriyor", status: "correct", fact: "Şube: Kadıköy ve Moda", quote: "Kadıköy'de hizmet veriyor" },
      { claim: "Hafta içi 09:00-22:00 açık", status: "wrong", fact: "Hafta içi 08:00–22:00", quote: "Hafta içi 09:00-22:00 açık" }] },
    { workspace_id: ws, brand_id: brand.id, run_id: run.id, response_id: resp[1].id, prompt_id: prompts[1].id, provider: "openai", claims: [
      { claim: "Filtre kahve 120 TL civarında", status: "wrong", fact: "Filtre kahve 85 TL", quote: "filtre kahve 120 TL civarında" },
      { claim: "Paket servis yok", status: "wrong", fact: "Paket servis var", quote: "paket servis yok" }] },
  ]));

  // Free: yalnız tanıtım
  await page.goto(`/marka/${brand.id}?sekme=rapor&tur=canli`);
  const tg = page.locator("#truthguard");
  await expect(tg).toContainText("Ücretli paketlerde");
  await expect(tg.getByText("Yanlış", { exact: true })).toHaveCount(0);

  // Ücretli paket
  must(await db.from("workspaces").update({ plan: "pro" }).eq("id", ws));
  await page.reload();
  await expect(tg.getByText("Yanlış", { exact: true })).toBeVisible();
  await expect(tg).toContainText("Doğrusu: Kuruluş: 2009");
  await expect(tg).toContainText("Paket servis yok");
  await expect(tg).toContainText("Forum / sözlük");
  await expect(tg).toContainText("Kaynaksız istatistik: %72");
  await expect(page.locator("#marka-algisi")).toContainText("Kaliteli");
  await page.addStyleTag({ content: ".bottomnav{display:none!important}.topbar{position:static!important}" });
  await tg.screenshot({ path: `${SHOTS}/30-truthguard.png` });
  await page.locator("#marka-algisi").getByRole("button", { name: "Alıntıyı göster" }).first().click();
  await page.locator("#marka-algisi").screenshot({ path: `${SHOTS}/31-marka-algisi.png` });
  await page.locator("#gorunurluk-skoru").screenshot({ path: `${SHOTS}/32-gorunurluk-skoru.png` });

  // Öneriler: yanlış bilgi maddesi ve kampanya
  await page.goto(`/marka/${brand.id}?sekme=oneriler&tur=canli`);
  await expect(page.getByText("Yapay zekâ markanız hakkında 4 yanlış bilgi veriyor")).toBeVisible();
  await page.addStyleTag({ content: ".bottomnav{display:none!important}.topbar{position:static!important}" });
  const rec = page.locator(".rec").filter({ hasText: "yanlış bilgi veriyor" });
  await rec.getByRole("button", { name: /Kampanya başlat/ }).click();
  await expect(page.locator(".camp").first()).toContainText("Sitenizde düzeltin");
  await page.locator(".camp input[type=checkbox]").first().click();
  await expect(page.locator(".camp-head").first()).toContainText("1/");
  await page.locator("#aksiyonlar").screenshot({ path: `${SHOTS}/33-kampanya.png` });
});
