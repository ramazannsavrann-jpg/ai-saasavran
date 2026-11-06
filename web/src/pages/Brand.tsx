import { useState, type FormEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useApp, useLoad } from "../lib/app";
import { api, INTENT_LABEL, type Brand, type Intent, type MeasurementType, type Run } from "../lib/data";
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

  if (brand.loading) return <Loading />;
  if (brand.error || !brand.data) return <ErrorBox message="Marka bulunamadı veya bu markayı görme yetkiniz yok." />;
  const b = brand.data;
  const type: MeasurementType = current?.kind === "demo_lab" ? "simulated" : "model_knowledge";

  return (
    <div className="stack">
      <header className="page-head brand-head">
        <Link to="/panel" className="back">Panele dön</Link>
        <h1>{b.name}</h1>
        <p className="muted">{[b.sector, b.city, b.website].filter(Boolean).join(", ") || "Ayrıntı girilmedi"}</p>
        <RunControl brand={b} runs={runs.data ?? []} onChange={runs.reload} />
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
                    {p.top_competitor && <p className="q-comp">Öne çıkan rakip: {p.top_competitor}</p>}
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

function Competitors({ brand }: { brand: Brand }) {
  const { current } = useApp();
  const comps = useLoad(() => api.competitors(brand.id), [brand.id]);
  const usage = useLoad(() => api.usage(brand.workspace_id), [brand.workspace_id]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const limit = usage.data?.competitor_limit ?? 0;
  const list = comps.data ?? [];
  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const name = String(f.get("name")).trim();
    if (!name) { setErr("Rakip adı gerekli."); return; }
    setBusy(true); setErr(null);
    try {
      await api.addBrand({
        workspace_id: brand.workspace_id, name, is_competitor: true, owner_brand_id: brand.id,
        website: String(f.get("website") || "").trim() || null,
        aliases: String(f.get("aliases") || "").split(",").map((s) => s.trim()).filter(Boolean),
        ...(current?.kind === "demo_lab" ? { data_origin: "simulated" } : {}),
      });
      form.reset(); comps.reload();
    } catch (e) { setErr(friendlyError(e)); } finally { setBusy(false); }
  }
  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-head"><h2>Rakipler</h2><span className="muted num">{list.length} / {limit}</span></div>
        {comps.loading ? <Loading /> : list.length === 0 ? <p className="muted">Henüz rakip yok. Cevaplarda hangi markaların sizin yerinize önerildiğini görmek için ekleyin.</p> : (
          <ul className="rows">
            {list.map((c) => (
              <li key={c.id}>
                <span><strong>{c.name}</strong>{c.website && <span className="muted"> {c.website}</span>}</span>
                <Confirm label={`${c.name} silinsin mi?`} onConfirm={async () => { await api.deleteBrand(c.id); comps.reload(); }}>Sil</Confirm>
              </li>
            ))}
          </ul>
        )}
      </section>
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

/** Türkçe bulunma eki (ünlü uyumu + sert ünsüz): Antalya'da, İzmir'de, Sinop'ta. */
export function locative(name: string): string {
  const lower = name.toLocaleLowerCase("tr-TR");
  const vowels = [...lower].filter((c) => "aıoueiöü".includes(c));
  const last = vowels[vowels.length - 1] ?? "a";
  const v = "aıou".includes(last) ? "a" : "e";
  const hard = "fstkçşhp".includes(lower.slice(-1));
  return `${name}'${hard ? "t" : "d"}${v}`;
}

function suggestions(b: Brand): { text: string; intent: Intent }[] {
  const where = b.city ? locative(b.city) : "Şehrimde";
  const city = b.city || "şehrimde";
  const s = (b.sector || "işletme").split("/")[0].trim().toLocaleLowerCase("tr-TR");
  return [
    { text: `${city} için en iyi ${s} seçenekleri hangileri?`, intent: "local" },
    { text: `${where} uygun fiyatlı ve güvenilir bir ${s} önerir misin?`, intent: "comparison" },
    { text: `${where} ailece gidilebilecek ${s} seçenekleri neler?`, intent: "local" },
    { text: `Bir ${s} seçerken nelere dikkat etmeliyim?`, intent: "informational" },
    { text: `${where} bugün gidebileceğim, yorumları iyi ${s} hangisi?`, intent: "purchase" },
  ];
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
  const ideas = suggestions(brand).filter((s) => !existing.has(s.text));

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
            {list.map((p) => (
              <li key={p.id} className={p.active ? "" : "inactive"}>
                <span><span className="q-text">{p.text}</span><span className="q-meta">{INTENT_LABEL[p.intent]}{!p.active && ", pasif"}</span></span>
                <span className="row-actions">
                  <button className="link-btn" onClick={async () => { try { await api.setPromptActive(p.id, !p.active); prompts.reload(); } catch (e) { setErr(friendlyError(e)); } }}>{p.active ? "Pasifleştir" : "Etkinleştir"}</button>
                  <Confirm label="Silinsin mi?" onConfirm={async () => { await api.deletePrompt(p.id); prompts.reload(); }}>Sil</Confirm>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {active < limit && ideas.length > 0 && (
        <section className="panel">
          <h2>Şablondan öneriler</h2>
          <p className="muted">Sektör ve şehre göre hazır şablonlar. Yapay zekâ ile üretilmedi; ekledikten sonra düzenleyebilirsiniz.</p>
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
