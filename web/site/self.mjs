// Kendi markamızın son ölçümü (otomatik): web/site/data/self.json — scripts/export-measurements.ts her pazartesi yazar.
// Dosya yoksa 18 Kasım 2026 ölçümü kullanılır (ilk ölçüm, elle doğrulandı). Ana sayfa kutusu ve karşılaştırma tablosu buradan.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const FILE = join(dirname(fileURLToPath(import.meta.url)), "data", "self.json");
const FALLBACK = { at: "2026-11-18", questions: 7, answers: 42, engines: ["ChatGPT", "Claude", "Perplexity"], ours: 0,
  brands: [["Peec AI", 33], ["Otterly.AI", 32], ["Semrush", 32], ["Profound", 23], ["Ahrefs", 22]] };
const load = () => { try { const j = JSON.parse(readFileSync(FILE, "utf8")); return j && j.answers > 0 && Array.isArray(j.brands) ? j : FALLBACK; } catch { return FALLBACK; } };
export const SELF = existsSync(FILE) ? load() : FALLBACK;

// Türkçe iyelik eki: "42 cevabın 3'ü", "6'sı", "0'ı"
export function trPoss(n) {
  const ones = ["ı", "i", "si", "ü", "ü", "i", "sı", "si", "i", "u"];
  const tens = ["", "u", "si", "u", "ı", "si", "ı", "i", "i", "ı"];
  if (n === 0) return `0'ı`;
  if (n % 100 === 0) return `${n}'ü`;
  const sfx = n % 10 ? ones[n % 10] : tens[Math.floor(n / 10) % 10];
  return `${n}'${sfx}`;
}
const date = (iso, tr) => new Date(iso + "T12:00:00Z").toLocaleDateString(tr ? "tr-TR" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Istanbul" });
export const selfDate = (tr) => date(SELF.at, tr);
const top = SELF.brands.slice(0, 5);
const range = top.length ? [Math.min(...top.map((b) => b[1])), Math.max(...top.map((b) => b[1]))] : [0, 0];
const list = top.map(([n, r]) => `${n} ${r}`).join(", ");

/** Karşılaştırma tablosu satırları: rakipler + biz (sona). */
export const selfRows = () => [...top, ["AI SaaSavran", SELF.ours]].map(([n, r]) => `<tr><td>${n}</td><td class="num">${r}/${SELF.answers}</td></tr>`).join("");

/** Ana sayfadaki dürüst kutu. */
export function selfBox(en) {
  const first = SELF.at === "2026-11-18";
  if (en) return `
<section class="honest">
  <div class="honest-copy">
  <p class="eyebrow">Transparency</p>
  <h2>We measure ourselves too: ${SELF.ours} out of ${SELF.answers}</h2>
  <p>On ${date(SELF.at, false)} we ran AI SaaSavran on our own brand: ${SELF.questions} unbranded questions to ${SELF.engines.join(", ")} with live web search from Turkey. We were recommended in ${SELF.ours} of ${SELF.answers} answers. Competitors were recommended in ${range[0]} to ${range[1]} of them (${list}). We re-measure every two weeks and this box updates itself. We publish it because it shows why measurement comes first: you can't improve what you can't see.</p>
  <p class="small">${first ? "" : "First full measurement (18 November 2026): 0 out of 42. "}Asked about us by name on 18 November, Perplexity found our site, Claude found only our code repository, and ChatGPT confused us with another brand. Our first measurement (11 November, ChatGPT only): 0 out of 20.</p>
  <p><a href="/guides/ai-visibility-tools-compared/">AI visibility tools compared</a> · <a href="/guides/measure-brand-visibility-in-chatgpt/">Measurement method</a></p>
  </div>
  <div class="stats"><div class="stat dark"><b>${SELF.ours}<span>/${SELF.answers}</span></b><span>answers recommended AI SaaSavran</span></div><div class="stat"><b>${range[0]}–${range[1]}</b><span>answers recommended each competitor (${top.map((b) => b[0]).join(", ")})</span></div></div>
</section>`;
  return `
<section class="honest">
  <div class="honest-copy">
  <p class="eyebrow">Şeffaflık</p>
  <h2>Kendi markamızı da ölçüyoruz: ${SELF.answers} cevabın ${trPoss(SELF.ours)}</h2>
  <p>${date(SELF.at, true)} tarihinde AI SaaSavran'ı kendi markamızla ölçtük: ${SELF.questions} markasız soru, ${SELF.engines.join(", ")} motorlarına Türkiye'den canlı web aramasıyla. ${SELF.ours === 0 ? `${SELF.answers} cevabın hiçbirinde önerilmedik.` : `${SELF.answers} cevabın ${SELF.ours} tanesinde önerildik.`} Rakipler ${range[0]} ile ${range[1]} cevapta önerildi (${list}). İki haftada bir yeniden ölçüyoruz ve bu kutu kendiliğinden güncelleniyor. Sonuçları saklamıyoruz, çünkü ürünün ne işe yaradığını en iyi bu gösteriyor: nerede olduğunuzu bilmeden ilerleyemezsiniz.</p>
  <p class="small">${first ? "" : "İlk tam ölçüm (18 Kasım 2026): 42 cevabın 0'ı. "}18 Kasım'da adımızı doğrudan sorduğumuzda Perplexity sitemizi buldu, Claude yalnız kod deposunu buldu, ChatGPT bizi başka bir markayla karıştırdı. İlk ölçümümüz (11 Kasım, yalnız ChatGPT): 20 cevabın 0'ı.</p>
  <p><a href="/rehber/yapay-zeka-gorunurluk-araclari/">Yapay zekâ görünürlük araçları karşılaştırması</a> · <a href="/rehber/chatgpt-marka-gorunurlugu-olcme/">Ölçüm yöntemi</a></p>
  </div>
  <div class="stats"><div class="stat dark"><b>${SELF.ours}<span>/${SELF.answers}</span></b><span>cevapta AI SaaSavran önerildi</span></div><div class="stat"><b>${range[0]}–${range[1]}</b><span>cevapta rakipler önerildi (${top.map((b) => b[0]).join(", ")})</span></div></div>
</section>`;
}
