// Kuyruktaki ölçümleri işler. GitHub Actions zamanlanmış iş olarak çalışır.
// Gerekli: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY. İsteğe bağlı: GEMINI_API_KEY.
// Ücretli API'ler ALLOW_PAID_API=true olmadan asla kullanılmaz.
import { createClient } from "@supabase/supabase-js";
import { processAudits, processQueue, scheduleWeekly } from "../engine/src/worker.ts";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.log("ATLANDI: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY tanımlı değil (Supabase projesi henüz bağlanmadı).");
  process.exit(0);
}
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const deps = { db, env: process.env };
const scheduled = await scheduleWeekly(deps);
const audits = await processAudits(deps);
const results = await processQueue(deps, Number(process.env.WORKER_MAX_RUNS || 20));
console.log(JSON.stringify({ weeklyScheduled: scheduled, audits, processed: results.length, results }, null, 2));
if (results.some((r) => r.stop === "worker_error")) process.exit(1);
