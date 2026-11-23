// Mobil uygulamanın ortak parçaları: ikonlar, alt menü, yükleniyor, hata kutusu.
import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
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
  logo: <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="5" fill="#F4F7F5" /><circle cx="16" cy="16" r="10" fill="none" stroke="#F4F7F5" strokeWidth="2" strokeDasharray="3 3" /></svg>,
};

export function TabBar() {
  const cls = ({ isActive }: { isActive: boolean }) => (isActive ? "active" : "");
  return (
    <nav className="tabbar" aria-label={L("Alt menü", "Bottom menu")}>
      <NavLink to="/ana" className={cls}>{Icon.home}{L("Ana sayfa", "Home")}</NavLink>
      <NavLink to="/rakipler" className={cls}>{Icon.bars}{L("Rakipler", "Competitors")}</NavLink>
      <NavLink to="/bildirimler" className={cls}>{Icon.bell}{L("Bildirimler", "Alerts")}</NavLink>
      <NavLink to="/hesap" className={cls}>{Icon.user}{L("Hesap", "Account")}</NavLink>
    </nav>
  );
}

export function Spinner() {
  return <div className="center" role="status" aria-label={L("Yükleniyor", "Loading")}><div className="spinner" /></div>;
}

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
