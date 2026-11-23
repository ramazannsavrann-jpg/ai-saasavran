// Ana sayfa: seçili markanın önerilme oranı (yapay zekâlara göre), önceki ölçüme göre değişim, bu haftanın işleri ve "Şimdi ölç".
// Rakip bilgisi yok (23 Kasım kararı). Az cevaba dayanan sonuç "ön sonuç" olarak küçük gösterilir; uydurma rakam yok.
import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useApp, useLoad } from "../../lib/app";
import { api, type Brand, type MeasurementType } from "../../lib/data";
import { friendlyError } from "../../lib/supabase";
import { formatDateTime, numLoc, providerLabel, series } from "../../lib/report";
import { L } from "../../lib/i18n";
import { SITE_ORIGIN } from "../../lib/env";
import { Err, Icon, Sheet, Spinner, greeting, haptic } from "../ui";

const KEY = "mobil-marka";
const PRELIM = 20; // bundan az cevap: ön sonuç
/** Kendi özelliklerine giden kısayollar (ana sayfa ve rapor özetinde). */
export function MoreLinks() {
  const nav = useNavigate();
  const items: [string, string, string, string, string][] = [
    ["/urunler", "Ürünler", "Products", "Ürünleriniz öneriliyor mu, doğru anlatılıyor mu", "Are your products recommended and described correctly"],
    ["/dogruluk", "Bilgi doğruluğu", "Accuracy", "Yapay zekâlar hakkınızda doğru mu söylüyor", "Are the AIs saying correct things about you"],
    ["/kaynaklar", "Kaynaklar", "Sources", "Yapay zekâların baktığı siteler", "The sites the AIs rely on"],
    ["/trafik", "Ziyaretçi ve botlar", "Visitors and bots", "Yapay zekâdan sitenize gelenler", "Who comes to your site from AI"],
    ["/marka-duzenle", "İşletme bilgileri", "Business details", "Ad, web sitesi, doğru bilgiler", "Name, website, facts"],
  ];
  return (
    <div className="list">
      {items.map(([to, tr, en, dtr, den]) => (
        <button key={to} className="row" onClick={() => nav(to)}>
          <span style={{ display: "flex", flexDirection: "column", gap: 2, textAlign: "left" }}><span style={{ fontWeight: 600 }}>{L(tr, en)}</span><span className="muted small">{L(dtr, den)}</span></span>
          {Icon.chevron}
        </button>
      ))}
    </div>
  );
}

export function useSelectedBrand() {
  const { current } = useApp();
  const brands = useLoad(() => (current ? api.brands(current.id) : Promise.resolve([] as Brand[])), [current?.id]);
  const own = (brands.data ?? []).filter((b) => !b.is_competitor);
  const [id, setId] = useState<string | null>(() => { try { return localStorage.getItem(KEY); } catch { return null; } });
  const brand = own.find((b) => b.id === id) ?? own[0] ?? null;
  const choose = (v: string) => { setId(v); try { localStorage.setItem(KEY, v); } catch { /* yok say */ } };
  return { brands: own, brand, choose, loading: brands.loading, error: brands.error };
}

/** Rapor bağlantısını telefonun paylaş menüsüyle paylaşır; menü yoksa panoya kopyalar ve true döner. */
export async function shareReport(brand: Brand): Promise<boolean> {
  const token = await api.createReportShare(brand.id, 30);
  const url = `${SITE_ORIGIN}/rapor/${token}`;
  const text = L(`${brand.name} yapay zekâ görünürlük raporu`, `${brand.name} AI visibility report`);
  if (navigator.share) { await navigator.share({ title: text, text, url }).catch(() => undefined); return false; }
  await navigator.clipboard?.writeText(url).catch(() => undefined);
  return true;
}

