// Öneriler: iyileştirme rehberi (kampanya başlatma), yaptıklarım ve sonuçları (önce/sonra), içerik planları, site kontrolü.
// Öneriler sitedekiyle aynı kurallardan çıkar (lib/recommend.ts + engine/src/recommendations.ts); yapay zekâ ile üretilmez.
import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useApp, useLoad } from "../../lib/app";
import { api, type Brand, type BrandAction, type MeasurementType, type Run } from "../../lib/data";
import { friendlyError } from "../../lib/supabase";
import { pct, providerLabel, series } from "../../lib/report";
import { useRecommendations } from "../../lib/recommend";
import { campaignFor, taskProgress } from "../../../../engine/src/campaign.ts";
import { actionImpact } from "../../../../engine/src/insights.ts";
import { L, isEn } from "../../lib/i18n";
import { Confirm, Err, Head, Icon, LoadError, Sheet, Spinner, haptic, isPaid, shownType } from "../ui";
import { useSelectedBrand, NoBrand } from "./Home";

/** Telefonun kendi saatine göre bugünün tarihi (toISOString UTC verir; Türkiye'de gece yarısından sonra bir gün geri kalır). */
const localDay = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };

const TABS = [
  { id: "yapilacak", tr: "Yapılacak", en: "To do" },
  { id: "yaptiklarim", tr: "Yapılan", en: "Done" },
  { id: "icerik", tr: "İçerik", en: "Content" },
  { id: "site", tr: "Site", en: "Website" },
] as const;
type Tab = (typeof TABS)[number]["id"];

/** Önerinin uygulamada yapılacağı yer: kullanıcı tarif okumak yerine tek dokunuşla oraya gider. */
const GO: Record<string, { to: string; tr: string; en: string }> = {
  no_website: { to: "/marka-duzenle", tr: "Web sitesini ekle", en: "Add website" },
  aliases: { to: "/marka-duzenle", tr: "Yazılışları ekle", en: "Add spellings" },
  weekly: { to: "/marka-duzenle", tr: "Haftalık ölçümü aç", en: "Turn on weekly measurement" },
  more_prompts: { to: "/rapor?b=sorular", tr: "Soru ekle", en: "Add questions" },
  absent_prompts: { to: "/rapor?b=sorular", tr: "Soruları gör", en: "See questions" },
};

export function Advice() {
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find((t) => t.id === params.get("b"))?.id ?? "yapilacak") as Tab;
  const sel = useSelectedBrand();
  const b = sel.brand;
  const runs = useLoad(() => (b ? api.runs(b.id) : Promise.resolve([] as Run[])), [b?.id]);
  if (sel.loading || runs.loading) return <Spinner />;
  if (!b) return <NoBrand sel={sel} />;
  if (runs.error) return <LoadError full retry={runs.reload} />;
  const type = shownType(b, runs.data) as MeasurementType;
  return (
    <div className="screen">
      <Head title={L("Öneriler", "Suggestions")} right={<span className="muted small">{b.name}</span>} />
      <div className="tabs" role="tablist" aria-label={L("Öneri bölümleri", "Suggestion sections")}>
        {TABS.map((t) => <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setParams({ b: t.id }, { replace: true })}>{L(t.tr, t.en)}</button>)}
      </div>
      <AdviceBody key={`${b.id}-${type}`} brand={b} type={type} runs={runs.data ?? []} tab={tab} goTab={(t) => setParams({ b: t }, { replace: true })} />
    </div>
  );
}

