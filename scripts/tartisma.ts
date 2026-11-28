// Yapay zekâ tartışma masası (28 Kasım 2026, sahibin isteği).
// ChatGPT (fikir), Perplexity (canlı web araştırması) ve Gemini (eleştiri + şartname) bir ürün konusunu
// sırayla tartışır; çıkan şartnameyi Claude (yazılımcı) koda döker.
// Konu: tartisma/konu.md · Sonuç: tartisma/sonuc/<tarih>-<konu>.md
// AI SaaSavran ölçüm motoruna dokunmaz; yalnız aynı API anahtarlarını kullanır.
// Harcama tavanı: TARTISMA_TAVAN_USD (varsayılan 0,15 $). Her çağrıdan ÖNCE "harcanan + bu çağrının en kötü
// maliyeti" tavanı aşarsa tartışma durur ve o ana kadarki metin kaydedilir.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const TAVAN = Number(process.env.TARTISMA_TAVAN_USD ?? "0.15");
if (process.env.ALLOW_PAID_API !== "true") {
  console.log("ALLOW_PAID_API=true değil → tartışma atlandı.");
  process.exit(0);
}

type Ses = "ChatGPT" | "Perplexity" | "Gemini";
interface Cevap { metin: string; maliyet: number; kaynaklar: string[] }

// Fiyatlar motorun sağlayıcı kartlarından (engine/src/providers/*.ts), en kötü durum hesabı için.
const FIYAT = {
  ChatGPT: { model: "gpt-6-luna", girdi: 0.10, cikti: 0.50, maxCikti: 2500 },
  Perplexity: { model: "perplexity/sonar", girdi: 1, cikti: 3, arama: 0.0025, maxArama: 2, maxCikti: 1800 },
  Gemini: { model: "gemini-3.5-flash-lite", girdi: 0.30, cikti: 2.50, maxCikti: 3500 },
} as const;

const enKotu = (ses: Ses, girdiKarakter: number): number => {
  const girdiTok = Math.ceil(girdiKarakter / 3) + 500;
  const f = FIYAT[ses];
  let c = (girdiTok * f.girdi + f.maxCikti * f.cikti) / 1e6;
  if (ses === "Perplexity") c += FIYAT.Perplexity.arama * FIYAT.Perplexity.maxArama + (8000 * f.girdi) / 1e6; // arama içeriği
  return c;
};

const gizle = (s: string) => {
  for (const k of [process.env.OPENAI_API_KEY, process.env.PERPLEXITY_API_KEY, process.env.GEMINI_CANLI_API_KEY]) {
    if (k) s = s.split(k).join("***");
  }
  return s.slice(0, 500);
};

async function chatgpt(prompt: string): Promise<Cevap> {
  const f = FIYAT.ChatGPT;
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model: f.model, input: prompt, reasoning: { effort: "low" }, max_output_tokens: f.maxCikti }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`ChatGPT HTTP ${res.status}: ${gizle(await res.text())}`);
  const j = await res.json() as { output?: { type: string; content?: { type: string; text?: string }[] }[]; usage?: { input_tokens?: number; output_tokens?: number } };
  const metin = (j.output ?? []).filter((o) => o.type === "message").flatMap((o) => o.content ?? [])
    .filter((c) => c.type === "output_text").map((c) => c.text ?? "").join("").trim();
  const maliyet = ((j.usage?.input_tokens ?? 0) * f.girdi + (j.usage?.output_tokens ?? 0) * f.cikti) / 1e6;
  return { metin: metin || "(boş cevap)", maliyet, kaynaklar: [] };
}

