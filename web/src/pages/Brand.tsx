import { useMemo, useState, type FormEvent } from "react";
import { SECTORS, competitorSuggestions, questionTemplates, sectorDef } from "../lib/sectors";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useApp, useLoad } from "../lib/app";
import { api, INTENT_LABEL, type Brand, type Intent, type MeasurementType, type Prompt, type Run } from "../lib/data";
import { friendlyError } from "../lib/supabase";
import { L, isEn } from "../lib/i18n";
import { ERROR_CLASS_TEXT, STOP_TEXT, runStatusText } from "../lib/messages";
import { actionImpact, conditionMap, lossCards, sourceDominance, type LossCard, type SourceRow } from "../../../engine/src/insights.ts";
import { competitorsInRun, formatDateTime, MIN_SAMPLE, numLoc, pct, providerLabel, rangeText, series, shareSummary, sourceOpportunities, topDomains, usd } from "../lib/report";
import { Button, Confirm, DataNotice, Empty, ErrorBox, Field, Loading, Select, TypeBadge } from "../components/ui";
import { CompareBars, TrendChart } from "../components/Chart";
import { buildRecommendations } from "../../../engine/src/recommendations.ts";
import { untrackedNames } from "../../../engine/src/metrics.ts";

const TABS = [
  ["rapor", L("Rapor", "Report")], ["oneriler", L("Öneriler", "Recommendations")], ["rakipler", L("Rakipler", "Competitors")], ["sorular", L("Sorular", "Questions")], ["olcumler", L("Ölçümler", "Runs")],
] as const;
type Tab = (typeof TABS)[number][0];

export function BrandPage() {
  const { id = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("sekme") as Tab) || "rapor";
  const { current } = useApp();
  const brand = useLoad(() => api.brand(id), [id]);
  const runs = useLoad(() => api.runs(id), [id]);
  const [editing, setEditing] = useState(false);

  if (brand.loading) return <Loading />;
  if (brand.error || !brand.data) return <ErrorBox message={L("Marka bulunamadı veya bu markayı görme yetkiniz yok.", "Brand not found, or you don't have access to it.")} />;
  const b = brand.data;
  const runList = runs.data ?? [];
  const hasLive = runList.some((r) => r.measurement_type === "live_search" && r.status === "done");
  const view = params.get("tur") === "canli" && hasLive ? "live_search" : null;
  const type: MeasurementType = current?.kind === "demo_lab" ? "simulated" : view ?? "model_knowledge";
  const setView = (v: "canli" | "aramasiz") => { const n = new URLSearchParams(params); n.set("tur", v); setParams(n, { replace: true }); };

  return (
    <div className="stack">
      <header className="page-head brand-head">
        <Link to="/panel" className="back">{L("Panele dön", "Back to dashboard")}</Link>
        {editing ? (
          <BrandEditForm brand={b} onDone={(changed) => { setEditing(false); if (changed) brand.reload(); }} />
        ) : (
          <>
            <h1>{b.name}</h1>
            <p className="muted">
              {[b.sector, b.city, b.website].filter(Boolean).join(", ") || L("Ayrıntı girilmedi", "No details yet")}
              <button className="link-btn" onClick={() => setEditing(true)}>{L("Düzenle", "Edit")}</button>
            </p>
            <RunControl brand={b} runs={runList} onChange={runs.reload} paidAllowed={!!current?.paid_live_allowed} workspaceId={current?.id ?? ""} />
          </>
        )}
      </header>
      <nav className="tabs" role="tablist" aria-label={L("Marka bölümleri", "Brand sections")}>
        {TABS.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => { const n = new URLSearchParams(params); n.set("sekme", k); setParams(n, { replace: true }); }}>{label}</button>
        ))}
      </nav>
      {hasLive && current?.kind !== "demo_lab" && (tab === "rapor" || tab === "oneriler") && (
        <div className="seg type-switch" role="group" aria-label={L("Ölçüm türü", "Measurement type")}>
          <button aria-pressed={type === "model_knowledge"} onClick={() => setView("aramasiz")}>{L("Aramasız (Gemini)", "No search (Gemini)")}</button>
          <button aria-pressed={type === "live_search"} onClick={() => setView("canli")}>{L("Canlı aramalı (ChatGPT)", "Live search (ChatGPT)")}</button>
        </div>
      )}
      {tab === "rapor" && <Report brand={b} type={type} onBrandChange={brand.reload} />}
      {tab === "oneriler" && <Advice brand={b} type={type} runs={runs.data ?? []} onBrandChange={brand.reload} />}
      {tab === "rakipler" && <Competitors brand={b} />}
      {tab === "sorular" && <Questions brand={b} />}
      {tab === "olcumler" && <RunHistory runs={runs.data ?? []} loading={runs.loading} />}
    </div>
  );
}

const splitAliases = (v: FormDataEntryValue | null) => String(v || "").split(",").map((x) => x.trim()).filter(Boolean);

function BrandEditForm({ brand, onDone }: { brand: Brand; onDone: (changed: boolean) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name")).trim();
    if (!name) { setErr(L("Marka adı gerekli.", "Brand name is required.")); return; }
    setBusy(true); setErr(null);
    try {
      await api.updateBrand(brand.id, {
        name, aliases: splitAliases(f.get("aliases")),
        website: String(f.get("website") || "").trim() || null,
        sector: String(f.get("sector") || "") || null,
        city: String(f.get("city") || "").trim() || null,
        country: /^[A-Za-z]{2}$/.test(String(f.get("country") || "").trim()) ? String(f.get("country")).trim().toUpperCase() : null,
        ...(brand.data_origin !== "simulated" ? { auto_weekly: f.get("auto_weekly") === "on" } : {}),
      });
      onDone(true);
    } catch (e) { setErr(friendlyError(e)); setBusy(false); }
  }
  return (
    <form className="panel stack" onSubmit={save} noValidate aria-label={L("Markayı düzenle", "Edit brand")}>
      <h2>{L("Markayı düzenle", "Edit brand")}</h2>
      <Field label={L("Marka adı", "Brand name")} name="name" defaultValue={brand.name} required maxLength={120} />
      <Field label={L("Diğer yazılışlar", "Other spellings")} name="aliases" defaultValue={brand.aliases.join(", ")} hint={L("Virgülle ayırın", "Comma-separated")} />
      <Field label="Web sitesi" name="website" defaultValue={brand.website ?? ""} inputMode="url" />
      <Select label={L("Sektör", "Sector")} name="sector" defaultValue={brand.sector ?? ""}>
        <option value="">{L("Seçilmedi", "Not set")}</option>
        {SECTORS.map((x) => <option key={x}>{x}</option>)}
        {brand.sector && !SECTORS.includes(brand.sector) && <option>{brand.sector}</option>}
      </Select>
      <Field label={L("Şehir veya ilçe", "City or area")} name="city" defaultValue={brand.city ?? ""} />
      <Field label={L("Ülke kodu (canlı arama konumu)", "Country code (live-search location)")} name="country" defaultValue={brand.country ?? ""} maxLength={2} placeholder="TR"
        hint={L("İki harf: TR, US, DE, GB… Boş bırakılırsa Türkiye. ChatGPT web aramasını bu ülkeden yapılmış gibi çalıştırır.", "Two letters: US, GB, DE, TR… Empty means Turkey. ChatGPT runs its web search as if from this country.")} />
      {brand.data_origin !== "simulated" && (
        <label className="check">
          <input type="checkbox" name="auto_weekly" defaultChecked={brand.auto_weekly} />
          <span>{L("Her hafta otomatik ölç", "Measure automatically every week")} <em className="muted">{L("(paket kotası yetmezse o hafta atlanır)", "(skipped that week if your plan quota runs out)")}</em></span>
        </label>
      )}
      <p className="muted">{L("Ad veya yazılışlar değişirse yeni ölçümler yeni adla yapılır; eski ölçümler olduğu gibi kalır.", "If the name or spellings change, past measurements are recalculated for free with the new details.")}</p>
      <ErrorBox message={err} />
      <div className="form-actions">
        <Button type="submit" busy={busy}>Kaydet</Button>
        <Button type="button" variant="quiet" onClick={() => onDone(false)}>{L("Vazgeç", "Cancel")}</Button>
      </div>
    </form>
  );
}

