// Demo Lab ve Growth Lab kurulumu (sunucu tarafı, service role). Tekrar çalıştırılabilir: var olanı yeniden oluşturmaz.
//
// Demo Lab: 10 sektörde TAMAMEN HAYALİ markalar. Ölçümler simülasyondur; hiçbir yapay zekâya gidilmez.
//   Veritabanı, bu çalışma alanına gerçek veri yazılmasını ve müşterilerin buraya erişmesini engeller.
// Growth Lab: AI SaaSavran'ın kendi gerçek görünürlüğü. Gerçek rakipler, gerçek (aramasız, ücretsiz) Gemini ölçümü.

import type { SupabaseClient } from "@supabase/supabase-js";
import { analyzeResponse, type BrandRef } from "./metrics.ts";
import { SimulatedProvider } from "./providers/simulated.ts";

type Intent = "informational" | "comparison" | "purchase" | "local";
interface DemoBrand { name: string; sector: string; city: string; competitors: string[]; prompts: [string, Intent][] }

// Bütün adlar uydurmadır; bilinen bir işletmeye benzememesi için özellikle seçildi.
export const DEMO_BRANDS: DemoBrand[] = [
  { name: "Kordonaltı Döner Evi", sector: "Restoran / döner-kebap", city: "Örnekşehir", competitors: ["Mavi Tepsi Kebap", "Çınaraltı Ocakbaşı"],
    prompts: [["Örnekşehir'de en iyi döner nerede yenir?", "local"], ["Örnekşehir'de ailece gidilecek uygun fiyatlı restoran?", "comparison"], ["Örnekşehir'de gece açık dönerci var mı?", "purchase"], ["İyi döner nasıl anlaşılır?", "informational"]] },
  { name: "Gündoğdu Market", sector: "Market", city: "Örnekşehir", competitors: ["Bereket Sepeti", "Yeşilvadi Gıda"],
    prompts: [["Örnekşehir'de en uygun fiyatlı market hangisi?", "comparison"], ["Örnekşehir'de taze sebze meyve nereden alınır?", "local"], ["Online market siparişi için hangi marketi önerirsin?", "purchase"]] },
  { name: "Yolüstü Akaryakıt", sector: "Akaryakıt istasyonu", city: "Örnekşehir", competitors: ["Kavşak Petrol", "Ovacık Enerji"],
    prompts: [["Örnekşehir çevreyolunda temiz tuvaleti olan benzinlik?", "local"], ["Uzun yolda mola için en iyi istasyon hangisi?", "comparison"], ["Hangi istasyonun yakıtı daha kaliteli?", "informational"]] },
  { name: "Lavanta Koy Otel", sector: "Otel / turizm", city: "Örnekşehir", competitors: ["Mercan Butik Otel", "Kumsal Konakları"],
    prompts: [["Örnekşehir'de aileler için en iyi otel?", "local"], ["Örnekşehir'de denize sıfır butik otel önerir misin?", "purchase"], ["Örnekşehir'de uygun fiyatlı temiz otel?", "comparison"]] },
  { name: "Ahşapevi Mobilya", sector: "Mobilya mağazası", city: "Örnekşehir", competitors: ["Konfor Salonu", "Çamlık Mobilya"],
    prompts: [["Örnekşehir'de güvenilir mobilya mağazası?", "local"], ["Kaliteli ve uygun fiyatlı koltuk takımı nereden alınır?", "purchase"], ["Mobilyada kalite nasıl anlaşılır?", "informational"]] },
  { name: "Usta Eller Oto Servis", sector: "Otomotiv", city: "Örnekşehir", competitors: ["Piston Garaj", "Hızlı Bakım Merkezi"],
    prompts: [["Örnekşehir'de güvenilir oto servis?", "local"], ["Örnekşehir'de uygun fiyatlı periyodik bakım nerede yapılır?", "comparison"], ["Özel servis mi yetkili servis mi?", "informational"]] },
  { name: "Anahtar Emlak", sector: "Emlak", city: "Örnekşehir", competitors: ["Kapı Gayrimenkul", "Merkez Emlak Ofisi"],
    prompts: [["Örnekşehir'de güvenilir emlakçı?", "local"], ["Örnekşehir'de kiralık daire için hangi emlakçı?", "purchase"], ["Emlakçı seçerken nelere dikkat edilir?", "informational"]] },
  { name: "Gülümse Diş Kliniği", sector: "Klinik / sağlık", city: "Örnekşehir", competitors: ["Beyaz Kalem Diş", "Ağız Sağlığı Merkezi"],
    prompts: [["Örnekşehir'de en iyi diş kliniği?", "local"], ["Örnekşehir'de implant için hangi klinik?", "purchase"], ["Diş kliniği seçerken nelere bakılmalı?", "informational"]] },
  { name: "Devre Teknoloji", sector: "Teknoloji / elektronik", city: "Örnekşehir", competitors: ["Piksel Elektronik", "Kablo Dünyası"],
    prompts: [["Örnekşehir'de güvenilir telefon mağazası?", "local"], ["Laptop almak için hangi mağaza?", "purchase"], ["Elektronikte garanti için nereden almalı?", "comparison"]] },
  { name: "Köpük Oto Yıkama", sector: "Oto yıkama / yerel hizmet", city: "Örnekşehir", competitors: ["Parlak Oto Kuaför", "Damla Yıkama"],
    prompts: [["Örnekşehir'de en iyi oto yıkama?", "local"], ["Örnekşehir'de detaylı iç temizlik yapan yer?", "purchase"], ["Örnekşehir'de uygun fiyatlı oto kuaför?", "comparison"]] },
];

