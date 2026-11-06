// Docker'sız, Supabase uyumlu yerel/CI test ortamı:
//   Postgres 16 (gerçek)  +  Supabase Auth (GoTrue, gerçek ikili)  +  PostgREST (gerçek ikili)  +  ağ geçidi
// Ağ geçidi Supabase bulutunun adres düzenini taklit eder: /auth/v1 → GoTrue, /rest/v1 → PostgREST,
// diğer her şey → web/dist (tek sayfa uygulama).
//
// Kullanım:  node scripts/stack/stack.mjs          (ön planda çalışır, Ctrl+C ile durur)
// Programdan: const s = await startStack(); ... await s.stop();

import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, chmodSync, statSync } from "node:fs";
import { createServer, request as httpRequest } from "node:http";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { devKeys } from "./jwt.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const BIN = process.env.STACK_BIN_DIR || join(tmpdir(), "saasavran-bin");
const PG_BIN = process.env.PG_BIN || "/usr/lib/postgresql/16/bin";
const JWT_SECRET = "dev-only-jwt-secret-at-least-32-characters-long";
const VERSIONS = { postgrest: "v12.2.3", auth: "v2.197.0" };
const PORTS = { pg: 54322, auth: 9999, rest: 54330, gateway: Number(process.env.STACK_PORT || 54321) };
const isRoot = process.getuid?.() === 0;
const step = (m) => { if (process.env.STACK_DEBUG) console.error(`[stack] ${m}`); };

function sh(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", ...opts });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")}\n${r.stdout}\n${r.stderr}`);
  return r.stdout;
}
const asPg = (cmd, args, opts) => (isRoot ? sh("runuser", ["-u", "postgres", "--", cmd, ...args], opts) : sh(cmd, args, opts));

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`İndirme başarısız ${res.status}: ${url}`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

export async function ensureBinaries() {
  mkdirSync(BIN, { recursive: true });
  if (!existsSync(join(BIN, "postgrest"))) {
    const f = join(BIN, "pgrst.tar.xz");
    await download(`https://github.com/PostgREST/postgrest/releases/download/${VERSIONS.postgrest}/postgrest-${VERSIONS.postgrest}-linux-static-x64.tar.xz`, f);
    sh("tar", ["xJf", f, "-C", BIN]);
  }
  if (!existsSync(join(BIN, "auth"))) {
    const f = join(BIN, "auth.tgz");
    await download(`https://github.com/supabase/auth/releases/download/${VERSIONS.auth}/auth-${VERSIONS.auth}-x86.tar.gz`, f);
    sh("tar", ["xzf", f, "-C", BIN]);
  }
  chmodSync(join(BIN, "postgrest"), 0o755);
  chmodSync(join(BIN, "auth"), 0o755);
}

async function waitFor(url, label, ms = 30_000) {
  const t0 = Date.now();
  for (;;) {
    try { const r = await fetch(url); if (r.status < 500) return; } catch {}
    if (Date.now() - t0 > ms) throw new Error(`${label} ${ms / 1000} sn içinde açılmadı (${url})`);
    await new Promise((r) => setTimeout(r, 300));
  }
}