function AdviceBody({ brand, type, runs, tab, goTab }: { brand: Brand; type: MeasurementType; runs: Run[]; tab: Tab; goTab: (t: Tab) => void }) {
  const rec = useRecommendations(brand, type, runs);
  const nav = useNavigate();
  const camps = useLoad(() => api.actions(brand.id), [brand.id]);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  if (rec.error) return <LoadError retry={() => { rec.prompts.reload(); rec.results.reload(); rec.prevResults.reload(); rec.evidence.reload(); }} />;
  if (rec.loading || !rec.recInput) return <Spinner />;
  const activeRecs = new Set((camps.data ?? []).filter((a) => a.rec_id && a.tasks && taskProgress(a.tasks).done < a.tasks.length).map((a) => a.rec_id!));

  async function startCampaign(r: (typeof rec.recs)[number], tasks: string[]) {
    setErr(null); setMsg(null); haptic.tap();
    try {
      await api.addAction({ workspace_id: brand.workspace_id, brand_id: brand.id, title: r.title.slice(0, 200), note: r.check ? r.check.slice(0, 1000) : null, done_on: localDay(), rec_id: r.id, tasks: tasks.map((t) => ({ t, done: false })) });
      camps.reload(); goTab("yaptiklarim");
    } catch (e) { setErr(friendlyError(e)); }
  }

  if (tab === "yaptiklarim") return <Done brandId={brand.id} workspaceId={brand.workspace_id} />;
  if (tab === "icerik") return <Briefs brandId={brand.id} results={rec.results.data ?? []} />;
  if (tab === "site") return <Website brandId={brand.id} website={brand.website} audit={rec.audit.data ?? null} pendingSince={brand.audit_requested_at} reload={() => rec.audit.reload()} />;

  return (
    <>
      <p className="muted small" style={{ margin: 0 }}>{L("Son ölçüm sonuçlarınızdan kurallarla çıkarıldı. En önemlisi en üstte.", "Derived by rules from your latest results. Most important first.")}</p>
      <Err msg={err} />
      {msg && <p className="ok" role="status">{msg}</p>}
      {rec.recs.length === 0 ? <p className="muted" style={{ margin: 0 }}>{L("Şu an öneri yok. Yeni ölçümlerden sonra tekrar bakın.", "No suggestions right now. Check again after new measurements.")}</p> : rec.recs.map((r) => {
        const tasks = campaignFor(r, rec.recInput!);
        const pri = r.priority === "yüksek" ? L("Önemli", "Important") : r.priority === "orta" ? L("Orta", "Medium") : L("Düşük", "Low");
        return (
          <article key={r.id} className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
              <h3 style={{ fontSize: 17, lineHeight: "24px" }}>{r.title}</h3>
              <span className={`badge ${r.priority === "yüksek" ? "b-men" : "b-no"}`}>{pri}</span>
            </div>
            <p style={{ margin: 0 }}>{r.action}</p>
            <p className="muted small" style={{ margin: 0 }}>{L("Neden: ", "Why: ")}{r.why}</p>
            {r.check && <p className="muted small" style={{ margin: 0 }}>{L("İşe yaradığını nasıl anlarsınız: ", "How you'll know it worked: ")}{r.check}</p>}
            {r.progress && <p className="small" style={{ margin: 0, color: r.progress.status === "improved" ? "var(--accent)" : r.progress.status === "worse" ? "var(--warn)" : "var(--muted)" }}>{r.progress.text}</p>}
            {GO[r.id] && <button className="btn btn-ghost" onClick={() => { haptic.tap(); nav(GO[r.id].to); }}>{L(GO[r.id].tr, GO[r.id].en)}</button>}
            {tasks && (activeRecs.has(r.id)
              ? <button className="btn btn-text" style={{ alignSelf: "flex-start", padding: 0 }} onClick={() => goTab("yaptiklarim")}>{L("Görevleriniz sürüyor", "Your tasks are in progress")} {Icon.chevron}</button>
              : <button className="btn btn-ghost" onClick={() => startCampaign(r, tasks)}>{L(`Adım adım yap (${tasks.length} görev)`, `Do it step by step (${tasks.length} tasks)`)}</button>)}
          </article>
        );
      })}
    </>
  );
}

