// Kuyruktaki ölçümleri işler. GitHub Actions zamanlanmış iş olarak çalışır.
// Gerekli: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY. İsteğe bağlı: GEMINI_API_KEY.
// Ücretli API'ler ALLOW_PAID_API=true olmadan asla kullanılmaz.
import { createClient } from "@supabase/supabase-js";
import { maintain, processAudits, processProductChecks, processQueue, processShoppingChecks, processReanalysis, scheduleWeekly } from "../engine/src/worker.ts";
import { seedLabs } from "../engine/src/labs.ts";
import { sendWeeklyDigests, sendWelcomeEmails } from "../engine/src/email.ts";
import { processDropAlerts } from "../engine/src/alerts.ts";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.log("ATLANDI: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY tanımlı değil (Supabase projesi henüz bağlanmadı).");
  process.exit(0);
}
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const deps = { db, env: process.env };
// Laboratuvarlar yoksa oluştur (idempotent; yönetici siteye giriş yaptıktan sonraki ilk çalışmada devreye girer).
if (process.env.PLATFORM_ADMIN_EMAIL) {
  try { await seedLabs(db, process.env.PLATFORM_ADMIN_EMAIL); } catch (e) { console.log("Laboratuvar hazırlığı atlandı:", (e as Error).message); }
}
// Bakım: yarıda kalan ölçümler ve yeni ayda açılacak alanlar (0012). Hata verirse iş durmaz.
let maintenance: unknown;
try { maintenance = await maintain(deps); } catch (e) { maintenance = `hata: ${(e as Error).message}`; }
const scheduled = await scheduleWeekly(deps);
const audits = await processAudits(deps);
let productChecks: unknown;
try { productChecks = await processProductChecks(deps); } catch (e) { productChecks = `hata: ${(e as Error).message}`; }
let shoppingChecks: unknown;
try { shoppingChecks = await processShoppingChecks(deps); } catch (e) { shoppingChecks = `hata: ${(e as Error).message}`; }
const reanalyzed = await processReanalysis(deps);
const results = await processQueue(deps, Number(process.env.WORKER_MAX_RUNS || 20), Number(process.env.WORKER_BUDGET_MIN || 25) * 60_000);
// Haftalık e-posta özeti (Pazartesi 09:00 İstanbul sonrası; kullanıcı başına haftada bir)
let digests: unknown = "RESEND_API_KEY yok";
if (process.env.RESEND_API_KEY) {
  try { digests = await sendWeeklyDigests(db, process.env.RESEND_API_KEY); } catch (e) { digests = `hata: ${(e as Error).message}`; }
}
// Hoş geldin e-postası (e-postasını doğrulayan yeni kullanıcıya bir kez)
let welcome: unknown;
try { welcome = await sendWelcomeEmails(db, process.env.RESEND_API_KEY); } catch (e) { welcome = `hata: ${(e as Error).message}`; }
// Düşüş uyarısı: biten her ölçüm önceki ölçümle bir kez karşılaştırılır (ek API yok)
let dropAlerts: unknown;
try { dropAlerts = await processDropAlerts(db, process.env.RESEND_API_KEY); } catch (e) { dropAlerts = `hata: ${(e as Error).message}`; }
console.log(JSON.stringify({ maintenance, dropAlerts, productChecks, shoppingChecks, weeklyScheduled: scheduled, audits, reanalyzed, digests, welcome, processed: results.length, results }, null, 2));
if (results.some((r) => r.stop === "worker_error")) process.exit(1);
