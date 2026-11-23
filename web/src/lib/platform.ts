// Mağaza uygulaması (Google Play TWA, ileride App Store) içinde mi çalışıyoruz?
// Mağaza kuralları: uygulama içinde dijital abonelik satışı/yönlendirmesi yok (Paddle yalnız web sitesinde).
// Bu yüzden uygulamada paket satın alma, yükseltme düğmeleri ve fiyat yönlendirmeleri gizlenir.
const KEY = "magaza-uygulamasi";
const ANDROID_PACKAGE = "com.aisaasavran.app";

export function detectStoreApp(): boolean {
  try {
    const q = new URLSearchParams(location.search).get("kaynak");
    const fromTwa = document.referrer.startsWith(`android-app://${ANDROID_PACKAGE}`);
    if (q === "android" || q === "ios" || fromTwa) localStorage.setItem(KEY, q === "ios" ? "ios" : "android");
    const on = !!localStorage.getItem(KEY);
    document.documentElement.classList.toggle("magaza", on);
    return on;
  } catch { return false; }
}

export function isStoreApp(): boolean {
  try { return !!localStorage.getItem(KEY); } catch { return false; }
}
