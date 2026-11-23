// Rapor: seçili markanın ayrıntıları. Başlıklar: Özet, Sorular, Rakipler, Ölçümler.
// Rakamlar sitedeki raporla aynı kaynaktan ve aynı hesapla gelir (web/src/lib/report.ts, engine/src/metrics.ts).
import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useApp, useLoad } from "../../lib/app";
import { api, type MeasurementType, type PromptResult } from "../../lib/data";
import { friendlyError } from "../../lib/supabase";
import { formatDateTime, lowSample, numLoc, providerLabel, series } from "../../lib/report";
import { confidenceScore } from "../../../../engine/src/metrics.ts";
import { L } from "../../lib/i18n";
import { Err, Head, Spinner } from "../ui";
import { useSelectedBrand } from "./Home";
import { RivalsBody } from "./Rivals";

const TABS = [
  { id: "ozet", tr: "Özet", en: "Summary" },
  { id: "sorular", tr: "Sorular", en: "Questions" },
  { id: "rakipler", tr: "Rakipler", en: "Competitors" },
  { id: "olcumler", tr: "Ölçümler", en: "Measurements" },
] as const;
type Tab = (typeof TABS)[number]["id"];
const pct = (v: number) => Math.round(v * 100);

export function Report() {
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find((t) => t.id === params.get("b"))?.id ?? "ozet") as Tab;
  const sel = useSelectedBrand();
  const b = sel.brand;
  const runs = useLoad(() => (b ? api.runs(b.id) : Promise.resolve([])), [b?.id]);
  const type: MeasurementType = (runs.data ?? []).some((r) => r.measurement_type === "live_search" && r.status === "done") ? "live_search" : "model_knowledge";
  const vis = useLoad(() => (b ? api.visibility(b.id, type) : Promise.resolve([])), [b?.id, type]);
  if (sel.loading || !b) return <Spinner />;
  const pts = series(vis.data ?? []);
  const last = pts[pts.length - 1];

  return (
    <div className="screen">
      <Head title={L("Rapor", "Report")} right={<span className="muted small">{b.name}</span>} />
      <div className="seg" role="group" aria-label={L("Rapor bölümleri", "Report sections")}>
        {TABS.map((t) => (
          <button key={t.id} aria-pressed={tab === t.id} onClick={() => setParams({ b: t.id }, { replace: true })}>{L(t.tr, t.en)}</button>
        ))}
      </div>
      {tab === "ozet" && <Summary brandId={b.id} pts={pts} rows={vis.data ?? []} type={type} />}
      {tab === "sorular" && <Questions brandId={b.id} workspaceId={b.workspace_id} lastRunId={last?.runId ?? null} />}
      {tab === "rakipler" && <RivalsBody />}
      {tab === "olcumler" && <Runs list={runs.data ?? []} />}
    </div>
  );
}

