// Android (Google Play) TWA projesini android/twa-manifest.json'dan üretir.
// Kullanım: node scripts/android/generate.mjs <hedef-klasör>   (ortam: VERSION_CODE, VERSION_NAME, ICON_BASE isteğe bağlı)
// Uygulama, sitenin kendisini Chrome motoruyla tam ekran açar: site güncellenince uygulama da anında güncellenir.
import { readFileSync } from "node:fs";
import { TwaGenerator, TwaManifest, ConsoleLog } from "@bubblewrap/core";

const out = process.argv[2] || "android/build";
const json = JSON.parse(readFileSync("android/twa-manifest.json", "utf8"));
if (process.env.VERSION_CODE) json.appVersionCode = Number(process.env.VERSION_CODE);
if (process.env.VERSION_NAME) json.appVersionName = json.appVersion = process.env.VERSION_NAME;
if (process.env.ICON_BASE) { // yerel deneme için ikonları başka adresten al
  json.iconUrl = `${process.env.ICON_BASE}/icons/icon-512.png`;
  json.maskableIconUrl = `${process.env.ICON_BASE}/icons/maskable-512.png`;
  json.webManifestUrl = `${process.env.ICON_BASE}/manifest.webmanifest`;
}
const manifest = new TwaManifest(json);
const errors = manifest.validate();
if (errors) { console.error("twa-manifest hatalı:", errors); process.exit(1); }
await new TwaGenerator().createTwaProject(out, manifest, new ConsoleLog("android"));
console.log(`Android projesi üretildi: ${out} (sürüm ${json.appVersionName}, kod ${json.appVersionCode})`);