function CompetitorRow({ c, onChange }: { c: Brand; onChange: () => void }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!editing) {
    return (
      <li>
        <span><strong>{c.name}</strong>{c.aliases.length > 0 && <span className="q-meta">{c.aliases.join(", ")}</span>}{c.website && <span className="q-meta">{c.website}</span>}</span>
        <span className="row-actions">
          <button className="link-btn" onClick={() => setEditing(true)}>{L("Düzenle", "Edit")}</button>
          <Confirm label={`${c.name} silinsin mi?`} onConfirm={async () => { await api.deleteBrand(c.id); onChange(); }}>Sil</Confirm>
        </span>
      </li>
    );
  }
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name")).trim();
    if (!name) { setErr(L("Rakip adı gerekli.", "Competitor name is required.")); return; }
    setBusy(true); setErr(null);
    try {
      await api.updateBrand(c.id, { name, aliases: splitAliases(f.get("aliases")), website: String(f.get("website") || "").trim() || null });
      setEditing(false); onChange();
    } catch (e) { setErr(friendlyError(e)); } finally { setBusy(false); }
  }
  return (
    <li className="editing">
      <form className="stack edit-inline" onSubmit={save} noValidate aria-label={L(`${c.name} düzenle`, `Edit ${c.name}`)}>
        <Field label={L("Rakip adı", "Competitor name")} name="name" defaultValue={c.name} required maxLength={120} />
        <Field label={L("Diğer yazılışlar", "Other spellings")} name="aliases" defaultValue={c.aliases.join(", ")} hint={L("Virgülle ayırın", "Comma-separated")} />
        <Field label="Web sitesi" name="website" defaultValue={c.website ?? ""} inputMode="url" />
        <ErrorBox message={err} />
        <div className="form-actions">
          <Button type="submit" busy={busy} className="btn-small">Kaydet</Button>
          <Button type="button" variant="quiet" className="btn-small" onClick={() => setEditing(false)}>{L("Vazgeç", "Cancel")}</Button>
        </div>
      </form>
    </li>
  );
}

/** Son ölçümden 7 gün sonra (işçi saatlik çalıştığı için yaklaşık). */
function nextWeekly(runs: Run[]): string | null {
  const last = runs.find((r) => r.status !== "failed");
  if (!last) return L("ilk ölçümden sonra", "after the first measurement");
  const d = new Date(new Date(last.created_at).getTime() + 7 * 86_400_000);
  return d < new Date() ? L("bir saat içinde", "within an hour") : d.toLocaleDateString(isEn() ? "en-US" : "tr-TR", { day: "numeric", month: "long", weekday: "long" });
}

function RunControl({ brand, runs, onChange, paidAllowed, workspaceId }: { brand: Brand; runs: Run[]; onChange: () => void; paidAllowed: boolean; workspaceId: string }) {
  const [busy, setBusy] = useState<"free" | "live" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const budget = useLoad(() => (paidAllowed ? api.paidBudget(workspaceId) : Promise.resolve(null)), [paidAllowed, workspaceId, runs.length]);
  const pending = runs.find((r) => r.status === "queued" || r.status === "running");
  async function start(live: boolean) {
    setBusy(live ? "live" : "free"); setErr(null);
    try { await api.requestRun(brand.id, live); onChange(); } catch (e) { setErr(friendlyError(e)); } finally { setBusy(null); }
  }
  const b = budget.data;
  const left = b ? Math.max(Number(b.cap_usd) - Number(b.spent_usd), 0) : 0;
  return (
    <div className="run-control">
      {pending ? (
        <p className="run-pending" role="status">
          {isEn()
            ? <>Measurement {pending.status === "queued" ? "queued" : "running"} ({formatDateTime(pending.created_at)}). Measurements run in order on the server; this page updates when results arrive.</>
            : <>Ölçüm {pending.status === "queued" ? "sırada" : "çalışıyor"} ({formatDateTime(pending.created_at)}). Ölçümler sunucuda sırayla işlenir; sonuç gelince bu sayfa güncellenir.</>}
          <button className="link-btn" onClick={onChange}>Yenile</button>
        </p>
      ) : paidAllowed && brand.data_origin !== "simulated" ? (
        <div className="run-buttons">
          <Button busy={busy === "free"} disabled={!!busy} onClick={() => start(false)}>{L("Ölçüm başlat (aramasız, ücretsiz)", "Start measurement (no search, free)")}</Button>
          <Button variant="quiet" busy={busy === "live"} disabled={!!busy || left < 0.05} onClick={() => start(true)}>{L("Canlı aramalı ölçüm (ChatGPT, ücretli)", "Live-search measurement (ChatGPT, paid)")}</Button>
          {b && <p className="muted paid-note">{isEn()
            ? <>Paid trial budget: {usd(Number(b.spent_usd))} of {usd(Number(b.cap_usd))} used. One measurement costs about {usd(0.019 * 2 * Math.max(runs[0]?.prompts_total ?? 10, 1))}. It stops automatically at the cap.</>
            : <>Ücretli deneme bütçesi: {usd(Number(b.spent_usd))} / {usd(Number(b.cap_usd))} kullanıldı. Bir ölçüm yaklaşık {usd(0.019 * 2 * Math.max(runs[0]?.prompts_total ?? 10, 1))} tutar. Tavana gelince kendiliğinden durur.</>}</p>}
        </div>
      ) : (
        <Button busy={busy === "free"} onClick={() => start(false)}>{L("Ölçüm başlat", "Start measurement")}</Button>
      )}
      {brand.data_origin !== "simulated" && (
        <p className="muted weekly-note">
          {brand.auto_weekly ? <>{L("Haftalık otomatik ölçüm açık", "Weekly automatic measurement on")}{nextWeekly(runs) && <>{L(", sıradaki: ", ", next: ")}{nextWeekly(runs)}</>}.</> : L("Haftalık otomatik ölçüm kapalı.", "Weekly automatic measurement off.")}
        </p>
      )}
      <ErrorBox message={err} />
    </div>
  );
}

