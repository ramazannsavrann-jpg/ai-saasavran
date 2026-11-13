// WordPress eklentisini web/public/downloads/ altına zip olarak üretir (site derlemesinden önce çalışır).
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("..", import.meta.url));
const out = `${root}web/public/downloads/ai-saasavran-bot-sayaci.zip`;
mkdirSync(`${root}web/public/downloads`, { recursive: true });
rmSync(out, { force: true });
execFileSync("zip", ["-q", "-r", "-X", out, "ai-saasavran-bot-sayaci"], { cwd: `${root}integrations/wordpress` });
console.log("WordPress eklentisi: web/public/downloads/ai-saasavran-bot-sayaci.zip");
