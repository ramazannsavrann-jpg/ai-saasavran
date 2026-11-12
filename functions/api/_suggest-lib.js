// Otomatik soru önerisi: istem ve cevabı ayıklama (test edilebilir, ağ yok).
const INTENTS = new Set(["informational", "comparison", "purchase", "local", "post_purchase"]);

export function buildSuggestPrompt(ctx) {
  const tr = (ctx.country || "TR").toUpperCase() === "TR";
  const lines = tr ? [
    "Bir işletmenin yapay zekâ asistanlarında (ChatGPT, Gemini) görünürlüğünü ölçmek için, müşterilerin bu asistanlara gerçekten soracağı sorular hazırla.",
    `Sektör: ${ctx.sector || "belirtilmedi"}`,
    ctx.city ? `Şehir/bölge: ${ctx.city}` : "Şehir: belirtilmedi (yerel soru yazma)",
    ctx.website ? `İşletmenin sitesi (konu ipucu): ${ctx.website}` : "",
    ctx.competitors?.length ? `Bilinen rakipler (ipucu, soruya yazma): ${ctx.competitors.slice(0, 8).join(", ")}` : "",
    ctx.existing?.length ? `Zaten olan sorular (tekrar etme):\n- ${ctx.existing.slice(0, 30).join("\n- ")}` : "",
    "Kurallar: 8 soru yaz. Türkçe, günlük dilde, müşteri ağzından. Hiçbir marka ya da işletme adı geçmesin (işletmenin kendi adı da). Her soru tek cümle, en fazla 140 karakter.",
    "Çeşit olsun: bilgi arayan, karşılaştıran, satın almaya hazır" + (ctx.city ? ", yerel (şehri anan)" : "") + " sorular.",
    'Yalnız JSON dizi döndür, başka metin yazma: [{"text":"...","intent":"informational|comparison|purchase|local"}]',
  ] : [
    "Write questions that real customers would ask AI assistants (ChatGPT, Gemini), to measure a business's visibility in those answers.",
    `Industry: ${ctx.sector || "not specified"}`,
    ctx.city ? `City/area: ${ctx.city}` : "City: not specified (no local questions)",
    ctx.website ? `Business website (topic hint): ${ctx.website}` : "",
    ctx.competitors?.length ? `Known competitors (hint only, do not name them): ${ctx.competitors.slice(0, 8).join(", ")}` : "",
    ctx.existing?.length ? `Existing questions (do not repeat):\n- ${ctx.existing.slice(0, 30).join("\n- ")}` : "",
    "Rules: write 8 questions in natural English from the customer's point of view. Do not include any brand or business name (including this business). One sentence each, max 140 characters.",
    "Mix: informational, comparison, ready-to-buy" + (ctx.city ? ", local (mentions the city)" : "") + " questions.",
    'Return only a JSON array, no other text: [{"text":"...","intent":"informational|comparison|purchase|local"}]',
  ];
  return lines.filter(Boolean).join("\n");
}

const norm = (s) => String(s).toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

/** Model cevabından soruları ayıklar; marka/rakip adı geçen, mevcut olan, çok kısa/uzun olanları atar. */
export function parseSuggestions(text, ctx) {
  let arr = [];
  const m = String(text || "").match(/\[[\s\S]*\]/);
  if (m) { try { arr = JSON.parse(m[0]); } catch { arr = []; } }
  const names = [ctx.name, ...(ctx.competitors || [])].map(norm).filter((n) => n.length >= 3);
  const existing = new Set((ctx.existing || []).map(norm));
  const seen = new Set();
  const out = [];
  for (const it of Array.isArray(arr) ? arr : []) {
    const q = String(it?.text ?? "").replace(/\s+/g, " ").trim();
    if (q.length < 10 || q.length > 160) continue;
    const n = norm(q);
    if (existing.has(n) || seen.has(n)) continue;
    if (names.some((x) => ` ${n} `.includes(` ${x} `) || n.includes(x))) continue;
    seen.add(n);
    out.push({ text: q, intent: INTENTS.has(it?.intent) ? it.intent : "informational" });
    if (out.length >= 8) break;
  }
  return out;
}
