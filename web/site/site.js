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
    bot: "Lütfen \"robot değilim\" doğrulamasını tamamlayıp tekrar deneyin.",
    region: "Ücretsiz kontrol bulunduğunuz ülkede şu an kapalı (Avrupa Ekonomik Alanı, İsviçre, Birleşik Krallık). ChatGPT canlı aramalı ölçüm ücretli paketlerde kullanılabilir.",
    sum: function (m, r, n, b) { return "<strong>" + b + "</strong>, " + n + " cevabın <strong>" + m + "</strong> tanesinde anıldı, <strong>" + r + "</strong> tanesinde önerildi."; },
    zero: "Bu sorularda yapay zekâ işletmenizi hiç anmadı. Yeni ya da yerel markalarda bu sık görülür; neyin değiştirilebileceğini düzenli ölçümle görürsünüz.",
    others: "Cevaplarda en çok geçen diğer adlar:", q: "Soru", yes: "Anıldı", rec: "Önerildi", no: "Geçmedi", na: "Cevap alınamadı", miss: function (k) { return k + " soruya yapay zekâdan cevap alınamadı; bunlar sonuca katılmadı. Biraz sonra tekrar deneyebilirsiniz."; },
    engine: "Gemini, model bilgisi (canlı web araması yok). Tek seferlik kontrol; yapay zekâ cevapları sorudan soruya değişir.",
    next: "Her hafta otomatik ölçmek, rakiplerle karşılaştırmak ve ChatGPT'nin canlı aramasını görmek için", cta: "ücretsiz hesap açın",
  } : {
    busy: "Asking Gemini 5 questions… (20–30 seconds)", input: "Enter your business name and what you do.",
    person_limit: "You've used your 2 free checks this month. Create a free account for regular measurement.",
    daily_limit: "Today's free check capacity is used up. Try again tomorrow or create a free account.",
    err: "The check couldn't run right now. Please try again in a moment.",
    bot: "Please complete the \"I'm not a robot\" check and try again.",
    region: "The free check isn't available in your country yet (EEA, Switzerland, UK). ChatGPT live-search measurement is available on paid plans.",
    sum: function (m, r, n, b) { return "<strong>" + b + "</strong> was mentioned in <strong>" + m + "</strong> of " + n + " answers and recommended in <strong>" + r + "</strong>."; },
    zero: "The AI didn't mention your business for these questions. That's common for new or local brands; regular measurement shows what moves the needle.",
    others: "Names that came up most in the answers:", q: "Question", yes: "Mentioned", rec: "Recommended", no: "Not mentioned", na: "No answer", miss: function (k) { return "No answer came back for " + k + " question(s); they are not counted. You can try again a little later."; },
    engine: "Gemini, model knowledge (no live web search). A one-off check; AI answers vary from one request to the next.",
    next: "To measure weekly, compare with competitors and see ChatGPT's live search,", cta: "create a free account",
  };
  // Bot koruması (Cloudflare Turnstile): site anahtarı config.json'da varsa görünür; yoksa form eskisi gibi çalışır.
  var siteKey = "", widgetId = null;
  fetch("/config.json").then(function (r) { return r.json(); }).then(function (c) {
    if (!c || !c.turnstileSiteKey) return;
    siteKey = c.turnstileSiteKey;
    var box = document.createElement("div"); box.className = "check-human";
    form.insertBefore(box, form.querySelector("button"));
    window.aisvTurnstile = function () { widgetId = window.turnstile.render(box, { sitekey: siteKey, language: tr ? "tr" : "en", theme: "auto" }); };
    var sc = document.createElement("script"); sc.async = true; sc.defer = true;
    sc.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=aisvTurnstile";
    document.head.appendChild(sc);
  }).catch(function () { /* ayar okunamadıysa koruma sunucuda yine geçerli */ });
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var fd = new FormData(form), body = { lang: tr ? "tr" : "en" };
    fd.forEach(function (v, k) { body[k] = String(v).trim(); });
    if ((body.brand || "").length < 2 || (body.category || "").length < 2) { out.innerHTML = '<p class="check-msg">' + T.input + "</p>"; return; }
    if (siteKey) {
      var tok = window.turnstile && widgetId !== null ? window.turnstile.getResponse(widgetId) : "";
      if (!tok) { out.innerHTML = '<p class="check-msg">' + T.bot + "</p>"; return; }
      body.cf_token = tok;
    }
    var btn = form.querySelector("button"); btn.disabled = true;
    out.innerHTML = '<p class="check-msg">' + T.busy + "</p>";
    fetch("/api/check", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { if (siteKey && window.turnstile && widgetId !== null) window.turnstile.reset(widgetId); return r; })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) {
        btn.disabled = false;
        if (!x.ok) { out.innerHTML = '<p class="check-msg">' + (T[x.j && x.j.error] || T.err) + "</p>"; return; }
        var j = x.j, h = '<div class="check-sum"><p>' + T.sum(j.mentioned, j.recommended, j.total, esc(body.brand)) + "</p>";
        var miss = j.questions.filter(function (q) { return !q.ok; }).length;
        if (miss) h += "<p>" + T.miss(miss) + "</p>";
        if (!j.mentioned && j.total) h += "<p>" + T.zero + "</p>";
        if (j.others && j.others.length) h += "<p>" + T.others + " " + j.others.map(esc).join(", ") + "</p>";
        h += '<p class="small">' + T.engine + "</p></div><ol class=\"check-qs\">";
        j.questions.forEach(function (q) {
          var tag = !q.ok ? '<span class="tag na">' + T.na + "</span>" : q.recommended ? '<span class="tag rec">' + T.rec + "</span>" : q.mentioned ? '<span class="tag yes">' + T.yes + "</span>" : '<span class="tag no">' + T.no + "</span>";
          h += "<li><p><strong>" + esc(q.q) + "</strong> " + tag + "</p>" + (q.excerpt ? "<details><summary>…</summary><p>" + esc(q.excerpt) + "</p></details>" : "") + "</li>";
        });
        h += '</ol><p>' + T.next + ' <a href="/kayit">' + T.cta + "</a>.</p>";
        out.innerHTML = h;
      })
      .catch(function () { btn.disabled = false; out.innerHTML = '<p class="check-msg">' + T.err + "</p>"; });
  });
})();

