// Herkese açık sayfalar için küçük yardımcı (sayfa bu dosya olmadan da tam çalışır).
(function () {
  // Giriş/doğrulama dönüşü yanlışlıkla ana sayfaya düşerse uygulamaya aktar
  var h = location.hash || "";
  if (/access_token=|error_description=|type=recovery/.test(h) || /[?&]code=/.test(location.search)) {
    location.replace("/panel" + location.search + h);
    return;
  }
  // Oturum açıksa "Giriş yap" yerine "Panele git"
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i) || "";
      if (/^sb-.*-auth-token$/.test(k)) {
        document.querySelectorAll("[data-cta]").forEach(function (a) { a.textContent = "Panele git"; a.setAttribute("href", "/panel"); });
        break;
      }
    }
  } catch (e) { /* depolama kapalı olabilir */ }
})();

// Ücretsiz kontrol formu (/check/, /tr/kontrol/)
(function () {
  var form = document.getElementById("free-check");
  if (!form) return;
  var out = document.getElementById("check-result");
  var tr = form.getAttribute("data-lang") === "tr";
  var T = tr ? {
    busy: "Gemini'ye 5 soru soruluyor… (20–30 saniye)", input: "İşletme adını ve ne iş yaptığınızı yazın.",
    person_limit: "Bu ayki 2 ücretsiz kontrol hakkınızı kullandınız. Düzenli ölçüm için ücretsiz hesap açabilirsiniz.",
    daily_limit: "Bugünkü ücretsiz kontrol kapasitesi doldu. Yarın tekrar deneyin ya da ücretsiz hesap açın.",
    err: "Kontrol şu an yapılamadı. Biraz sonra tekrar deneyin.",
    region: "Ücretsiz kontrol bulunduğunuz ülkede şu an kapalı (Avrupa Ekonomik Alanı, İsviçre, Birleşik Krallık). ChatGPT canlı aramalı ölçüm ücretli paketlerde kullanılabilir.",
    sum: function (m, r, n, b) { return "<strong>" + b + "</strong>, " + n + " cevabın <strong>" + m + "</strong> tanesinde anıldı, <strong>" + r + "</strong> tanesinde önerildi."; },
    zero: "Bu sorularda yapay zekâ işletmenizi hiç anmadı. Yeni ya da yerel markalarda bu sık görülür; neyin değiştirilebileceğini düzenli ölçümle görürsünüz.",
    others: "Cevaplarda en çok geçen diğer adlar:", q: "Soru", yes: "Anıldı", rec: "Önerildi", no: "Geçmedi",
    engine: "Gemini, model bilgisi (canlı web araması yok). Tek seferlik kontrol; yapay zekâ cevapları sorudan soruya değişir.",
    next: "Her hafta otomatik ölçmek, rakiplerle karşılaştırmak ve ChatGPT'nin canlı aramasını görmek için", cta: "ücretsiz hesap açın",
  } : {
    busy: "Asking Gemini 5 questions… (20–30 seconds)", input: "Enter your business name and what you do.",
    person_limit: "You've used your 2 free checks this month. Create a free account for regular measurement.",
    daily_limit: "Today's free check capacity is used up. Try again tomorrow or create a free account.",
    err: "The check couldn't run right now. Please try again in a moment.",
    region: "The free check isn't available in your country yet (EEA, Switzerland, UK). ChatGPT live-search measurement is available on paid plans.",
    sum: function (m, r, n, b) { return "<strong>" + b + "</strong> was mentioned in <strong>" + m + "</strong> of " + n + " answers and recommended in <strong>" + r + "</strong>."; },
    zero: "The AI didn't mention your business for these questions. That's common for new or local brands; regular measurement shows what moves the needle.",
    others: "Names that came up most in the answers:", q: "Question", yes: "Mentioned", rec: "Recommended", no: "Not mentioned",
    engine: "Gemini, model knowledge (no live web search). A one-off check; AI answers vary from one request to the next.",
    next: "To measure weekly, compare with competitors and see ChatGPT's live search,", cta: "create a free account",
  };
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var fd = new FormData(form), body = { lang: tr ? "tr" : "en" };
    fd.forEach(function (v, k) { body[k] = String(v).trim(); });
    if ((body.brand || "").length < 2 || (body.category || "").length < 2) { out.innerHTML = '<p class="check-msg">' + T.input + "</p>"; return; }
    var btn = form.querySelector("button"); btn.disabled = true;
    out.innerHTML = '<p class="check-msg">' + T.busy + "</p>";
    fetch("/api/check", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) {
        btn.disabled = false;
        if (!x.ok) { out.innerHTML = '<p class="check-msg">' + (T[x.j && x.j.error] || T.err) + "</p>"; return; }
        var j = x.j, h = '<div class="check-sum"><p>' + T.sum(j.mentioned, j.recommended, j.total, esc(body.brand)) + "</p>";
        if (!j.mentioned) h += "<p>" + T.zero + "</p>";
        if (j.others && j.others.length) h += "<p>" + T.others + " " + j.others.map(esc).join(", ") + "</p>";
        h += '<p class="small">' + T.engine + "</p></div><ol class=\"check-qs\">";
        j.questions.forEach(function (q) {
          var tag = q.recommended ? '<span class="tag rec">' + T.rec + "</span>" : q.mentioned ? '<span class="tag yes">' + T.yes + "</span>" : '<span class="tag no">' + T.no + "</span>";
          h += "<li><p><strong>" + esc(q.q) + "</strong> " + tag + "</p>" + (q.excerpt ? "<details><summary>…</summary><p>" + esc(q.excerpt) + "</p></details>" : "") + "</li>";
        });
        h += '</ol><p>' + T.next + ' <a href="/kayit">' + T.cta + "</a>.</p>";
        out.innerHTML = h;
      })
      .catch(function () { btn.disabled = false; out.innerHTML = '<p class="check-msg">' + T.err + "</p>"; });
  });
})();