async function perplexity(prompt: string): Promise<Cevap> {
  const f = FIYAT.Perplexity;
  const res = await fetch("https://api.perplexity.ai/v1/agent", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}` },
    body: JSON.stringify({ model: f.model, input: prompt, max_output_tokens: f.maxCikti, tools: [{ type: "web_search" }] }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`Perplexity HTTP ${res.status}: ${gizle(await res.text())}`);
  type Part = { type?: string; text?: string; annotations?: { url?: string }[] };
  const j = await res.json() as {
    output?: { type?: string; content?: Part[]; queries?: string[] }[];
    usage?: { input_tokens?: number; output_tokens?: number; cost?: { total_cost?: number } };
  };
  const parts = (j.output ?? []).filter((i) => i.type === "message").flatMap((i) => i.content ?? []).filter((c) => c.type === "output_text");
  const metin = parts.map((p) => p.text ?? "").join("").trim();
  const kaynaklar = [...new Set(parts.flatMap((p) => p.annotations ?? []).map((a) => a.url ?? "").filter(Boolean))];
  const aramalar = (j.output ?? []).flatMap((i) => i.queries ?? []).length;
  const maliyet = j.usage?.cost?.total_cost
    ?? ((j.usage?.input_tokens ?? 0) * f.girdi + (j.usage?.output_tokens ?? 0) * f.cikti) / 1e6 + Math.max(1, aramalar) * f.arama;
  return { metin: metin || "(boş cevap)", maliyet, kaynaklar };
}

async function gemini(prompt: string): Promise<Cevap> {
  const f = FIYAT.Gemini;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${f.model}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_CANLI_API_KEY ?? "" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: f.maxCikti } }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${gizle(await res.text())}`);
  const j = await res.json() as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number };
  };
  const metin = (j.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
  const u = j.usageMetadata ?? {};
  const maliyet = ((u.promptTokenCount ?? 0) * f.girdi + ((u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0)) * f.cikti) / 1e6;
  return { metin: metin || "(boş cevap)", maliyet, kaynaklar: [] };
}

const SESLER: Record<Ses, (p: string) => Promise<Cevap>> = { ChatGPT: chatgpt, Perplexity: perplexity, Gemini: gemini };

// --- Konu ---
const konu = readFileSync("tartisma/konu.md", "utf8").trim();
if (!konu) { console.log("tartisma/konu.md boş → atlandı."); process.exit(0); }

const KOSULLAR = `Kurallar (herkes için):
- Ürünün sahibi Antalya'da yaşayan, yazılımda yeni biri; başlangıç bütçesi 0 $.
- Kodu Claude yazacak (Android uygulaması ve/veya web). Sunucu masrafı olmamalı ya da çok düşük olmalı.
- Gerçekçi ol: uydurma rakam, uydurma rakip, uydurma kaynak yok. Emin değilsen "emin değilim" de.
- Kısa ve net yaz (en fazla ~350 kelime). Madde işaretleri kullan. Türkçe yaz.`;

const TURLAR: { ses: Ses; gorev: string }[] = [
  { ses: "ChatGPT", gorev: "Sen ürün fikircisisin. Bu konu için birbirinden farklı 3 ürün fikri öner. Her biri: kime, hangi sorunu çözer, nasıl para kazanır, neden küçük bir ekip yapabilir." },
  { ses: "Perplexity", gorev: "Sen pazar araştırmacısısın. Canlı web aramasıyla her fikir için gerçek rakipleri, talebi ve boşluğu bul. Kaynak göster. Hangi fikrin pazarda gerçekten şansı var, açıkça söyle." },
  { ses: "Gemini", gorev: "Sen şeytanın avukatısın. Önceki iki görüşü sert ama adil eleştir: teknik risk, Google Play kuralları, gizlilik/yasal risk, para kazanma zorluğu, 0 $ bütçeyle yapılabilirlik. Her fikre 10 üzerinden puan ver." },
  { ses: "ChatGPT", gorev: "Eleştirileri dikkate alarak TEK bir fikir seç (gerekirse birleştir/değiştir). Neden seçtiğini, ilk sürümde (MVP) olacak en fazla 6 özelliği ve ilk 100 kullanıcıyı nasıl bulacağını yaz." },
  { ses: "Perplexity", gorev: "Seçilen fikri canlı web aramasıyla son kez kontrol et: en yakın 3 rakip, fiyatları, kullanıcı şikâyetleri (yorumlardan), bizi ayıracak tek şey. Kaynak göster." },
  { ses: "Gemini", gorev: `Sen hakemsin. Tartışmanın tamamını oku ve Claude için YAZILIM ŞARTNAMESİ yaz. Başlıklar:
1. Ürün adı önerisi (2 seçenek) ve tek cümlelik tanım
2. Hedef kullanıcı
3. MVP özellikleri (en fazla 6, öncelik sırasıyla)
4. Ekranlar (her ekran tek satır)
5. Veri ve teknik tercih (cihazda mı, sunucu gerekir mi, hangi ücretsiz servis)
6. Para kazanma modeli
7. Riskler ve çözümleri
8. Tartışmada uzlaşılamayan noktalar (Claude ve sahibi karar verecek)
Bu turda kelime sınırı 600.` },
];

