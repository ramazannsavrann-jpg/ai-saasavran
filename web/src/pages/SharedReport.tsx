// Paylaşılan rapor: bağlantıyı bilen herkes giriş yapmadan görür. "PDF olarak kaydet" tarayıcının yazdırma penceresini açar.
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CompareBars, TrendChart } from "../components/Chart";
import { Empty, Loading } from "../components/ui";
import type { MeasurementType, VisRow } from "../lib/data";
import { L, isEn } from "../lib/i18n";
import { MIN_SAMPLE, competitorsInRun, formatDate, formatDateTime, numLoc, pct, providerLabel, rangeText, series } from "../lib/report";

interface Shared {
  brand: { name: string; sector: string | null; city: string | null; country: string };
  expires_at: string;
  vis: Record<MeasurementType, VisRow[]>;
  questions: { text: string; answers: number; recommended: number; mentioned: number; top_competitor: string | null }[];
  sources: { domain: string; count: number }[];
}

const TYPE_TEXT: Record<string, () => string> = {
  live_search: () => L("Canlı web aramalı (müşterinin gördüğüne en yakın)", "With live web search (closest to what customers see)"),
  model_knowledge: () => L("Web araması olmadan (yapay zekânın bildiği)", "Without web search (what the AI knows)"),
};

export function SharedReport() {
  const { token } = useParams();
  const [data, setData] = useState<Shared | null | undefined>(undefined);
  useEffect(() => {
    document.title = L("Yapay zekâ görünürlük raporu | AI SaaSavran", "AI visibility report | AI SaaSavran");
    const m = document.createElement("meta"); m.name = "robots"; m.content = "noindex, nofollow"; document.head.appendChild(m);
    fetch(`/api/report?t=${encodeURIComponent(token ?? "")}`).then((r) => (r.ok ? r.json() : null)).then(setData).catch(() => setData(null));
    return () => { m.remove(); };
  }, [token]);
  if (data === undefined) return <main className="content"><Loading /></main>;
  if (!data) return <main className="content"><Empty title={L("Bu rapor bağlantısı geçersiz ya da süresi dolmuş", "This report link is invalid or has expired")}><p>{L("Bağlantıyı paylaşan kişiden yenisini isteyin.", "Ask the person who shared it for a new link.")}</p></Empty></main>;

  const types = (["live_search", "model_knowledge"] as MeasurementType[]).filter((t) => (data.vis[t] ?? []).length > 0);
  return (
    <main className="content shared-report">
      <header className="report-head">
        <a href="/" className="report-logo"><img src="/icon.svg" alt="" width={32} height={32} /><span>AI SaaSavran</span></a>
        <button className="btn btn-quiet btn-small no-print" onClick={() => window.print()}>{L("PDF olarak kaydet", "Save as PDF")}</button>
      </header>
      <h1>{data.brand.name}</h1>
      <p className="lead">{L("Yapay zekâ görünürlük raporu", "AI visibility report")}{[data.brand.sector, data.brand.city].filter(Boolean).length ? ` · ${[data.brand.sector, data.brand.city].filter(Boolean).join(", ")}` : ""}</p>
      {types.length === 0 && <Empty title={L("Bu markanın henüz tamamlanmış ölçümü yok", "This brand has no completed measurement yet")} />}
      {types.map((t) => {
        const rows = data.vis[t];
        const pts = series(rows);
        const last = pts[pts.length - 1];
        const comp = competitorsInRun(rows, last.runId);
        return (
          <section key={t} className="panel stack">
            <h2>{TYPE_TEXT[t]()}</h2>
            <p className="muted">{providerLabel(last.providers.join(","))} · {formatDateTime(last.at)} · {isEn() ? `${last.recommend.n} answers` : `${last.recommend.n} cevap`}</p>
            <dl className="facts">
              <div><dt>{L("Önerilme", "Recommended")}</dt><dd className="num">{pct(last.recommend.value)}<span className="muted dd-note">{L("aralık", "range")} {rangeText(last.recommend)}</span></dd></div>
              <div><dt>{L("Anılma", "Mentioned")}</dt><dd className="num">{pct(last.mention.value)}<span className="muted dd-note">{L("aralık", "range")} {rangeText(last.mention)}</span></dd></div>
              <div><dt>{L("Önerilerdeki payı", "Share of recommendations")}</dt><dd className="num">{pct(last.share)}</dd></div>
            </dl>
            {last.recommend.n < MIN_SAMPLE && <p className="caution">{L("Örneklem küçük; oranlar kesin değildir, aralığa bakın.", "Small sample; rates are not precise, look at the range.")}</p>}
            {pts.length > 1 && <TrendChart points={pts} type={t} metric="recommend" />}
            <h3>{L("Rakiplerle karşılaştırma (son ölçüm)", "Compared with competitors (latest)")}</h3>
            <CompareBars type={t} rows={comp.map((c) => ({ name: c.name, isTarget: c.isTarget, value: c.recommend.value,
              detail: isEn() ? `recommended in ${c.recommend.k} of ${c.recommend.n} answers (${rangeText(c.recommend)})` : `${c.recommend.n} cevabın ${numLoc(c.recommend.k)} önerildi (${rangeText(c.recommend)})` }))} />
          </section>
        );
      })}
      {data.questions.length > 0 && (
        <section className="panel stack">
          <h2>{L("Sorulan sorular (son ölçüm)", "Questions asked (latest)")}</h2>
          <ul className="rows">{data.questions.map((q) => (
            <li key={q.text}><span><strong>{q.text}</strong><span className="q-meta">{isEn() ? `recommended in ${q.recommended} of ${q.answers} answers` : `${q.answers} cevabın ${numLoc(q.recommended)} önerildi`}{q.top_competitor ? L(` · en çok önerilen rakip: ${q.top_competitor}`, ` · top competitor: ${q.top_competitor}`) : ""}</span></span></li>
          ))}</ul>
        </section>
      )}
      {data.sources.length > 0 && (
        <section className="panel stack">
          <h2>{L("Yapay zekânın baktığı siteler (son ölçüm)", "Websites the AI read (latest)")}</h2>
          <ul className="rows">{data.sources.map((s) => <li key={s.domain}><span>{s.domain}</span><span className="num">{s.count}</span></li>)}</ul>
        </section>
      )}
      <p className="src-sup muted">{L("Ölçüm: yapay zekâ platformlarının resmî API'leri; tüketici uygulamasındaki cevaplar farklı olabilir. Oranlar güven aralığıyla verilir.", "Measured through the AI platforms' official APIs; answers in the consumer apps can differ. Rates come with confidence ranges.")} {isEn() ? `Link valid until ${formatDate(data.expires_at)}.` : `Bağlantı ${formatDate(data.expires_at)} tarihine kadar geçerli.`} <a href="/">aisaasavran.com</a></p>
    </main>
  );
}