function psql(file, db = "postgres") {
  const args = ["-v", "ON_ERROR_STOP=1", "-q", "-h", "127.0.0.1", "-p", String(PORTS.pg), "-U", "postgres", "-d", db, "-f", file];
  return sh("psql", args, { env: { ...process.env, PGPASSWORD: "postgres" } });
}
export function sqlQuery(sql) {
  return sh("psql", ["-X", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-h", "127.0.0.1", "-p", String(PORTS.pg), "-U", "postgres", "-d", "postgres", "-c", sql],
    { env: { ...process.env, PGPASSWORD: "postgres" } }).trim();
}

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json", ".png": "image/png", ".ico": "image/x-icon", ".woff2": "font/woff2" };

function startGateway(webDir) {
  const server = createServer((req, res) => {
    const route = req.url.startsWith("/auth/v1/") ? { port: PORTS.auth, path: req.url.slice(8) }
      : req.url.startsWith("/rest/v1/") ? { port: PORTS.rest, path: req.url.slice(8) }
      : null;
    if (route) {
      const up = httpRequest({ host: "127.0.0.1", port: route.port, path: route.path, method: req.method, headers: req.headers }, (u) => {
        res.writeHead(u.statusCode, u.headers);
        u.pipe(res);
      });
      up.on("error", (e) => { res.writeHead(502); res.end(String(e)); });
      req.pipe(up);
      return;
    }
    // Statik uygulama + SPA geri dönüşü
    const clean = decodeURIComponent(req.url.split("?")[0]).replace(/\.\.+/g, "");
    let file = join(webDir, clean);
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(webDir, "index.html");
    if (!existsSync(file)) { res.writeHead(404); res.end("web/dist yok — önce: npm run web:build"); return; }
    res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
    res.end(readFileSync(file));
  });
  return new Promise((resolve) => server.listen(PORTS.gateway, "127.0.0.1", () => resolve(server)));
}

export async function startStack({ quiet = true, webDir = join(ROOT, "web", "dist") } = {}) {
  await ensureBinaries();
  const data = join(tmpdir(), `saasavran-pg-${PORTS.pg}`);
  const procs = [];
  const log = (p, name) => {
    const chunks = [];
    p.stdout?.on("data", (d) => { chunks.push(d); if (!quiet) process.stdout.write(`[${name}] ${d}`); });
    p.stderr?.on("data", (d) => { chunks.push(d); if (!quiet) process.stderr.write(`[${name}] ${d}`); });
    p.logs = () => Buffer.concat(chunks).toString().slice(-4000);
    procs.push(p);
    return p;
  };

  step("postgres");
  // 1) Postgres (her başlatmada temiz veritabanı)
  rmSync(data, { recursive: true, force: true });
  mkdirSync(data, { recursive: true });
  if (isRoot) sh("chown", ["postgres:postgres", data]);
  const pwFile = join(data, "..", `saasavran-pw-${PORTS.pg}`);
  writeFileSync(pwFile, "postgres\n"); if (isRoot) sh("chown", ["postgres:postgres", pwFile]);
  asPg(join(PG_BIN, "initdb"), ["-D", data, "-U", "postgres", "--pwfile", pwFile, "-A", "md5", "--locale=C.UTF-8", "-E", "UTF8"]);
  const pgCmd = [join(PG_BIN, "postgres"), "-D", data, "-p", String(PORTS.pg), "-k", data, "-c", "listen_addresses=127.0.0.1", "-c", "fsync=off"];
  const pg = log(isRoot ? spawn("runuser", ["-u", "postgres", "--", ...pgCmd]) : spawn(pgCmd[0], pgCmd.slice(1)), "postgres");
  for (let i = 0; ; i++) {
    const r = spawnSync(join(PG_BIN, "pg_isready"), ["-h", "127.0.0.1", "-p", String(PORTS.pg)]);
    if (r.status === 0) break;
    if (i > 100) throw new Error("Postgres açılmadı\n" + pg.logs());
    await new Promise((r) => setTimeout(r, 200));
  }
  psql(join(ROOT, "scripts", "stack", "bootstrap.sql"));

  step("auth");
  // 2) Supabase Auth (kendi auth şemasını oluşturur)
  const authEnv = {
    ...process.env,
    GOTRUE_API_HOST: "127.0.0.1", PORT: String(PORTS.auth), API_EXTERNAL_URL: `http://127.0.0.1:${PORTS.gateway}/auth/v1`,
    GOTRUE_DB_DRIVER: "postgres",
    DATABASE_URL: `postgres://supabase_auth_admin:devpass@127.0.0.1:${PORTS.pg}/postgres?sslmode=disable`,
    GOTRUE_SITE_URL: `http://127.0.0.1:${PORTS.gateway}`,
    GOTRUE_JWT_SECRET: JWT_SECRET, GOTRUE_JWT_EXP: "3600", GOTRUE_JWT_AUD: "authenticated",
    GOTRUE_JWT_DEFAULT_GROUP_NAME: "authenticated", GOTRUE_JWT_ADMIN_ROLES: "service_role",
    GOTRUE_DISABLE_SIGNUP: "false", GOTRUE_EXTERNAL_EMAIL_ENABLED: "true",
    GOTRUE_MAILER_AUTOCONFIRM: "true", // test ortamında e-posta doğrulaması atlanır; bulutta açık olacak
    GOTRUE_PASSWORD_MIN_LENGTH: "8",
    GOTRUE_RATE_LIMIT_HEADER: "", GOTRUE_LOG_LEVEL: "warn",
  };
  const auth = log(spawn(join(BIN, "auth"), [], { env: authEnv, cwd: BIN }), "auth");
  await waitFor(`http://127.0.0.1:${PORTS.auth}/health`, "Supabase Auth", 60_000).catch((e) => { throw new Error(e.message + "\n" + auth.logs()); });

  step("migrations");
  // 3) Uygulama şeması
  const migDir = join(ROOT, "supabase", "migrations");
  for (const f of readdirSync(migDir).filter((x) => x.endsWith(".sql")).sort()) psql(join(migDir, f));

  step("postgrest");
  // 4) PostgREST
  const restConf = join(data, "..", `saasavran-postgrest-${PORTS.pg}.conf`);
  writeFileSync(restConf, [
    `db-uri = "postgres://authenticator:devpass@127.0.0.1:${PORTS.pg}/postgres"`,
    `db-schemas = "public"`, `db-anon-role = "anon"`, `jwt-secret = "${JWT_SECRET}"`,
    `server-host = "127.0.0.1"`, `server-port = ${PORTS.rest}`, `db-pool = 5`, `log-level = "warn"`,
  ].join("\n"));
  const rest = log(spawn(join(BIN, "postgrest"), [restConf]), "postgrest");
  await waitFor(`http://127.0.0.1:${PORTS.rest}/`, "PostgREST").catch((e) => { throw new Error(e.message + "\n" + rest.logs()); });

  step("gateway");
  // 5) Ağ geçidi
  const gateway = await startGateway(webDir);
  const url = `http://127.0.0.1:${PORTS.gateway}`;
  const keys = devKeys(JWT_SECRET);
  writeFileSync(join(tmpdir(), "saasavran-stack.json"), JSON.stringify({ url, ...keys }));

  return {
    url, ...keys, jwtSecret: JWT_SECRET, sql: sqlQuery,
    async stop() {
      gateway.closeAllConnections?.(); gateway.close();
      for (const p of [...procs].reverse()) { if (p !== pg) { try { p.kill("SIGTERM"); } catch {} } }
      try { asPg(join(PG_BIN, "pg_ctl"), ["-D", data, "stop", "-m", "immediate"]); } catch {}
      await new Promise((r) => setTimeout(r, 300));
      for (const p of procs) { try { p.kill("SIGKILL"); } catch {} p.stdout?.destroy(); p.stderr?.destroy(); }
    },
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === (await import("node:path")).resolve(process.argv[1])) {
  const s = await startStack({ quiet: process.env.STACK_VERBOSE !== "1" });
  console.log(`Hazır: ${s.url}\nanon: ${s.anonKey}\nservice: ${s.serviceKey}`);
  const shutdown = async () => { await s.stop(); process.exit(0); };
  process.on("SIGINT", shutdown); process.on("SIGTERM", shutdown);
}
