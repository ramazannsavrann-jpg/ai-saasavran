// Ana sayfa: seçili markanın önerilme oranı (yapay zekâlara göre), önceki ölçüme göre değişim, bu haftanın işleri ve "Şimdi ölç".
// Rakip bilgisi yok (23 Kasım kararı). Az cevaba dayanan sonuç "ön sonuç" olarak küçük gösterilir; uydurma rakam yok.
import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useApp, useLoad } from "../../lib/app";
import { api, type Brand, type MeasurementType } from "../../lib/data";
import { friendlyError } from "../../lib/supabase";
import { formatDateTime, numLoc, providerLabel, series } from "../../lib/report";
import { L, isEn } from "../../lib/i18n";
import { SITE_ORIGIN } from "../../lib/env";
import { Err, Icon, LoadError, Sheet, Spinner, greeting, haptic, isPaid, shownType } from "../ui";

const KEY = "mobil-marka";
const PRELIM = 20; // bundan az cevap: ön sonuç
/** Başlangıç adımları: ilk ölçümden sonra sonucu güçlendiren 3 iş. Durum gerçek veriden okunur; bitince ya da kapatılınca görünmez. */
function StartSteps({ brand, doneRuns }: { brand: Brand; doneRuns: number }) {
  const nav = useNavigate();
  const prompts = useLoad(() => api.prompts(brand.id), [brand.id]);
  const { current } = useApp();
  const paid = isPaid(current);
  const key = `mobil-rehber-${brand.id}`;
  const [off, setOff] = useState(() => { try { return localStorage.getItem(key) === "1"; } catch { return false; } });
  if (off || doneRuns >= 4 || !prompts.data || brand.data_origin === "simulated") return null;
  const active = prompts.data.filter((p) => p.active).length;
  const steps = [
    { done: active >= 10, to: "/rapor?b=sorular", t: L(`Soru sayısını 10'a çıkarın (şu an ${active})`, `Grow to 10 questions (now ${active})`), d: L("Daha çok soru, daha güvenilir sonuç.", "More questions, a more reliable result.") },
    { done: !!brand.website, to: "/marka-duzenle", t: L("Web sitenizi ekleyin", "Add your website"), d: L("Sitenizin yapay zekâlarda kaynak gösterilip gösterilmediğine bakarız.", "We check whether the AIs cite your site.") },
    { done: !!brand.fact_card, to: "/marka-duzenle", t: L("Doğru bilgilerinizi yazın", "Write your correct facts"), d: paid
      ? L("Adres, saat ve fiyatlarınızı yazın. Yapay zekâların söyledikleri bunlarla karşılaştırılır.", "Write your address, hours and prices. What the AIs say is checked against them.")
      : L("Adres, saat ve fiyatlarınızı yazın. Ücretli paketlerde yapay zekâların söyledikleri bunlarla karşılaştırılır.", "Write your address, hours and prices. On paid plans, what the AIs say is checked against them.") },
  ];
  const left = steps.filter((x) => !x.done);
  if (!left.length) return null;
  const close = () => { try { localStorage.setItem(key, "1"); } catch { /* yok say */ } setOff(true); };
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h2 className="section-title">{L("Sonucunuzu güçlendirin", "Strengthen your result")}</h2>
        <button className="btn btn-text" style={{ minHeight: 48, padding: "0 8px", color: "var(--muted)" }} onClick={close}>{L("Gizle", "Hide")}</button>
      </div>
      <div className="list">
        {steps.map((x) => (
          <button key={x.to} className="row" disabled={x.done} onClick={() => nav(x.to)} style={{ alignItems: "center" }}>
            <span className={`stepmark${x.done ? " done" : ""}`} aria-hidden="true">{x.done ? "✓" : ""}</span>
            <span style={{ display: "flex", flexDirection: "column", gap: 2, textAlign: "left", flex: 1, minWidth: 0 }}>
              <span style={{ fontWeight: 600, color: x.done ? "var(--muted)" : "var(--text)", textDecoration: x.done ? "line-through" : "none" }}>{x.t}</span>
              {!x.done && <span className="muted small">{x.d}</span>}
            </span>
            {!x.done && Icon.chevron}
          </button>
        ))}
      </div>
    </>
  );
}

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

