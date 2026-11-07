import { useState, type FormEvent } from "react";
import { SECTORS, competitorSuggestions, questionTemplates, sectorDef } from "../lib/sectors";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useApp, useLoad } from "../lib/app";
import { api, INTENT_LABEL, type Brand, type Intent, type MeasurementType, type Prompt, type Run } from "../lib/data";
import { friendlyError } from "../lib/supabase";
import { ERROR_CLASS_TEXT, STOP_TEXT, runStatusText } from "../lib/messages";
import { competitorsInRun, formatDateTime, MIN_SAMPLE, numLoc, pct, providerLabel, rangeText, series, shareSummary, sourceOpportunities, topDomains, usd } from "../lib/report";
import { Button, Confirm, DataNotice, Empty, ErrorBox, Field, Loading, Select, TypeBadge } from "../components/ui";
import { CompareBars, TrendChart } from "../components/Chart";
import { buildRecommendations } from "../../../engine/src/recommendations.ts";
import { untrackedNames } from "../../../engine/src/metrics.ts";

const TABS = [
  ["rapor", "Rapor"], ["oneriler", "Öneriler"], ["rakipler", "Rakipler"], ["sorular", "Sorular"], ["olcumler", "Ölçümler"],
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
  if (brand.error || !brand.data) return <ErrorBox message="Marka bulunamadı veya bu markayı görme yetkiniz yok." />;
  const b = brand.data;
  const runList = runs.data ?? [];
  const hasLive = runList.some((r) => r.measurement_type === "live_search" && r.status === "done");
  const view = params.get("tur") === "canli" && hasLive ? "live_search" : null;
  const type: MeasurementType = current?.kind === "demo_lab" ? "simulated" : view ?? "model_knowledge";
  const setView = (v: "canli" | "aramasiz") => { const n = new URLSearchParams(params); n.set("tur", v); setParams(n, { replace: true }); };

  return (
    <div className="stack">
      <header className="page-head brand-head">
        <Link to="/panel" className="back">Panele dön</Link>
        {editing ? (
          <BrandEditForm brand={b} onDone={(changed) => { setEditing(false); if (changed) brand.reload(); }} />
        ) : (
          <>
            <h1>{b.name}</h1>
            <p className="muted">
              {[b.sector, b.city, b.website].filter(Boolean).join(", ") || "Ayrıntı girilmedi"}
              <button className="link-btn" onClick={() => setEditing(true)}>Düzenle</button>
            </p>
            <RunControl brand={b} runs={runList} onChange={runs.reload} paidAllowed={!!current?.paid_live_allowed} workspaceId={current?.id ?? ""} />
          </>
        )}
      </header>
      <nav className="tabs" role="tablist" aria-label="Marka bölümleri">
        {TABS.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => { const n = new URLSearchParams(params); n.set("sekme", k); setParams(n, { replace: true }); }}>{label}</button>
        ))}
      </nav>
      {hasLive && current?.kind !== "demo_lab" && (tab === "rapor" || tab === "oneriler") && (
        <div className="seg type-switch" role="group" aria-label="Ölçüm türü">
          <button aria-pressed={type === "model_knowledge"} onClick={() => setView("aramasiz")}>Aramasız (Gemini)</button>
          <button aria-pressed={type === "live_search"} onClick={() => setView("canli")}>Canlı aramalı (ChatGPT)</button>
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
    if (!name) { setErr("Marka adı gerekli."); return; }
    setBusy(true); setErr(null);
    try {
      await api.updateBrand(brand.id, {
        name, aliases: splitAliases(f.get("aliases")),
        website: String(f.get("website") || "").trim() || null,
        sector: String(f.get("sector") || "") || null,
        city: String(f.get("city") || "").trim() || null,
        ...(brand.data_origin !== "simulated" ? { auto_weekly: f.get("auto_weekly") === "on" } : {}),
      });
      onDone(true);
    } catch (e) { setErr(friendlyError(e)); setBusy(false); }
  }
  return (
    <form className="panel stack" onSubmit={save} noValidate aria-label="Markayı düzenle">
      <h2>Markayı düzenle</h2>
      <Field label="Marka adı" name="name" defaultValue={brand.name} required maxLength={120} />
      <Field label="Diğer yazılışlar" name="aliases" defaultValue={brand.aliases.join(", ")} hint="Virgülle ayırın" />
      <Field label="Web sitesi" name="website" defaultValue={brand.website ?? ""} inputMode="url" />
      <Select label="Sektör" name="sector" defaultValue={brand.sector ?? ""}>
        <option value="">Seçilmedi</option>
        {SECTORS.map((x) => <option key={x}>{x}</option>)}
        {brand.sector && !SECTORS.includes(brand.sector) && <option>{brand.sector}</option>}
      </Select>
      <Field label="Şehir veya ilçe" name="city" defaultValue={brand.city ?? ""} />
      {brand.data_origin !== "simulated" && (
        <label className="check">
          <input type="checkbox" name="auto_weekly" defaultChecked={brand.auto_weekly} />
          <span>Her hafta otomatik ölç <em className="muted">(paket kotası yetmezse o hafta atlanır)</em></span>
        </label>
      )}
      <p className="muted">Ad veya yazılışlar değişirse yeni ölçümler yeni adla yapılır; eski ölçümler olduğu gibi kalır.</p>
      <ErrorBox message={err} />
      <div className="form-actions">
        <Button type="submit" busy={busy}>Kaydet</Button>
        <Button type="button" variant="quiet" onClick={() => onDone(false)}>Vazgeç</Button>
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
          <button className="link-btn" onClick={() => setEditing(true)}>Düzenle</button>
          <Confirm label={`${c.name} silinsin mi?`} onConfirm={async () => { await api.deleteBrand(c.id); onChange(); }}>Sil</Confirm>
        </span>
      </li>
    );
  }
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name")).trim();
    if (!name) { setErr("Rakip adı gerekli."); return; }
    setBusy(true); setErr(null);
    try {
      await api.updateBrand(c.id, { name, aliases: splitAliases(f.get("aliases")), website: String(f.get("website") || "").trim() || null });
      setEditing(false); onChange();
    } catch (e) { setErr(friendlyError(e)); } finally { setBusy(false); }
  }
  return (
    <li className="editing">
      <form className="stack edit-inline" onSubmit={save} noValidate aria-label={`${c.name} düzenle`}>
        <Field label="Rakip adı" name="name" defaultValue={c.name} required maxLength={120} />
        <Field label="Diğer yazılışlar" name="aliases" defaultValue={c.aliases.join(", ")} hint="Virgülle ayırın" />
        <Field label="Web sitesi" name="website" defaultValue={c.website ?? ""} inputMode="url" />
        <ErrorBox message={err} />
        <div className="form-actions">
          <Button type="submit" busy={busy} className="btn-small">Kaydet</Button>
          <Button type="button" variant="quiet" className="btn-small" onClick={() => setEditing(false)}>Vazgeç</Button>
        </div>
      </form>
    </li>
  );
}

