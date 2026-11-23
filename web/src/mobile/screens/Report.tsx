// Rapor: seçili markanın ayrıntıları. Başlıklar: Özet, Sorular, Rakipler, Ölçümler.
// Rakamlar sitedeki raporla aynı kaynaktan ve aynı hesapla gelir (web/src/lib/report.ts, engine/src/metrics.ts).
import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useApp, useLoad } from "../../lib/app";
import { api, type MeasurementType, type PromptResult } from "../../lib/data";
import { friendlyError } from "../../lib/supabase";
import { formatDateTime, lowSample, numLoc, providerLabel, series } from "../../lib/report";
import { confidenceScore } from "../../../../engine/src/metrics.ts";
import { lossCards } from "../../../../engine/src/insights.ts";
import { L } from "../../lib/i18n";
import { Confirm, Err, Head, Icon, Sheet, Spinner } from "../ui";
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
      <div className="tabs" role="tablist" aria-label={L("Rapor bölümleri", "Report sections")}>
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setParams({ b: t.id }, { replace: true })}>{L(t.tr, t.en)}</button>
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
        {lowSample(last.recommend) && <span className="muted small">{L(`Henüz ${last.recommend.n} cevap var. Soru ekledikçe sonuç netleşir.`, `Only ${last.recommend.n} answers so far. Adding questions makes it clearer.`)}</span>}
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
          <h2 className="label">{L("Güvenilirlik", "Reliability")}</h2>
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 18 }}>{L("Güven puanı", "Confidence")} {c.score}/100</span>
            <span className="muted small" style={{ lineHeight: 1.45 }}>{L(`${c.clusters} soru ve yapay zekâ eşleşmesi, ${c.answers} cevap.`, `${c.clusters} question and AI pairs, ${c.answers} answers.`)}{c.consistency != null ? L(` Tekrar sorulan sorularda aynı sonuç oranı %${pct(c.consistency)}.`, ` Same result when asked again: ${pct(c.consistency)}%.`) : ""}</span>
            <span className="muted small">{L("Puan, ölçümün ne kadar güvenilir olduğunu gösterir. Soru ve ölçüm sayısı arttıkça yükselir.", "The score shows how reliable the measurement is. It rises with more questions and measurements.")}</span>
          </div>
        </>
      )}
    </>
  );
}

function verdict(r: PromptResult) {
  if (r.target_recommended > 0) return { cls: "b-rec", t: L("Önerildiniz", "Recommended") };
  if (r.target_mentioned > 0) return { cls: "b-men", t: L("Adınız geçti", "Mentioned") };
  return { cls: "b-no", t: L("Adınız geçmedi", "Not mentioned") };
}

