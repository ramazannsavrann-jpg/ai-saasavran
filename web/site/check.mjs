// Üye olmadan ücretsiz kontrol sayfası (form site.js ile çalışır; sonuç /api/check'ten gelir).
export function checkHtml(en) {
  const t = en ? {
    h: "Free AI visibility check", lede: "We ask Gemini 5 questions a customer might ask about your category and show whether your business comes up. No signup.",
    brand: "Business name", brandPh: "e.g. Smile Dental", cat: "What you do", catPh: "e.g. dentist, CRM software, coffee shop",
    city: "City or country (optional)", cityPh: "e.g. Austin, Texas", web: "Website (optional)", webPh: "e.g. smiledental.com",
    go: "Run the free check", note: "2 free checks per person per month. Uses Gemini's model knowledge without live web search; ChatGPT with live search is in paid plans. Don't enter personal data.",
  } : {
    h: "Ücretsiz yapay zekâ görünürlük kontrolü", lede: "Müşterinizin sektörünüzle ilgili sorabileceği 5 soruyu Gemini'ye soruyoruz ve işletmenizin cevaplarda geçip geçmediğini gösteriyoruz. Üyelik gerekmez.",
    brand: "İşletme adı", brandPh: "ör. Gülüş Diş Kliniği", cat: "Ne iş yapıyorsunuz?", catPh: "ör. diş kliniği, muhasebe yazılımı, kafe",
    city: "Şehir veya ülke (isteğe bağlı)", cityPh: "ör. Antalya", web: "Web sitesi (isteğe bağlı)", webPh: "ör. gulusdis.com",
    go: "Ücretsiz kontrolü başlat", note: "Kişi başına ayda 2 ücretsiz kontrol. Gemini'nin model bilgisi kullanılır, canlı web araması yoktur; ChatGPT canlı arama ücretli paketlerde. Kişisel bilgi girmeyin.",
  };
  return `
<section class="article check">
  <h1>${t.h}</h1>
  <p class="lede">${t.lede}</p>
  <form id="free-check" class="check-form" data-lang="${en ? "en" : "tr"}" novalidate>
    <label>${t.brand}<input name="brand" required minlength="2" maxlength="80" placeholder="${t.brandPh}" autocomplete="organization"></label>
    <label>${t.cat}<input name="category" required minlength="2" maxlength="80" placeholder="${t.catPh}"></label>
    <label>${t.city}<input name="city" maxlength="80" placeholder="${t.cityPh}"></label>
    <label>${t.web}<input name="website" maxlength="120" placeholder="${t.webPh}" inputmode="url"></label>
    <button class="btn" type="submit">${t.go}</button>
    <p class="small">${t.note}</p>
  </form>
  <div id="check-result" aria-live="polite"></div>
</section>`;
}