/** Son ölçümden 7 gün sonra (işçi saatlik çalıştığı için yaklaşık). */
function nextWeekly(runs: Run[]): string | null {
  const last = runs.find((r) => r.status !== "failed");
  if (!last) return "ilk ölçümden sonra";
  const d = new Date(new Date(last.created_at).getTime() + 7 * 86_400_000);
  return d < new Date() ? "bir saat içinde" : d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "long" });
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
          Ölçüm {pending.status === "queued" ? "sırada" : "çalışıyor"} ({formatDateTime(pending.created_at)}). Ölçümler sunucuda sırayla işlenir; sonuç gelince bu sayfa güncellenir.
          <button className="link-btn" onClick={onChange}>Yenile</button>
        </p>
      ) : paidAllowed && brand.data_origin !== "simulated" ? (
        <div className="run-buttons">
          <Button busy={busy === "free"} disabled={!!busy} onClick={() => start(false)}>Ölçüm başlat (aramasız, ücretsiz)</Button>
          <Button variant="quiet" busy={busy === "live"} disabled={!!busy || left < 0.05} onClick={() => start(true)}>Canlı aramalı ölçüm (ChatGPT, ücretli)</Button>
          {b && <p className="muted paid-note">Ücretli deneme bütçesi: {usd(Number(b.spent_usd))} / {usd(Number(b.cap_usd))} kullanıldı. Bir ölçüm yaklaşık {usd(0.012 * 2 * Math.max(runs[0]?.prompts_total ?? 10, 1))} tutar. Tavana gelince kendiliğinden durur.</p>}
        </div>
      ) : (
        <Button busy={busy === "free"} onClick={() => start(false)}>Ölçüm başlat</Button>
      )}
      {brand.data_origin !== "simulated" && (
        <p className="muted weekly-note">
          {brand.auto_weekly ? <>Haftalık otomatik ölçüm açık{nextWeekly(runs) && <>, sıradaki: {nextWeekly(runs)}</>}.</> : "Haftalık otomatik ölçüm kapalı."}
        </p>
      )}
      <ErrorBox message={err} />
    </div>
  );
}

