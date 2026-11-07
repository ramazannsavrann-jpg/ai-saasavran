// Ana sayfa sunumu: tek bir GERÇEK soru ve cevap (Growth Lab, ChatGPT canlı web araması, 6 Kasım 2026, 2 cevap).
// Banka ve kart adları gizlendi (Banka A–E). Cevap metni kısaltıldı; İngilizce sürüm çeviridir. Uydurma veri yok.
const T = {
  tr: {
    h: "Bir soru, baştan sona",
    sub: "Gerçek bir ölçümümüz: banka ve kart adlarını gizledik, gerisi olduğu gibi.",
    s1: "Soru", q: "Kredi kartı almak için hangi bankayı önerirsin?", meta: "ChatGPT, canlı web araması · 6 Kasım 2026 · aynı soru 2 kez soruldu",
    s2: "Yapay zekânın cevabı (kısaltılmış)",
    a: `Tek bir kart önereceksem, yıllık aidat ödemek istemiyorsan <mark class="hit">Banka A Kredi Kartı</mark> derim. […] Kampanya ve taksit fırsatları senin için daha önemliyse, <mark class="hit target">Banka D</mark>, <mark class="hit alt">Banka E</mark>, <mark class="hit alt">Banka B</mark> veya <mark class="hit alt">Banka C</mark> kartlarını karşılaştırırdım.`,
    src: "Baktığı kaynaklar: bir kredi kartı karşılaştırma sitesi · Banka A'nın kart sayfası · Banka E'nin ücret tablosu · BDDK",
    s3: "Ölçtüğümüz (2 cevap)",
    rows: [["Banka A", 2, "2 cevapta da ilk öneri"], ["Banka B", 2, "seçenekler arasında"], ["Banka C", 2, "seçenekler arasında"], ["Banka D", 1, "yalnız 1 cevapta, ilk öneri değil"], ["Banka E", 1, "yalnız 1 cevapta"]],
    note: "Gerçek raporda her soru her hafta tekrar sorulur; oranlar güven aralığıyla gösterilir.",
    s4: "Banka D için öneriler",
    recs: ["Aidatsız kart seçeneğini tek, açık bir sayfada anlatın: yapay zekâ “aidatsız” gerekçesiyle Banka A'yı seçti.",
           "Karşılaştırma sitelerinde güncel bilgiyle yer alın: cevabın dayandığı kaynaklardan biri oydu.",
           "Ücret ve avantaj tablosunu açıkça yayınlayın: Banka E'nin tablosu kaynak gösterildi.",
           "Haftaya aynı soruyu yeniden ölçün ve değişimi grafikte izleyin."],
    cta: "Kendi markanızı ölçün",
  },
  en: {
    h: "One question, start to finish",
    sub: "A real measurement from our lab in Turkey. Bank and card names are hidden; the answer is translated and shortened.",
    s1: "Question", q: "Which bank would you recommend for a credit card?", meta: "ChatGPT with live web search · 6 Nov 2026 · same question asked twice",
    s2: "The AI's answer (shortened)",
    a: `If I had to pick one card and you don't want an annual fee, I'd say the <mark class="hit">Bank A credit card</mark>. […] If campaigns and instalments matter more to you, I'd compare cards from <mark class="hit target">Bank D</mark>, <mark class="hit alt">Bank E</mark>, <mark class="hit alt">Bank B</mark> or <mark class="hit alt">Bank C</mark>.`,
    src: "Sources it read: a credit card comparison site · Bank A's card page · Bank E's fee table · the banking regulator",
    s3: "What we measured (2 answers)",
    rows: [["Bank A", 2, "first pick in both answers"], ["Bank B", 2, "among the options"], ["Bank C", 2, "among the options"], ["Bank D", 1, "only in 1 answer, never first"], ["Bank E", 1, "only in 1 answer"]],
    note: "In a real report every question is asked again each week, and rates come with confidence ranges.",
    s4: "What Bank D should do",
    recs: ["Explain its no-fee card on one clear page: the AI chose Bank A because of “no annual fee”.",
           "Keep its listing on comparison sites current: one was a source for this answer.",
           "Publish fees and benefits openly: Bank E's fee table was cited.",
           "Measure the same question next week and watch the trend."],
    cta: "Measure your own brand",
  },
};

export function demoHtml(en) {
  const t = en ? T.en : T.tr;
  return `
<section class="demo" aria-labelledby="demo-h">
  <h2 id="demo-h">${t.h}</h2>
  <p class="muted">${t.sub}</p>
  <ol class="demo-steps">
    <li><h3>${t.s1}</h3><p class="demo-q">${t.q}</p><p class="small">${t.meta}</p></li>
    <li><h3>${t.s2}</h3><blockquote class="demo-a">${t.a}</blockquote><p class="small">${t.src}</p></li>
    <li><h3>${t.s3}</h3>
      <ul class="demo-bars">${t.rows.map(([n, k, d]) => `
        <li${n.endsWith("D") ? ' class="target"' : ""}><span class="nm">${n}</span><span class="track"><span class="fill" style="width:${k * 50}%"></span></span><span class="k">${k}/2</span><span class="d">${d}</span></li>`).join("")}
      </ul>
      <p class="small">${t.note}</p></li>
    <li><h3>${t.s4}</h3><ul class="demo-recs">${t.recs.map((r) => `<li>${r}</li>`).join("")}</ul></li>
  </ol>
  <p class="actions"><a class="btn" href="${en ? "/check/" : "/tr/kontrol/"}">${en ? "Free check, no signup" : "Üye olmadan ücretsiz kontrol"}</a><a class="btn ghost" href="/kayit">${t.cta}</a></p>
</section>`;
}
