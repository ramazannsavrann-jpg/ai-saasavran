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

  const d = (n: number) => new Date(Date.now() + 3 * 3600_000 - n * 86_400_000).toISOString().slice(0, 10);
  must(await db.from("ai_visits").insert([
    { workspace_id: ws, brand_id: brand.id, day: d(1), source: "chatgpt", path: "/", visits: 14 },
    { workspace_id: ws, brand_id: brand.id, day: d(3), source: "chatgpt", path: "/menu", visits: 9 },
    { workspace_id: ws, brand_id: brand.id, day: d(9), source: "gemini", path: "/", visits: 5 },
    { workspace_id: ws, brand_id: brand.id, day: d(20), source: "perplexity", path: "/iletisim", visits: 3 },
    { workspace_id: ws, brand_id: brand.id, day: d(40), source: "chatgpt", path: "/", visits: 12 },
  ]));

  must(await db.from("ai_bot_hits").insert([
    { workspace_id: ws, brand_id: brand.id, day: d(1), bot: "OAI-SearchBot", path: "/", hits: 12, verified: 12, errors: 0 },
    { workspace_id: ws, brand_id: brand.id, day: d(2), bot: "ChatGPT-User", path: "/menu", hits: 5, verified: 5, errors: 0 },
    { workspace_id: ws, brand_id: brand.id, day: d(4), bot: "GPTBot", path: "/", hits: 20, verified: 0, errors: 3 },
    { workspace_id: ws, brand_id: brand.id, day: d(6), bot: "ClaudeBot", path: "/iletisim", hits: 7, verified: 0, errors: 0 },
  ]));
  // Free: yalnız tanıtım ve toplam ziyaret
  await page.goto(`/marka/${brand.id}?sekme=rapor&tur=canli`);
  await expect(page.locator("#ai-ziyaretci")).toContainText("31");
  await expect(page.locator("#ai-ziyaretci")).toContainText("ücretli paketlerde");
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
  const net = page.locator("#kaynak-agi");
  await expect(net).toContainText("eksisozluk.com");
  await expect(net.locator("svg line")).not.toHaveCount(0);
  await net.screenshot({ path: `${SHOTS}/38-kaynak-agi.png` });
  const tr = page.locator("#ai-ziyaretci");
  await expect(tr).toContainText("Gelinen sayfalar");
  await expect(tr).toContainText("/menu");
  await expect(tr).toContainText("önceki 30 gün: 12");
  await expect(tr).toContainText("Görünürlük ve ziyaretçi");
  await expect(tr.locator(".vvt-col")).toHaveCount(8);
  await tr.getByRole("button", { name: "Sitenize eklenecek kodu göster" }).click();
  await expect(tr.locator(".code-snippet")).toContainText('data-site="');
  await tr.screenshot({ path: `${SHOTS}/34-ai-ziyaretci.png` });
  const bt = page.locator("#ai-botlar");
  await expect(bt).toContainText("44 kez okudu");
  await expect(bt).toContainText("30 gündür hiç gelmedi: Claude-SearchBot, PerplexityBot");
  await expect(bt).toContainText("3 bot isteği hata aldı");
  await expect(bt).toContainText("IP doğrulandı");
  await bt.screenshot({ path: `${SHOTS}/35-ai-botlar.png` });

  // Gerçek sorular (Google): öneri ekleme ve keşif isteği
  must(await db.from("brands").update({ sector: "kafe" }).eq("id", brand.id));
  must(await db.from("prompt_suggestions").insert([
    { workspace_id: ws, brand_id: brand.id, text: "Kadıköy'de laptopla çalışılacak kafe var mı?", source: "paa", seed: "Kadıköy kafe" },
    { workspace_id: ws, brand_id: brand.id, text: "kadıköy kafe fiyatları", source: "related", seed: "Kadıköy kafe" },
  ]));
  await page.goto(`/marka/${brand.id}?sekme=sorular`);
  await page.addStyleTag({ content: ".bottomnav{display:none!important}.topbar{position:static!important}" });
  const gq = page.locator("#gercek-sorular");
  await expect(gq).toContainText("laptopla çalışılacak kafe");
  await gq.locator("li").filter({ hasText: "laptopla" }).getByRole("button", { name: "+ Ekle" }).click();
  await expect(page.locator(".q-text").filter({ hasText: "laptopla" })).toHaveCount(1);
  await gq.getByRole("button", { name: "Soruları keşfet" }).click();
  await expect(gq).toContainText("Keşif sıraya alındı");
  await gq.screenshot({ path: `${SHOTS}/36-gercek-sorular.png` });

  // Öneriler: yanlış bilgi maddesi ve kampanya
  await page.goto(`/marka/${brand.id}?sekme=oneriler&tur=canli`);
  await expect(page.getByText("Yapay zekâ markanız hakkında 4 yanlış bilgi veriyor")).toBeVisible();
  // İçerik planı: önerilmediğimiz soru için istek ve hazır plan
  const ip = page.locator("#icerik-planlari");
  await expect(ip).toContainText("Moda'da çalışmak için sakin kafe önerir misin?");
  await ip.getByRole("button", { name: "İçerik planı oluştur" }).click();
  await expect(ip).toContainText("Plan hazırlanıyor");
  must(await db.from("content_briefs").update({ status: "done", done_at: new Date().toISOString(), brief: {
    title: "Moda'da çalışmak için sessiz kafe: Kafe Mavi", angle: "Cevaplar priz, sessizlik ve uzun oturma iznini ödüllendiriyor.",
    outline: ["Neden çalışmaya uygun", "Priz ve internet", "Sessiz saatler", "Fiyatlar", "Ulaşım"],
    mustInclude: [{ item: "Paket servis var", verify: false }, { item: "Priz sayısı ve Wi-Fi hızı", verify: true }],
    faq: ["Laptopla kaç saat oturulabilir?", "Wi-Fi şifresi isteniyor mu?"], sites: ["tripadvisor.com.tr", "eksisozluk.com"], winners: ["Kahve Durağı"] } }).eq("brand_id", brand.id));
  await page.reload();
  await page.addStyleTag({ content: ".bottomnav{display:none!important}.topbar{position:static!important}" });
  await ip.getByRole("button", { name: "Planı göster" }).click();
  await expect(ip).toContainText("doğrulayın");
  await ip.screenshot({ path: `${SHOTS}/37-icerik-plani.png` });
  await page.addStyleTag({ content: ".bottomnav{display:none!important}.topbar{position:static!important}" });
  const rec = page.locator(".rec").filter({ hasText: "yanlış bilgi veriyor" });
  await rec.getByRole("button", { name: /Kampanya başlat/ }).click();
  await expect(page.locator(".camp").first()).toContainText("Sitenizde düzeltin");
  await page.locator(".camp input[type=checkbox]").first().click();
  await expect(page.locator(".camp-head").first()).toContainText("1/");
  await page.locator("#aksiyonlar").screenshot({ path: `${SHOTS}/33-kampanya.png` });
});
