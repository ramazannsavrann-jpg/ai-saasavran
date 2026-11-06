// Growth Lab ölçüm özeti (salt okunur): marka bazında önerilme, kaynak siteler, gerçek ücretli harcama.
// Gizli bilgi yazdırmaz. Gerekli: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
import { createClient } from "@supabase/supabase-js";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) { console.log("ATLANDI: Supabase anahtarları yok."); process.exit(0); }
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const must = <T>(r: { data: T | null; error: { message: string } | null }) => { if (r.error) throw new Error(r.error.message); return r.data as T; };

const ws = must(await db.from("workspaces").select("id").eq("kind", "growth_lab")) as { id: string }[];
const ids = ws.map((w) => w.id);
const runs = must(await db.from("runs").select("id,brand_id,measurement_type,status,cost_usd,calls_ok,created_at,brands(name)").in("workspace_id", ids).eq("status", "done").order("created_at", { ascending: false }).limit(10)) as any[];
const total = must(await db.from("cost_ledger").select("cost_usd").eq("billing", "paid")) as { cost_usd: number }[];
const cap = must(await db.from("app_settings").select("paid_total_cap_usd").single()) as any;
console.log(`Toplam ücretli harcama: $${total.reduce((s, r) => s + Number(r.cost_usd), 0).toFixed(4)} / tavan $${cap.paid_total_cap_usd}`);

// Her marka + tür için en son ölçüm
const seen = new Set<string>();
for (const r of runs) {
  const key = `${r.brand_id}|${r.measurement_type}`;
  if (seen.has(key)) continue; seen.add(key);
  const resp = must(await db.from("responses").select("id,prompt_id,answer_text,cited_urls,input_tokens,output_tokens,cost_usd").eq("run_id", r.id)) as any[];
  const ment = must(await db.from("mentions").select("brand_id,mentioned,recommended,cited,brands(name)").in("response_id", resp.map((x) => x.id))) as any[];
  const by = new Map<string, { n: number; m: number; rec: number; cit: number }>();
  for (const m of ment) {
    const k = m.brands.name; const v = by.get(k) ?? { n: 0, m: 0, rec: 0, cit: 0 };
    v.n++; v.m += +m.mentioned; v.rec += +m.recommended; v.cit += +m.cited; by.set(k, v);
  }
  const doms = new Map<string, number>();
  for (const x of resp) for (const u of x.cited_urls ?? []) { try { const d = new URL(u).hostname.replace(/^www\./, ""); doms.set(d, (doms.get(d) ?? 0) + 1); } catch {} }
  const inTok = resp.reduce((s, x) => s + (x.input_tokens ?? 0), 0), outTok = resp.reduce((s, x) => s + (x.output_tokens ?? 0), 0);
  console.log(`\n=== ${r.brands.name} — ${r.measurement_type} (${r.created_at.slice(0, 16)}) — ${resp.length} cevap, maliyet $${Number(r.cost_usd).toFixed(4)}, ort. girdi ${Math.round(inTok / Math.max(resp.length, 1))} / çıktı ${Math.round(outTok / Math.max(resp.length, 1))} token`);
  for (const [k, v] of [...by.entries()].sort((a, b) => b[1].rec - a[1].rec)) console.log(`  ${k}: anıldı ${v.m}/${resp.length}, önerildi ${v.rec}/${resp.length}, kaynak ${v.cit}/${resp.length}`);
  if (doms.size) console.log(`  Kaynak siteler: ${[...doms.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([d, c]) => `${d} (${c})`).join(", ")}`);
  const sample = resp[0]?.answer_text?.replace(/\s+/g, " ").slice(0, 400);
  if (sample) console.log(`  Örnek cevap: ${sample}…`);
}
