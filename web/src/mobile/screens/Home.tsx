// Ana sayfa: seçili markanın önerilme oranı, en güçlü rakiple kıyas, bu haftanın işleri ve "Yeni ölçüm başlat".
// Rakamlar yalnız gerçek ölçümlerden gelir; ölçüm yoksa açıkça "henüz ölçüm yok" denir.
import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useApp, useLoad } from "../../lib/app";
import { api, type Brand, type MeasurementType } from "../../lib/data";
import { friendlyError } from "../../lib/supabase";
import { competitorsInRun, formatDateTime, lowSample, series } from "../../lib/report";
import { L } from "../../lib/i18n";
import { SITE_ORIGIN } from "../../lib/env";
import { Err, Icon, Spinner, greeting } from "../ui";

const KEY = "mobil-marka";
export function useSelectedBrand() {
  const { current } = useApp();
  const brands = useLoad(() => (current ? api.brands(current.id) : Promise.resolve([] as Brand[])), [current?.id]);
  const own = (brands.data ?? []).filter((b) => !b.is_competitor);
  const [id, setId] = useState<string | null>(() => { try { return localStorage.getItem(KEY); } catch { return null; } });
  const brand = own.find((b) => b.id === id) ?? own[0] ?? null;
  const choose = (v: string) => { setId(v); try { localStorage.setItem(KEY, v); } catch { /* yok say */ } };
  return { brands: own, brand, choose, loading: brands.loading, error: brands.error };
}

export async function shareReport(brand: Brand) {
  const token = await api.createReportShare(brand.id, 30);
  const url = `${SITE_ORIGIN}/rapor/${token}`;
  const text = L(`${brand.name} yapay zekâ görünürlük raporu`, `${brand.name} AI visibility report`);
  if (navigator.share) await navigator.share({ title: text, text, url }).catch(() => undefined);
  else { await navigator.clipboard?.writeText(url).catch(() => undefined); alert(L("Rapor bağlantısı kopyalandı.", "Report link copied.")); }
}