const RIVAL_RECS = new Set(["source_sites", "shopping_behind", "mentioned_not_recommended", "own_source_low", "rival_traits", "competitor_gap"]);

export function useSelectedBrand() {
  const { current, wsError, reload } = useApp();
  const brands = useLoad(() => (current ? api.brands(current.id) : Promise.resolve([] as Brand[])), [current?.id]);
  const own = (brands.data ?? []).filter((b) => !b.is_competitor);
  const [id, setId] = useState<string | null>(() => { try { return localStorage.getItem(KEY); } catch { return null; } });
  const brand = own.find((b) => b.id === id) ?? own[0] ?? null;
  const choose = (v: string) => { setId(v); try { localStorage.setItem(KEY, v); } catch { /* yok say */ } };
  // Yükleme hatası "marka yok" sayılmaz: yoksa kullanıcı kurulum ekranına düşüp aynı markayı yeniden ekler
  const failed = wsError || !!brands.error;
  const retry = () => { void reload().catch(() => {}); brands.reload(); };
  return { brands: own, brand, choose, loading: brands.loading, error: brands.error, failed, retry };
}

/** Seçili marka yokken: yükleme hatasıysa "Tekrar dene", gerçekten marka yoksa kurulum. */
export function NoBrand({ sel }: { sel: { failed: boolean; retry: () => void } }) {
  if (sel.failed) return <LoadError full retry={sel.retry} />;
  return <Navigate to="/kurulum" replace />;
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
  const promptsQ = useLoad(() => (b ? api.prompts(b.id) : Promise.resolve([])), [b?.id]);
  const runList = runs.data ?? [];
  const type = shownType(b, runList) as MeasurementType;
  const lastDone = runList.find((r) => r.status === "done")?.id ?? "";
  // Ölçüm bitince (durumu değişince) sonuç yeniden okunur
  const vis = useLoad(() => (b ? api.visibility(b.id, type) : Promise.resolve([])), [b?.id, type, lastDone]);
  const sim = b?.data_origin === "simulated";
  const canLive = !!current?.paid_live_allowed && !sim;
  const quota = useLoad(() => (current ? api.quota(current.id) : Promise.resolve(null)), [current?.id, lastDone]);
  const budget = useLoad(() => (canLive && current ? api.paidBudget(current.id) : Promise.resolve(null)), [canLive, current?.id, lastDone]);
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
  if (!current || !b) return <NoBrand sel={sel} />;
  if (runs.error || vis.error) return <LoadError full retry={() => { runs.reload(); vis.reload(); }} />;
  // İlk yüklemede bekle: ölçümü olan kullanıcı bir an "İlk ölçümü başlat" görmesin
  if (!runs.data || !vis.data) return <Spinner />;

  const pts = series(vis.data ?? []);
  const last = pts[pts.length - 1], prev = pts[pts.length - 2];
  const rate = last ? Math.round(last.recommend.value * 100) : null;
  const delta = last && prev ? Math.round((last.recommend.value - prev.recommend.value) * 100) : null;
  const prelim = !!last && last.recommend.n < PRELIM;
  const engines = last ? Object.entries((vis.data ?? []).filter((r) => r.run_id === last.runId && r.is_target).reduce<Record<string, { k: number; n: number }>>((acc, r) => {
    const a = acc[r.provider] ?? { k: 0, n: 0 }; a.k += r.recommended; a.n += r.n; acc[r.provider] = a; return acc;
  }, {})).filter(([, v]) => v.n > 0).map(([p, v]) => ({ name: providerLabel(p).replace(/ \(.*\)$/, ""), rate: Math.round((v.k / v.n) * 100) })) : [];
  // Ana sayfada rakip dili yok (23 Kasım kararı): rakip/kaynak karşılaştırmalı öneriler ve başka dilde yazılmış ya da
  // kimliksiz (eski) kayıtlar gösterilmez; tamamı Öneriler ekranında.
  const actions = (b.top_actions ?? []).filter((a) => a.id && !RIVAL_RECS.has(a.id) && a.lang === (isEn() ? "en" : "tr")).slice(0, 3);
  const u = usage.data;
  const q = quota.data;
  // Soru hakkı (0072): "Şimdi ölç" yaklaşık kaç hak kullanır (soru × motor × tekrar; sunucudaki run_call_estimate ile aynı)
  const budgetLeft = budget.data ? Number(budget.data.cap_usd) - Number(budget.data.spent_usd) : 0;
  const willLive = canLive && budgetLeft >= 0.05;
  const activeN = (promptsQ.data ?? []).filter((p) => p.active).length;
  const need = activeN * (willLive ? 6 : 2); // canlı: ChatGPT 2 + Gemini 2 + Claude 1 + Perplexity 1 (0077)

  async function start() {
    setBusy("run"); setErr(null); haptic.tap();
    // Canlı (ücretli) ölçüm yalnız izin ve bütçe varsa; yoksa aramasız ölçüm (sitedeki kural)
    if (q?.hybrid && need > q.manual_left) {
      setBusy(null);
      setErr(L(`Soru hakkınız yetmiyor: bu ölçüm ${need} hak kullanır, bu ay ${q.manual_left} hakkınız kaldı. Hakkınız yeni ay başında yenilenir; haftalık otomatik ölçüm sürer.`, `Not enough question credits: this measurement uses ${need}, you have ${q.manual_left} left this month. Credits renew next month; the weekly automatic measurement continues.`));
      return;
    }
    try { await api.requestRun(b!.id, willLive); runs.reload(); usage.reload(); quota.reload(); }
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
        <button onClick={() => setPicker(true)} aria-haspopup="dialog" aria-label={L(`${b.name}, marka değiştir`, `${b.name}, switch brand`)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: 0, padding: 0, minHeight: 48, fontSize: 24, fontWeight: 600, color: "var(--text)", maxWidth: "100%" }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name}</span>{Icon.down}
        </button>
      </div>

      <section className="hero" aria-label={L("Yapay zekâlar sizi önerdi", "AIs recommended you")}>
        {rate === null ? (
          <>
            <span className="sub">{sim ? L("SİMÜLASYON · demo marka", "SIMULATION · demo brand") : L("Henüz ölçüm yok", "No measurement yet")}</span>
            <p style={{ margin: 0, fontSize: 17, lineHeight: "24px" }}>{L("Yapay zekâlara müşterilerinizin soracağı soruları sorup sizi önerip önermediklerine bakacağız.", "We'll ask the AIs the questions your customers would ask and check whether they recommend you.")}</p>
            {pending ? <p style={{ margin: 0 }} role="status">{pending.status === "queued" ? L("Ölçüm sırada.", "Measurement queued.") : L("Ölçüm sürüyor.", "Measurement running.")} {L("Bitince bu ekran yenilenir.", "This screen refreshes when it's done.")}</p> : !sim && startBtn(true)}
          </>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span className="sub">{sim ? L("SİMÜLASYON · gerçek ölçüm değil", "SIMULATION · not a real measurement") : L("Yapay zekâlar sizi önerdi", "AIs recommended you")}</span>
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
        : !sim && startBtn(false))}
      {q?.hybrid
        ? <span className="muted small" style={{ marginTop: -8 }}>{L(`Bu ay ${q.manual_left.toLocaleString("tr-TR")} soru hakkınız kaldı.`, `${q.manual_left.toLocaleString("en-US")} question credits left this month.`)}{!sim && activeN > 0 && L(` "Şimdi ölç" yaklaşık ${need} hak kullanır.`, ` "Measure now" uses about ${need}.`)}</span>
        : u && <span className="muted small" style={{ marginTop: -8 }}>{L(`Bu ay ${u.engine_calls.toLocaleString("tr-TR")} / ${u.engine_call_limit.toLocaleString("tr-TR")} yapay zekâ cevabı kullanıldı.`, `${u.engine_calls.toLocaleString("en-US")} / ${u.engine_call_limit.toLocaleString("en-US")} AI answers used this month.`)}</span>}
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
          ) : <button className="btn btn-ghost" onClick={() => nav("/oneriler")}>{L("Önerileri gör", "See suggestions")}</button>}
        </>
      )}

      {b && runList.some((r) => r.status === "done") && <StartSteps brand={b} doneRuns={runList.filter((r) => r.status === "done").length} />}

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