export function Home() {
  const { current, loading } = useApp();
  const nav = useNavigate();
  const sel = useSelectedBrand();
  const b = sel.brand;
  const runs = useLoad(() => (b ? api.runs(b.id) : Promise.resolve([])), [b?.id]);
  const usage = useLoad(() => (current ? api.usage(current.id) : Promise.resolve(null)), [current?.id]);
  const runList = runs.data ?? [];
  const type: MeasurementType = runList.some((r) => r.measurement_type === "live_search" && r.status === "done") ? "live_search" : "model_knowledge";
  const vis = useLoad(() => (b ? api.visibility(b.id, type) : Promise.resolve([])), [b?.id, type, runList.length]);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);
  const pending = runList.find((r) => r.status === "queued" || r.status === "running");
  useEffect(() => {
    if (!pending) return;
    const t = setInterval(() => runs.reload(), 15_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending?.id]);

  if (loading || sel.loading) return <Spinner />;
  if (!current || !b) return <Navigate to="/kurulum" replace />;

  const pts = series(vis.data ?? []);
  const last = pts[pts.length - 1], prev = pts[pts.length - 2];
  const rate = last ? Math.round(last.recommend.value * 100) : null;
  const delta = last && prev ? Math.round((last.recommend.value - prev.recommend.value) * 100) : null;
  const prelim = !!last && last.recommend.n < PRELIM;
  const engines = last ? Object.entries((vis.data ?? []).filter((r) => r.run_id === last.runId && r.is_target).reduce<Record<string, { k: number; n: number }>>((acc, r) => {
    const a = acc[r.provider] ?? { k: 0, n: 0 }; a.k += r.recommended; a.n += r.n; acc[r.provider] = a; return acc;
  }, {})).filter(([, v]) => v.n > 0).map(([p, v]) => ({ name: providerLabel(p).replace(/ \(.*\)$/, ""), rate: Math.round((v.k / v.n) * 100) })) : [];
  const actions = (b.top_actions ?? []).slice(0, 3);
  const u = usage.data;

  async function start() {
    setBusy("run"); setErr(null); haptic.tap();
    try { await api.requestRun(b!.id, !!current?.paid_live_allowed); runs.reload(); usage.reload(); }
    catch (e) { setErr(friendlyError(e)); } finally { setBusy(null); }
  }
  async function share() {
    setBusy("share"); setErr(null); setNote(null);
    try { if (await shareReport(b!)) setNote(L("Rapor bağlantısı kopyalandı.", "Report link copied.")); }
    catch (e) { setErr(friendlyError(e)); } finally { setBusy(null); }
  }
  const startBtn = (onHero: boolean) => (
    <button className={`btn ${onHero ? "btn-on-hero" : "btn-primary"}`} onClick={start} disabled={busy === "run"}>{Icon.play}{busy === "run" ? L("Başlatılıyor…", "Starting…") : rate === null ? L("İlk ölçümü başlat", "Start the first measurement") : L("Şimdi ölç", "Measure now")}</button>
  );

  return (
    <div className="screen">
      <div>
        <span className="muted small">{greeting()},</span>
        <button onClick={() => setPicker(true)} aria-haspopup="dialog" aria-label={L(`${b.name}, marka değiştir`, `${b.name}, switch brand`)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: 0, padding: 0, minHeight: 44, fontSize: 24, fontWeight: 600, color: "var(--text)", maxWidth: "100%" }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name}</span>{Icon.down}
        </button>
      </div>

      <section className="hero" aria-label={L("Yapay zekâlar sizi önerdi", "AIs recommended you")}>
        {rate === null ? (
          <>
            <span className="sub">{L("Henüz ölçüm yok", "No measurement yet")}</span>
            <p style={{ margin: 0, fontSize: 17, lineHeight: "24px" }}>{L("Yapay zekâlara müşterilerinizin soracağı soruları sorup sizi önerip önermediklerine bakacağız.", "We'll ask the AIs the questions your customers would ask and check whether they recommend you.")}</p>
            {pending ? <p style={{ margin: 0 }} role="status">{pending.status === "queued" ? L("Ölçüm sırada.", "Measurement queued.") : L("Ölçüm sürüyor.", "Measurement running.")} {L("Bitince bu ekran yenilenir.", "This screen refreshes when it's done.")}</p> : startBtn(true)}
          </>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span className="sub">{L("Yapay zekâlar sizi önerdi", "AIs recommended you")}</span>
                <span className={`big${prelim ? " prelim" : ""}`}>%{rate}</span>
              </div>
              {prelim ? <span className="chip-on">{L("Ön sonuç", "Early result")}</span> : delta !== null && delta !== 0 && (
                <span className={delta < 0 ? "delta-down" : "delta-up"}>{delta < 0 ? L(`${Math.abs(delta)} puan düştü`, `down ${Math.abs(delta)} pts`) : L(`${delta} puan arttı`, `up ${delta} pts`)}</span>
              )}
            </div>
            <span style={{ fontSize: 15 }}>{L(`${last!.recommend.n} cevabın ${numLoc(last!.recommend.k)} önerildiniz.`, `Recommended in ${last!.recommend.k} of ${last!.recommend.n} answers.`)}{prelim ? L(" Soru ekledikçe sonuç netleşir.", " Adding questions makes it clearer.") : ""}</span>
            {engines.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {engines.map((e) => <span key={e.name} className="chip-on">{e.name} %{e.rate}</span>)}
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="act" onClick={() => nav("/rapor")}>{L("Raporu aç", "Open report")}</button>
              <button className="act" onClick={share} disabled={busy === "share"}>{Icon.share}{L("Paylaş", "Share")}</button>
            </div>
          </>
        )}
      </section>

      {rate !== null && (pending
        ? <p className="ok" role="status">{pending.status === "queued" ? L("Ölçüm sırada.", "Measurement queued.") : L("Ölçüm sürüyor.", "Measurement running.")} {formatDateTime(pending.created_at)}. {L("Bitince bu ekran yenilenir.", "This screen refreshes when it's done.")}</p>
        : startBtn(false))}
      {u && <span className="muted small" style={{ marginTop: -8 }}>{L(`Bu ay ${u.engine_calls.toLocaleString("tr-TR")} / ${u.engine_call_limit.toLocaleString("tr-TR")} soru soruldu.`, `${u.engine_calls.toLocaleString("en-US")} / ${u.engine_call_limit.toLocaleString("en-US")} questions asked this month.`)}</span>}
      <Err msg={err} />
      {note && <p className="ok" role="status">{note}</p>}

      {rate !== null && (
        <>
          <h2 className="section-title">{L("Bu hafta ne yapabilirsiniz", "What you can do this week")}</h2>
          {actions.length ? (
            <div className="list">
              {actions.map((a, i) => (
                <button key={i} className="row" style={{ alignItems: "flex-start", flexDirection: "column", gap: 2, textAlign: "left" }} onClick={() => nav("/oneriler")}>
                  <span style={{ fontWeight: 600 }}>{a.title}</span>
                  <span className="muted small">{a.action}</span>
                </button>
              ))}
            </div>
          ) : <p className="muted" style={{ margin: 0 }}>{L("Öneriler birkaç ölçümden sonra burada çıkar.", "Suggestions appear here after a few measurements.")}</p>}
        </>
      )}

      <h2 className="section-title">{L("İşletmeniz", "Your business")}</h2>
      <MoreLinks />

      <Sheet open={picker} onClose={() => setPicker(false)} title={L("Markalarınız", "Your brands")}>
        <div className="list" style={{ background: "var(--surface2)" }}>
          {sel.brands.map((x) => (
            <button key={x.id} className="row" aria-current={x.id === b.id} onClick={() => { sel.choose(x.id); setPicker(false); }}>
              <span style={{ fontWeight: x.id === b.id ? 600 : 400 }}>{x.name}</span>{x.id === b.id && <span className="muted small">{L("Seçili", "Selected")}</span>}
            </button>
          ))}
        </div>
        <button className="btn btn-ghost" onClick={() => { setPicker(false); nav("/marka-duzenle"); }}>{L(`${b.name} bilgilerini düzenle`, `Edit ${b.name} details`)}</button>
        <button className="btn btn-ghost" onClick={() => { setPicker(false); nav("/marka-ekle"); }}>{Icon.plus}{L("Marka ekle", "Add brand")}</button>
      </Sheet>
    </div>
  );
}