export const GROWTH = {
  workspace: "AI SaaSavran (Growth Lab)",
  brand: { name: "AI SaaSavran", aliases: ["SaaSavran", "AI Savran"], website: "aisaasavran.com", sector: "Yazılım / dijital hizmet" },
  competitors: [
    { name: "Profound", aliases: ["tryprofound"], website: "tryprofound.com" },
    { name: "Peec AI", aliases: ["Peec"], website: "peec.ai" },
    { name: "Otterly.AI", aliases: ["Otterly"], website: "otterly.ai" },
    { name: "Semrush", aliases: [], website: "semrush.com" },
    { name: "Ahrefs", aliases: [], website: "ahrefs.com" },
  ] as Comp[],
  prompts: [
    ["Markamın ChatGPT'de ne kadar görünür olduğunu nasıl ölçerim?", "informational"],
    ["Yapay zekâ cevaplarında marka görünürlüğünü ölçen araçlar hangileri?", "comparison"],
    ["GEO (generative engine optimization) için en iyi araçlar hangileri?", "comparison"],
    ["Türkiye'de yapay zekâ görünürlüğü analizi yapan bir hizmet önerir misin?", "purchase"],
    ["İşletmemin Gemini ve ChatGPT'de önerilmesi için ne yapmalıyım?", "informational"],
    ["Ajanslar için yapay zekâ arama görünürlüğü takip aracı önerir misin?", "purchase"],
    ["Profound'un uygun fiyatlı alternatifleri neler?", "comparison"],
    ["What are the best tools to track brand visibility in ChatGPT and Gemini?", "comparison"],
    ["Yerel işletmeler yapay zekâ asistanlarında nasıl öne çıkar?", "informational"],
    ["Rakiplerimin ChatGPT'de neden önerildiğini nasıl öğrenirim?", "informational"],
  ] as [string, Intent][],
};

/** Canlı arama ile aramasız sonucu karşılaştırmak için tanınmış bir test markası (Growth Lab içinde). */
export const GROWTH_TEST = {
  brand: { name: "Garanti BBVA", aliases: ["Garanti Bankası", "Garanti BBVA Mobil", "Garanti Bonus", "Bonus Card", "Bonus kart"], website: "garantibbva.com.tr", sector: "Banka / finans" },
  competitors: [
    { name: "Akbank", aliases: ["Akbank Mobil", "Juzdan", "Axess", "Wings"], website: "akbank.com" },
    { name: "İş Bankası", aliases: ["Türkiye İş Bankası", "İşCep", "İşbank", "Maximum Mobil", "Maximum kart", "İş Bankası Maximum"], website: "isbank.com.tr" },
    { name: "Yapı Kredi", aliases: ["Yapı Kredi Mobil", "World Card", "Worldcard", "Yapı Kredi World"], website: "yapikredi.com.tr" },
    { name: "Ziraat Bankası", aliases: ["Ziraat", "Ziraat Mobil", "T.C. Ziraat Bankası"], website: "ziraatbank.com.tr" },
    { name: "Enpara.com", aliases: ["Enpara"], website: "enpara.com" },
  ] as Comp[],
  prompts: [
    ["Türkiye'de en iyi mobil bankacılık uygulaması hangisi?", "comparison"],
    ["Kredi kartı almak için hangi bankayı önerirsin?", "purchase"],
    ["Türkiye'de müşteri hizmetleri en iyi banka hangisi?", "comparison"],
    ["Yeni hesap açmak için en avantajlı banka hangisi?", "purchase"],
    ["Türkiye'de en güvenilir bankalar hangileri?", "informational"],
  ] as [string, Intent][],
};

function must<T>(r: { data: T | null; error: { message: string } | null }, what: string): T {
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return r.data as T;
}