function Done({ brandId, workspaceId }: { brandId: string; workspaceId: string }) {
  const actions = useLoad(() => api.actions(brandId), [brandId]);
  const live = useLoad(() => api.visibility(brandId, "live_search"), [brandId]);
  const know = useLoad(() => api.visibility(brandId, "model_knowledge"), [brandId]);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rm, setRm] = useState<string | null>(null);
  // Görevler yerelde hemen işaretlenir; kayıt sırayla yapılır, böylece art arda iki dokunuş birbirini silmez
  const [local, setLocal] = useState<Record<string, BrandAction["tasks"]>>({});
  const today = localDay();
  if (actions.loading && !actions.data) return <Spinner />;
  const toPoints = (rows: typeof live.data) => series(rows ?? []).map((p) => ({ at: p.at, k: p.recommend.k, n: p.recommend.n }));
  const engines = [
    ...[...new Set((live.data ?? []).map((r) => r.provider))].map((e) => ({ label: providerLabel(e), points: toPoints((live.data ?? []).filter((r) => r.provider === e)) })),
    { label: L("Gemini (aramasız)", "Gemini (no search)"), points: toPoints(know.data) },
  ].filter((e) => e.points.length > 0);

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const title = String(f.get("t") || "").trim();
    if (title.length < 3) { setErr(L("Ne yaptığınızı kısaca yazın.", "Briefly describe what you did.")); return; }
    setBusy(true); setErr(null);
    try { await api.addAction({ workspace_id: workspaceId, brand_id: brandId, title, note: String(f.get("n") || "").trim() || null, done_on: String(f.get("d") || today) }); setAdding(false); actions.reload(); }
    catch (x) { setErr(friendlyError(x)); } finally { setBusy(false); }
  }
  const tasksOf = (a: BrandAction) => local[a.id] ?? a.tasks;
  async function toggle(a: BrandAction, ix: number) {
    const tasks = (tasksOf(a) ?? []).map((t, j) => (j === ix ? { ...t, done: !t.done } : t));
    setLocal((m) => ({ ...m, [a.id]: tasks }));
    haptic.tap();
    try { await api.updateActionTasks(a.id, tasks!); } catch (x) { setErr(friendlyError(x)); setLocal((m) => { const n = { ...m }; delete n[a.id]; return n; }); }
  }
  async function remove(id: string) { setRm(null); try { await api.deleteAction(id); actions.reload(); } catch (x) { setErr(friendlyError(x)); } }
  const rate = (p: { k: number; n: number }) => (p.n ? pct(p.k / p.n) : "%0");
  const list = actions.data ?? [];

  return (
    <>
      <p className="muted small" style={{ margin: 0 }}>{L("Yaptığınız işleri tarihiyle yazın. Öncesindeki ve sonrasındaki ölçümü karşılaştırırız. Değişimin nedeni yalnız sizin işiniz olmayabilir; yapay zekâlar da değişir.", "Log what you did with its date. We compare the measurement before and after. The change may not be caused only by your work; the AIs change too.")}</p>
      <Err msg={err} />
      {list.length === 0 && <p className="muted" style={{ margin: 0 }}>{L("Henüz kayıt yok.", "Nothing logged yet.")}</p>}
      {list.map((a) => {
        const tk = tasksOf(a);
        const pr = tk ? taskProgress(tk) : null;
        return (
          <article key={a.id} className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <h3 style={{ fontSize: 17, lineHeight: "24px" }}>{a.title}</h3>
              <span className="muted small time">{new Date(a.done_on + "T00:00:00").toLocaleDateString(isEn() ? "en-US" : "tr-TR", { day: "numeric", month: "short" })}</span>
            </div>
            {pr && (
              <>
                <span className="small">{L(`${pr.total} görevden ${pr.done} tanesi bitti`, `${pr.done} of ${pr.total} tasks done`)}</span>
                <div className="meter"><i style={{ width: `${pr.total ? (100 * pr.done) / pr.total : 0}%` }} /></div>
                <div className="list" style={{ background: "var(--surface2)" }}>
                  {tk!.map((t, ix) => (
                    <label key={ix} className="row" style={{ justifyContent: "flex-start" }}>
                      <input type="checkbox" checked={t.done} onChange={() => toggle(a, ix)} style={{ width: 24, height: 24, accentColor: "var(--brand)", flexShrink: 0 }} />
                      <span style={{ color: t.done ? "var(--muted)" : "var(--text)", textDecoration: t.done ? "line-through" : "none" }}>{t.t}</span>
                    </label>
                  ))}
                </div>
              </>
            )}
            {engines.map((en) => {
              const im = actionImpact(en.points, a.done_on);
              const text = im.verdict === "no_before" ? L("öncesinde ölçüm yok", "no measurement before")
                : im.verdict === "no_after" ? L(`önce ${rate(im.before!)}, sonraki ölçüm bekleniyor`, `before ${rate(im.before!)}, waiting for the next measurement`)
                : L(`önce ${rate(im.before!)}, sonra ${rate(im.after!)}`, `before ${rate(im.before!)}, after ${rate(im.after!)}`)
                  + (im.verdict === "up" ? L(" · belirgin artış", " · clear rise") : im.verdict === "down" ? L(" · belirgin düşüş", " · clear drop") : L(" · fark ölçüm oynaklığı içinde", " · within measurement noise"));
              return <span key={en.label} className="small"><span className="muted">{en.label}: </span>{text}</span>;
            })}
            <button className="btn btn-text" style={{ alignSelf: "flex-end", color: "var(--muted)", minHeight: 48, padding: "0 8px" }} onClick={() => setRm(a.id)}>{L("Sil", "Delete")}</button>
          </article>
        );
      })}
      <button className="btn btn-ghost" onClick={() => { setErr(null); setAdding(true); }}>{Icon.plus}{L("Yaptığım bir işi ekle", "Log something I did")}</button>
      <Sheet open={adding} onClose={() => setAdding(false)} title={L("Ne yaptınız?", "What did you do?")}>
        <form onSubmit={add} style={{ display: "flex", flexDirection: "column", gap: 12 }} noValidate>
          <label className="field">{L("Yaptığınız iş", "What you did")}<input name="t" maxLength={200} autoFocus placeholder={L("Örn. Sitemize SSS sayfası ekledik", "e.g. We added an FAQ page")} /></label>
          <label className="field">{L("Tarih", "Date")}<input name="d" type="date" defaultValue={today} max={today} /></label>
          <label className="field">{L("Not (isteğe bağlı)", "Note (optional)")}<input name="n" maxLength={1000} /></label>
          <Err msg={err} />
          <button className="btn btn-primary" disabled={busy}>{L("Kaydet", "Save")}</button>
        </form>
      </Sheet>
      <Confirm open={!!rm} danger title={L("Bu kayıt silinsin mi?", "Delete this entry?")} action={L("Sil", "Delete")} onYes={() => rm && remove(rm)} onNo={() => setRm(null)} />
    </>
  );
}

