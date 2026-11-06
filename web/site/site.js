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