export function Home() {
  const { session, current, loading } = useApp();
  const nav = useNavigate();
  const sel = useSelectedBrand();
  const b = sel.brand;
  const runs = useLoad(() => (b ? api.runs(b.id) : Promise.resolve([])), [b?.id]);
  const runList = runs.data ?? [];
  const type: MeasurementType = runList.some((r) => r.measurement_type === "live_search" && r.status === "done") ? "live_search" : "model_knowledge";
  const vis = useLoad(() => (b ? api.visibility(b.id, type) : Promise.resolve([])), [b?.id, type, runList.length]);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const pending = runList.find((r) => r.status === "queued" || r.status === "running");
  // Ölçüm sürerken sonuç gelince ekran kendini yeniler
  useEffect(() => {
    if (!pending) return;
    const t = setInterval(() => runs.reload(), 20_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending?.id]);

  if (loading || sel.loading) return <Spinner />;
  if (!current || (!sel.loading && !b)) return <Navigate to="/kurulum" replace />;
  if (!b) return <Spinner />;

  const pts = series(vis.data ?? []);
  const last = pts[pts.length - 1], prev = pts[pts.length - 2];
  const rate = last ? Math.round(last.recommend.value * 100) : null;
  const delta = last && prev ? Math.round((last.recommend.value - prev.recommend.value) * 100) : null;
  const top = last ? competitorsInRun(vis.data ?? [], last.runId).find((c) => !c.isTarget) : undefined;
  const name = (session?.user.email ?? "").split("@")[0];
  const actions = (b.top_actions ?? []).slice(0, 3);

  async function start() {
    setBusy("run"); setErr(null);
    try { await api.requestRun(b!.id, !!current?.paid_live_allowed); runs.reload(); }
    catch (e) { setErr(friendlyError(e)); } finally { setBusy(null); }
  }
  async function share() {
    setBusy("share"); setErr(null);
    try { await shareReport(b!); } catch (e) { setErr(friendlyError(e)); } finally { setBusy(null); }
  }

  return (
    <div className="screen">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          <span className="muted" style={{ fontSize: 14 }}>{greeting()},</span>
          <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 24, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
        </div>
        <button className="iconbtn" aria-label={L("Bildirimler", "Alerts")} onClick={() => nav("/bildirimler")}>{Icon.bell}</button>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        {sel.brands.length > 1 ? (
          <select className="brand-pill" aria-label={L("Marka seç", "Choose brand")} value={b.id} onChange={(e) => sel.choose(e.target.value)}>
            {sel.brands.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        ) : <span className="brand-pill" style={{ display: "flex", alignItems: "center" }}>{b.name}</span>}
        <button className="iconbtn" aria-label={L("Marka ekle", "Add brand")} onClick={() => nav("/marka-ekle")}>{Icon.plus}</button>
      </div>

      <section className="hero" aria-label={L("Önerilme oranı", "Recommendation rate")}>
        {rate === null ? (
          <>
            <span className="sub">{L("Henüz ölçüm yok", "No measurement yet")}</span>
            <p style={{ margin: 0, fontSize: 17, lineHeight: 1.4 }}>{L("İlk ölçümü başlatın; yapay zekâların markanızı önerip önermediğini görün. Sonuç hazır olunca bu ekran güncellenir.", "Start the first measurement to see whether AIs recommend your brand. This screen updates when results are ready.")}</p>
          </>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span className="sub">{L("Yapay zekâ cevaplarında önerilme oranı", "Recommendation rate in AI answers")}</span>
                <span className="big">%{rate}</span>
              </div>
              {delta !== null && (
                <div className="pill">
                  <span style={{ color: delta < 0 ? "#FFC48A" : "#BFF5DD", fontWeight: 700, fontSize: 18 }}>{delta < 0 ? "▼" : delta > 0 ? "▲" : "="} {Math.abs(delta)}</span>
                  <span style={{ fontSize: 12, color: "#D3E7E0" }}>{L("önceki ölçüme göre", "vs previous")}</span>
                </div>
              )}
            </div>
            {top && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#D3E7E0" }}>
                  <span>{L("Siz", "You")}</span><span>{L("En güçlü rakip", "Top competitor")}: {top.name} · %{Math.round(top.recommend.value * 100)}</span>
                </div>
                <div className="bar"><i style={{ width: `${rate}%` }} /><b style={{ left: `${Math.min(98, Math.round(top.recommend.value * 100))}%` }} /></div>
              </div>
            )}
            {last && lowSample(last.recommend) && <span style={{ fontSize: 12, color: "#D3E7E0" }}>{L("Az sayıda cevaba dayanıyor; daha fazla soru ve ölçümle netleşir.", "Based on few answers; becomes clearer with more questions and measurements.")}</span>}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="act" onClick={() => nav("/rakipler")}>{L("Rakipleri gör", "See competitors")}</button>
              <button className="act" onClick={share} disabled={busy === "share"}>{Icon.share}{L("Paylaş", "Share")}</button>
            </div>
          </>
        )}
      </section>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h2 style={{ fontSize: 19 }}>{L("Bu hafta yapılacaklar", "To do this week")}</h2>
      </div>
      {actions.length ? (
        <div className="list">
          {actions.map((a, i) => (
            <div key={i} className="row" style={{ alignItems: "flex-start", flexDirection: "column", gap: 3 }}>
              <span style={{ fontWeight: 600 }}>{a.title}</span>
              <span className="muted small">{a.action}</span>
            </div>
          ))}
        </div>
      ) : <p className="muted" style={{ margin: 0 }}>{L("İlk ölçümden sonra size özel öneriler burada görünür.", "Tailored suggestions appear here after the first measurement.")}</p>}

      <Err msg={err} />
      {pending ? (
        <p className="ok" role="status" style={{ marginTop: "auto" }}>{pending.status === "queued" ? L("Ölçüm sırada", "Measurement queued") : L("Ölçüm çalışıyor", "Measurement running")} · {formatDateTime(pending.created_at)}. {L("Sonuç gelince bu ekran güncellenir.", "This screen updates when results arrive.")}</p>
      ) : (
        <button className="btn btn-primary" style={{ marginTop: "auto" }} onClick={start} disabled={busy === "run"}>{Icon.play}{busy === "run" ? L("Başlatılıyor…", "Starting…") : L("Yeni ölçüm başlat", "Start new measurement")}</button>
      )}
    </div>
  );
}
