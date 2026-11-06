import { useState, type FormEvent } from "react";
import { SECTORS, competitorSuggestions, questionTemplates, sectorDef } from "../lib/sectors";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useApp, useLoad } from "../lib/app";
import { api, INTENT_LABEL, type Brand, type Intent, type MeasurementType, type Prompt, type Run } from "../lib/data";
import { friendlyError } from "../lib/supabase";
import { ERROR_CLASS_TEXT, STOP_TEXT, runStatusText } from "../lib/messages";
import { competitorsInRun, formatDateTime, MIN_SAMPLE, numLoc, pct, providerLabel, rangeText, series } from "../lib/report";
import { Button, Confirm, DataNotice, Empty, ErrorBox, Field, Loading, Select, TypeBadge } from "../components/ui";
import { CompareBars, TrendChart } from "../components/Chart";

const TABS = [
  ["rapor", "Rapor"], ["rakipler", "Rakipler"], ["sorular", "Sorular"], ["olcumler", "Ölçümler"],
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
  const type: MeasurementType = current?.kind === "demo_lab" ? "simulated" : "model_knowledge";

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
            <RunControl brand={b} runs={runs.data ?? []} onChange={runs.reload} />
          </>
        )}
      </header>
      <nav className="tabs" role="tablist" aria-label="Marka bölümleri">
        {TABS.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setParams({ sekme: k }, { replace: true })}>{label}</button>
        ))}
      </nav>
      {tab === "rapor" && <Report brand={b} type={type} />}
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

function RunControl({ brand, runs, onChange }: { brand: Brand; runs: Run[]; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const pending = runs.find((r) => r.status === "queued" || r.status === "running");
  async function start() {
    setBusy(true); setErr(null);
    try { await api.requestRun(brand.id); onChange(); } catch (e) { setErr(friendlyError(e)); } finally { setBusy(false); }
  }
  return (
    <div className="run-control">
      {pending ? (
        <p className="run-pending" role="status">
          Ölçüm {pending.status === "queued" ? "sırada" : "çalışıyor"} ({formatDateTime(pending.created_at)}). Ölçümler sunucuda sırayla işlenir; sonuç gelince bu sayfa güncellenir.
          <button className="link-btn" onClick={onChange}>Yenile</button>
        </p>
      ) : (
        <Button busy={busy} onClick={start}>Ölçüm başlat</Button>
      )}
      <ErrorBox message={err} />
    </div>
  );
}

function Report({ brand, type }: { brand: Brand; type: MeasurementType }) {
  const vis = useLoad(() => api.visibility(brand.id, type), [brand.id, type]);
  const [metric, setMetric] = useState<"recommend" | "mention">("recommend");
  const pts = series(vis.data ?? []);
  const last = pts[pts.length - 1];
  const prompts = useLoad(() => (last ? api.promptResults(last.runId) : Promise.resolve([])), [last?.runId]);
  const answers = useLoad(() => (last ? api.answers(last.runId) : Promise.resolve([])), [last?.runId]);
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
              {type === "simulated" ? "Simülasyonda" : "Gemini"}, <strong>{last.recommend.n}</strong> cevabın <strong>{numLoc(last.recommend.k)}</strong> {brand.name} markasını önerdi.
            </p>
            <dl className="metrics">
              <div><dt>Önerilme</dt><dd className="num">{pct(last.recommend.value)}</dd><dd className="range">aralık {rangeText(last.recommend)}</dd></div>
              <div><dt>Anılma</dt><dd className="num">{pct(last.mention.value)}</dd><dd className="range">aralık {rangeText(last.mention)}</dd></div>
              <div><dt>Önerilerdeki payınız</dt><dd className="num">{pct(last.share)}</dd><dd className="range">rakiplerle birlikte</dd></div>
              <div><dt>Kaynak gösterilme</dt><dd className="num na">Ölçülmedi</dd><dd className="range">yalnızca canlı aramada vardır</dd></div>
            </dl>
            {last.recommend.n < MIN_SAMPLE && (
              <p className="caution">Örneklem küçük ({last.recommend.n} cevap). Oranları kesin sonuç gibi okumayın; aralıklar geniştir. Daha fazla soru ekleyip tekrar ölçün.</p>
            )}
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
                            <p className="answer-meta">{type === "simulated" ? "Simülasyon cevabı" : `Gemini cevabı (${a.model}, aramasız)`}{(answers.data ?? []).filter((x) => x.prompt_id === p.prompt_id).length > 1 && `, tekrar ${a.repetition}`}</p>
                            <Highlighted text={a.answer_text} names={[brand.name, ...brand.aliases]} />
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
