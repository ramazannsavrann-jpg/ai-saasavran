// Telefon bildirimleri: izin, cihaz kaydı, bildirime dokununca ilgili ekrana gitme.
// Yalnız Firebase ayarı (google-services.json) eklenmiş derlemede açılır: VITE_PUSH=1. Aksi halde hiçbir şey yapılmaz.
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { sb } from "../lib/supabase";
import { getLang } from "../lib/i18n";

export const PUSH_AVAILABLE = import.meta.env.VITE_PUSH === "1" && Capacitor.isNativePlatform();
const KEY = "mobil-push-token";

export type PushState = "unavailable" | "on" | "off" | "denied";

export async function pushState(): Promise<PushState> {
  if (!PUSH_AVAILABLE) return "unavailable";
  const p = await PushNotifications.checkPermissions();
  if (p.receive === "denied") return "denied";
  let tok: string | null = null;
  try { tok = localStorage.getItem(KEY); } catch { /* yok say */ }
  return p.receive === "granted" && tok ? "on" : "off";
}

/** İzin ister ve cihazı kaydeder. true: bildirimler açık. */
export async function enablePush(): Promise<boolean> {
  if (!PUSH_AVAILABLE) return false;
  let p = await PushNotifications.checkPermissions();
  if (p.receive === "prompt" || p.receive === "prompt-with-rationale") p = await PushNotifications.requestPermissions();
  if (p.receive !== "granted") return false;
  await PushNotifications.createChannel({ id: "olcumler", name: getLang() === "en" ? "Measurements" : "Ölçümler", importance: 3 }).catch(() => undefined);
  const token = await new Promise<string>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("push_timeout")), 15_000);
    void PushNotifications.addListener("registration", (x) => { clearTimeout(t); resolve(x.value); });
    void PushNotifications.addListener("registrationError", (e) => { clearTimeout(t); reject(new Error(e.error)); });
    void PushNotifications.register();
  });
  const { error } = await sb().rpc("register_push_device", { p_token: token, p_platform: Capacitor.getPlatform() === "ios" ? "ios" : "android", p_lang: getLang() });
  if (error) throw new Error(error.message);
  try { localStorage.setItem(KEY, token); } catch { /* yok say */ }
  return true;
}

export async function disablePush(): Promise<void> {
  let tok: string | null = null;
  try { tok = localStorage.getItem(KEY); localStorage.removeItem(KEY); } catch { /* yok say */ }
  if (tok) await sb().rpc("unregister_push_device", { p_token: tok });
  if (PUSH_AVAILABLE) await PushNotifications.unregister().catch(() => undefined);
}

/** Uygulama açılışında: izin önceden verildiyse anahtarı tazeler; bildirime dokununca yönlendirir. */
export function initPush(go: (path: string) => void) {
  if (!PUSH_AVAILABLE) return;
  void PushNotifications.addListener("pushNotificationActionPerformed", (a) => {
    const path = String((a.notification.data as { path?: string } | undefined)?.path ?? "/ana");
    go(path.startsWith("/") ? path : "/ana");
  });
  void pushState().then((s) => { if (s === "on") void enablePush().catch(() => undefined); });
}
