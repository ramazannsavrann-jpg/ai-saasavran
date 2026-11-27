// TruthGuard video/araştırma raporu (salt okunur, ücretsiz). Growth Lab'deki her konu (hedef marka + rakipleri) için son N günün
// TruthGuard sonuçlarını marka marka yan yana yazar: doğru / yanlış / eski bilgi / doğrulanamadı, doğruluk oranı, örnek alıntılar
// ve "doğrusu" bilgisinin resmî kaynağı. Video sahnesi ("Yapay zekâ Samsung hakkında ne kadar doğru konuşuyor?") buradan kurulur.
// Gerekli: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY. İsteğe bağlı: TRUTH_DAYS (varsayılan 14), TRUTH_BRAND (yalnız bu hedef marka).
import { createClient } from "@supabase/supabase-js";
import { truthByBrand, MIN_CHECKABLE, type TruthClaim } from "../engine/src/truth.ts";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) { console.log("ATLANDI: Supabase anahtarları yok."); process.exit(0); }
const days = Math.max(1, Math.min(90, Number(process.env.TRUTH_DAYS || 14)));
const only = (process.env.TRUTH_BRAND || "").trim().toLocaleLowerCase("tr-TR");
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const must = <T>(r: { data: T | null; error: { message: string } | null }) => { if (r.error) throw new Error(r.error.message); return r.data as T; };
const ENG: Record<string, string> = { openai: "ChatGPT", claude: "Claude", gemini: "Gemini", perplexity: "Perplexity" };
const pct = (x: number | null) => (x == null ? "–" : `%${Math.round(x * 100)}`);

const ws = (must(await db.from("workspaces").select("id").eq("kind", "growth_lab")) as { id: string }[]).map((w) => w.id);
type B = { id: string; name: string; sector: string | null; country: string | null; is_competitor: boolean; owner_brand_id: string | null; fact_card: string | null; fact_sources: string[] | null; fact_checked_on: string | null };
const brands = must(await db.from("brands").select("id,name,sector,country,is_competitor,owner_brand_id,fact_card,fact_sources,fact_checked_on").in("workspace_id", ws)) as B[];
const since = new Date(Date.now() - days * 86_400_000).toISOString();
const checks = must(await db.from("truth_checks").select("brand_id,provider,created_at,failed,claims").in("workspace_id", ws).gte("created_at", since)) as { brand_id: string; provider: string; created_at: string; failed: boolean; claims: TruthClaim[] }[];

const byId = new Map(brands.map((b) => [b.id, b]));
const topics = brands.filter((b) => !b.is_competitor && (!only || b.name.toLocaleLowerCase("tr-TR") === only));
console.log(`# TruthGuard karşılaştırması (son ${days} gün)\n`);
console.log(`Doğruluk oranı = doğru / (doğru + yanlış + eski). "Doğrulanamadı" paydaya girmez; ${MIN_CHECKABLE}'ten az kontrol edilebilir iddiada oran verilmez.\n`);
let printed = 0;
for (const t of topics) {
  const group = brands.filter((b) => b.id === t.id || b.owner_brand_id === t.id);
  const ids = new Set(group.map((b) => b.id));
  const rows = checks.filter((c) => ids.has(c.brand_id)).map((c) => ({ ...c, brand: byId.get(c.brand_id)!.name }));
  if (!rows.length) continue;
  printed++;
  console.log(`## ${t.name} — ${t.sector ?? ""}${t.country ? ` (${t.country})` : ""}\n`);
  const noCard = group.filter((b) => !b.fact_card).map((b) => b.name);
  if (noCard.length) console.log(`Bilgi kartı olmadığı için kontrol edilmeyen: ${noCard.join(", ")}\n`);
  console.log("| Marka | Kontrol | Doğru | Yanlış | Eski | Doğrulanamadı | Doğruluk | Kartta en çok eksik |");
  console.log("|---|---|---|---|---|---|---|---|");
  const res = truthByBrand(rows);
  for (const r of res) console.log(`| ${r.brand} | ${r.checks} | ${r.correct} | ${r.wrong} | ${r.outdated} | ${r.unverifiable} | ${pct(r.accuracy)} | ${r.gaps.slice(0, 2).map((g) => `${g.topic} (${g.count})`).join(", ") || "–"} |`);
  for (const r of res) {
    const b = group.find((x) => x.name === r.brand)!;
    const ex = [...r.wrongClaims.map((w) => ({ ...w, k: "YANLIŞ" })), ...r.outdatedClaims.map((w) => ({ ...w, k: "ESKİ" }))].slice(0, 4);
    if (!ex.length) continue;
    console.log(`\n**${r.brand}** — kaynak: ${(b.fact_sources ?? []).join(", ") || "kartta kaynak yok"}${b.fact_checked_on ? ` (kontrol ${b.fact_checked_on})` : ""}`);
    for (const e of ex) console.log(`- ${e.k} · ${ENG[e.provider] ?? e.provider}: "${e.quote}" → doğrusu: ${e.fact || "–"}`);
  }
  console.log("");
}
if (!printed) console.log("Bu dönemde TruthGuard kontrolü yok (bilgi kartı olan marka ölçülmemiş ya da işçi henüz çalışmamış).");