function Briefs({ brandId, results }: { brandId: string; results: { prompt_id: string; prompt_text: string; answers: number; target_recommended: number }[] }) {
  const { current } = useApp();
  const paid = isPaid(current);
  const nav = useNavigate();
  const briefs = useLoad(() => (paid ? api.contentBriefs(brandId) : Promise.resolve([])), [brandId, paid]);
  const [open, setOpen] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const lost = results.filter((r) => r.answers > 0 && r.target_recommended === 0);
  const latest = new Map<string, NonNullable<typeof briefs.data>[number]>();
  for (const b of briefs.data ?? []) if (!latest.has(b.prompt_id)) latest.set(b.prompt_id, b);
  const req = async (pid: string) => { setErr(null); haptic.tap(); try { await api.requestBrief(brandId, pid); briefs.reload(); } catch (e) { setErr(friendlyError(e)); } };
  const openBrief = [...latest.values()].find((x) => x.id === open)?.brief ?? null;
  return (
    <>
      <p className="muted small" style={{ margin: 0 }}>{L("Önerilmediğiniz her soru için sitenize yazılacak sayfanın planı: başlık, bölümler, yazılması gereken bilgiler ve sık sorulan sorular.", "For each question you weren't recommended in, a plan for the page to add to your website: title, sections, facts to include and FAQ.")}</p>
      {!paid ? <div className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}><span>{L("İçerik planları ücretli paketlerde açık.", "Content plans are available on paid plans.")}</span><button className="btn btn-text" style={{ alignSelf: "flex-start", padding: 0 }} onClick={() => nav("/paket")}>{L("Paketleri gör", "See plans")} {Icon.chevron}</button></div>
        : lost.length === 0 ? <p className="muted" style={{ margin: 0 }}>{L("Son ölçümde önerilmediğiniz soru yok.", "No questions you weren't recommended in last time.")}</p> : (
        <div className="list">
          {lost.map((r) => {
            const b = latest.get(r.prompt_id);
            return (
              <div key={r.prompt_id} className="row" style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}>
                <span>{r.prompt_text}</span>
                {!b ? <button className="btn btn-text" style={{ alignSelf: "flex-start", padding: 0 }} onClick={() => req(r.prompt_id)}>{L("Plan hazırla", "Prepare a plan")}</button>
                  : b.status === "queued" ? <span className="muted small">{L("Plan hazırlanıyor. Hazır olunca burada görünür.", "Preparing the plan. It appears here when ready.")}</span>
                  : b.status === "failed" ? <button className="btn btn-text" style={{ alignSelf: "flex-start", padding: 0 }} onClick={() => req(r.prompt_id)}>{L("Hazırlanamadı, tekrar dene", "Failed, try again")}</button>
                  : <button className="btn btn-text" style={{ alignSelf: "flex-start", padding: 0 }} onClick={() => setOpen(b.id)}>{L("Planı aç", "Open plan")} {Icon.chevron}</button>}
              </div>
            );
          })}
        </div>
      )}
      <Err msg={err} />
      <Sheet open={!!openBrief} onClose={() => setOpen(null)} title={openBrief?.title}>
        {openBrief && (
          <>
            {openBrief.angle && <p className="muted" style={{ margin: 0 }}>{openBrief.angle}</p>}
            <h3 style={{ fontSize: 16 }}>{L("Bölümler", "Sections")}</h3>
            <ol style={{ margin: 0, paddingLeft: 20 }}>{openBrief.outline.map((x) => <li key={x}>{x}</li>)}</ol>
            {openBrief.mustInclude.length > 0 && <><h3 style={{ fontSize: 16 }}>{L("Mutlaka yazın", "Be sure to include")}</h3><ul style={{ margin: 0, paddingLeft: 20 }}>{openBrief.mustInclude.map((x) => <li key={x.item}>{x.item}{x.verify && <span className="muted small"> {L("(kendi doğru bilginizle)", "(with your own accurate facts)")}</span>}</li>)}</ul></>}
            {openBrief.faq.length > 0 && <><h3 style={{ fontSize: 16 }}>{L("Sık sorulan sorular", "FAQ")}</h3><ul style={{ margin: 0, paddingLeft: 20 }}>{openBrief.faq.map((x) => <li key={x}>{x}</li>)}</ul></>}
            {openBrief.sites.length > 0 && <p className="small" style={{ margin: 0 }}><span className="muted">{L("Yapay zekânın baktığı siteler: ", "Sites the AI relied on: ")}</span>{openBrief.sites.join(", ")}</p>}
          </>
        )}
      </Sheet>
    </>
  );
}