function Questions({ brandId, workspaceId, lastRunId }: { brandId: string; workspaceId: string; lastRunId: string | null }) {
  const { current } = useApp();
  const prompts = useLoad(() => api.prompts(brandId), [brandId]);
  const results = useLoad(() => (lastRunId ? api.promptResults(lastRunId) : Promise.resolve([] as PromptResult[])), [lastRunId]);
  const usage = useLoad(() => (current ? api.usage(current.id) : Promise.resolve(null)), [current?.id]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [menu, setMenu] = useState<{ id: string; text: string; active: boolean } | null>(null);
  const [del, setDel] = useState<string | null>(null);
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
    try { await api.addPrompt({ workspace_id: workspaceId, brand_id: brandId, text, intent: "informational" }); setAdding(false); prompts.reload(); }
    catch (e2) { setErr(friendlyError(e2)); } finally { setBusy(false); }
  }
  async function toggle(id: string, on: boolean) {
    setErr(null); setMenu(null);
    try { await api.setPromptActive(id, on); prompts.reload(); } catch (e2) { setErr(friendlyError(e2)); }
  }
  async function remove(id: string) {
    setDel(null); setMenu(null);
    try { await api.deletePrompt(id); prompts.reload(); } catch (e2) { setErr(friendlyError(e2)); }
  }

  return (
    <>
      <p className="muted small" style={{ margin: 0 }}>
        {L("Yapay zekâlara sorduğumuz sorular. Müşterilerinizin gerçekten soracağı sorular en doğru sonucu verir.", "The questions we ask the AIs. Questions your customers would really ask give the most accurate result.")}
        {limit > 0 && L(` ${active} / ${limit} soru ölçülüyor.`, ` ${active} / ${limit} questions measured.`)}
      </p>
      <Err msg={err} />
      {list.length > 0 && (
        <div className="list">
          {list.map((p) => {
            const r = byPrompt.get(p.id);
            const v = r ? verdict(r) : null;
            return (
              <button key={p.id} className="row" onClick={() => setMenu({ id: p.id, text: p.text, active: p.active })} aria-haspopup="dialog" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
                <span style={{ lineHeight: "22px", color: p.active ? "var(--text)" : "var(--muted)" }}>{p.text}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {!p.active ? <span className="badge b-no">{L("Ölçülmüyor", "Not measured")}</span> : v && <span className={`badge ${v.cls}`}>{v.t}</span>}
                  {p.active && r && r.answers > 0 && <span className="muted tiny">{L(`${r.answers} cevapta`, `in ${r.answers} answers`)}</span>}
                  <span className="muted" style={{ marginLeft: "auto" }}>{Icon.more}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
      {(!limit || active < limit) && <button className="btn btn-ghost" onClick={() => { setErr(null); setAdding(true); }}>{Icon.plus}{L("Soru ekle", "Add question")}</button>}

      <Sheet open={adding} onClose={() => setAdding(false)} title={L("Yeni soru", "New question")}>
        <form onSubmit={add} style={{ display: "flex", flexDirection: "column", gap: 12 }} noValidate>
          <label className="field">{L("Müşterinizin yapay zekâya soracağı soru", "The question your customer would ask an AI")}<input name="q" maxLength={300} autoFocus placeholder={L("Örn. Antalya'da en iyi döner nerede yenir?", "e.g. Where can I get the best pizza in Austin?")} /></label>
          <Err msg={err} />
          <button className="btn btn-primary" disabled={busy}>{L("Soruyu ekle", "Add question")}</button>
        </form>
      </Sheet>
      <Sheet open={!!menu} onClose={() => setMenu(null)} title={menu?.text}>
        {menu && lastRunId && <WhyBlock brandId={brandId} runId={lastRunId} promptId={menu.id} />}
        {menu && <button className="btn btn-ghost" onClick={() => toggle(menu.id, !menu.active)}>{menu.active ? L("Ölçmeyi durdur", "Stop measuring") : L("Yeniden ölç", "Measure again")}</button>}
        {menu && <button className="btn btn-danger" onClick={() => setDel(menu.id)}>{L("Soruyu sil", "Delete question")}</button>}
      </Sheet>
      <Confirm open={!!del} danger title={L("Soru silinsin mi?", "Delete this question?")} text={L("Eski ölçümlerdeki sonuçları raporda kalır.", "Its results in past measurements stay in the report.")} action={L("Sil", "Delete")} onYes={() => del && remove(del)} onNo={() => setDel(null)} />
    </>
  );
}

/** Neden önerildiniz / önerilmediniz: son ölçümde bu sorunun cevapları ve (canlı aramada) kanıtlar. Kanıt gösterir, kesin neden değildir. */
function WhyBlock({ brandId, runId, promptId }: { brandId: string; runId: string; promptId: string }) {
  const sel = useSelectedBrand();
  const brand = sel.brands.find((x) => x.id === brandId);
  const all = useLoad(() => api.answers(runId), [runId]);
  const answers = (all.data ?? []).filter((a) => a.prompt_id === promptId);
  const ments = useLoad(() => (answers.length ? api.mentionsFor(answers.map((a) => a.id)) : Promise.resolve([])), [answers.map((a) => a.id).join(",")]);
  const comps = useLoad(() => api.competitors(brandId), [brandId]);
  const [open, setOpen] = useState<string | null>(null);
  if (all.loading || ments.loading || comps.loading || !brand) return <Spinner />;
  if (!answers.length) return <p className="muted small" style={{ margin: 0 }}>{L("Bu soru son ölçümde sorulmadı.", "This question wasn't asked in the last measurement.")}</p>;
  const brands = [{ id: brand.id, name: brand.name, website: brand.website, isTarget: true }, ...(comps.data ?? []).map((c) => ({ id: c.id, name: c.name, website: c.website, isTarget: false }))];
  const m = ments.data ?? [];
  const recIn = answers.filter((a) => m.some((x) => x.response_id === a.id && x.brand_id === brand.id && x.recommended)).length;
  const card = lossCards(answers, m, brands).find((c) => c.promptId === promptId);
  const comp = card ? card.sources.filter((x) => x.owner === "competitor") : [];
  const third = card ? card.sources.filter((x) => x.owner === "third_party") : [];
  const lines: string[] = [];
  if (card) {
    if (card.winners.length) lines.push(L(`Sizin yerinize önerilen: ${card.winners.map((w) => `${w.name} (${card.answers} cevabın ${w.count} tanesinde)`).join(", ")}.`, `Recommended instead: ${card.winners.map((w) => `${w.name} (${w.count}/${card.answers})`).join(", ")}.`));
    if (card.evidence.includes("absent")) lines.push(L("Bu sorunun hiçbir cevabında adınız geçmedi.", "You weren't named in any answer to this question."));
    if (card.evidence.includes("mentioned_not_recommended")) lines.push(L(`${card.answers} cevabın ${card.targetMentioned} tanesinde adınız geçti ama önerilmediniz.`, `Named in ${card.targetMentioned} of ${card.answers} answers but not recommended.`));
    if (card.evidence.includes("competitor_own_site_cited")) lines.push(L(`Cevap rakibin kendi sitesine dayandı: ${comp.map((x) => x.domain).join(", ")}.`, `The answer relied on a rival's own site: ${comp.map((x) => x.domain).join(", ")}.`));
    if (card.evidence.includes("target_site_not_cited")) lines.push(L("Sizin siteniz kaynak gösterilmedi.", "Your site wasn't cited."));
    if (card.evidence.includes("target_site_cited_anyway")) lines.push(L(`Siteniz ${card.targetSiteCited} cevapta kaynak gösterildi ama önerilmediniz. Sayfanız bu soruya doğrudan cevap vermiyor olabilir.`, `Your site was cited in ${card.targetSiteCited} answers but you weren't recommended. The page may not answer this question directly.`));
    if (card.evidence.includes("third_party_sources")) lines.push(L(`Kullanılan diğer siteler: ${third.slice(0, 5).map((x) => x.domain).join(", ")}. Bu sitelerde yer alıp almadığınızı kontrol edin.`, `Other sites used: ${third.slice(0, 5).map((x) => x.domain).join(", ")}. Check whether you're on them.`));
    if (card.evidence.includes("no_sources")) lines.push(L("Bu cevaplarda kaynak gösterilmedi; neden hakkında kanıt yok.", "No sources were cited; no evidence about the reason."));
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <span style={{ fontWeight: 600 }}>{recIn > 0 ? L(`Son ölçümde ${answers.length} cevabın ${recIn} tanesinde önerildiniz.`, `Recommended in ${recIn} of ${answers.length} answers last time.`) : L("Son ölçümde bu soruda önerilmediniz.", "Not recommended for this question last time.")}</span>
      {lines.length > 0 && (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 6, background: "var(--surface2)" }}>
          <span className="small" style={{ fontWeight: 600 }}>{L("Neden önerilmediniz: kanıtlar", "Why not: the evidence")}</span>
          {lines.map((l) => <span key={l} className="small">{l}</span>)}
          <span className="muted tiny">{L("Bunlar kanıttır, kesin neden değildir; cevaplar ölçümden ölçüme değişir.", "This is evidence, not a proven cause; answers vary between measurements.")}</span>
        </div>
      )}
      <span className="small" style={{ fontWeight: 600 }}>{L("Yapay zekâlar ne dedi?", "What did the AIs say?")}</span>
      {answers.slice(0, 6).map((a) => {
        const rec = m.some((x) => x.response_id === a.id && x.brand_id === brand.id && x.recommended);
        const long = a.answer_text.length > 280, isOpen = open === a.id;
        return (
          <div key={a.id} className="card" style={{ display: "flex", flexDirection: "column", gap: 6, background: "var(--surface2)" }}>
            <span className="small" style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><b>{providerLabel(a.provider)}</b><span className={`badge ${rec ? "b-rec" : "b-no"}`}>{rec ? L("Önerildiniz", "Recommended") : L("Önerilmediniz", "Not recommended")}</span></span>
            <span className="small" style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{long && !isOpen ? a.answer_text.slice(0, 280) + "…" : a.answer_text}</span>
            {long && <button className="btn btn-text" style={{ alignSelf: "flex-start", padding: 0, minHeight: 36 }} onClick={() => setOpen(isOpen ? null : a.id)}>{isOpen ? L("Kısalt", "Show less") : L("Devamını oku", "Read more")}</button>}
          </div>
        );
      })}
    </div>
  );
}

function Runs({ list }: { list: { id: string; status: string; created_at: string; trigger: string; measurement_type: string; prompts_total: number }[] }) {
  if (!list.length) return <p className="muted" style={{ margin: 0 }}>{L("Henüz ölçüm yok.", "No measurements yet.")}</p>;
  const st = (s: string) => s === "done" ? L("Tamamlandı", "Done") : s === "failed" ? L("Tamamlanamadı", "Failed") : s === "running" ? L("Çalışıyor", "Running") : s === "queued" ? L("Sırada", "Queued") : L("Durduruldu", "Stopped");
  return (
    <div className="list">
      {list.map((r) => (
        <div key={r.id} className="row" style={{ flexDirection: "column", alignItems: "stretch", gap: 2 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><span style={{ fontWeight: 600 }}>{r.trigger === "weekly" ? L("Haftalık otomatik ölçüm", "Weekly automatic measurement") : L("Sizin başlattığınız ölçüm", "Measurement you started")}</span><span className="muted small time">{st(r.status)}</span></div>
          <span className="muted small">{formatDateTime(r.created_at)} · {r.measurement_type === "live_search" ? L("canlı aramalı", "live search") : L("aramasız", "without search")}{r.prompts_total ? L(` · ${r.prompts_total} soru`, ` · ${r.prompts_total} questions`) : ""}</span>
        </div>
      ))}
    </div>
  );
}