function Summary({ pts, rows, type }: { brandId: string; pts: ReturnType<typeof series>; rows: Parameters<typeof series>[0]; type: MeasurementType }) {
  const last = pts[pts.length - 1];
  const conf = useLoad(() => (last ? api.runConfidence(last.runId) : Promise.resolve([])), [last?.runId]);
  if (!last) return <p className="muted" style={{ margin: 0 }}>{L("Henüz ölçüm yok. Ana sayfadan ilk ölçümü başlatabilirsiniz.", "No measurement yet. You can start the first one from Home.")}</p>;
  const recent = pts.slice(-8);
  const c = confidenceScore(conf.data ?? []);
  const byEngine = Object.entries(rows.filter((r) => r.run_id === last.runId && r.is_target).reduce<Record<string, { k: number; m: number; n: number }>>((acc, r) => {
    const a = acc[r.provider] ?? { k: 0, m: 0, n: 0 }; a.k += r.recommended; a.m += r.mentioned; a.n += r.n; acc[r.provider] = a; return acc;
  }, {})).filter(([, v]) => v.n > 0);
  return (
    <>
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <p style={{ margin: 0, lineHeight: 1.45 }}>
          {L(`Son ölçümde yapay zekâ cevaplarının %${numLoc(pct(last.recommend.value))} önerildiniz, %${numLoc(pct(last.mention.value))} adınız geçti.`,
            `In the last measurement you were recommended in ${pct(last.recommend.value)}% of AI answers and mentioned in ${pct(last.mention.value)}%.`)}
        </p>
        {recent.length > 1 && (
          <>
            <div className="spark" role="img" aria-label={L(`Son ${recent.length} ölçümde önerilme oranı`, `Recommendation rate over the last ${recent.length} measurements`)}>
              {recent.map((p) => <i key={p.runId} style={{ height: `${Math.max(3, pct(p.recommend.value))}%` }} />)}
            </div>
            <span className="muted small">{formatDateTime(recent[0].at)} – {formatDateTime(last.at)}</span>
          </>
        )}
        {lowSample(last.recommend) && <span className="muted small">{L("Az sayıda cevaba dayanıyor; soru ekledikçe netleşir.", "Based on few answers; adding questions makes it clearer.")}</span>}
        <span className="muted small">{type === "live_search" ? L("Canlı aramalı ölçüm", "Live search measurement") : L("Aramasız ölçüm (yapay zekânın kendi bilgisi)", "Measurement without search (the AI's own knowledge)")}</span>
      </div>
      {byEngine.length > 0 && (
        <>
          <h2 className="label">{L("Yapay zekâlara göre", "By AI")}</h2>
          <div className="list">
            {byEngine.map(([p, v]) => (
              <div key={p} className="row" style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontWeight: 600 }}>{providerLabel(p)}</span><span>{L(`%${pct(v.k / v.n)} önerildi`, `${pct(v.k / v.n)}% recommended`)}</span></div>
                <div className="meter"><i style={{ width: `${pct(v.k / v.n)}%`, background: "var(--accent)" }} /></div>
              </div>
            ))}
          </div>
        </>
      )}
      {c && (
        <>
          <h2 className="label">{L("Sonuç ne kadar sağlam?", "How solid is the result?")}</h2>
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 18 }}>{L("Güven puanı", "Confidence")} {c.score}/100</span>
            <span className="muted small" style={{ lineHeight: 1.45 }}>{L(`${c.clusters} soru ve yapay zekâ eşleşmesi, ${c.answers} cevap.`, `${c.clusters} question and AI pairs, ${c.answers} answers.`)}{c.consistency != null ? L(` Tekrar sorulan sorularda aynı sonuç oranı %${pct(c.consistency)}.`, ` Same result when asked again: ${pct(c.consistency)}%.`) : ""}</span>
            <span className="muted small">{L("Bu puan markanızın iyi ya da kötü olduğunu değil, ölçümün ne kadar güvenilir olduğunu gösterir.", "This score shows how reliable the measurement is, not whether your brand is good or bad.")}</span>
          </div>
        </>
      )}
    </>
  );
}

function verdict(r: PromptResult) {
  if (r.target_recommended > 0) return { cls: "v-rec", t: L("Önerildiniz", "Recommended") };
  if (r.target_mentioned > 0) return { cls: "v-men", t: L("Adınız geçti", "Mentioned") };
  return { cls: "v-no", t: L("Geçmediniz", "Not mentioned") };
}