// Bugünün ölçümü: her gün Growth Lab'in gerçek bir sonucu (marka adları gizli). Gelmezse sabit örnek kalır.
(function () {
  var box = document.getElementById("daily");
  if (!box || !window.fetch) return;
  var en = box.getAttribute("data-lang") === "en";
  var T = en ? {
    h: "Today's measurement", sub: "A different real question every day from our own lab. Brand names are hidden; the numbers are as measured.",
    q: "Question", trNote: " (asked in Turkish)", eng: { openai: "ChatGPT", claude: "Claude", gemini: "Gemini" },
    live: "live web search", know: "no web search (model knowledge)", answers: "answers", res: "What we measured",
    rec: function (b, n) { return "recommended in " + b.recommended + " of " + n + (b.first ? ", first pick " + b.first + "×" : ""); },
    brand: "Brand ", src: function (k) { return "The AI read " + k + " different websites."; },
    note: "Tomorrow there will be another question. In your report every question is asked again each week and shown with confidence ranges.",
    c1: "Free check, no signup", c1h: "/check/", c2: "Measure your own brand"
  } : {
    h: "Bugünün ölçümü", sub: "Her gün kendi laboratuvarımızdan başka bir gerçek soru. Marka adlarını gizledik; sayılar ölçüldüğü gibi.",
    q: "Soru", trNote: "", eng: { openai: "ChatGPT", claude: "Claude", gemini: "Gemini" },
    live: "canlı web araması", know: "web araması yok (model bilgisi)", answers: "cevap", res: "Ölçtüğümüz",
    rec: function (b, n) { return n + " cevabın " + b.recommended + " tanesinde önerildi" + (b.first ? ", " + b.first + " kez ilk sırada" : ""); },
    brand: "Marka ", src: function (k) { return "Yapay zekâ " + k + " farklı siteye baktı."; },
    note: "Yarın başka bir soru olacak. Raporunuzda her soru her hafta yeniden sorulur ve güven aralığıyla gösterilir.",
    c1: "Üye olmadan ücretsiz kontrol", c1h: "/tr/kontrol/", c2: "Kendi markanızı ölçün"
  };
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  fetch("/api/example").then(function (r) { return r.ok ? r.json() : null; }).then(function (x) {
    if (!x || !x.brands || x.brands.length < 2) return;
    var d = new Date(x.at);
    var date = isNaN(d) ? "" : d.toLocaleDateString(en ? "en-GB" : "tr-TR", { day: "numeric", month: "long", year: "numeric" });
    var h = el("h2", null, T.h); h.id = "daily-h"; box.appendChild(h);
    box.appendChild(el("p", "muted", T.sub));
    var ol = el("ol", "demo-steps");
    var li1 = el("li"); li1.appendChild(el("h3", null, T.q)); li1.appendChild(el("p", "demo-q", x.question));
    li1.appendChild(el("p", "small", (T.eng[x.provider] || x.provider) + ", " + (x.measurement_type === "live_search" ? T.live : T.know) + " · " + date + " · " + x.answers + " " + T.answers + T.trNote));
    ol.appendChild(li1);
    var li2 = el("li"); li2.appendChild(el("h3", null, T.res + " (" + x.answers + " " + T.answers + ")"));
    var ul = el("ul", "demo-bars");
    x.brands.forEach(function (b) {
      var row = el("li");
      row.appendChild(el("span", "nm", T.brand + b.label));
      var tr = el("span", "track"); var f = el("span", "fill"); f.style.width = Math.round(100 * b.recommended / Math.max(1, x.answers)) + "%"; tr.appendChild(f); row.appendChild(tr);
      row.appendChild(el("span", "k", b.recommended + "/" + x.answers));
      row.appendChild(el("span", "d", T.rec(b, x.answers)));
      ul.appendChild(row);
    });
    li2.appendChild(ul);
    if (x.sources > 0) li2.appendChild(el("p", "small", T.src(x.sources)));
    li2.appendChild(el("p", "small", T.note));
    ol.appendChild(li2);
    box.appendChild(ol);
    var act = el("p", "actions");
    var a1 = el("a", "btn", T.c1); a1.href = T.c1h; act.appendChild(a1);
    var a2 = el("a", "btn ghost", T.c2); a2.href = "/kayit"; act.appendChild(a2);
    box.appendChild(act);
    box.hidden = false;
    var stat = box.nextElementSibling;
    if (stat && stat.classList.contains("demo")) stat.hidden = true;
  }).catch(function () { /* sabit örnek kalır */ });
})();