/** Kayıp Nedeni Kartı: yalnız kanıt gösterir; kanıt yoksa neden üretmez. */
function LossCardView({ card, brand, hasSite }: { card: LossCard; brand: string; hasSite: boolean }) {
  const comp = card.sources.filter((s) => s.owner === "competitor");
  const third = card.sources.filter((s) => s.owner === "third_party");
  const lines: string[] = [];
  lines.push(isEn()
    ? `Recommended instead: ${card.winners.map((w) => `${w.name} (${w.count}/${card.answers})`).join(", ")}.`
    : `Sizin yerinize önerilen: ${card.winners.map((w) => `${w.name} (${card.answers} cevabın ${w.count}'inde)`).join(", ")}.`);
  if (card.evidence.includes("absent")) lines.push(L(`${brand} bu sorunun hiçbir cevabında geçmedi.`, `${brand} did not appear in any answer to this question.`));
  if (card.evidence.includes("mentioned_not_recommended")) lines.push(isEn() ? `${brand} was mentioned in ${card.targetMentioned} of ${card.answers} answers but never recommended.` : `${brand}, ${card.answers} cevabın ${card.targetMentioned}'inde anıldı ama hiç önerilmedi.`);
  if (card.evidence.includes("competitor_own_site_cited")) lines.push(L(`Cevap, rakibin kendi sitesine dayandı: ${comp.map((s) => `${s.domain} (${s.ownerName})`).join(", ")}.`, `The answer relied on a competitor's own site: ${comp.map((s) => `${s.domain} (${s.ownerName})`).join(", ")}.`));
  if (card.evidence.includes("target_site_not_cited")) lines.push(L("Sizin siteniz bu sorunun hiçbir cevabında kaynak gösterilmedi.", "Your site was not cited in any answer to this question."));
  if (card.evidence.includes("target_site_cited_anyway")) lines.push(isEn() ? `Your site was cited in ${card.targetSiteCited} answers, yet you were not recommended. The page may not answer this question directly.` : `Siteniz ${card.targetSiteCited} cevapta kaynak gösterildi ama yine de önerilmediniz. Sayfanız bu soruya doğrudan cevap vermiyor olabilir.`);
  if (card.evidence.includes("third_party_sources")) lines.push(L(`Kullanılan üçüncü taraf kaynaklar: ${third.slice(0, 5).map((s) => s.domain).join(", ")}. Bu sitelerde yer alıp almadığınızı kontrol edin.`, `Third-party sources used: ${third.slice(0, 5).map((s) => s.domain).join(", ")}. Check whether you are featured on them.`));
  if (card.evidence.includes("no_sources")) lines.push(L("Bu cevaplarda kaynak gösterilmedi; neden hakkında kanıt yok.", "These answers cited no sources; there is no evidence about the reason."));
  if (!hasSite) lines.push(L("Markanıza web sitesi eklenmemiş; sitenizin kaynak gösterilip gösterilmediği ölçülemedi.", "No website is set for your brand, so we couldn't check whether your site was cited."));
  return (
    <div className="loss-card">
      <p className="loss-title">{L("Kayıp nedeni: kanıtlar", "Why you lost: the evidence")}</p>
      <ul>{lines.map((l) => <li key={l}>{l}</li>)}</ul>
      <p className="loss-note muted">{isEn() ? `Based on ${card.answers} answers. This is evidence, not a proven cause; AI answers vary between runs.` : `${card.answers} cevaba dayanır. Bunlar kanıttır, kesin neden değildir; yapay zekâ cevapları ölçümden ölçüme değişir.`}</p>
    </div>
  );
}

const ENGINE_ORDER = ["openai", "claude", "gemini", "mock"];

function Report({ brand, type, onBrandChange }: { brand: Brand; type: MeasurementType; onBrandChange: () => void }) {
  const vis = useLoad(() => api.visibility(brand.id, type), [brand.id, type]);
  const [metric, setMetric] = useState<"recommend" | "mention">("recommend");
  // Canlı aramada birden çok motor olabilir (ChatGPT, Claude): oranlar motor bazında ayrı gösterilir, karıştırılmaz
  const engList = [...new Set((vis.data ?? []).map((r) => r.provider))].sort((x, y) => ENGINE_ORDER.indexOf(x) - ENGINE_ORDER.indexOf(y));
  const [engPick, setEngPick] = useState<string | null>(null);
  const eng = engList.length > 1 ? (engPick && engList.includes(engPick) ? engPick : engList[0]) : null;
  const rows = eng ? (vis.data ?? []).filter((r) => r.provider === eng) : vis.data;
  const pts = series(rows ?? []);
  const last = pts[pts.length - 1];
  const prompts = useLoad(() => (last ? api.promptResults(last.runId, eng) : Promise.resolve([])), [last?.runId, eng]);
  const answersAll = useLoad(() => (last ? api.answers(last.runId) : Promise.resolve([])), [last?.runId]);
  // useMemo: süzülmüş dizi her çizimde yeniden oluşmasın (aşağıdaki yüklemeler buna bağlı)
  const answersData = useMemo(() => (answersAll.data && eng ? answersAll.data.filter((x) => x.provider === eng) : answersAll.data), [answersAll.data, eng]);
  const answers = { ...answersAll, data: answersData };
  const live = type === "live_search";
  const engine = type === "simulated" ? L("Simülasyonda", "In the simulation") : live ? (eng === "claude" ? L("Claude (canlı web aramasıyla)", "Claude (with live web search)") : L("ChatGPT (canlı web aramasıyla)", "ChatGPT (with live web search)")) : "Gemini";
  const domains = live ? topDomains((answers.data ?? []).flatMap((a) => a.cited_urls ?? [])) : [];
  const comps = useLoad(() => api.competitors(brand.id), [brand.id, brand.aliases.join("|")]);
  const ments = useLoad(() => (live && answers.data ? api.mentionsFor(answers.data.map((a) => a.id)) : Promise.resolve([])), [live, answers.data]);
  const host = (w: string | null) => (w ? w.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].toLowerCase() : "");
  const opps = live && answers.data && ments.data
    ? sourceOpportunities(answers.data, ments.data, brand.id, [brand.website, ...(comps.data ?? []).map((c) => c.website)].map(host).filter(Boolean))
    : [];
  // Koşullu görünürlük: son 4 ölçümün cevapları soru niyetine göre toplanır (ek API çağrısı yok)
  const recentIds = pts.slice(-4).map((p) => p.runId);
  const condRuns = useLoad(() => Promise.all(recentIds.map((id) => api.promptResults(id, eng))), [recentIds.join(","), eng]);
  const conditions = conditionMap(condRuns.data ?? []);
  const allPrompts = useLoad(() => api.prompts(brand.id), [brand.id]);
  const segOf = new Map((allPrompts.data ?? []).filter((q) => q.segment).map((q) => [q.id, q.segment as string]));
  const segments = conditionMap((condRuns.data ?? []).map((rows) => rows.filter((r) => segOf.has(r.prompt_id)).map((r) => ({ ...r, intent: segOf.get(r.prompt_id)! }))));
  const condRow = (c: (typeof conditions)[number], label: string) => (
    <li key={label}>
      <p className="src-head"><strong>{label}</strong> <span className="num">{pct(c.answers ? c.recommended / c.answers : 0)}</span></p>
      <p className="src-sup muted">{isEn() ? `Recommended in ${c.recommended} of ${c.answers} answers, range ${pct(c.low)}–${pct(c.high)}` : `${c.answers} cevabın ${c.recommended} tanesinde önerildiniz, aralık ${pct(c.low)}–${pct(c.high)}`}{c.topCompetitor && <>{L("; en çok önerilen rakip: ", "; most recommended competitor: ")}{c.topCompetitor}</>}.</p>
      {c.lowSample && <p className="src-sup muted">{L("Örneklem küçük: bu grupta daha fazla soru ekleyin.", "Small sample: add more questions of this kind.")}</p>}
    </li>
  );
  const [open, setOpen] = useState<string | null>(null);
  // Kaynak egemenliği ve kayıp nedeni kanıtları (yalnız canlı aramalı ölçümde; ek API çağrısı yok)
  const insightBrands = [{ id: brand.id, name: brand.name, website: brand.website, isTarget: true },
    ...(comps.data ?? []).map((c) => ({ id: c.id, name: c.name, website: c.website, isTarget: false }))];
  const insightsReady = live && !!answers.data && !!ments.data && !!comps.data;
  const dominance: SourceRow[] = insightsReady ? sourceDominance(answers.data!, ments.data!, insightBrands) : [];
  const losses = new Map<string, LossCard>((insightsReady ? lossCards(answers.data!, ments.data!, insightBrands) : []).map((c) => [c.promptId, c]));

  if (vis.loading) return <Loading />;
  if (vis.error) return <ErrorBox message={vis.error} />;

  return (
    <div className="stack">
      <DataNotice type={type} />
      {!last ? (
        <Empty title={L("Henüz tamamlanmış ölçüm yok", "No completed measurements yet")}>
          {isEn()
            ? <p>First set up <Link to="?sekme=sorular">questions</Link> and <Link to="?sekme=rakipler">competitors</Link>, then start a measurement above.</p>
            : <p>Önce <Link to="?sekme=sorular">soruları</Link> ve <Link to="?sekme=rakipler">rakipleri</Link> tanımlayın, sonra yukarıdan ölçüm başlatın.</p>}
        </Empty>
      ) : (
        <>
          {engList.length > 1 && (
            <div className="seg" role="group" aria-label={L("Yapay zekâ motoru", "AI engine")}>
              {engList.map((e) => <button key={e} aria-pressed={e === eng} onClick={() => setEngPick(e)}>{providerLabel(e)}</button>)}
            </div>
          )}
          <section className="panel lead-result">
            <div className="lead-meta"><TypeBadge type={type} /><span className="muted">{formatDateTime(last.at)}, {last.providers.map(providerLabel).join(", ")}</span></div>
            <p className="lead-sentence">
              {isEn()
                ? <>{engine} recommended {brand.name} in <strong>{last.recommend.k}</strong> of <strong>{last.recommend.n}</strong> answers.</>
                : <>{engine}, <strong>{last.recommend.n}</strong> cevabın <strong>{numLoc(last.recommend.k)}</strong> {brand.name} markasını önerdi.</>}
            </p>
            <dl className="metrics">
              <div><dt>{L("Önerilme", "Recommended")}</dt><dd className="num">{pct(last.recommend.value)}</dd><dd className="range">{L("aralık", "range")} {rangeText(last.recommend)}</dd></div>
              <div><dt>{L("Anılma", "Mentioned")}</dt><dd className="num">{pct(last.mention.value)}</dd><dd className="range">{L("aralık", "range")} {rangeText(last.mention)}</dd></div>
              <div><dt>{L("Önerilerdeki payınız", "Share of recommendations")}</dt><dd className="num">{pct(last.share)}</dd><dd className="range">{L("rakiplerle birlikte", "among tracked brands")}</dd></div>
              {live
                ? <div><dt>{L("Sitenizin kaynak gösterilmesi", "Your site cited")}</dt><dd className="num">{pct(last.cite.value)}</dd><dd className="range">{last.cite.k}/{last.cite.n} {L("cevapta", "answers")}</dd></div>
                : <div><dt>{L("Kaynak gösterilme", "Cited")}</dt><dd className="num na">{L("Ölçülmedi", "Not measured")}</dd><dd className="range">{L("yalnızca canlı aramada vardır", "only with live search")}</dd></div>}
            </dl>
            {last.recommend.n < MIN_SAMPLE && (
              <p className="caution">{isEn() ? `Small sample (${last.recommend.n} answers). Don't read these rates as final; the ranges are wide. Add more questions and measure again.` : `Örneklem küçük (${last.recommend.n} cevap). Oranları kesin sonuç gibi okumayın; aralıklar geniştir. Daha fazla soru ekleyip tekrar ölçün.`}</p>
            )}
            <ShareButton text={() => shareSummary({
              brand: brand.name, at: last.at, live, simulated: type === "simulated",
              recommend: last.recommend, mention: last.mention,
              competitors: competitorsInRun(rows ?? [], last.runId).filter((c) => !c.isTarget),
              absentPrompts: (prompts.data ?? []).filter((p) => p.target_mentioned === 0).map((p) => p.prompt_text),
              topSources: domains.map((d) => d.domain),
            })} />
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>{L("Zaman içinde", "Over time")}</h2>
              <div className="seg" role="group" aria-label={L("Gösterilen oran", "Rate shown")}>
                <button aria-pressed={metric === "recommend"} onClick={() => setMetric("recommend")}>{L("Önerilme", "Recommended")}</button>
                <button aria-pressed={metric === "mention"} onClick={() => setMetric("mention")}>{L("Anılma", "Mentioned")}</button>
              </div>
            </div>
            {pts.length < 2 && <p className="muted">{L("Eğilim için en az iki ölçüm gerekir. Şimdilik tek ölçüm gösteriliyor.", "A trend needs at least two measurements. Showing one for now.")}</p>}
            <TrendChart points={pts} type={type} metric={metric} />
          </section>

          <section className="panel">
            <h2>{L("Rakiplerle karşılaştırma", "Competitor comparison")}</h2>
            <p className="muted">{L("Son ölçümde her markanın önerildiği cevap oranı.", "Share of answers recommending each brand in the latest measurement.")}</p>
            <CompareBars type={type} rows={competitorsInRun(rows ?? [], last.runId).map((c) => ({
              name: c.name, isTarget: c.isTarget, value: c.recommend.value,
              detail: isEn() ? `${c.recommend.k}/${c.recommend.n} answers, range ${rangeText(c.recommend)}, share of recommendations ${pct(c.share)}` : `${c.recommend.k}/${c.recommend.n} cevap, aralık ${rangeText(c.recommend)}, önerilerde pay ${pct(c.share)}`,
            }))} />
          </section>

          <section className="panel" id="kosul-haritasi">
            <h2>{L("Hangi koşulda görünüyorsunuz", "Where you show up, and where you don't")}</h2>
            <p className="muted">{isEn() ? `Recommendation rate by what the customer is doing, over the last ${recentIds.length} measurement${recentIds.length > 1 ? "s" : ""}. Groups under 20 answers are marked; don't draw conclusions from them.` : `Müşterinin ne yaptığına göre önerilme oranı, son ${recentIds.length} ölçümün toplamı. 20 cevabın altındaki gruplar işaretlidir; onlardan sonuç çıkarmayın.`}</p>
            {condRuns.loading ? <Loading /> : conditions.length === 0 ? <p>{L("Henüz veri yok.", "No data yet.")}</p> : (
              <>
                <ul className="src-dom">{conditions.map((c) => condRow(c, INTENT_LABEL[c.key as keyof typeof INTENT_LABEL] ?? c.key))}</ul>
                <h3>{L("Etiketlere göre", "By tag")}</h3>
                {segments.length === 0
                  ? <p className="muted">{isEn() ? <>No tagged questions yet. Add a tag such as "budget", "premium" or a country to your <Link to="?sekme=sorular">questions</Link> to compare conditions.</> : <>Henüz etiketli soru yok. <Link to="?sekme=sorular">Sorularınıza</Link> "ucuz", "premium" ya da ülke adı gibi bir etiket ekleyerek koşulları karşılaştırabilirsiniz.</>}</p>
                  : <ul className="src-dom">{segments.map((c) => condRow(c, c.key))}</ul>}
              </>
            )}
          </section>

          {live && (
            <section className="panel">
              <h2>{L("Yapay zekânın kaynak gösterdiği siteler", "Sites the AI cited")}</h2>
              <p className="muted">{L("ChatGPT bu cevapları verirken internette bu sitelere baktı. Rakibinizi öneren sitelerde yer almak görünürlüğünüzü artırır.", "ChatGPT read these sites before answering. Getting featured on sites that recommend your competitors raises your visibility.")}</p>
              {answers.loading ? <Loading /> : domains.length === 0 ? <p>{L("Bu ölçümde kaynak gösterilmedi.", "No sources were cited in this measurement.")}</p> : (
                <ol className="domains">
                  {domains.map((d) => <li key={d.domain}><span>{d.domain}</span><span className="num muted">{d.count} kez</span></li>)}
                </ol>
              )}
            </section>
          )}

          {live && (
            <section className="panel" id="kaynak-egemenligi">
              <h2>{L("Kaynaklar kimi destekliyor", "Who the sources support")}</h2>
              <p className="muted">{L("Her kaynak sitenin kaç cevapta kullanıldığı, kime ait olduğu ve o cevaplarda hangi markaların önerildiği. Bir kaynağın geçtiği cevapta bir markanın önerilmesi, kaynağın o markayı önerdiğini kanıtlamaz; birlikte görülme sayısıdır.", "How many answers used each source site, who owns it, and which brands were recommended in those answers. A brand being recommended in an answer that cites a source does not prove the source recommends it; this is a co-occurrence count.")}</p>
              {ments.loading || comps.loading || answers.loading ? <Loading /> : dominance.length === 0 ? <p>{L("Bu ölçümde kaynak gösterilmedi.", "No sources were cited in this measurement.")}</p> : (
                <ul className="src-dom">
                  {dominance.map((d) => (
                    <li key={d.domain} className={`src-${d.owner}`}>
                      <p className="src-head"><strong>{d.domain}</strong> <span className="muted num">{isEn() ? `${d.answers} answers` : `${d.answers} cevap`}</span></p>
                      <p className="src-owner">{d.owner === "target" ? L("Sizin siteniz", "Your site") : d.owner === "competitor" ? L(`Rakibin kendi sitesi: ${d.ownerName}`, `Competitor's own site: ${d.ownerName}`) : L("Üçüncü taraf site", "Third-party site")}</p>
                      <p className="src-sup muted">{d.supports.length === 0 ? L("Bu cevaplarda takip ettiğiniz hiçbir marka önerilmedi.", "No tracked brand was recommended in these answers.") : <>{L("Bu cevaplarda önerilen: ", "Recommended in these answers: ")}{d.supports.map((x) => `${x.name} (${x.count})`).join(", ")}</>}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {type !== "simulated" && answers.data && comps.data && (
            <UntrackedNames brand={brand} competitors={comps.data} texts={answers.data.map((a) => a.answer_text)}
              onChange={() => { onBrandChange(); comps.reload(); }} />
          )}

          {live && (
            <section className="panel">
              <h2>{L("Kaynak fırsatları", "Source opportunities")}</h2>
              <p className="muted">{L("Rakibiniz önerilirken sizin önerilmediğiniz cevaplarda ChatGPT'nin baktığı siteler. Rakiplerin kendi siteleri ayrıca işaretlendi; diğerleri, yer almaya çalışabileceğiniz yerlerdir (içerik, liste, inceleme, basın).", "Sites ChatGPT read in answers that recommended a competitor but not you. Competitors' own sites are marked; the rest are places worth getting featured on (content, lists, reviews, press).")}</p>
              {ments.loading || comps.loading ? <Loading /> : opps.length === 0 ? <p>{L("Bu ölçümde böyle bir cevap yok.", "No such answers in this measurement.")}</p> : (
                <ol className="domains">
                  {opps.map((d) => <li key={d.domain}><span>{d.domain}{d.own && <span className="muted"> {L("(rakibin kendi sitesi)", "(competitor's own site)")}</span>}</span><span className="num muted">{d.count} kez</span></li>)}
                </ol>
              )}
            </section>
          )}

          <section className="panel">
            <h2>{L("Soru bazında sonuç", "Results by question")}</h2>
            {prompts.loading ? <Loading /> : (
              <ul className="q-results">
                {(prompts.data ?? []).map((p) => (
                  <li key={p.prompt_id}>
                    <p className="q-text">{p.prompt_text}</p>
                    <p className="q-meta">{INTENT_LABEL[p.intent]}</p>
                    <p className={`q-verdict ${p.target_recommended ? "yes" : p.target_mentioned ? "partial" : "no"}`}>
                      {p.target_recommended ? (isEn() ? `Recommended${p.best_rank ? `, best position ${p.best_rank}` : ""}` : `Önerildiniz${p.best_rank ? `, en iyi sıra ${p.best_rank}` : ""}`) : p.target_mentioned ? L("Anıldınız ama önerilmediniz", "Mentioned, not recommended") : L("Cevapta yoksunuz", "Not in the answer")}
                      <span className="muted"> ({p.answers} cevap)</span>
                    </p>
                    {p.top_competitor && <p className="q-comp">{p.target_recommended ? L("Sizinle birlikte en çok önerilen rakip", "Competitor most recommended alongside you") : L("Sizin yerinize önerilen rakip", "Competitor recommended instead")}: {p.top_competitor}</p>}
                    {losses.get(p.prompt_id) && <LossCardView card={losses.get(p.prompt_id)!} brand={brand.name} hasSite={!!brand.website} />}
                    {type === "model_knowledge" && !p.target_recommended && p.top_competitor && (
                      <p className="q-comp muted">{L("Neden önerilmediğinize dair kaynak kanıtı yalnız canlı aramalı ölçümde (ChatGPT, ücretli paketler) çıkar.", "Source evidence for why you weren't recommended is only available in live-search measurements (ChatGPT, paid plans).")}</p>
                    )}
                    <button className="link-btn" aria-expanded={open === p.prompt_id} onClick={() => setOpen(open === p.prompt_id ? null : p.prompt_id)}>
                      {open === p.prompt_id ? L("Cevabı gizle", "Hide answer") : L("Cevabı göster", "Show answer")}
                    </button>
                    {open === p.prompt_id && (
                      <div className="answers">
                        {(answers.data ?? []).filter((a) => a.prompt_id === p.prompt_id).map((a) => (
                          <blockquote key={a.repetition} className="answer">
                            <p className="answer-meta">{type === "simulated" ? L("Simülasyon cevabı", "Simulated answer") : live ? L(`ChatGPT cevabı (${a.model}, canlı arama)`, `ChatGPT answer (${a.model}, live search)`) : L(`Gemini cevabı (${a.model}, aramasız)`, `Gemini answer (${a.model}, no search)`)}{(answers.data ?? []).filter((x) => x.prompt_id === p.prompt_id).length > 1 && L(`, tekrar ${a.repetition}`, `, repeat ${a.repetition}`)}</p>
                            <Highlighted text={a.answer_text} names={[brand.name, ...brand.aliases, ...(brand.name.split(/\s+/).length > 1 && brand.name.split(/\s+/)[0].length >= 4 ? [brand.name.split(/\s+/)[0]] : [])]} />
                            {live && (a.cited_urls ?? []).length > 0 && (
                              <ul className="answer-sources">{a.cited_urls.map((u) => <li key={u}><a href={u} target="_blank" rel="noopener noreferrer nofollow">{(() => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } })()}</a></li>)}</ul>
                            )}
                          </blockquote>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {type === "model_knowledge" && <section className="panel">
            <h2>{L("Bu rapor neyi göstermez", "What this report doesn't show")}</h2>
            <ul className="plain">
              <li>{L("Yapay zekânın internette arayarak verdiği güncel cevaplar bu ölçümde yok.", "Up-to-date answers the AI gives after searching the web aren't part of this measurement.")}</li>
              <li>{L("Hangi web sitelerinin cevapları etkilediği (kaynak analizi) canlı arama olmadan bilinemez.", "Which websites shaped the answers (source analysis) can't be known without live search.")}</li>
              <li>{L("Perplexity ölçülmedi.", "Perplexity isn't measured.")}</li>
            </ul>
          </section>}
        </>
      )}
    </div>
  );
}

/** Aksiyon ve Sonuç Takibi: yapılan iyileştirme tarihle kaydedilir; önceki ve sonraki ölçüm motor bazında karşılaştırılır. */
function ActionsPanel({ brand }: { brand: Brand }) {
  const actions = useLoad(() => api.actions(brand.id), [brand.id]);
  const live = useLoad(() => api.visibility(brand.id, "live_search"), [brand.id]);
  const know = useLoad(() => api.visibility(brand.id, "model_knowledge"), [brand.id]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const toPoints = (rows: typeof live.data) => series(rows ?? []).map((p) => ({ at: p.at, k: p.recommend.k, n: p.recommend.n }));
  const liveEngines = [...new Set((live.data ?? []).map((r) => r.provider))].sort((x, y) => ENGINE_ORDER.indexOf(x) - ENGINE_ORDER.indexOf(y));
  const engines = [
    ...liveEngines.map((e) => ({ label: `${providerLabel(e)} ${L("(canlı arama)", "(live search)")}`, points: toPoints((live.data ?? []).filter((r) => r.provider === e)) })),
    { label: L("Gemini (aramasız)", "Gemini (no search)"), points: toPoints(know.data) },
  ].filter((e) => e.points.length > 0);

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget, f = new FormData(form);
    const title = String(f.get("action_title") || "").trim();
    if (title.length < 3) { setErr(L("Ne yaptığınızı kısaca yazın.", "Briefly describe what you did.")); return; }
    setBusy(true); setErr(null);
    try {
      await api.addAction({ workspace_id: brand.workspace_id, brand_id: brand.id, title, note: String(f.get("action_note") || "").trim() || null, done_on: String(f.get("action_date") || today) });
      form.reset(); actions.reload();
    } catch (x) { setErr(friendlyError(x)); } finally { setBusy(false); }
  }
  async function remove(id: string) { try { await api.deleteAction(id); actions.reload(); } catch (x) { setErr(friendlyError(x)); } }
  const rateText = (p: { k: number; n: number; low: number; high: number }) => `${pct(p.n ? p.k / p.n : 0)} (${p.k}/${p.n}, ${pct(p.low)}–${pct(p.high)})`;

  return (
    <section className="panel stack" id="aksiyonlar">
      <h2>{L("Yaptıklarım ve sonuçları", "What I did, and what happened")}</h2>
      <p className="muted">{L("Bir iyileştirme yaptığınızda buraya tarihiyle yazın. Önceki son ölçümle sonraki en güncel ölçümü motor bazında karşılaştırırız. Önerilme oranı tek başına nedeni kanıtlamaz: yapay zekâ modelleri, rakipler ve kaynak siteler de değişir.", "When you make an improvement, log it here with its date. We compare the last measurement before it with the latest one after it, per engine. A change in the rate does not prove the cause: AI models, competitors and source sites change too.")}</p>
      <form className="stack" onSubmit={add} noValidate aria-label={L("Aksiyon ekle", "Add action")}>
        <Field label={L("Ne yaptınız?", "What did you do?")} name="action_title" maxLength={200} placeholder={L("Örn. SSS sayfası eklendi", "e.g. Added an FAQ page")} />
        <Field label={L("Tarih", "Date")} name="action_date" type="date" defaultValue={today} max={today} />
        <Field label={L("Not (isteğe bağlı)", "Note (optional)")} name="action_note" maxLength={1000} />
        <ErrorBox message={err} />
        <Button type="submit" variant="quiet" busy={busy}>{L("Kaydet", "Save")}</Button>
      </form>
      {actions.loading ? <Loading /> : (actions.data ?? []).length === 0 ? <p className="muted">{L("Henüz kayıt yok.", "Nothing logged yet.")}</p> : (
        <ul className="src-dom">
          {(actions.data ?? []).map((a) => (
            <li key={a.id}>
              <p className="src-head"><strong>{a.title}</strong> <span className="muted num">{new Date(a.done_on + "T00:00:00").toLocaleDateString(isEn() ? "en-US" : "tr-TR", { day: "numeric", month: "short", year: "numeric" })}</span></p>
              {a.note && <p className="src-sup muted">{a.note}</p>}
              {engines.length === 0 && <p className="src-sup muted">{L("Henüz tamamlanmış ölçüm yok.", "No completed measurements yet.")}</p>}
              {engines.map((en) => {
                const im = actionImpact(en.points, a.done_on);
                const text = im.verdict === "no_before" ? L("öncesinde ölçüm yok; karşılaştırma yapılamaz.", "no measurement before it; can't compare.")
                  : im.verdict === "no_after" ? (isEn() ? `before: ${rateText(im.before!)}. Waiting for the next measurement.` : `önce: ${rateText(im.before!)}. Sonraki ölçüm bekleniyor.`)
                  : (isEn() ? `before ${rateText(im.before!)} → after ${rateText(im.after!)}. ` : `önce ${rateText(im.before!)} → sonra ${rateText(im.after!)}. `)
                    + (im.verdict === "up" ? L("Artış, ölçüm oynaklığından büyük.", "The rise is larger than measurement noise.")
                      : im.verdict === "down" ? L("Düşüş, ölçüm oynaklığından büyük.", "The drop is larger than measurement noise.")
                      : L("Aralıklar örtüşüyor: fark ölçüm oynaklığı olabilir.", "The ranges overlap: the difference may be measurement noise."));
                return <p key={en.label} className="src-sup"><span className="muted">{en.label}: </span>{text}</p>;
              })}
              <button className="link-btn" onClick={() => remove(a.id)}>{L("Sil", "Delete")}</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const SEV_LABEL = { high: L("Önemli", "Important"), medium: L("Orta", "Medium"), low: L("Düşük", "Low"), info: L("Bilgi", "Info") } as const;

function Advice({ brand, type, runs, onBrandChange }: { brand: Brand; type: MeasurementType; runs: Run[]; onBrandChange: () => void }) {
  const audit = useLoad(() => api.latestAudit(brand.id), [brand.id, brand.audit_requested_at]);
  const prompts = useLoad(() => api.prompts(brand.id), [brand.id]);
  const lastRun = runs.find((r) => r.status === "done");
  const results = useLoad(() => (lastRun ? api.promptResults(lastRun.id) : Promise.resolve([])), [lastRun?.id]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const sim = brand.data_origin === "simulated";
  const pendingAudit = brand.audit_requested_at && (!audit.data || audit.data.created_at < brand.audit_requested_at);

  if (audit.loading || prompts.loading || results.loading) return <Loading />;
  const recs = buildRecommendations({
    brandName: brand.name, website: brand.website, city: brand.city, sector: brand.sector, aliases: brand.aliases,
    activePrompts: (prompts.data ?? []).filter((p) => p.active).length,
    completedRuns: runs.filter((r) => r.status === "done").length,
    autoWeekly: brand.auto_weekly || sim, measurementType: type,
    prompts: results.data ?? [],
    audit: sim ? null : audit.data ? { status: audit.data.status, checks: audit.data.checks } : null,
    lang: isEn() ? "en" : "tr",
  }).filter((r) => !(sim && r.id === "no_website"));

  async function check() {
    setBusy(true); setErr(null); setMsg(null);
    try { await api.requestAudit(brand.id); setMsg(L("Kontrol sıraya alındı. Sonuç en geç bir saat içinde burada görünür.", "Check queued. Results appear here within an hour.")); onBrandChange(); }
    catch (e) { setErr(friendlyError(e)); } finally { setBusy(false); }
  }

  return (
    <div className="stack">
      {sim && <DataNotice type="simulated" />}
      <section className="panel">
        <h2>{L("Yapılacaklar", "To do")}</h2>
        <p className="muted">{isEn() ? `Derived by rules from the latest measurement${!sim ? " and website check" : ""}; not generated by AI. Ordered by importance.` : `Son ölçüm${!sim ? " ve web sitesi kontrolü" : ""} sonuçlarından kurallarla çıkarıldı; yapay zekâ ile üretilmedi. Önem sırasına göre.`}</p>
        {recs.length === 0 ? <p>{L("Şu an önerimiz yok. Yeni ölçümlerden sonra tekrar bakın.", "No recommendations right now. Check again after new measurements.")}</p> : (
          <ol className="recs">
            {recs.map((r) => (
              <li key={r.id} className={`rec rec-${r.priority === "yüksek" ? "high" : r.priority === "orta" ? "medium" : "low"}`}>
                <div className="rec-head"><strong>{r.title}</strong><span className="rec-pri">{isEn() ? `${r.priority === "yüksek" ? "High" : r.priority === "orta" ? "Medium" : "Low"} priority` : `${r.priority} öncelik`}</span></div>
                <p className="rec-why"><span>Neden:</span> {r.why}</p>
                <p className="rec-action"><span>{L("Ne yapılmalı:", "What to do:")}</span> {r.action}</p>
              </li>
            ))}
          </ol>
        )}
      </section>

      {!sim && <ActionsPanel brand={brand} />}

      {!sim && (
        <section className="panel">
          <div className="panel-head">
            <h2>{L("Web sitesi kontrolü", "Website check")}</h2>
            {brand.website && <Button variant="quiet" className="btn-small" busy={busy} onClick={check} disabled={!!pendingAudit}>{pendingAudit ? L("Sırada", "Queued") : L("Siteyi kontrol et", "Check site")}</Button>}
          </div>
          {msg && <p className="success-box">{msg}</p>}
          <ErrorBox message={err} />
          {!brand.website ? <p className="muted">{L("Markaya web sitesi eklenmemiş. Adın yanındaki \"Düzenle\" ile ekleyin.", "No website on this brand yet. Add one with \"Edit\" next to the name.")}</p>
            : !audit.data ? <p className="muted">{pendingAudit ? L("Kontrol sırada; en geç bir saat içinde sonuç gelir.", "Check queued; results within an hour.") : L("Henüz kontrol edilmedi. Site her hafta otomatik olarak da kontrol edilir.", "Not checked yet. The site is also checked automatically every week.")}</p>
            : (
              <>
                <p className="muted">{audit.data.url}, {formatDateTime(audit.data.created_at)}. {audit.data.checks.filter((c) => c.ok).length}/{audit.data.checks.length} {L("kontrol geçti.", "checks passed.")}</p>
                <ul className="checks">
                  {audit.data.checks.map((c) => (
                    <li key={c.id} className={c.ok ? "ok" : `bad sev-${c.severity}`}>
                      <span className="check-mark" aria-hidden>{c.ok ? "✓" : c.severity === "info" ? "i" : "!"}</span>
                      <span><strong>{isEn() ? (c.title_en ?? c.title) : c.title}</strong>{!c.ok && <em className="sev">{SEV_LABEL[c.severity]}</em>}<span className="muted">{isEn() ? (c.detail_en ?? c.detail) : c.detail}</span></span>
                    </li>
                  ))}
                </ul>
              </>
            )}
        </section>
      )}
    </div>
  );
}

/** Cevap metni; markanın geçtiği yerler vurgulanır. Metin güvenli şekilde (HTML olarak değil) gösterilir. */
function Highlighted({ text, names }: { text: string; names: string[] }) {
  const clean = text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/^#{1,6}\s+/gm, "");
  const ns = names.filter((n) => n.trim().length >= 2).map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (ns.length === 0) return <p className="answer-text">{clean}</p>;
  const re = new RegExp(`(${ns.join("|")})`, "gi");
  return <p className="answer-text">{clean.split(re).map((part, i) => (i % 2 === 1 ? <mark key={i}>{part}</mark> : part))}</p>;
}

function Competitors({ brand }: { brand: Brand }) {
  const { current } = useApp();
  const comps = useLoad(() => api.competitors(brand.id), [brand.id]);
  const usage = useLoad(() => api.usage(brand.workspace_id), [brand.workspace_id]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const limit = usage.data?.competitor_limit ?? 0;
  const list = comps.data ?? [];
  const ideas = competitorSuggestions(brand.sector, brand.name, list.map((c) => c.name));
  async function create(name: string, aliases: string[], website: string | null) {
    setBusy(true); setErr(null);
    try {
      await api.addBrand({
        workspace_id: brand.workspace_id, name, is_competitor: true, owner_brand_id: brand.id, website, aliases,
        ...(current?.kind === "demo_lab" ? { data_origin: "simulated" } : {}),
      });
      comps.reload();
      return true;
    } catch (e) { setErr(friendlyError(e)); return false; } finally { setBusy(false); }
  }
  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const name = String(f.get("name")).trim();
    if (!name) { setErr(L("Rakip adı gerekli.", "Competitor name is required.")); return; }
    if (await create(name, splitAliases(f.get("aliases")), String(f.get("website") || "").trim() || null)) form.reset();
  }
  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-head"><h2>{L("Rakipler", "Competitors")}</h2><span className="muted num">{list.length} / {limit}</span></div>
        {comps.loading ? <Loading /> : list.length === 0 ? <p className="muted">{L("Henüz rakip yok. Cevaplarda hangi markaların sizin yerinize önerildiğini görmek için ekleyin.", "No competitors yet. Add them to see which brands get recommended instead of you.")}</p> : (
          <ul className="rows">
            {list.map((c) => <CompetitorRow key={c.id} c={c} onChange={comps.reload} />)}
          </ul>
        )}
      </section>
      {list.length < limit && ideas.length > 0 && (
        <section className="panel">
          <h2>{L("Bu sektörde bilinen markalar", "Known brands in this sector")}</h2>
          <p className="muted">{isEn() ? `Examples from "${brand.sector}". Add your competitors with one tap; you can edit names later.` : `"${brand.sector}" sektöründen örnekler. Rakibiniz olanı tek dokunuşla ekleyin; adını sonra düzenleyebilirsiniz.`}</p>
          <div className="chips">
            {ideas.map((n) => <button key={n} className="chip" disabled={busy} onClick={() => create(n, [], null)}>+ {n}</button>)}
          </div>
        </section>
      )}
      {list.length < limit ? (
        <form className="panel stack" onSubmit={add} noValidate>
          <h2>{L("Rakip ekle", "Add competitor")}</h2>
          <Field label={L("Rakip adı", "Competitor name")} name="name" required maxLength={120} />
          <Field label={L("Diğer yazılışlar", "Other spellings")} name="aliases" hint={L("Virgülle ayırın", "Comma-separated")} />
          <Field label={L("Web sitesi", "Website")} name="website" inputMode="url" />
          <ErrorBox message={err} />
          <Button type="submit" busy={busy}>{L("Rakibi ekle", "Add competitor")}</Button>
        </form>
      ) : !comps.loading && <p className="muted">{L("Paketinizin rakip sınırına ulaştınız.", "You've reached your plan's competitor limit.")}</p>}
    </div>
  );
}

function Questions({ brand }: { brand: Brand }) {
  const prompts = useLoad(() => api.prompts(brand.id), [brand.id]);
  const usage = useLoad(() => api.usage(brand.workspace_id), [brand.workspace_id]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const list = prompts.data ?? [];
  const active = list.filter((p) => p.active).length;
  const limit = usage.data?.prompt_limit ?? 0;
  const existing = new Set(list.map((p) => p.text));
  const ideas = questionTemplates(brand.sector, brand.city).filter((s) => !existing.has(s.text));
  const def = sectorDef(brand.sector);
  const needsCity = def?.local && !brand.city;

  async function add(text: string, intent: Intent, segment: string | null = null) {
    setBusy(true); setErr(null);
    try { await api.addPrompt({ workspace_id: brand.workspace_id, brand_id: brand.id, text, intent, ...(segment ? { segment } : {}) }); prompts.reload(); }
    catch (e) { setErr(friendlyError(e)); } finally { setBusy(false); }
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const text = String(f.get("text")).trim();
    if (text.length < 5) { setErr(L("Soru en az 5 karakter olmalı.", "A question needs at least 5 characters.")); return; }
    await add(text, String(f.get("intent")) as Intent, String(f.get("segment") || "").trim().slice(0, 40) || null);
    form.reset();
  }

  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-head"><h2>{L("Sorular", "Questions")}</h2><span className="muted num">{active} / {limit} {L("aktif", "active")}</span></div>
        <p className="muted">{L("Müşterilerinizin yapay zekâya soracağı soruları yazın. Her ölçümde bu sorular Gemini'ye sorulur.", "Write the questions your customers would ask an AI assistant. Every measurement asks these questions.")}</p>
        {prompts.loading ? <Loading /> : list.length === 0 ? <p className="muted">{L("Henüz soru yok.", "No questions yet.")}</p> : (
          <ul className="rows">
            {list.map((p) => <PromptRow key={p.id} p={p} onChange={prompts.reload} onError={setErr} />)}
          </ul>
        )}
      </section>

      {active < limit && ideas.length > 0 && (
        <section className="panel">
          <h2>{L("Hazır sorular", "Suggested questions")}</h2>
          <p className="muted">{isEn() ? `Hand-written questions for "${brand.sector}"${def?.local && brand.city ? `, for ${brand.city}` : ""}. You can edit them after adding.` : `"${brand.sector}" sektörü için elle hazırlanmış sorular${def?.local && brand.city ? `, ${brand.city} için` : ""}. Ekledikten sonra düzenleyebilirsiniz.`}</p>
          <ul className="rows">
            {ideas.map((s) => (
              <li key={s.text}>
                <span><span className="q-text">{s.text}</span><span className="q-meta">{INTENT_LABEL[s.intent]}</span></span>
                <button className="link-btn" disabled={busy} onClick={() => add(s.text, s.intent)}>Ekle</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {active < limit && ideas.length === 0 && (!def || def.questions.length === 0 || needsCity) && (
        <p className="muted">{needsCity ? L("Bu sektörün hazır soruları şehre göre hazırlanır. Markayı düzenleyip şehir ekleyin.", "Suggested questions for this sector depend on the city. Edit the brand and add a city.") : L("Bu sektör için hazır soru yok. Sektör seçmek için markayı düzenleyin ya da kendi sorularınızı yazın.", "No suggested questions for this sector. Edit the brand to choose a sector, or write your own.")}</p>
      )}

      {active < limit ? (
        <form className="panel stack" onSubmit={submit} noValidate>
          <h2>Kendi sorunuzu ekleyin</h2>
          <Field label={L("Soru", "Question")} name="text" maxLength={300} placeholder={L("Örn. Antalya'da en iyi döner nerede yenir?", "e.g. Where's the best pizza in Austin?")} />
          <Select label={L("Müşteri ne yapıyor?", "What is the customer doing?")} name="intent" defaultValue="local">
            {(Object.keys(INTENT_LABEL) as Intent[]).map((k) => <option key={k} value={k}>{INTENT_LABEL[k]}</option>)}
          </Select>
          <Field label={L("Etiket (isteğe bağlı)", "Tag (optional)")} name="segment" maxLength={40}  placeholder={L("Örn. ucuz, premium, Almanya", "e.g. budget, premium, Germany")} hint={L("Aynı etiketi taşıyanlar raporda birlikte gösterilir: hangi koşulda görünüp hangisinde kaybolduğunuzu görürsünüz.", "Items sharing a tag are grouped in the report, so you can see where you show up and where you don't.")} />
          <ErrorBox message={err} />
          <Button type="submit" busy={busy}>Soruyu ekle</Button>
        </form>
      ) : <><ErrorBox message={err} /><p className="muted">Paketinizin aktif soru sınırına ulaştınız.</p></>}
    </div>
  );
}

function PromptRow({ p, onChange, onError }: { p: Prompt; onChange: () => void; onError: (m: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  if (editing) {
    return (
      <li className="editing">
        <form className="stack edit-inline" noValidate aria-label={L("Soruyu düzenle", "Edit question")} onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const text = String(f.get("text")).trim();
          if (text.length < 5) { onError(L("Soru en az 5 karakter olmalı.", "A question needs at least 5 characters.")); return; }
          setBusy(true);
          try { await api.updatePrompt(p.id, { text, intent: String(f.get("intent")) as Intent, segment: String(f.get("segment") || "").trim().slice(0, 40) || null }); setEditing(false); onChange(); }
          catch (err) { onError(friendlyError(err)); } finally { setBusy(false); }
        }}>
          <Field label={L("Soru", "Question")} name="text" defaultValue={p.text} maxLength={300} />
          <Select label={L("Müşteri ne yapıyor?", "What is the customer doing?")} name="intent" defaultValue={p.intent}>
            {(Object.keys(INTENT_LABEL) as Intent[]).map((k) => <option key={k} value={k}>{INTENT_LABEL[k]}</option>)}
          </Select>
          <Field label={L("Etiket (isteğe bağlı)", "Tag (optional)")} name="segment" maxLength={40} id={`segment-${p.id}`} defaultValue={p.segment ?? ""} placeholder={L("Örn. ucuz, premium, Almanya", "e.g. budget, premium, Germany")} hint={L("Aynı etiketi taşıyanlar raporda birlikte gösterilir: hangi koşulda görünüp hangisinde kaybolduğunuzu görürsünüz.", "Items sharing a tag are grouped in the report, so you can see where you show up and where you don't.")} />
          <div className="form-actions">
            <Button type="submit" busy={busy} className="btn-small">Kaydet</Button>
            <Button type="button" variant="quiet" className="btn-small" onClick={() => setEditing(false)}>{L("Vazgeç", "Cancel")}</Button>
          </div>
        </form>
      </li>
    );
  }
  return (
    <li className={p.active ? "" : "inactive"}>
      <span><span className="q-text">{p.text}</span><span className="q-meta">{INTENT_LABEL[p.intent]}{p.segment && `, ${p.segment}`}{!p.active && ", pasif"}</span></span>
      <span className="row-actions">
        <button className="link-btn" onClick={() => setEditing(true)}>{L("Düzenle", "Edit")}</button>
        <button className="link-btn" onClick={async () => { try { await api.setPromptActive(p.id, !p.active); onChange(); } catch (e) { onError(friendlyError(e)); } }}>{p.active ? L("Pasifleştir", "Deactivate") : L("Etkinleştir", "Activate")}</button>
        <Confirm label="Silinsin mi?" onConfirm={async () => { await api.deletePrompt(p.id); onChange(); }}>Sil</Confirm>
      </span>
    </li>
  );
}

function RunHistory({ runs, loading }: { runs: Run[]; loading: boolean }) {
  if (loading) return <Loading />;
  if (runs.length === 0) return <Empty title={L("Henüz ölçüm yapılmadı", "No measurements yet")}><p>{L("Yukarıdaki \"Ölçüm başlat\" düğmesiyle ilk ölçümü başlatın.", "Start your first measurement with the \"Start measurement\" button above.")}</p></Empty>;
  return (
    <ul className="runs">
      {runs.map((r) => {
        const err = r.error_class ? ERROR_CLASS_TEXT[r.error_class] : null;
        return (
          <li key={r.id} className={`run run-${r.status}`}>
            <div className="run-head">
              <strong>{runStatusText(r)}</strong>
              <TypeBadge type={r.measurement_type} />
            </div>
            <p className="muted">{formatDateTime(r.created_at)}{r.model && <>, {providerLabel(r.provider ?? "")} / {r.model}</>}</p>
            {r.status !== "queued" && r.status !== "running" && (
              <p>{isEn() ? `${r.calls_ok} successful answers${r.calls_failed > 0 ? `, ${r.calls_failed} failed calls` : ""}.` : `${r.calls_ok} başarılı cevap${r.calls_failed > 0 ? `, ${r.calls_failed} başarısız çağrı` : ""}.`} {STOP_TEXT[r.stop_reason ?? ""] ?? ""}</p>
            )}
            {err && <div className="run-error"><strong>{err.title}</strong><p>{err.body}</p></div>}
          </li>
        );
      })}
    </ul>
  );
}

/** Cevaplarda geçen ama takip edilmeyen adlar: kullanıcı "benim markam" ya da "rakip" diye işaretler; eski ölçümler ücretsiz yeniden hesaplanır. */
function UntrackedNames({ brand, competitors, texts, onChange }: { brand: Brand; competitors: Brand[]; texts: string[]; onChange: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const [hidden, setHidden] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const names = untrackedNames(texts, [brand, ...competitors]).filter((n) => !hidden.includes(n.name));
  if (names.length === 0 && !msg && !brand.reanalyze_requested_at) return null;
  async function act(name: string, kind: "alias" | "competitor") {
    setBusy(true); setErr(null); setMsg(null);
    try {
      if (kind === "alias") await api.updateBrand(brand.id, { aliases: [...brand.aliases, name] });
      else await api.addBrand({ workspace_id: brand.workspace_id, name, is_competitor: true, owner_brand_id: brand.id, data_origin: brand.data_origin } as never);
      setHidden((h) => [...h, name]); setOpen(null);
      setMsg(kind === "alias" ? L(`"${name}" markanızın diğer adı olarak eklendi.`, `"${name}" added as another name for your brand.`) : L(`"${name}" rakip olarak eklendi.`, `"${name}" added as a competitor.`));
      onChange();
    } catch (e) { setErr(friendlyError(e)); } finally { setBusy(false); }
  }
  return (
    <section className="panel">
      <h2>{L("Cevaplarda geçen diğer adlar", "Other names in the answers")}</h2>
      <p className="muted">{L("Bu adlar cevaplarda geçiyor ama takip etmiyorsunuz. Markanızın başka bir yazılışıysa ya da bir rakipse işaretleyin; geçmiş ölçümler ücretsiz olarak yeniden hesaplanır.", "These names appear in answers but you don't track them. Mark them as another spelling of your brand or as a competitor; past measurements are recalculated for free.")}</p>
      {brand.reanalyze_requested_at && <p className="success-box">{L("Geçmiş ölçümler yeni bilgilerle yeniden hesaplanıyor; en geç bir saat içinde rapora yansır.", "Past measurements are being recalculated with the new details; the report updates within an hour.")}</p>}
      {msg && <p className="success-box">{msg}</p>}
      <ErrorBox message={err} />
      <ul className="name-chips">
        {names.map((n) => (
          <li key={n.name}>
            <button className={open === n.name ? "chip on" : "chip"} aria-expanded={open === n.name} onClick={() => setOpen(open === n.name ? null : n.name)}>
              {n.name} <span className="muted">{n.count}</span>
            </button>
            {open === n.name && (
              <div className="chip-actions">
                <Button variant="quiet" className="btn-small" busy={busy} onClick={() => act(n.name, "alias")}>{L("Benim markamın diğer adı", "Another name for my brand")}</Button>
                <Button variant="quiet" className="btn-small" busy={busy} onClick={() => act(n.name, "competitor")}>{L("Rakip olarak ekle", "Add as competitor")}</Button>
                <button className="link-btn" onClick={() => { setHidden((h) => [...h, n.name]); setOpen(null); }}>{L("Önemsiz, gizle", "Not relevant, hide")}</button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Özeti telefonun paylaşım menüsüyle (WhatsApp vb.) gönderir; desteklenmiyorsa panoya kopyalar. */
function ShareButton({ text }: { text: () => string }) {
  const [done, setDone] = useState<string | null>(null);
  async function share() {
    const t = text();
    try {
      if (navigator.share) { await navigator.share({ title: L("AI SaaSavran ön raporu", "AI SaaSavran snapshot"), text: t }); setDone(L("Paylaşıldı.", "Shared.")); return; }
      await navigator.clipboard.writeText(t); setDone(L("Özet panoya kopyalandı; WhatsApp'a yapıştırabilirsiniz.", "Summary copied; paste it into WhatsApp, email or Slack."));
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      try { await navigator.clipboard.writeText(t); setDone(L("Özet panoya kopyalandı.", "Summary copied.")); } catch { setDone(L("Kopyalanamadı; tarayıcı izin vermedi.", "Couldn't copy; the browser blocked it.")); }
    }
  }
  return (
    <div className="share-row">
      <Button variant="quiet" className="btn-small" onClick={share}>{L("Özeti paylaş (WhatsApp, e-posta)", "Share summary")}</Button>
      <Button variant="quiet" className="btn-small" onClick={() => window.print()}>{L("PDF olarak indir", "Download PDF")}</Button>
      {done && <span className="muted" role="status">{done}</span>}
    </div>
  );
}
