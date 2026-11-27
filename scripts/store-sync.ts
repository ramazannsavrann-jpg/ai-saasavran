// Hafif mağaza eşitlemesi: yalnız Google Play aboneliklerini Google'a yeniden sorar (ölçüm yapmaz, ücretli API yok).
// Ölçüm işçisi (worker.yml) İstanbul saatiyle 08–23 arası her saat aynı işi yapar; bu betik gece saatlerini kapatır
// (store-sync.yml), böylece iptal/iade/süre dolması ve askıdan dönen ödeme gece de en geç ~1 saatte işlenir.
import { createClient } from "@supabase/supabase-js";
import { syncStoreSubscriptions } from "../engine/src/store-sync.ts";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_PLAY_SERVICE_ACCOUNT } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.log("ATLANDI: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY tanımlı değil.");
  process.exit(0);
}
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const storeSync = await syncStoreSubscriptions(db, GOOGLE_PLAY_SERVICE_ACCOUNT);
console.log(JSON.stringify({ storeSync }));