function Report({ brand, type, onBrandChange }: { brand: Brand; type: MeasurementType; onBrandChange: () => void }) {
  const vis = useLoad(() => api.visibility(brand.id, type), [brand.id, type]);
  const [metric, setMetric] = useState<"recommend" | "mention">("recommend");
  const pts = series(vis.data ?? []);
  const last = pts[pts.length - 1];
  const prompts = useLoad(() => (last ? api.promptResults(last.runId) : Promise.resolve([])), [last?.runId]);
  const answers = useLoad(() => (last ? api.answers(last.runId) : Promise.resolve([])), [last?.runId]);
  const live = type === "live_search";
  const engine = type === "simulated" ? "Simülasyonda" : live ? "ChatGPT (canlı web aramasıyla)" : "Gemini";
  const domains = live ? topDomains((answers.data ?? []).flatMap((a) => a.cited_urls ?? [])) : [];
  const comps = useLoad(() => api.competitors(brand.id), [brand.id, brand.aliases.join("|")]);
  const ments = useLoad(() => (live && answers.data ? api.mentionsFor(answers.data.map((a) => a.id)) : Promise.resolve([])), [live, answers.data]);
  const host = (w: string | null) => (w ? w.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].toLowerCase() : "");
  const opps = live && answers.data && ments.data
    ? sourceOpportunities(answers.data, ments.data, brand.id, [brand.website, ...(comps.data ?? []).map((c) => c.website)].map(host).filter(Boolean))
    : [];
  const [open, setOpen] = useState<string | null>(null);

  if (vis.loading) return <Loading />;
  if (vis.error) return <ErrorBox message={vis.error} />;

  return (
    <div className="stack">
      <DataNotice type={type} />
      {!last ? (
        <Empty title="Henüz tamamlanmış ölçüm yok">
          <p>Önce <Link to="?sekme=sorular">soruları</Link> ve <Link to="?sekme=rakipler">rakipleri</Link> tanımlayın, sonra yukarıdan ölçüm başlatın.</p>
        </Empty>
      ) : (
        <>
          <section className="panel lead-result">
            <div className="lead-meta"><TypeBadge type={type} /><span className="muted">{formatDateTime(last.at)}, {last.providers.map(providerLabel).join(", ")}</span></div>
            <p className="lead-sentence">
              {engine}, <strong>{last.recommend.n}</strong> cevabın <strong>{numLoc(last.recommend.k)}</strong> {brand.name} markasını önerdi.
            </p>
            <dl className="metrics">
              <div><dt>Önerilme</dt><dd className="num">{pct(last.recommend.value)}</dd><dd className="range">aralık {rangeText(last.recommend)}</dd></div>
              <div><dt>Anılma</dt><dd className="num">{pct(last.mention.value)}</dd><dd className="range">aralık {rangeText(last.mention)}</dd></div>
              <div><dt>Önerilerdeki payınız</dt><dd className="num">{pct(last.share)}</dd><dd className="range">rakiplerle birlikte</dd></div>
              {live
                ? <div><dt>Sitenizin kaynak gösterilmesi</dt><dd className="num">{pct(last.cite.value)}</dd><dd className="range">{last.cite.k}/{last.cite.n} cevapta</dd></div>
                : <div><dt>Kaynak gösterilme</dt><dd className="num na">Ölçülmedi</dd><dd className="range">yalnızca canlı aramada vardır</dd></div>}
            </dl>
            {last.recommend.n < MIN_SAMPLE && (
              <p className="caution">Örneklem küçük ({last.recommend.n} cevap). Oranları kesin sonuç gibi okumayın; aralıklar geniştir. Daha fazla soru ekleyip tekrar ölçün.</p>
            )}
            <ShareButton text={() => shareSummary({
              brand: brand.name, at: last.at, live, simulated: type === "simulated",
              recommend: last.recommend, mention: last.mention,
              competitors: competitorsInRun(vis.data ?? [], last.runId).filter((c) => !c.isTarget),
              absentPrompts: (prompts.data ?? []).filter((p) => p.target_mentioned === 0).map((p) => p.prompt_text),
              topSources: domains.map((d) => d.domain),
            })} />
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Zaman içinde</h2>
              <div className="seg" role="group" aria-label="Gösterilen oran">
                <button aria-pressed={metric === "recommend"} onClick={() => setMetric("recommend")}>Önerilme</button>
                <button aria-pressed={metric === "mention"} onClick={() => setMetric("mention")}>Anılma</button>
              </div>
            </div>
            {pts.length < 2 && <p className="muted">Eğilim için en az iki ölçüm gerekir. Şimdilik tek ölçüm gösteriliyor.</p>}
            <TrendChart points={pts} type={type} metric={metric} />
          </section>

          <section className="panel">
            <h2>Rakiplerle karşılaştırma</h2>
            <p className="muted">Son ölçümde her markanın önerildiği cevap oranı.</p>
            <CompareBars type={type} rows={competitorsInRun(vis.data ?? [], last.runId).map((c) => ({
              name: c.name, isTarget: c.isTarget, value: c.recommend.value,
              detail: `${c.recommend.k}/${c.recommend.n} cevap, aralık ${rangeText(c.recommend)}, önerilerde pay ${pct(c.share)}`,
            }))} />
          </section>

          {live && (
            <section className="panel">
              <h2>Yapay zekânın kaynak gösterdiği siteler</h2>
              <p className="muted">ChatGPT bu cevapları verirken internette bu sitelere baktı. Rakibinizi öneren sitelerde yer almak görünürlüğünüzü artırır.</p>
              {answers.loading ? <Loading /> : domains.length === 0 ? <p>Bu ölçümde kaynak gösterilmedi.</p> : (
                <ol className="domains">
                  {domains.map((d) => <li key={d.domain}><span>{d.domain}</span><span className="num muted">{d.count} kez</span></li>)}
                </ol>
              )}
            </section>
          )}

          {type !== "simulated" && answers.data && comps.data && (
            <UntrackedNames brand={brand} competitors={comps.data} texts={answers.data.map((a) => a.answer_text)}
              onChange={() => { onBrandChange(); comps.reload(); }} />
          )}

          {live && (
            <section className="panel">
              <h2>Kaynak fırsatları</h2>
              <p className="muted">Rakibiniz önerilirken sizin önerilmediğiniz cevaplarda ChatGPT'nin baktığı siteler. Rakiplerin kendi siteleri ayrıca işaretlendi; diğerleri, yer almaya çalışabileceğiniz yerlerdir (içerik, liste, inceleme, basın).</p>
              {ments.loading || comps.loading ? <Loading /> : opps.length === 0 ? <p>Bu ölçümde böyle bir cevap yok.</p> : (
                <ol className="domains">
                  {opps.map((d) => <li key={d.domain}><span>{d.domain}{d.own && <span className="muted"> (rakibin kendi sitesi)</span>}</span><span className="num muted">{d.count} kez</span></li>)}
                </ol>
              )}
            </section>
          )}

          <section className="panel">
            <h2>Soru bazında sonuç</h2>
            {prompts.loading ? <Loading /> : (
              <ul className="q-results">
                {(prompts.data ?? []).map((p) => (
                  <li key={p.prompt_id}>
                    <p className="q-text">{p.prompt_text}</p>
                    <p className="q-meta">{INTENT_LABEL[p.intent]}</p>
                    <p className={`q-verdict ${p.target_recommended ? "yes" : p.target_mentioned ? "partial" : "no"}`}>
                      {p.target_recommended ? `Önerildiniz${p.best_rank ? `, en iyi sıra ${p.best_rank}` : ""}` : p.target_mentioned ? "Anıldınız ama önerilmediniz" : "Cevapta yoksunuz"}
                      <span className="muted"> ({p.answers} cevap)</span>
                    </p>
                    {p.top_competitor && <p className="q-comp">{p.target_recommended ? "Sizinle birlikte en çok önerilen rakip" : "Sizin yerinize önerilen rakip"}: {p.top_competitor}</p>}
                    <button className="link-btn" aria-expanded={open === p.prompt_id} onClick={() => setOpen(open === p.prompt_id ? null : p.prompt_id)}>
                      {open === p.prompt_id ? "Cevabı gizle" : "Cevabı göster"}
                    </button>
                    {open === p.prompt_id && (
                      <div className="answers">
                        {(answers.data ?? []).filter((a) => a.prompt_id === p.prompt_id).map((a) => (
                          <blockquote key={a.repetition} className="answer">
                            <p className="answer-meta">{type === "simulated" ? "Simülasyon cevabı" : live ? `ChatGPT cevabı (${a.model}, canlı arama)` : `Gemini cevabı (${a.model}, aramasız)`}{(answers.data ?? []).filter((x) => x.prompt_id === p.prompt_id).length > 1 && `, tekrar ${a.repetition}`}</p>
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
            <h2>Bu rapor neyi göstermez</h2>
            <ul className="plain">
              <li>Gemini uygulamasının internette arayarak verdiği güncel cevaplar ölçülmedi.</li>
              <li>ChatGPT ve Perplexity ölçülmedi.</li>
              <li>Hangi web sitelerinin cevapları etkilediği (kaynak analizi) canlı arama olmadan bilinemez.</li>
              <li>Öneri ve içerik iyileştirme tavsiyeleri henüz üretilmiyor.</li>
            </ul>
          </section>}
        </>
      )}
    </div>
  );
}

const SEV_LABEL = { high: "Önemli", medium: "Orta", low: "Düşük", info: "Bilgi" } as const;

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
  }).filter((r) => !(sim && r.id === "no_website"));

  async function check() {
    setBusy(true); setErr(null); setMsg(null);
    try { await api.requestAudit(brand.id); setMsg("Kontrol sıraya alındı. Sonuç en geç bir saat içinde burada görünür."); onBrandChange(); }
    catch (e) { setErr(friendlyError(e)); } finally { setBusy(false); }
  }

  return (
    <div className="stack">
      {sim && <DataNotice type="simulated" />}
      <section className="panel">
        <h2>Yapılacaklar</h2>
        <p className="muted">Son ölçüm{!sim && " ve web sitesi kontrolü"} sonuçlarından kurallarla çıkarıldı; yapay zekâ ile üretilmedi. Önem sırasına göre.</p>
        {recs.length === 0 ? <p>Şu an önerimiz yok. Yeni ölçümlerden sonra tekrar bakın.</p> : (
          <ol className="recs">
            {recs.map((r) => (
              <li key={r.id} className={`rec rec-${r.priority === "yüksek" ? "high" : r.priority === "orta" ? "medium" : "low"}`}>
                <div className="rec-head"><strong>{r.title}</strong><span className="rec-pri">{r.priority} öncelik</span></div>
                <p className="rec-why"><span>Neden:</span> {r.why}</p>
                <p className="rec-action"><span>Ne yapılmalı:</span> {r.action}</p>
              </li>
            ))}
          </ol>
        )}
      </section>

      {!sim && (
        <section className="panel">
          <div className="panel-head">
            <h2>Web sitesi kontrolü</h2>
            {brand.website && <Button variant="quiet" className="btn-small" busy={busy} onClick={check} disabled={!!pendingAudit}>{pendingAudit ? "Sırada" : "Siteyi kontrol et"}</Button>}
          </div>
          {msg && <p className="success-box">{msg}</p>}
          <ErrorBox message={err} />
          {!brand.website ? <p className="muted">Markaya web sitesi eklenmemiş. Adın yanındaki "Düzenle" ile ekleyin.</p>
            : !audit.data ? <p className="muted">{pendingAudit ? "Kontrol sırada; en geç bir saat içinde sonuç gelir." : "Henüz kontrol edilmedi. Site her hafta otomatik olarak da kontrol edilir."}</p>
            : (
              <>
                <p className="muted">{audit.data.url}, {formatDateTime(audit.data.created_at)}. {audit.data.checks.filter((c) => c.ok).length}/{audit.data.checks.length} kontrol geçti.</p>
                <ul className="checks">
                  {audit.data.checks.map((c) => (
                    <li key={c.id} className={c.ok ? "ok" : `bad sev-${c.severity}`}>
                      <span className="check-mark" aria-hidden>{c.ok ? "✓" : c.severity === "info" ? "i" : "!"}</span>
                      <span><strong>{c.title}</strong>{!c.ok && <em className="sev">{SEV_LABEL[c.severity]}</em>}<span className="muted">{c.detail}</span></span>
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
    if (!name) { setErr("Rakip adı gerekli."); return; }
    if (await create(name, splitAliases(f.get("aliases")), String(f.get("website") || "").trim() || null)) form.reset();
  }
  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-head"><h2>Rakipler</h2><span className="muted num">{list.length} / {limit}</span></div>
        {comps.loading ? <Loading /> : list.length === 0 ? <p className="muted">Henüz rakip yok. Cevaplarda hangi markaların sizin yerinize önerildiğini görmek için ekleyin.</p> : (
          <ul className="rows">
            {list.map((c) => <CompetitorRow key={c.id} c={c} onChange={comps.reload} />)}
          </ul>
        )}
      </section>
      {list.length < limit && ideas.length > 0 && (
        <section className="panel">
          <h2>Bu sektörde bilinen markalar</h2>
          <p className="muted">"{brand.sector}" sektöründen örnekler. Rakibiniz olanı tek dokunuşla ekleyin; adını sonra düzenleyebilirsiniz.</p>
          <div className="chips">
            {ideas.map((n) => <button key={n} className="chip" disabled={busy} onClick={() => create(n, [], null)}>+ {n}</button>)}
          </div>
        </section>
      )}
      {list.length < limit ? (
        <form className="panel stack" onSubmit={add} noValidate>
          <h2>Rakip ekle</h2>
          <Field label="Rakip adı" name="name" required maxLength={120} />
          <Field label="Diğer yazılışlar" name="aliases" hint="Virgülle ayırın" />
          <Field label="Web sitesi" name="website" inputMode="url" />
          <ErrorBox message={err} />
          <Button type="submit" busy={busy}>Rakibi ekle</Button>
        </form>
      ) : !comps.loading && <p className="muted">Paketinizin rakip sınırına ulaştınız.</p>}
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

  async function add(text: string, intent: Intent) {
    setBusy(true); setErr(null);
    try { await api.addPrompt({ workspace_id: brand.workspace_id, brand_id: brand.id, text, intent }); prompts.reload(); }
    catch (e) { setErr(friendlyError(e)); } finally { setBusy(false); }
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const text = String(f.get("text")).trim();
    if (text.length < 5) { setErr("Soru en az 5 karakter olmalı."); return; }
    await add(text, String(f.get("intent")) as Intent);
    form.reset();
  }

  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-head"><h2>Sorular</h2><span className="muted num">{active} / {limit} aktif</span></div>
        <p className="muted">Müşterilerinizin yapay zekâya soracağı soruları yazın. Her ölçümde bu sorular Gemini'ye sorulur.</p>
        {prompts.loading ? <Loading /> : list.length === 0 ? <p className="muted">Henüz soru yok.</p> : (
          <ul className="rows">
            {list.map((p) => <PromptRow key={p.id} p={p} onChange={prompts.reload} onError={setErr} />)}
          </ul>
        )}
      </section>

      {active < limit && ideas.length > 0 && (
        <section className="panel">
          <h2>Hazır sorular</h2>
          <p className="muted">"{brand.sector}" sektörü için elle hazırlanmış sorular{def?.local && brand.city ? `, ${brand.city} için` : ""}. Ekledikten sonra düzenleyebilirsiniz.</p>
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
        <p className="muted">{needsCity ? "Bu sektörün hazır soruları şehre göre hazırlanır. Markayı düzenleyip şehir ekleyin." : "Bu sektör için hazır soru yok. Sektör seçmek için markayı düzenleyin ya da kendi sorularınızı yazın."}</p>
      )}

      {active < limit ? (
        <form className="panel stack" onSubmit={submit} noValidate>
          <h2>Kendi sorunuzu ekleyin</h2>
          <Field label="Soru" name="text" maxLength={300} placeholder="Örn. Antalya'da en iyi döner nerede yenir?" />
          <Select label="Müşteri ne yapıyor?" name="intent" defaultValue="local">
            {(Object.keys(INTENT_LABEL) as Intent[]).map((k) => <option key={k} value={k}>{INTENT_LABEL[k]}</option>)}
          </Select>
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
        <form className="stack edit-inline" noValidate aria-label="Soruyu düzenle" onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const text = String(f.get("text")).trim();
          if (text.length < 5) { onError("Soru en az 5 karakter olmalı."); return; }
          setBusy(true);
          try { await api.updatePrompt(p.id, { text, intent: String(f.get("intent")) as Intent }); setEditing(false); onChange(); }
          catch (err) { onError(friendlyError(err)); } finally { setBusy(false); }
        }}>
          <Field label="Soru" name="text" defaultValue={p.text} maxLength={300} />
          <Select label="Müşteri ne yapıyor?" name="intent" defaultValue={p.intent}>
            {(Object.keys(INTENT_LABEL) as Intent[]).map((k) => <option key={k} value={k}>{INTENT_LABEL[k]}</option>)}
          </Select>
          <div className="form-actions">
            <Button type="submit" busy={busy} className="btn-small">Kaydet</Button>
            <Button type="button" variant="quiet" className="btn-small" onClick={() => setEditing(false)}>Vazgeç</Button>
          </div>
        </form>
      </li>
    );
  }
  return (
    <li className={p.active ? "" : "inactive"}>
      <span><span className="q-text">{p.text}</span><span className="q-meta">{INTENT_LABEL[p.intent]}{!p.active && ", pasif"}</span></span>
      <span className="row-actions">
        <button className="link-btn" onClick={() => setEditing(true)}>Düzenle</button>
        <button className="link-btn" onClick={async () => { try { await api.setPromptActive(p.id, !p.active); onChange(); } catch (e) { onError(friendlyError(e)); } }}>{p.active ? "Pasifleştir" : "Etkinleştir"}</button>
        <Confirm label="Silinsin mi?" onConfirm={async () => { await api.deletePrompt(p.id); onChange(); }}>Sil</Confirm>
      </span>
    </li>
  );
}

function RunHistory({ runs, loading }: { runs: Run[]; loading: boolean }) {
  if (loading) return <Loading />;
  if (runs.length === 0) return <Empty title="Henüz ölçüm yapılmadı"><p>Yukarıdaki "Ölçüm başlat" düğmesiyle ilk ölçümü başlatın.</p></Empty>;
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
              <p>{r.calls_ok} başarılı cevap{r.calls_failed > 0 && `, ${r.calls_failed} başarısız çağrı`}. {STOP_TEXT[r.stop_reason ?? ""] ?? ""}</p>
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
      setMsg(kind === "alias" ? `"${name}" markanızın diğer adı olarak eklendi.` : `"${name}" rakip olarak eklendi.`);
      onChange();
    } catch (e) { setErr(friendlyError(e)); } finally { setBusy(false); }
  }
  return (
    <section className="panel">
      <h2>Cevaplarda geçen diğer adlar</h2>
      <p className="muted">Bu adlar cevaplarda geçiyor ama takip etmiyorsunuz. Markanızın başka bir yazılışıysa ya da bir rakipse işaretleyin; geçmiş ölçümler ücretsiz olarak yeniden hesaplanır.</p>
      {brand.reanalyze_requested_at && <p className="success-box">Geçmiş ölçümler yeni bilgilerle yeniden hesaplanıyor; en geç bir saat içinde rapora yansır.</p>}
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
                <Button variant="quiet" className="btn-small" busy={busy} onClick={() => act(n.name, "alias")}>Benim markamın diğer adı</Button>
                <Button variant="quiet" className="btn-small" busy={busy} onClick={() => act(n.name, "competitor")}>Rakip olarak ekle</Button>
                <button className="link-btn" onClick={() => { setHidden((h) => [...h, n.name]); setOpen(null); }}>Önemsiz, gizle</button>
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
      if (navigator.share) { await navigator.share({ title: "AI SaaSavran ön raporu", text: t }); setDone("Paylaşıldı."); return; }
      await navigator.clipboard.writeText(t); setDone("Özet panoya kopyalandı; WhatsApp'a yapıştırabilirsiniz.");
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      try { await navigator.clipboard.writeText(t); setDone("Özet panoya kopyalandı."); } catch { setDone("Kopyalanamadı; tarayıcı izin vermedi."); }
    }
  }
  return (
    <div className="share-row">
      <Button variant="quiet" className="btn-small" onClick={share}>Özeti paylaş (WhatsApp, e-posta)</Button>
      {done && <span className="muted" role="status">{done}</span>}
    </div>
  );
}
