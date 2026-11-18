// Ölçüm sayfaları (18 Kasım, görünürlük düzeni): Growth Lab'in gerçek ölçümlerini sitede yayımlanacak özet veriye çevirir.
// Çıktı: web/site/data/measurements.json (depoya girer; yalnız sayılar ve marka adları — cevap metni, kaynak adresi, müşteri verisi yok).
// Kurallar: yalnız Growth Lab (hide_from_examples=false), simülasyon yok, soruda marka adı geçenler yok,
// her soru için motor ve ölçüm türü başına SON ölçüm; en az 4 cevap ve en az 2 marka.
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) { console.log("ATLANDI: Supabase anahtarı yok"); process.exit(0); }
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const must = <T>(r: { data: T | null; error: { message: string } | null }) => { if (r.error) throw new Error(r.error.message); return r.data as T; };

const ws = (must(await db.from("workspaces").select("id").eq("kind", "growth_lab").eq("hide_from_examples", false)) as { id: string }[]).map((w) => w.id);
const brands = must(await db.from("brands").select("id,name,aliases,is_competitor,owner_brand_id,country").in("workspace_id", ws)) as any[];
const prompts = must(await db.from("prompts").select("id,text,brand_id,active").in("workspace_id", ws)) as any[];
const since = new Date(Date.now() - 60 * 86400_000).toISOString();

const named = (t: string) => brands.some((b) => [b.name, ...(b.aliases ?? [])].some((n: string) => n && n.length >= 3 && !n.startsWith("parent:") && t.toLocaleLowerCase("tr-TR").includes(n.toLocaleLowerCase("tr-TR"))));
const slugify = (t: string) => t.toLocaleLowerCase("tr-TR").replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u")
  .normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 70).replace(/-$/, "");
const isTr = (t: string) => /[çğışöüÇĞİŞÖÜ]/.test(t) || /\b(hangi|nedir|nasıl|önerir|en iyi)\b/i.test(t);

const out: any[] = [];
for (const p of prompts) {
  if (named(p.text)) continue;
  const resp = must(await db.from("responses").select("id,run_id,provider,measurement_type,created_at,data_origin")
    .eq("prompt_id", p.id).gte("created_at", since).neq("data_origin", "simulated").order("created_at", { ascending: false }).limit(200)) as any[];
  if (!resp.length) continue;
  // motor × ölçüm türü başına son ölçüm
  const lastRun = new Map<string, string>();
  for (const r of resp) { const k = `${r.provider}|${r.measurement_type}`; if (!lastRun.has(k)) lastRun.set(k, r.run_id); }
  const use = resp.filter((r) => lastRun.get(`${r.provider}|${r.measurement_type}`) === r.run_id);
  const ment = must(await db.from("mentions").select("response_id,brand_id,mentioned,recommended,rank").in("response_id", use.map((r) => r.id))) as any[];
  const engines: any[] = [];
  for (const [k] of lastRun) {
    const [provider, mtype] = k.split("|");
    const rs = use.filter((r) => r.provider === provider && r.measurement_type === mtype);
    const ids = new Set(rs.map((r) => r.id));
    const per = new Map<string, { recommended: number; mentioned: number; first: number }>();
    for (const m of ment) {
      if (!ids.has(m.response_id)) continue;
      const b = brands.find((x) => x.id === m.brand_id); if (!b) continue;
      const e = per.get(b.name) ?? { recommended: 0, mentioned: 0, first: 0 };
      if (m.mentioned) e.mentioned++; if (m.recommended) e.recommended++; if (m.recommended && m.rank === 1) e.first++;
      per.set(b.name, e);
    }
    const list = [...per.entries()].filter(([, v]) => v.mentioned > 0).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.recommended - a.recommended || b.mentioned - a.mentioned || a.name.localeCompare(b.name));
    if (rs.length >= 2 && list.length >= 2) engines.push({ provider, measurement_type: mtype, answers: rs.length, at: rs.map((r) => r.created_at).sort().at(-1), brands: list.slice(0, 10) });
  }
  const answers = engines.reduce((a, e) => a + e.answers, 0);
  if (answers < 4 || !engines.length) continue;
  const owner = brands.find((b) => b.id === p.brand_id);
  out.push({
    slug: slugify(p.text), question: p.text, lang: isTr(p.text) ? "tr" : "en", country: owner?.country ?? null,
    at: engines.map((e) => e.at).sort().at(-1), answers,
    engines: engines.sort((a, b) => (a.measurement_type === b.measurement_type ? a.provider.localeCompare(b.provider) : a.measurement_type === "live_search" ? -1 : 1)),
  });
}
// aynı slug iki kez olmasın
const seen = new Set<string>();
const final = out.sort((a, b) => b.at.localeCompare(a.at)).filter((m) => (seen.has(m.slug) ? false : (seen.add(m.slug), true)));
mkdirSync("web/site/data", { recursive: true });
writeFileSync("web/site/data/measurements.json", JSON.stringify({ updated: new Date().toISOString().slice(0, 10), items: final }, null, 1) + "\n");
console.log(`Ölçüm sayfaları: ${final.length} soru (${final.filter((m) => m.lang === "tr").length} TR, ${final.filter((m) => m.lang === "en").length} EN)`);
