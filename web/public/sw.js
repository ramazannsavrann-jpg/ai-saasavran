// AI SaaSavran service worker (PWA + Android uygulaması).
// Bilerek önbellek KULLANMAZ: her yayın anında görünsün, eski dosya takılı kalmasın.
// Görevi: ağ yokken sayfa açılışında kısa bir "bağlantı yok" ekranı göstermek; ileride bildirimleri almak.
const OFFLINE = `<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bağlantı yok · AI SaaSavran</title><body style="font-family:system-ui,sans-serif;background:#F4F7F5;color:#13201C;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px;text-align:center">
<div><h1 style="font-size:22px">İnternet bağlantısı yok</h1><p>Bağlantı gelince sayfa yeniden yüklenecek.</p><p style="color:#5b6b66">No internet connection. The page will reload when you are back online.</p>
<button onclick="location.reload()" style="background:#0F6E5C;color:#fff;border:0;border-radius:10px;padding:12px 20px;font-size:16px">Yeniden dene / Retry</button></div>
<script>addEventListener("online",()=>location.reload())</script></body></html>`;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (e) => {
  if (e.request.mode !== "navigate") return; // yalnız sayfa açılışları; API ve dosyalar tarayıcıya bırakılır
  const u = new URL(e.request.url);
  if (u.origin !== location.origin || /^\/(auth|api|rest)\//.test(u.pathname)) return; // giriş/ödeme yönlendirmelerine dokunma
  e.respondWith(fetch(e.request).catch(() => new Response(OFFLINE, { headers: { "content-type": "text/html; charset=utf-8" } })));
});

self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || "AI SaaSavran", {
    body: d.body || "", icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", data: { url: d.url || "/panel" }, tag: d.tag,
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/panel";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) if ("focus" in c) { c.navigate(url); return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
