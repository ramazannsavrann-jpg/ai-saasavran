// Android geri tuşu: önce açık alt pencereyi kapatır; sekme kökündeyse ana sayfaya, ana sayfadaysa uygulamayı arka plana alır.
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import type { NavigateFunction } from "react-router-dom";

const ROOTS = ["/ana", "/rapor", "/oneriler", "/bildirimler", "/hesap"];
const START = ["/", "/giris", "/kayit"];

export function initBackButton(nav: NavigateFunction): (() => void) | undefined {
  if (!Capacitor.isNativePlatform()) return undefined;
  const h = App.addListener("backButton", ({ canGoBack }) => {
    if (document.querySelector(".sheet-back")) {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      return;
    }
    const path = location.hash.replace(/^#/, "").split("?")[0] || "/";
    // İlk kurulum ekranından geri gidilecek yer yok (giriş sayfası tekrar kuruluma yönlendirir): uygulama arka plana
    if (path === "/ana" || path === "/" || path === "/kurulum") { void App.minimizeApp(); return; }
    if (ROOTS.includes(path)) { nav("/ana"); return; }
    if (START.includes(path)) { nav("/"); return; }
    if (canGoBack) history.back(); else nav("/ana", { replace: true });
  });
  return () => { void h.then((x) => x.remove()); };
}