function Questions({ brandId, workspaceId, lastRunId }: { brandId: string; workspaceId: string; lastRunId: string | null }) {
  const { current } = useApp();
  const prompts = useLoad(() => api.prompts(brandId), [brandId]);
  const results = useLoad(() => (lastRunId ? api.promptResults(lastRunId) : Promise.resolve([] as PromptResult[])), [lastRunId]);
  const usage = useLoad(() => (current ? api.usage(current.id) : Promise.resolve(null)), [current?.id]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (prompts.loading) return <Spinner />;
  const list = prompts.data ?? [];
  const active = list.filter((p) => p.active).length;
  const limit = usage.data?.prompt_limit ?? 0;
  const byPrompt = new Map((results.data ?? []).map((r) => [r.prompt_id, r]));

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const text = String(new FormData(form).get("q") ?? "").trim();
    if (text.length < 8) { setErr(L("Soruyu bir müşterinin yazacağı gibi tam cümle yazın.", "Write the question as a full sentence, the way a customer would.")); return; }
    setBusy(true); setErr(null);
    try { await api.addPrompt({ workspace_id: workspaceId, brand_id: brandId, text, intent: "informational" }); form.reset(); prompts.reload(); }
    catch (e2) { setErr(friendlyError(e2)); } finally { setBusy(false); }
  }
  async function toggle(id: string, on: boolean) {
    setErr(null);
    try { await api.setPromptActive(id, on); prompts.reload(); } catch (e2) { setErr(friendlyError(e2)); }
  }
  async function remove(id: string) {
    if (!confirm(L("Bu soru silinsin mi? Eski ölçümlerdeki sonuçları raporda kalır.", "Delete this question? Its results in past measurements stay in the report."))) return;
    try { await api.deletePrompt(id); prompts.reload(); } catch (e2) { setErr(friendlyError(e2)); }
  }

  return (
    <>
      <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.45 }}>
        {L("Yapay zekâlara sorduğumuz sorular. Müşterilerinizin gerçekten soracağı sorular en doğru sonucu verir.", "The questions we ask the AIs. Questions your customers would really ask give the most accurate result.")}
        {limit > 0 && L(` Açık soru: ${active} / ${limit}.`, ` Active: ${active} / ${limit}.`)}
      </p>
      {(!limit || active < limit) && (
        <form onSubmit={add} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label className="field">{L("Yeni soru", "New question")}<input name="q" maxLength={300} placeholder={L("Örn. Antalya'da en iyi döner nerede yenir?", "e.g. Where can I get the best pizza in Austin?")} /></label>
          <button className="btn btn-ghost" disabled={busy}>{L("Soruyu ekle", "Add question")}</button>
        </form>
      )}
      <Err msg={err} />
      <div className="list">
        {list.map((p) => {
          const r = byPrompt.get(p.id);
          const v = r ? verdict(r) : null;
          return (
            <div key={p.id} className="row" style={{ flexDirection: "column", alignItems: "stretch", gap: 8, opacity: p.active ? 1 : 0.6 }}>
              <span style={{ lineHeight: 1.4 }}>{p.text}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {v && <span className={`verdict ${v.cls}`}>{v.t}{r && r.answers ? ` · ${r.target_recommended}/${r.answers}` : ""}</span>}
                {!p.active && <span className="verdict v-no">{L("Kapalı", "Off")}</span>}
                <span style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                  <button className="btn btn-text" style={{ width: "auto", minHeight: 44, fontSize: 14 }} onClick={() => toggle(p.id, !p.active)}>{p.active ? L("Kapat", "Turn off") : L("Aç", "Turn on")}</button>
                  <button className="btn btn-danger" style={{ width: "auto", minHeight: 44, fontSize: 14 }} aria-label={L(`Soruyu sil: ${p.text}`, `Delete question: ${p.text}`)} onClick={() => remove(p.id)}>{L("Sil", "Delete")}</button>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function Runs({ list }: { list: { id: string; status: string; created_at: string; trigger: string; measurement_type: string; prompts_total: number }[] }) {
  if (!list.length) return <p className="muted" style={{ margin: 0 }}>{L("Henüz ölçüm yok.", "No measurements yet.")}</p>;
  const st = (s: string) => s === "done" ? L("Tamamlandı", "Done") : s === "failed" ? L("Tamamlanamadı", "Failed") : s === "running" ? L("Çalışıyor", "Running") : s === "queued" ? L("Sırada", "Queued") : L("Durduruldu", "Stopped");
  return (
    <div className="list">
      {list.map((r) => (
        <div key={r.id} className="row" style={{ flexDirection: "column", alignItems: "stretch", gap: 2 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontWeight: 600 }}>{r.trigger === "weekly" ? L("Haftalık otomatik ölçüm", "Weekly automatic measurement") : L("Sizin başlattığınız ölçüm", "Measurement you started")}</span><span className="muted small">{st(r.status)}</span></div>
          <span className="muted small">{formatDateTime(r.created_at)} · {r.measurement_type === "live_search" ? L("canlı aramalı", "live search") : L("aramasız", "without search")}{r.prompts_total ? L(` · ${r.prompts_total} soru`, ` · ${r.prompts_total} questions`) : ""}</span>
        </div>
      ))}
    </div>
  );
}
