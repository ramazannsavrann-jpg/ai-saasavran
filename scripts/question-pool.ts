// Soru havuzu (19 Kasım): her sektör için Google'da insanların gerçekten sorduğu soruları (SerpApi: "Diğer kişiler şunları da sordu"
// ve ilgili aramalar) toplar, web/src/lib/question-pool.ts dosyasına yazar. Yapay zekâ kullanılmaz; sorular Google'dan olduğu gibi gelir.
// SerpApi hakkı Shopping ile ortak: kalan hak POOL_RESERVE'in (varsayılan 150) altına inmeden durur. Yarıda kalırsa sonraki
// çalıştırma kaldığı sektörden devam eder (dolu sektörler atlanır). Sektör başına 2 arama, en fazla 15 soru.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { cleanQuestions, guessIntent, parseDiscovery, serpGoogle, type FoundQuestion } from "../engine/src/discovery.ts";
import { shoppingSearchesLeft } from "../engine/src/shopping.ts";

const key = process.env.SERPAPI_KEY;
if (!key) { console.log("SERPAPI_KEY yok"); process.exit(0); }
const RESERVE = Number(process.env.POOL_RESERVE || 150);
const MAX_SECTORS = Number(process.env.POOL_MAX_SECTORS || 200);
const OUT = "web/src/lib/question-pool.ts";

const src = readFileSync("web/src/lib/sectors.ts", "utf8");
const enStart = src.indexOf("export const SECTOR_DEFS_EN");
const sectors: { label: string; lang: "tr" | "en" }[] = [];
for (const m of src.matchAll(/label: ("(?:[^"\\]|\\.)*"), local: (true|false)/g)) {
  const label = JSON.parse(m[1]) as string;
  if (/^(Diğer|Other)$|: diğer$|: other$/i.test(label)) continue;
  sectors.push({ label, lang: (m.index ?? 0) > enStart ? "en" : "tr" });
}

type Item = { t: string; i: string; s: "paa" | "related" };
let pool: Record<string, Item[]> = {};
if (existsSync(OUT)) {
  const m = readFileSync(OUT, "utf8").match(/export const QUESTION_POOL[^=]*= (\{[\s\S]*\});\s*$/);
  if (m) pool = JSON.parse(m[1]);
}

function seedsFor(label: string, lang: string): string[] {
  const loc = lang === "en" ? "en-US" : "tr-TR";
  const cc = label.match(/^(?:content creator|içerik üreticisi): (.+)$/i);
  if (cc) { const t = cc[1].split("/")[0].trim().toLocaleLowerCase(loc); return lang === "en" ? [`best ${t} youtube channels`] : [`en iyi ${t} youtube kanalları`]; }
  const parts = label.replace(/\([^)]*\)/g, "").split("/").map((x) => x.trim()).filter((x) => x.length >= 2);
  const main = (parts.length > 1 ? parts.slice(0, 2).join(" ") : parts[0] ?? label).toLocaleLowerCase(loc);
  return lang === "en" ? [`best ${main}`, `how to choose ${main}`] : [`en iyi ${main}`, `${main} nasıl seçilir`];
}

let left = await shoppingSearchesLeft(key);
console.log(`SerpApi kalan arama: ${left ?? "bilinmiyor"} · rezerv ${RESERVE} · sektör ${sectors.length} · dolu ${Object.keys(pool).length}`);
let done = 0, searches = 0;
for (const s of sectors) {
  if (pool[s.label]?.length) continue;
  if (done >= MAX_SECTORS) break;
  const seeds = seedsFor(s.label, s.lang);
  if (left !== null && left - seeds.length < RESERVE) { console.log("Rezerve ulaşıldı, duruluyor."); break; }
  const found: FoundQuestion[] = [];
  for (const seed of seeds) {
    try { found.push(...parseDiscovery(await serpGoogle(seed, { apiKey: key, lang: s.lang }), seed)); searches++; if (left !== null) left--; }
    catch (e) { console.log(`  ! ${s.label} / ${seed}: ${(e as Error).message}`); }
  }
  const clean = cleanQuestions(found, [], 15);
  pool[s.label] = clean.map((q) => ({ t: q.text, i: guessIntent(q.text), s: q.source }));
  console.log(`· ${s.label} (${s.lang}): ${clean.length} soru`);
  done++;
}
const sorted = Object.fromEntries(Object.entries(pool).filter(([, v]) => v.length).sort(([a], [b]) => a.localeCompare(b, "tr")));
writeFileSync(OUT, `// Otomatik üretilir: scripts/question-pool.ts (Google "Diğer kişiler şunları da sordu" + ilgili aramalar, SerpApi). Elle düzenlemeyin.
// Sektör etiketi → Google'da sorulan gerçek sorular. i = amaç tahmini, s = kaynak (paa | related).
export const QUESTION_POOL: Record<string, { t: string; i: string; s: string }[]> = ${JSON.stringify(sorted, null, 1)};
`);
console.log(`Bitti: ${done} sektör, ${searches} arama, havuzda ${Object.keys(sorted).length} sektör, ${Object.values(sorted).reduce((a, v) => a + v.length, 0)} soru.`);
