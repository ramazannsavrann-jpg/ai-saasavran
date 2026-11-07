// Ana sayfa sunumu için: Growth Lab'deki kredi kartı sorularının gerçek ölçüm verisini dışa aktarır (salt okunur).
// Çıktı: demo-export.json (iş akışı eseri olarak indirilir; depoya girmez). Gizli anahtar yazdırılmaz.
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) { console.log("ATLANDI"); process.exit(0); }
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const must = <T>(r: { data: T | null; error: { message: string } | null }) => { if (r.error) throw new Error(r.error.message); return r.data as T; };

const ws = (must(await db.from("workspaces").select("id").eq("kind", "growth_lab")) as { id: string }[]).map((w) => w.id);
const prompts = must(await db.from("prompts").select("id,text,brand_id").in("workspace_id", ws)) as any[];
const card = prompts.filter((p) => /kart|banka/i.test(p.text));
const out: any[] = [];
for (const p of card) {
  const resp = must(await db.from("responses").select("id,provider,measurement_type,answer_text,cited_urls,created_at").eq("prompt_id", p.id).order("created_at", { ascending: false }).limit(20)) as any[];
  const ment = resp.length ? must(await db.from("mentions").select("response_id,mentioned,recommended,rank,brands(name)").in("response_id", resp.map((r) => r.id))) as any[] : [];
  out.push({ prompt: p.text, responses: resp.map((r) => ({ ...r, mentions: ment.filter((m) => m.response_id === r.id).map((m) => ({ brand: m.brands?.name, mentioned: m.mentioned, recommended: m.recommended, rank: m.rank })) })) });
}
writeFileSync("demo-export.json", JSON.stringify(out, null, 1));
// Eser indirilemediğinde günlükten okunabilsin (yalnız yapay zekâ cevapları; kişisel veri yok)
console.log("DEMO_JSON_BEGIN"); console.log(JSON.stringify(out)); console.log("DEMO_JSON_END");
console.log(`Dışa aktarıldı: ${out.length} soru, ${out.reduce((s, o) => s + o.responses.length, 0)} cevap`);
