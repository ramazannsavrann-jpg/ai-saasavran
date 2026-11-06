// Growth Lab'deki kayıtlı cevapları güncel kurallarla yeniden analiz eder (API çağrısı yok, ücretsiz).
import { createClient } from "@supabase/supabase-js";
import { reanalyzeRuns } from "../engine/src/worker.ts";
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) { console.log("ATLANDI"); process.exit(0); }
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
console.log("Yeniden analiz:", JSON.stringify(await reanalyzeRuns(db)));