function Website({ brandId, website, audit, pendingSince, reload }: { brandId: string; website: string | null; audit: { status: string; created_at: string; checks: { id: string; ok: boolean; severity: string; title: string; detail: string; title_en?: string; detail_en?: string }[] } | null; pendingSince: string | null; reload: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  if (!website) return <p className="card" style={{ margin: 0 }}>{L("Markanıza web sitesi eklenmemiş. Site kontrolü için web sitesi gerekir.", "No website is set for this brand. The website check needs one.")}</p>;
  const pending = pendingSince && (!audit || audit.created_at < pendingSince);
  async function check() {
    setBusy(true); setErr(null); setMsg(null); haptic.tap();
    try { await api.requestAudit(brandId); setMsg(L("Kontrol sıraya alındı. Sonuç hazır olunca burada görünür.", "Check queued. Results appear here when ready.")); reload(); }
    catch (e) { setErr(friendlyError(e)); } finally { setBusy(false); }
  }
  const failing = (audit?.checks ?? []).filter((c) => !c.ok);
  const ok = (audit?.checks ?? []).filter((c) => c.ok);
  return (
    <>
      <p className="muted small" style={{ margin: 0 }}>{L(`${website.replace(/^https?:\/\//, "")} sitesinin yapay zekâların okuyabileceği şekilde hazırlanıp hazırlanmadığına bakarız.`, `We check whether ${website.replace(/^https?:\/\//, "")} is set up so AIs can read it.`)}</p>
      {audit?.status === "unreachable" && <p className="error">{L("Siteye ulaşılamadı.", "The website could not be reached.")}</p>}
      {failing.length > 0 && <><h2 className="label">{L("Düzeltilecekler", "To fix")}</h2><div className="list">{failing.map((c) => (
        <div key={c.id} className="row" style={{ flexDirection: "column", alignItems: "stretch", gap: 4 }}>
          <span style={{ fontWeight: 600 }}>{isEn() ? c.title_en ?? c.title : c.title}</span>
          <span className="muted small">{isEn() ? c.detail_en ?? c.detail : c.detail}</span>
        </div>))}</div></>}
      {ok.length > 0 && <p className="muted small" style={{ margin: 0 }}>{L(`${ok.length} kontrol sorunsuz.`, `${ok.length} checks passed.`)}</p>}
      {!audit && !pending && <p className="muted" style={{ margin: 0 }}>{L("Henüz kontrol yapılmadı.", "Not checked yet.")}</p>}
      <Err msg={err} />
      {msg && <p className="ok" role="status">{msg}</p>}
      {pending ? <p className="ok" role="status">{L("Kontrol sırada.", "Check queued.")}</p> : <button className="btn btn-ghost" onClick={check} disabled={busy}>{L("Siteyi şimdi kontrol et", "Check the website now")}</button>}
    </>
  );
}
