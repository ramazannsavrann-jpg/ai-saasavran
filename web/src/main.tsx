import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "@fontsource/instrument-sans/400.css";
import "@fontsource/instrument-sans/500.css";
import "@fontsource/instrument-sans/600.css";
import "@fontsource/bricolage-grotesque/600.css";
import "@fontsource/bricolage-grotesque/700.css";
import "./styles.css";
import { initSupabase } from "./lib/supabase";
import { AppProvider, useApp } from "./lib/app";
import { Shell } from "./components/Shell";
import { Loading } from "./components/ui";
import { Forgot, Login, Signup } from "./pages/Auth";
import { Dashboard, NewBrand, NewWorkspace } from "./pages/Dashboard";
import { BrandPage } from "./pages/Brand";
import { Account, DemoLab, ProductStatus } from "./pages/Misc";
import { Privacy, Terms } from "./pages/Legal";

function Private({ children }: { children: React.ReactNode }) {
  const { session, loading } = useApp();
  if (loading) return <Loading />;
  if (!session) return <Navigate to="/giris" replace />;
  return <>{children}</>;
}
function PublicOnly({ children }: { children: React.ReactNode }) {
  const { session, loading } = useApp();
  if (loading) return <Loading />;
  if (session) return <Navigate to="/panel" replace />;
  return <>{children}</>;
}
function StatusRoute() {
  const { session, loading } = useApp();
  if (loading) return <Loading />;
  return session ? <Navigate to="/durum-ic" replace /> : <main className="content"><ProductStatus /></main>;
}

function App() {
  return (
    <Routes>
      <Route path="/giris" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/kayit" element={<PublicOnly><Signup /></PublicOnly>} />
      <Route path="/sifre" element={<PublicOnly><Forgot /></PublicOnly>} />
      <Route path="/durum" element={<StatusRoute />} />
      <Route path="/gizlilik" element={<Privacy />} />
      <Route path="/kosullar" element={<Terms />} />
      <Route element={<Private><Shell /></Private>}>
        <Route path="/panel" element={<Dashboard />} />
        <Route path="/durum-ic" element={<ProductStatus />} />
        <Route path="/calisma-alani/yeni" element={<NewWorkspace />} />
        <Route path="/marka/yeni" element={<NewBrand />} />
        <Route path="/marka/:id" element={<BrandPage />} />
        <Route path="/hesap" element={<Account />} />
        <Route path="/demo-lab" element={<DemoLab />} />
      </Route>
      <Route path="*" element={<Navigate to="/panel" replace />} />
    </Routes>
  );
}

function NotConfigured() {
  return (
    <main className="content stack narrow">
      <h1>Uygulama henüz yapılandırılmadı</h1>
      <p>Sunucu bağlantı bilgileri (config.json) eksik. Bu, kurulumun tamamlanmadığı anlamına gelir.</p>
    </main>
  );
}

const root = createRoot(document.getElementById("root")!);
initSupabase().then(
  () => root.render(<StrictMode><BrowserRouter><AppProvider><App /></AppProvider></BrowserRouter></StrictMode>),
  () => root.render(<NotConfigured />),
);
