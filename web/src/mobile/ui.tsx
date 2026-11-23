// Mobil uygulamanın ortak parçaları: ikonlar, alt menü, yükleniyor, hata kutusu.
import { useEffect, type ReactNode } from "react";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { NavLink, useLocation, type NavigateFunction } from "react-router-dom";
import { L } from "../lib/i18n";

const P = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
export const Icon = {
  home: <svg width="24" height="24" viewBox="0 0 24 24" {...P} aria-hidden="true"><path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z" /></svg>,
  bars: <svg width="24" height="24" viewBox="0 0 24 24" {...P} aria-hidden="true"><path d="M18 20V10M12 20V4M6 20v-6" /></svg>,
  bell: <svg width="24" height="24" viewBox="0 0 24 24" {...P} aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>,
  user: <svg width="24" height="24" viewBox="0 0 24 24" {...P} aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M5 21a7 7 0 0 1 14 0" /></svg>,
  play: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 4l14 8-14 8z" /></svg>,
  share: <svg width="16" height="16" viewBox="0 0 24 24" {...P} aria-hidden="true"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></svg>,
  back: <svg width="22" height="22" viewBox="0 0 24 24" {...P} aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>,
  chevron: <svg width="18" height="18" viewBox="0 0 24 24" {...P} aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>,
  down: <svg width="16" height="16" viewBox="0 0 24 24" {...P} aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>,
  plus: <svg width="20" height="20" viewBox="0 0 24 24" {...P} aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>,
  bulb: <svg width="24" height="24" viewBox="0 0 24 24" {...P} aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" /></svg>,
  more: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>,
};

/** Gösterilecek ölçüm türü: en son biten ölçümün türü (sitedeki gibi tek kural). Demo markada simülasyon. */
export function shownType(brand: { data_origin: string } | null, runs: { status: string; measurement_type: string }[] | null | undefined): "live_search" | "model_knowledge" | "simulated" {
  if (brand?.data_origin === "simulated") return "simulated";
  const last = (runs ?? []).find((r) => r.status === "done" && r.measurement_type !== "simulated");
  return last?.measurement_type === "live_search" ? "live_search" : "model_knowledge";
}
/** Geri: geçmiş yoksa (bildirimden açıldıysa) ana sayfaya. */
export function goBack(nav: NavigateFunction) {
  if (typeof history !== "undefined" && history.length > 1) nav(-1); else nav("/ana", { replace: true });
}
/** Ücretli paket (sitedeki koşul): Growth Lab ya da ücretsiz olmayan paket. */
export const isPaid = (c: { kind: string; plan: string } | null | undefined) => c?.kind === "growth_lab" || (!!c?.plan && c.plan !== "free");

export function TabBar() {
  const { pathname } = useLocation();
  // Ana sayfadaki kısayollardan açılan ayrıntı ekranlarında "Ana sayfa" seçili kalır
  const fromHome = /^\/(urunler|dogruluk|kaynaklar|trafik)(\/|$)/.test(pathname);
  const cls = ({ isActive }: { isActive: boolean }) => (isActive ? "active" : "");
  return (
    <nav className="tabbar" aria-label={L("Alt menü", "Bottom menu")}>
      <NavLink to="/ana" className={({ isActive }) => (isActive || fromHome ? "active" : "")}>{Icon.home}{L("Ana sayfa", "Home")}</NavLink>
      <NavLink to="/rapor" className={cls}>{Icon.bars}{L("Rapor", "Report")}</NavLink>
      <NavLink to="/oneriler" className={cls}>{Icon.bulb}{L("Öneriler", "Tips")}</NavLink>
      <NavLink to="/bildirimler" className={cls}>{Icon.bell}{L("Bildirimler", "Alerts")}</NavLink>
      <NavLink to="/hesap" className={cls}>{Icon.user}{L("Hesap", "Account")}</NavLink>
    </nav>
  );
}

/** İskelet yükleme: ekranın şeklini gri bloklarla gösterir (ortada dönen simge yerine). */
export function Spinner() {
  return (
    <div className="screen" role="status" aria-label={L("Yükleniyor", "Loading")}>
      <div className="skel" style={{ height: 28, width: "45%" }} />
      <div className="skel" style={{ height: 180, borderRadius: 16 }} />
      <div className="skel" style={{ height: 20, width: "60%" }} />
      <div className="skel" style={{ height: 120, borderRadius: 16 }} />
    </div>
  );
}

/** Alt sayfa (bottom sheet): seçimler ve onaylar için; tarayıcının alert/confirm pencereleri kullanılmaz. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sheet-back" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <span className="grip" aria-hidden="true" />
        {title && <h2 className="section-title" style={{ margin: 0 }}>{title}</h2>}
        {children}
      </div>
    </div>
  );
}

/** Onay alt sayfası */
export function Confirm({ open, title, text, action, danger, onYes, onNo }: { open: boolean; title: string; text?: string; action: string; danger?: boolean; onYes: () => void; onNo: () => void }) {
  return (
    <Sheet open={open} onClose={onNo} title={title}>
      {text && <p className="muted" style={{ margin: 0 }}>{text}</p>}
      <button className={`btn ${danger ? "btn-danger-solid" : "btn-primary"}`} onClick={onYes}>{action}</button>
      <button className="btn btn-ghost" onClick={onNo}>{L("Vazgeç", "Cancel")}</button>
    </Sheet>
  );
}

/** Dokunma titreşimi (telefonda); tarayıcıda sessizce geçer */
export const haptic = {
  tap: () => { Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined); },
  done: () => { Haptics.notification({ type: NotificationType.Success }).catch(() => undefined); },
};

export function Err({ msg }: { msg?: string | null }) {
  return msg ? <p className="error" role="alert">{msg}</p> : null;
}

export function Head({ title, back, right }: { title: string; back?: () => void; right?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {back && <button className="iconbtn" aria-label={L("Geri", "Back")} onClick={back}>{Icon.back}</button>}
      <h1 style={{ fontSize: 24 }}>{title}</h1>
      {right && <div style={{ marginLeft: "auto" }}>{right}</div>}
    </div>
  );
}

export const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? L("Günaydın", "Good morning") : h < 18 ? L("İyi günler", "Good afternoon") : L("İyi akşamlar", "Good evening");
};

// Türkçe sayı ekleri (sayının okunuşunun son kelimesine göre): %40'tan, %32'ye
const ABL_U = ["dan", "den", "den", "ten", "ten", "ten", "dan", "den", "den", "dan"];
const ABL_T = ["", "dan", "den", "dan", "tan", "den", "tan", "ten", "den", "dan"];
const DAT_U = ["a", "e", "ye", "e", "e", "e", "ya", "ye", "e", "a"];
const DAT_T = ["", "a", "ye", "a", "a", "ye", "a", "e", "e", "a"];
const pick = (n: number, u: string[], t: string[], hundred: string, zero: string) =>
  n === 0 ? zero : n % 10 ? u[n % 10] : n % 100 ? t[(n % 100) / 10] : hundred;
export const trAbl = (n: number) => `${n}'${pick(n, ABL_U, ABL_T, "den", "dan")}`;
export const trDat = (n: number) => `${n}'${pick(n, DAT_U, DAT_T, "e", "a")}`;