const tutanak: string[] = [];
const toplamlar: Record<Ses, number> = { ChatGPT: 0, Perplexity: 0, Gemini: 0 };
let harcanan = 0;
let durdu = "";

for (const [i, t] of TURLAR.entries()) {
  const gecmis = tutanak.length ? `\n\nŞimdiye kadarki tartışma:\n${tutanak.join("\n\n")}` : "";
  const prompt = `${KOSULLAR}\n\nKONU:\n${konu}${gecmis}\n\nSENİN GÖREVİN (${t.ses}, tur ${i + 1}/${TURLAR.length}):\n${t.gorev}`;
  const tahmin = enKotu(t.ses, prompt.length);
  if (harcanan + tahmin > TAVAN) {
    durdu = `Tur ${i + 1} (${t.ses}) çalıştırılmadı: harcanan ${harcanan.toFixed(4)} $ + en kötü ${tahmin.toFixed(4)} $ > tavan ${TAVAN} $.`;
    console.log(durdu); break;
  }
  try {
    const c = await SESLER[t.ses](prompt);
    harcanan += c.maliyet; toplamlar[t.ses] += c.maliyet;
    const kay = c.kaynaklar.length ? `\n\nKaynaklar:\n${c.kaynaklar.map((u) => `- ${u}`).join("\n")}` : "";
    tutanak.push(`### Tur ${i + 1} — ${t.ses}\n\n${c.metin}${kay}`);
    console.log(`Tur ${i + 1} ${t.ses}: ${c.maliyet.toFixed(5)} $ (toplam ${harcanan.toFixed(5)} $)`);
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    console.error(`Tur ${i + 1} ${t.ses} HATA: ${m}`);
    tutanak.push(`### Tur ${i + 1} — ${t.ses}\n\n(Hata: ${m})`);
  }
}

const tarih = new Date().toISOString().slice(0, 16).replace("T", "-").replace(":", "");
const slug = konu.split("\n")[0].toLowerCase()
  .replace(/[çÇ]/g, "c").replace(/[ğĞ]/g, "g").replace(/[ıİ]/g, "i").replace(/[öÖ]/g, "o").replace(/[şŞ]/g, "s").replace(/[üÜ]/g, "u")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "konu";
const dosya = `tartisma/sonuc/${tarih}-${slug}.md`;
const ozet = `| Motor | Model | Maliyet ($) |\n|---|---|---|\n` +
  (Object.keys(toplamlar) as Ses[]).map((s) => `| ${s} | ${FIYAT[s].model} | ${toplamlar[s].toFixed(5)} |`).join("\n") +
  `\n| **Toplam** | | **${harcanan.toFixed(5)}** |`;
mkdirSync("tartisma/sonuc", { recursive: true });
writeFileSync(dosya, `# Tartışma: ${konu.split("\n")[0]}\n\nTarih: ${new Date().toISOString()} · Tavan: ${TAVAN} $\n\n## Konu\n\n${konu}\n\n## Maliyet (API kullanım verisinden)\n\n${ozet}\n${durdu ? `\n> ${durdu}\n` : ""}\n## Tutanak\n\n${tutanak.join("\n\n")}\n`);
console.log(`Kaydedildi: ${dosya} · toplam ${harcanan.toFixed(5)} $`);
