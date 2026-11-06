// Demo Lab ve Growth Lab'i hazırlar. Gerekli: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PLATFORM_ADMIN_EMAIL.
import { createClient } from "@supabase/supabase-js";
import { seedLabs } from "../engine/src/labs.ts";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PLATFORM_ADMIN_EMAIL } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !PLATFORM_ADMIN_EMAIL) {
  console.log("ATLANDI: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / PLATFORM_ADMIN_EMAIL eksik.");
  process.exit(0);
}
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
await seedLabs(db, PLATFORM_ADMIN_EMAIL);