async function ensureWorkspace(db: SupabaseClient, name: string, kind: "demo_lab" | "growth_lab", plan: string, uid: string): Promise<string> {
  const found = must(await db.from("workspaces").select("id").eq("name", name).eq("kind", kind).limit(1), "workspace ara") as { id: string }[];
  const id = found[0]?.id ?? (must(await db.from("workspaces").insert({ name, kind, plan }).select("id").single(), "workspace oluştur") as { id: string }).id;
  must(await db.from("workspace_members").upsert({ workspace_id: id, user_id: uid, role: "owner" }, { onConflict: "workspace_id,user_id" }), "üyelik");
  return id;
}

type Comp = string | { name: string; aliases?: string[]; website?: string };
const compOf = (c: Comp) => (typeof c === "string" ? { name: c, aliases: [] as string[], website: undefined as string | undefined } : { name: c.name, aliases: c.aliases ?? [], website: c.website });

async function ensureBrand(db: SupabaseClient, ws: string, b: { name: string; sector?: string; city?: string; website?: string; aliases?: string[] }, origin: "simulated" | "live_api", competitors: Comp[], prompts: [string, Intent][]) {
  const existing = must(await db.from("brands").select("id").eq("workspace_id", ws).eq("name", b.name).eq("is_competitor", false).limit(1), "marka ara") as { id: string }[];
  if (existing[0]) {
    // Var olan markada takma adları ve rakip bilgilerini (takma ad, web sitesi) güncelle
    if (b.aliases?.length) must(await db.from("brands").update({ aliases: b.aliases }).eq("id", existing[0].id), "takma ad");
    for (const c of competitors.map(compOf)) {
      if (!c.aliases.length && !c.website) continue;
      must(await db.from("brands").update({ aliases: c.aliases, website: c.website ?? null }).eq("owner_brand_id", existing[0].id).eq("name", c.name), "rakip güncelle");
    }
    return { id: existing[0].id, created: false };
  }
  const brand = must(await db.from("brands").insert({ workspace_id: ws, name: b.name, sector: b.sector ?? null, city: b.city ?? null, website: b.website ?? null, aliases: b.aliases ?? [], data_origin: origin }).select("id").single(), "marka ekle") as { id: string };
  if (competitors.length) must(await db.from("brands").insert(competitors.map(compOf).map((c) => ({ workspace_id: ws, name: c.name, aliases: c.aliases, website: c.website ?? null, is_competitor: true, owner_brand_id: brand.id, data_origin: origin }))), "rakip ekle");
  if (prompts.length) must(await db.from("prompts").insert(prompts.map(([text, intent]) => ({ workspace_id: ws, brand_id: brand.id, text, intent }))), "soru ekle");
  return { id: brand.id, created: true };
}

/** Demo markası için geçmişe yayılmış simüle haftalık ölçümler (önce/sonra eğilimi). */
async function seedSimulatedHistory(db: SupabaseClient, ws: string, brandId: string, weeks = 6, now = new Date()) {
  const brand = must(await db.from("brands").select("id,name,aliases").eq("id", brandId).single(), "marka") as { id: string; name: string; aliases: string[] };
  const comps = must(await db.from("brands").select("id,name,aliases").eq("owner_brand_id", brandId), "rakipler") as { id: string; name: string; aliases: string[] }[];
  const prompts = must(await db.from("prompts").select("id,text").eq("brand_id", brandId).eq("active", true), "sorular") as { id: string; text: string }[];
  const refs: BrandRef[] = [brand, ...comps].map((b) => ({ id: b.id, name: b.name, aliases: b.aliases ?? [] }));
  for (let w = weeks - 1; w >= 0; w--) {
    const at = new Date(now.getTime() - w * 7 * 86_400_000);
    // Eğilim: ilk haftalarda hedef marka geride, iyileştirmelerden sonra öne çıkıyor (simülasyon)
    const boost = -0.25 + ((weeks - 1 - w) / (weeks - 1)) * 0.45;
    const run = must(await db.from("runs").insert({
      workspace_id: ws, brand_id: brandId, status: "done", data_origin: "simulated", measurement_type: "simulated",
      max_cost_usd: 1, prompts_total: prompts.length, calls_ok: prompts.length, stop_reason: "completed",
      provider: "mock", model: "simulasyon-v1", trigger: "seed",
      created_at: at.toISOString(), started_at: at.toISOString(), finished_at: at.toISOString(),
    }).select("id").single(), "run") as { id: string };
    const sim = new SimulatedProvider(refs.map((r) => r.name), `${brandId}|w${w}`, { target: brand.name, boost });
    for (const p of prompts) {
      const res = await sim.ask(p.id, p.text);
      const resp = must(await db.from("responses").insert({
        workspace_id: ws, run_id: run.id, prompt_id: p.id, provider: "mock", model: res.model, method: "simulation",
        repetition: 1, answer_text: res.answerText, cited_urls: [], data_origin: "simulated", measurement_type: "simulated",
        billing: "free", created_at: at.toISOString(),
      }).select("id").single(), "cevap") as { id: string };
      must(await db.from("mentions").insert(analyzeResponse(res, refs).map((h) => ({
        response_id: resp.id, workspace_id: ws, brand_id: h.brandId, mentioned: h.mentioned, recommended: h.recommended, cited: false, rank: h.rank, classifier: "rules_v2",
      }))), "anılma");
    }
  }
}

