import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useApp } from "../lib/app";
import { sb } from "../lib/supabase";
import { t, L, getLang, switchLang } from "../lib/i18n";

export function Shell() {
  const { workspaces, current, select, isAdmin } = useApp();
  const nav = useNavigate();
  const customer = workspaces.filter((w) => w.kind !== "demo_lab");
  const inDemo = current?.kind === "demo_lab";
  const paid = !!current && ["starter", "pro", "agency"].includes(current.plan) && (current.kind === "business" || current.kind === "agency");

  return (
    <div className={`shell ${inDemo ? "shell-demo" : ""}`}>
      <header className="topbar">
        <NavLink to="/panel" className="brandmark" aria-label={L("AI SaaSavran ana panel", "AI SaaSavran dashboard")}>
          <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden><rect width="32" height="32" rx="8" fill="currentColor" /><circle cx="16" cy="16" r="5" fill="var(--paper)" /><circle cx="16" cy="16" r="10" fill="none" stroke="var(--paper)" strokeWidth="2" strokeDasharray="3 3" /></svg>
          <span>SaaSavran</span>
        </NavLink>
        {current && (
          <label className="ws-switch">
            <span className="sr-only">{L("Çalışma alanı", "Workspace")}</span>
            <select value={current.id} onChange={(e) => {
              if (e.target.value === "__new") nav("/calisma-alani/yeni");
              else { select(e.target.value); nav("/panel"); }
            }}>
              {customer.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              {isAdmin && workspaces.filter((w) => w.kind === "demo_lab").map((w) => <option key={w.id} value={w.id}>Demo Lab: {w.name}</option>)}
              <option value="__new">{L("+ Yeni çalışma alanı", "+ New workspace")}</option>
            </select>
          </label>
        )}
        <nav className="topnav" aria-label={L("Ana menü", "Main menu")}>
          <NavLink to="/panel">{t("nav.dashboard")}</NavLink>
          <NavLink to="/durum-ic">{t("nav.status")}</NavLink>
          {isAdmin && <NavLink to="/demo-lab">{t("nav.demo")}</NavLink>}
          {isAdmin && <NavLink to="/yonetim">{L("Müşteriler", "Customers")}</NavLink>}
          <NavLink to="/hesap">{t("nav.account")}</NavLink>
          <NavLink to="/hesap#paket" className="nav-upgrade">{paid ? L("Paketim", "My plan") : L("Paketi yükselt", "Upgrade")}</NavLink>
          <LangSwitch />
        </nav>
      </header>
      {inDemo && <div className="demo-ribbon" role="note">{L("Demo Lab: buradaki her şey simülasyondur, gerçek müşteri verisi değildir.", "Demo Lab: everything here is simulated, not real customer data.")}</div>}
      <main className="content"><Outlet /></main>
      <nav className="bottomnav" aria-label={L("Alt menü", "Bottom menu")}>
        <NavLink to="/panel"><Icon d="M4 11l8-7 8 7v9h-5v-6H9v6H4z" />{t("nav.dashboard")}</NavLink>
        <NavLink to="/durum-ic"><Icon d="M12 3a9 9 0 100 18 9 9 0 000-18zm0 4v6m0 3v1" />{L("Durum", "Status")}</NavLink>
        {isAdmin && <NavLink to="/demo-lab"><Icon d="M9 3h6M10 3v6l-5 9a2 2 0 002 3h10a2 2 0 002-3l-5-9V3" />Demo</NavLink>}
        <NavLink to="/hesap#paket" className="nav-upgrade-b"><Icon d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z" />{paid ? L("Paketim", "Plan") : L("Yükselt", "Upgrade")}</NavLink>
        <NavLink to="/hesap"><Icon d="M12 12a4 4 0 100-8 4 4 0 000 8zm-7 9a7 7 0 0114 0" />{t("nav.account")}</NavLink>
      </nav>
    </div>
  );
}

function Icon({ d }: { d: string }) {
  return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>;
}

export async function signOut() { await sb().auth.signOut(); }

/** Dil seçimi: TR / EN (seçim tarayıcıda saklanır). */
export function LangSwitch() {
  const l = getLang();
  return (
    <button type="button" className="lang-switch" onClick={() => switchLang(l === "en" ? "tr" : "en")} lang={l === "en" ? "tr" : "en"}
      aria-label={l === "en" ? "Türkçeye geç" : "Switch to English"}>
      {l === "en" ? "TR" : "EN"}
    </button>
  );
}
