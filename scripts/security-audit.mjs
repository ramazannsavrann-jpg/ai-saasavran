// Canlı veritabanı güvenlik denetimi (her yayında, migration'lardan sonra çalışır). Veri okumaz, yalnız şemaya bakar.
// Başarısız olursa yayın durur. Denetlenenler:
//  1) public şemasında satır güvenliği (RLS) kapalı tablo olmamalı
//  2) Giriş yapmamış ziyaretçinin (anon) çağırabildiği SECURITY DEFINER fonksiyon yalnız izin listesindekiler olmalı
//  3) SECURITY DEFINER fonksiyonların arama yolu (search_path) sabit olmalı
// Gerekli: SUPABASE_DB_URL. Yoksa "ATLANDI" der.
import { spawnSync } from "node:child_process";

const URL_ = process.env.SUPABASE_DB_URL;
if (!URL_) { console.log("ATLANDI: SUPABASE_DB_URL yok"); process.exit(0); }
// RLS kurallarının her rolde çağırdığı yardımcılar: yalnız çağıranın kendisi hakkında evet/hayır döner
const ANON_OK = new Set(["is_member", "is_platform_admin"]);

function q(sql) {
  const r = spawnSync("psql", [URL_, "-X", "-At", "-v", "ON_ERROR_STOP=1", "-c", sql], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`psql hatası: ${(r.stderr || "").split("\n")[0]}`);
  return r.stdout.split("\n").map((l) => l.trim()).filter(Boolean);
}

const problems = [];
for (const t of q(`select c.relname from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind in ('r','p') and not c.relrowsecurity`))
  problems.push(`RLS kapalı tablo: ${t}`);
for (const f of q(`select p.proname from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prosecdef and has_function_privilege('anon', p.oid, 'EXECUTE')`))
  if (!ANON_OK.has(f)) problems.push(`Giriş yapmamış ziyaretçi çağırabiliyor: ${f}()`);
for (const f of q(`select p.proname from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prosecdef and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')`))
  problems.push(`Arama yolu sabit değil: ${f}()`);

if (problems.length) {
  console.error("GÜVENLİK DENETİMİ BAŞARISIZ:\n- " + problems.join("\n- "));
  process.exit(1);
}
const [tables] = q(`select count(*) from pg_class where relnamespace = 'public'::regnamespace and relkind in ('r','p')`);
console.log(`Güvenlik denetimi geçti: ${tables} tablonun hepsinde RLS açık; ziyaretçiye açık fonksiyonlar yalnız ${[...ANON_OK].join(", ")}.`);
