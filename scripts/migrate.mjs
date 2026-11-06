// Supabase veritabanına migration uygular. Her dosya bir kez ve tek işlem (transaction) içinde uygulanır;
// uygulananlar app_meta.migrations tablosunda izlenir (bu şema veri API'sine açık değildir).
// Daha önce uygulanmış bir dosya sonradan değiştirilirse durur: migration'lar yalnızca eklenir, düzenlenmez.
//
// Gerekli: SUPABASE_DB_URL (Supabase → Connect → Session pooler bağlantı adresi). Yoksa "ATLANDI" der.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync, rmSync, mkdtempSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const URL_ = process.env.SUPABASE_DB_URL;
const DIR = process.env.MIGRATIONS_DIR || join(dirname(fileURLToPath(import.meta.url)), "..", "supabase", "migrations");

if (!URL_) {
  console.log("ATLANDI: SUPABASE_DB_URL tanımlı değil (Supabase projesi henüz bağlanmadı).");
  process.exit(0);
}

function psql(args, input) {
  const r = spawnSync("psql", ["-X", "-q", "-v", "ON_ERROR_STOP=1", URL_, ...args], { encoding: "utf8", input });
  if (r.status !== 0) {
    // Bağlantı adresinde şifre bulunur; hata mesajına sızmasın
    const clean = (s) => (s || "").split(URL_).join("***");
    throw new Error(clean(r.stderr) || clean(r.stdout) || `psql çıkış kodu ${r.status}`);
  }
  return r.stdout;
}

psql(["-c", `create schema if not exists app_meta;
  revoke all on schema app_meta from public;
  create table if not exists app_meta.migrations (
    name text primary key, checksum text not null, applied_at timestamptz not null default now());`]);

const applied = new Map(
  psql(["-A", "-t", "-F", "|", "-c", "select name, checksum from app_meta.migrations"])
    .trim().split("\n").filter(Boolean).map((l) => l.split("|")),
);

const files = readdirSync(DIR).filter((f) => /^\d+_.*\.sql$/.test(f)).sort();
const tmp = mkdtempSync(join(tmpdir(), "mig-"));
let count = 0;
try {
  for (const f of files) {
    const sql = readFileSync(join(DIR, f), "utf8");
    const sum = createHash("sha256").update(sql).digest("hex");
    if (applied.has(f)) {
      if (applied.get(f) !== sum) throw new Error(`${f} uygulandıktan sonra değiştirilmiş. Değişikliği yeni bir migration dosyası olarak ekleyin.`);
      continue;
    }
    const file = join(tmp, f);
    writeFileSync(file, `${sql}\n;insert into app_meta.migrations (name, checksum) values ('${f}', '${sum}');\n`);
    psql(["--single-transaction", "-f", file]);
    console.log(`uygulandı: ${f}`);
    count++;
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
console.log(count ? `${count} migration uygulandı.` : "Veritabanı güncel; uygulanacak migration yok.");
