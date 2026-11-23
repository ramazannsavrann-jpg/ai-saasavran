// AI SaaSavran mobil uygulaması (Android/iOS, Capacitor). Ekranlar telefonun içinde çalışır;
// veri katmanı sitedekiyle aynıdır (web/src/lib): aynı hesap, aynı markalar, aynı ölçümler.
import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Navigate, Outlet, Route, Routes, useNavigate } from "react-router-dom";
import "@fontsource/instrument-sans/400.css";
import "@fontsource/instrument-sans/500.css";
import "@fontsource/instrument-sans/600.css";
import "@fontsource/bricolage-grotesque/600.css";
import "@fontsource/bricolage-grotesque/700.css";
import "./styles.css";
import { initSupabase } from "../lib/supabase";
import { AppProvider, useApp } from "../lib/app";
import { L } from "../lib/i18n";
import { Spinner, TabBar } from "./ui";
import { Advice } from "./screens/Advice";
import { Forgot, Login, Signup, Welcome } from "./screens/Auth";
import { BrandForm, Setup } from "./screens/Setup";
import { Home } from "./screens/Home";
import { Report } from "./screens/Report";
import { Activity } from "./screens/Activity";
import { Account } from "./screens/Account";

function Private({ children }: { children: ReactNode }) {
  const { session, loading } = useApp();
  if (loading) return <Spinner />;
  return session ? <>{children}</> : <Navigate to="/" replace />;
}
function PublicOnly({ children }: { children: ReactNode }) {
  const { session, loading } = useApp();
  if (loading) return <Spinner />;
  return session ? <Navigate to="/ana" replace /> : <>{children}</>;
}
function Tabs() {
  return <div className="app"><Outlet /><TabBar /></div>;
}
function AddBrand() {
  const nav = useNavigate();
  return <BrandForm title={L("Marka ekleyin", "Add a brand")} onDone={(id) => { try { localStorage.setItem("mobil-marka", id); } catch { /* yok say */ } nav("/ana", { replace: true }); }} />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicOnly><div className="app"><Welcome /></div></PublicOnly>} />
      <Route path="/giris" element={<PublicOnly><div className="app"><Login /></div></PublicOnly>} />
      <Route path="/kayit" element={<PublicOnly><div className="app"><Signup /></div></PublicOnly>} />
      <Route path="/sifre" element={<div className="app"><Forgot /></div>} />
      <Route path="/kurulum" element={<Private><div className="app"><Setup /></div></Private>} />
      <Route path="/marka-ekle" element={<Private><div className="app"><AddBrand /></div></Private>} />
      <Route element={<Private><Tabs /></Private>}>
        <Route path="/ana" element={<Home />} />
        <Route path="/rapor" element={<Report />} />
        <Route path="/rakipler" element={<Navigate to="/rapor?b=rakipler" replace />} />
        <Route path="/oneriler" element={<Advice />} />
        <Route path="/bildirimler" element={<Activity />} />
        <Route path="/hesap" element={<Account />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function Offline({ retry }: { retry: () => void }) {
  return (
    <div className="app"><div className="screen" style={{ justifyContent: "center", textAlign: "center" }}>
      <h1 style={{ fontSize: 24 }}>{L("Bağlantı kurulamadı", "Couldn't connect")}</h1>
      <p className="muted">{L("İnternet bağlantınızı kontrol edip tekrar deneyin.", "Check your internet connection and try again.")}</p>
      <button className="btn btn-primary" onClick={retry}>{L("Tekrar dene", "Try again")}</button>
    </div></div>
  );
}

const root = createRoot(document.getElementById("root")!);
function boot() {
  root.render(<Spinner />);
  initSupabase().then(
    () => root.render(<StrictMode><HashRouter><AppProvider><App /></AppProvider></HashRouter></StrictMode>),
    () => root.render(<Offline retry={boot} />),
  );
}
boot();