export async function seedLabs(db: SupabaseClient, adminEmail: string, log: (m: string) => void = console.log) {
  const uid = must(await db.rpc("ensure_platform_admin", { p_email: adminEmail }), "ensure_platform_admin") as string | null;
  if (!uid) { log("Yönetici e-postasıyla kayıtlı kullanıcı bulunamadı: önce bu e-postayla siteye giriş yapın."); return { ok: false }; }
  log("Platform yöneticisi hazır.");

  const demo = await ensureWorkspace(db, "Demo Lab", "demo_lab", "agency_plus", uid);
  let seeded = 0;
  for (const d of DEMO_BRANDS) {
    const { id, created } = await ensureBrand(db, demo, d, "simulated", d.competitors, d.prompts);
    if (created) { await seedSimulatedHistory(db, demo, id); seeded++; }
  }
  log(`Demo Lab: ${DEMO_BRANDS.length} marka (${seeded} yeni, 6 haftalık simülasyon).`);

  const growth = await ensureWorkspace(db, GROWTH.workspace, "growth_lab", "pro", uid);
  // Ücretli canlı ölçüm yalnız bu alanda açılabilir (veritabanı kısıtı: yalnız growth_lab)
  must(await db.from("workspaces").update({ paid_live_allowed: true }).eq("id", growth), "ücretli izin");
  const g = await ensureBrand(db, growth, GROWTH.brand, "live_api", GROWTH.competitors, GROWTH.prompts);
  if (g.created) {
    // Web sitesi kontrolü işçinin bir sonraki çalışmasında otomatik yapılır (pending_site_audits).
    const prompts = GROWTH.prompts.length;
    must(await db.from("runs").insert({ workspace_id: growth, brand_id: g.id, status: "queued", data_origin: "live_api", measurement_type: "model_knowledge", max_cost_usd: 1, prompts_total: prompts, trigger: "manual" }), "ilk ölçüm");
    log("Growth Lab: AI SaaSavran markası oluşturuldu, ilk gerçek ölçüm sıraya alındı.");
  } else {
    // Web sitesi adresi değiştiyse güncelle (ör. pages.dev → kendi alan adı)
    must(await db.from("brands").update({ website: GROWTH.brand.website }).eq("id", g.id).neq("website", GROWTH.brand.website), "web sitesi güncelle");
    log("Growth Lab: zaten var.");
  }
  const gt = await ensureBrand(db, growth, GROWTH_TEST.brand, "live_api", GROWTH_TEST.competitors, GROWTH_TEST.prompts);
  if (gt.created) {
    // Test markası haftalık ücretsiz ölçüme dahil olmasın; yalnız elle ölçülür
    must(await db.from("brands").update({ auto_weekly: false }).eq("id", gt.id), "test markası");
    log("Growth Lab: karşılaştırma için Garanti BBVA test markası eklendi.");
  }
  // İlk canlı aramalı (ücretli) deneme ölçümü: Growth Lab'de hiç yoksa iki marka için birer kez sıraya alınır.
  // Toplam harcama veritabanındaki tavanla (app_settings.paid_total_cap_usd) sınırlıdır.
  const liveRuns = must(await db.from("runs").select("id").eq("workspace_id", growth).eq("measurement_type", "live_search").limit(1), "canlı ölçüm ara") as unknown[];
  const settings = must(await db.from("app_settings").select("paid_total_cap_usd").single(), "ayarlar") as { paid_total_cap_usd: number };
  if (liveRuns.length === 0 && Number(settings.paid_total_cap_usd) > 0) {
    for (const id of [g.id, gt.id]) {
      const n = (must(await db.from("prompts").select("id").eq("brand_id", id).eq("active", true), "sorular") as unknown[]).length;
      const busy = must(await db.from("runs").select("id").eq("brand_id", id).in("status", ["queued", "running"]), "bekleyen") as unknown[];
      if (n > 0 && busy.length === 0) {
        must(await db.from("runs").insert({ workspace_id: growth, brand_id: id, status: "queued", data_origin: "live_api", measurement_type: "live_search", max_cost_usd: 1, prompts_total: n, trigger: "seed" }), "canlı ölçüm");
      }
    }
    log("Growth Lab: ilk canlı aramalı deneme ölçümleri sıraya alındı.");
  }
  return { ok: true, demo, growth };
}
