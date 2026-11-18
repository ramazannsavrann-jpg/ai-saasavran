// Kendi görünürlüğümüz (18 Kasım, sahip kararı: 2 haftada bir): Growth Lab'deki "AI SaaSavran" markası için canlı aramalı
// ölçümü sıraya koyar. Çift ISO haftalarında çalışır; sırada ya da son 10 günde bitmiş ölçüm varsa koymaz. Tavan 0,60 $.
// Ücretli çağrıyı işçi yapar (ALLOW_PAID_API + veritabanı tavanları geçerli).
import { createClient } from "@supabase/supabase-js";

const BRAND = "1d757724-5db7-45f8-962c-dc6c87f395be";
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) { console.log("ATLANDI: Supabase anahtarı yok"); process.exit(0); }
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const now = new Date();
const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
const week = Math.ceil(((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86400_000 + 1) / 7);
if (week % 2 !== 0) { console.log(`Tek hafta (${week}); kendi ölçümümüz gelecek hafta.`); process.exit(0); }

const b = await db.from("brands").select("id,workspace_id").eq("id", BRAND).single();
if (b.error || !b.data) { console.log("Marka bulunamadı; atlandı."); process.exit(0); }
const recent = await db.from("runs").select("id,status,created_at").eq("brand_id", BRAND).eq("measurement_type", "live_search")
  .gte("created_at", new Date(Date.now() - 10 * 86400_000).toISOString());
if ((recent.data ?? []).length) { console.log("Son 10 günde ölçüm var; yenisi konmadı."); process.exit(0); }
const n = await db.from("prompts").select("id", { count: "exact", head: true }).eq("brand_id", BRAND).eq("active", true).neq("intent", "informational");
const ins = await db.from("runs").insert({ workspace_id: b.data.workspace_id, brand_id: BRAND, status: "queued", data_origin: "live_api",
  measurement_type: "live_search", max_cost_usd: 0.6, prompts_total: n.count ?? 0, trigger: "manual" }).select("id").single();
if (ins.error) { console.error("Ölçüm sıraya konamadı:", ins.error.message); process.exit(1); }
console.log(`Kendi ölçümümüz sıraya kondu (hafta ${week}).`);
