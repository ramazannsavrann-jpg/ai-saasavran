// IndexNow: site yayına çıkınca yeni/değişen sayfaları Bing, Yandex, Seznam ve Naver'a bildirir (hesap gerekmez).
// Bing'in dizini ChatGPT aramasını da besler. Anahtar herkese açık bir doğrulama dosyasıdır (gizli değil): web/public/63b340ed9b20c61768a422d4e585569e.txt
// Kullanım: node scripts/indexnow.mjs [gün=7]  → site haritasında son N günde değişen sayfalar + ana sayfalar
import { readFileSync } from "node:fs";

const KEY = "63b340ed9b20c61768a422d4e585569e";
const HOST = "aisaasavran.com";
const days = Number(process.argv[2] ?? 7);
const xml = readFileSync("web/dist/sitemap.xml", "utf8");
const since = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc><lastmod>([^<]+)<\/lastmod>/g)]
  .filter(([, , d]) => d >= since).map(([, u]) => u);
for (const u of [`https://${HOST}/`, `https://${HOST}/tr/`]) if (!urls.includes(u)) urls.push(u);
const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: urls.slice(0, 10000) }),
  signal: AbortSignal.timeout(20_000),
});
console.log(`IndexNow: ${urls.length} adres bildirildi, cevap ${res.status}`);
// 200/202 kabul; 422 = adres ya da anahtar uyuşmazlığı, 429 = çok sık. Yayını durdurmaz.
if (![200, 202].includes(res.status)) console.log(await res.text().catch(() => ""));
