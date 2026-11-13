import { useMemo, useState, type FormEvent } from "react";
import { SECTORS, competitorSuggestions, postPurchaseTemplates, questionTemplates, sectorDef } from "../lib/sectors";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useApp, useLoad } from "../lib/app";
import { api, INTENT_LABEL, type Brand, type BrandAction, type PromptResult, type Intent, type MeasurementType, type Prompt, type Run, type Product, type ShoppingCheck, type VisRow } from "../lib/data";
import { friendlyError, sb } from "../lib/supabase";
import { L, isEn } from "../lib/i18n";
import { ERROR_CLASS_TEXT, STOP_TEXT, runStatusText } from "../lib/messages";
import { actionImpact, compareProducts, engineComparison, engineScoreChanges, perceptionSummary, scoreChange, visibilityScore, type ScoreInput, type ScorePartKey, ownedSourceShare, visibilityForecast, sourcesByEngine, rivalReasons, conditionMap, lossCards, productVisibility, promptKind, shoppingSources, sourceDominance, splitByKind, type EngineCompareRow, type LossCard, type SourceRow } from "../../../engine/src/insights.ts";
import { competitorsInRun, formatDate, formatDateTime, MIN_SAMPLE, numLoc, pct, providerLabel, rangeText, series, shareSummary, sourceOpportunities, topDomains, usd } from "../lib/report";
import { Button, Confirm, DataNotice, Empty, ErrorBox, Field, Loading, Select, TypeBadge } from "../components/ui";
import { CompareBars, TrendChart } from "../components/Chart";
import { buildRecommendations, type RecInput } from "../../../engine/src/recommendations.ts";
import { untrackedNames } from "../../../engine/src/metrics.ts";
import { campaignFor, taskProgress } from "../../../engine/src/campaign.ts";
import { guessIntent } from "../../../engine/src/discovery.ts";
import { botSummary, snippet, SOURCE_PROVIDER, trafficSummary, visibilityVsVisits, workerCode, type AiSource, type BotKind } from "../../../engine/src/traffic.ts";
import { sourceMix, statSummary, truthSummary, type SourceMix, type SourceType } from "../../../engine/src/truth.ts";

const TABS = [
  ["rapor", L("Rapor", "Report")], ["oneriler", L("Öneriler", "Recommendations")], ["rakipler", L("Rakipler", "Competitors")], ["sorular", L("Sorular", "Questions")], ["urunler", L("Ürünler", "Products")], ["olcumler", L("Ölçümler", "Runs")],
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
      {tab === "rapor" && <Report brand={b} type={type} onBrandChange={brand.reload} paid={current?.kind === "growth_lab" || (!!current?.plan && current.plan !== "free")} />}
      {tab === "rapor" && current?.kind !== "demo_lab" && b.data_origin !== "simulated" && runList.some((r) => r.status === "done") && <ReportSharePanel brand={b} />}
      {tab === "oneriler" && <Advice brand={b} type={type} runs={runs.data ?? []} onBrandChange={brand.reload} />}
      {tab === "rakipler" && <Competitors brand={b} />}
      {tab === "sorular" && <Questions brand={b} />}
      {tab === "urunler" && <Products brand={b} paidAllowed={!!current?.paid_live_allowed} />}
      {tab === "olcumler" && <RunHistory runs={runs.data ?? []} loading={runs.loading} />}
    </div>
  );
}

/** Paylaşılabilir rapor bağlantısı: giriş yapmadan görülebilen salt okunur rapor (PDF olarak da kaydedilebilir). */
function ReportSharePanel({ brand }: { brand: Brand }) {
  const shares = useLoad(() => api.reportShares(brand.id), [brand.id]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const url = (t: string) => `${location.origin}/rapor/${t}`;
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const days = Number(new FormData(e.currentTarget).get("days") || 30);
    setBusy(true); setErr(null);
    try { const t = await api.createReportShare(brand.id, days); shares.reload(); await copy(t); }
    catch (x) { setErr(friendlyError(x)); } finally { setBusy(false); }
  }
  async function copy(t: string) {
    try {
      if (navigator.share) await navigator.share({ title: `${brand.name}: ${L("yapay zekâ görünürlük raporu", "AI visibility report")}`, url: url(t) });
      else { await navigator.clipboard.writeText(url(t)); setCopied(t); }
    } catch { /* kullanıcı vazgeçti */ }
  }
  return (
    <section className="panel stack">
      <h2>{L("Raporu paylaş", "Share the report")}</h2>
      <p className="muted">{L("Bağlantıyı bilen herkes giriş yapmadan raporu görür: son ölçümün sayıları, rakip karşılaştırması, sorular ve kaynak siteler. Cevap metinleri gösterilmez. Rapor sayfasında \"PDF olarak kaydet\" düğmesi var. İstediğiniz zaman iptal edebilirsiniz.", "Anyone with the link can view the report without signing in: latest numbers, competitor comparison, questions and source sites. Answer texts are not shown. The report page has a \"Save as PDF\" button. You can revoke it anytime.")}</p>
      <form className="row-form" onSubmit={create} aria-label={L("Paylaşım bağlantısı oluştur", "Create share link")}>
        <Select label={L("Geçerlilik", "Valid for")} name="days" defaultValue="30">
          <option value="7">{L("7 gün", "7 days")}</option>
          <option value="30">{L("30 gün", "30 days")}</option>
          <option value="90">{L("90 gün", "90 days")}</option>
        </Select>
        <Button type="submit" busy={busy}>{L("Bağlantı oluştur", "Create link")}</Button>
      </form>
      <ErrorBox message={err} />
      {(shares.data ?? []).length > 0 && (
        <ul className="rows">{(shares.data ?? []).map((s) => (
          <li key={s.id}>
            <span><a href={url(s.token)} target="_blank" rel="noopener">{L("Rapor bağlantısı", "Report link")}</a><span className="q-meta">{isEn() ? `until ${formatDate(s.expires_at)}` : `${formatDate(s.expires_at)} tarihine kadar`}{copied === s.token ? L(" · kopyalandı", " · copied") : ""}</span></span>
            <span>
              <button className="link-btn" onClick={() => copy(s.token)}>{L("Paylaş", "Share")}</button>
              <Confirm label={L("İptal edilsin mi?", "Revoke?")} onConfirm={async () => { await api.revokeReportShare(s.id); shares.reload(); }}>{L("İptal et", "Revoke")}</Confirm>
            </span>
          </li>
        ))}</ul>
      )}
    </section>
  );
}

/** Rakip ürün karşılaştırması: kendi ürünü ve rakip ürünler aynı cevaplarda, motor bazında; ikisi birlikte geçtiğinde kim önerildi. */
function RivalCompare({ own, rivals, brand, answers, hasRuns, onChange, onError }: {
  own: { id: string; name: string }; rivals: { id: string; name: string; rival_brand: string | null }[]; brand: Brand;
  answers: Parameters<typeof compareProducts>[0] | null; hasRuns: boolean; onChange: () => void; onError: (m: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const rows = answers && rivals.length ? compareProducts(answers, own, rivals, { name: brand.name }) : [];
  const engines = [...new Set(rows.flatMap((r) => Object.keys(r.byEngine)))].sort();
  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget, f = new FormData(form);
    const name = String(f.get("rival_name") || "").trim();
    if (name.length < 2) { onError(L("Rakip ürünün adını yazın.", "Enter the competitor product's name.")); return; }
    setBusy(true);
    try { await api.addRival({ workspace_id: brand.workspace_id, brand_id: brand.id, name, rival_of: own.id, rival_brand: String(f.get("rival_brand") || "").trim() || null }); form.reset(); setOpen(false); onChange(); }
    catch (x) { onError(friendlyError(x)); } finally { setBusy(false); }
  }
  return (
    <div className="prod-vis">
      <p className="src-sup"><strong>{L("Rakip ürünlerle karşılaştırma", "Compared with competitor products")}</strong></p>
      {rivals.length === 0 && <p className="src-sup muted">{L("Henüz rakip ürün yok. Müşterinizin bu ürün yerine alabileceği 1–5 rakip ürün ekleyin.", "No competitor products yet. Add 1–5 products a customer might buy instead.")}</p>}
      {rivals.length > 0 && !hasRuns && <p className="src-sup muted">{L("Karşılaştırma için önce bir ölçüm tamamlanmalı.", "A completed measurement is needed to compare.")}</p>}
      {rows.length > 0 && engines.map((en) => (
        <div key={en}>
          <p className="src-sup muted">{providerLabel(en)}</p>
          <ul className="src-dom">
            {rows.map((r) => { const e = r.byEngine[en]; return (
              <li key={r.id}>
                <p className="src-head"><span>{r.isOwn ? <strong>{r.name}</strong> : r.name}</span> <span className="num">{e ? `${e.recommended}/${e.answers}` : "–"}</span></p>
                {e && <p className="src-sup muted">{isEn() ? `mentioned ${e.mentioned}, recommended ${e.recommended} (range ${pct(e.low)}–${pct(e.high)})` : `${e.mentioned} kez geçti, ${e.recommended} kez önerildi (aralık ${pct(e.low)}–${pct(e.high)})`}</p>}
              </li>
            ); })}
          </ul>
        </div>
      ))}
      {rows.filter((r) => !r.isOwn && r.headToHead && r.headToHead.bothMentioned > 0).map((r) => (
        <p key={r.id} className="src-sup">{isEn() ? `${own.name} vs ${r.name}: both appeared in ${r.headToHead!.bothMentioned} answers; only yours recommended in ${r.headToHead!.ownWins}, only theirs in ${r.headToHead!.rivalWins}.` : `${own.name} ↔ ${r.name}: ${r.headToHead!.bothMentioned} cevapta ikisi birlikte geçti; yalnız sizinki ${r.headToHead!.ownWins}, yalnız onunki ${r.headToHead!.rivalWins} kez önerildi.`}</p>
      ))}
      {answers && rivals.length > 0 && rivalReasons(answers, own, rivals, { name: brand.name }).filter((x) => x.quotes.length > 0).map((x) => (
        <div key={x.rivalId} className="loss-card">
          <p className="loss-title">{isEn() ? `Why ${rows.find((r) => r.id === x.rivalId)?.name} was recommended instead of yours (${x.answers} answer${x.answers > 1 ? "s" : ""})` : `${rows.find((r) => r.id === x.rivalId)?.name} sizin yerinize neden önerildi (${x.answers} cevap)`}</p>
          <ul>{x.quotes.map((q) => <li key={q.answerId}><span className="muted">{providerLabel(q.provider)}: </span>“{q.text}”</li>)}</ul>
          <p className="src-sup muted">{L("Cevaplardan birebir alıntı. Bu özellikler sizin ürününüzde de varsa sitenizde ve ürün sayfanızda açıkça yazın.", "Verbatim quotes from the answers. If your product has these strengths too, state them clearly on your site and product page.")}</p>
        </div>
      ))}
      {rows.length > 0 && <p className="src-sup muted">{L("Son ölçümün cevaplarına dayanır; ek ücret yok. Ürün adları cevaplarda farklı yazılabilir, sayımlar bu yüzden düşük kalabilir.", "Based on the latest measurement's answers; no extra cost. Product names may be written differently in answers, so counts can be low.")}</p>}
      {rivals.length > 0 && <p className="src-sup">{rivals.map((r) => <span key={r.id} className="chip-inline">{r.rival_brand ? `${r.rival_brand} ` : ""}{r.name} <button className="link-btn" onClick={async () => { try { await api.deleteProduct(r.id); onChange(); } catch (x) { onError(friendlyError(x)); } }}>{L("sil", "remove")}</button></span>)}</p>}
      {rivals.length < 5 && (open ? (
        <form className="stack" onSubmit={add} noValidate aria-label={L("Rakip ürün ekle", "Add competitor product")}>
          <Field label={L("Rakip ürün adı", "Competitor product name")} name="rival_name" maxLength={120} placeholder={L("Örn. Aero 5", "e.g. Aero 5")} />
          <Field label={L("Rakip marka (isteğe bağlı)", "Competitor brand (optional)")} name="rival_brand" maxLength={80} />
          <Button type="submit" variant="quiet" busy={busy}>{L("Ekle", "Add")}</Button>
        </form>
      ) : <button className="link-btn" onClick={() => setOpen(true)}>{L("+ Rakip ürün ekle", "+ Add competitor product")}</button>)}
    </div>
  );
}

/** Ürün görünürlüğü ve önerilme oranı: motor bazında; ürünün önerilmediği sorularda yerine önerilen rakip markalar ve kaynaklar. */
function ProductVisibilityView({ vis, loading, hasRuns }: { vis: ReturnType<typeof productVisibility> | null; loading: boolean; hasRuns: boolean }) {
  if (loading) return <p className="src-sup muted">{L("Görünürlük hesaplanıyor…", "Calculating visibility…")}</p>;
  if (!hasRuns || !vis) return <p className="src-sup muted">{L("Görünürlük için önce bir ölçüm tamamlanmalı.", "Visibility needs a completed measurement first.")}</p>;
  const total = vis.engines.reduce((n, e) => n + e.mentioned, 0);
  const winners = new Map<string, number>(); const sources = new Map<string, number>();
  for (const l of vis.losses) { for (const w of l.winners) winners.set(w.name, (winners.get(w.name) ?? 0) + w.count); for (const s of l.sources) sources.set(s.domain, (sources.get(s.domain) ?? 0) + s.count); }
  const top = (m: Map<string, number>, n: number) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k} (${v})`).join(", ");
  return (
    <div className="prod-vis">
      <p className="src-sup"><strong>{L("Görünürlük (son ölçüm)", "Visibility (latest measurement)")}</strong></p>
      {vis.engines.map((e) => (
        <p key={e.provider} className="src-sup"><span className="muted">{providerLabel(e.provider)}: </span>
          {isEn() ? `mentioned in ${e.mentioned} of ${e.answers} answers, recommended in ${e.recommended} (${pct(e.answers ? e.recommended / e.answers : 0)}, range ${pct(e.low)}–${pct(e.high)})` : `${e.answers} cevabın ${e.mentioned} tanesinde geçti, ${e.recommended} tanesinde önerildi (${pct(e.answers ? e.recommended / e.answers : 0)}, aralık ${pct(e.low)}–${pct(e.high)})`}{e.answers < MIN_SAMPLE && L("; örneklem küçük", "; small sample")}.
        </p>
      ))}
      {total === 0 && <p className="src-sup muted">{L("Ürün adı hiçbir cevapta geçmedi. Sorularınız marka düzeyindeyse bu beklenir: Sorular sekmesinden bu ürünün kategorisine dair markasız sorular ekleyin (örn. \"1.000 dolar altı en iyi yol bisikleti hangisi?\").", "The product name did not appear in any answer. That is expected if your questions are brand-level: add unbranded questions about this product's category in the Questions tab (e.g. \"What is the best road bike under $1,000?\").")}</p>}
      {vis.losses.length > 0 && winners.size > 0 && (
        <p className="src-sup">{isEn() ? `Not recommended in ${vis.losses.length} question${vis.losses.length > 1 ? "s" : ""} where a competitor brand was. Recommended instead: ${top(winners, 4)}.` : `${vis.losses.length} soruda ürününüz önerilmedi, rakip marka önerildi. Yerine önerilenler: ${top(winners, 4)}.`}{sources.size > 0 && <> {L("Bu cevapların dayandığı kaynaklar: ", "Sources behind those answers: ")}{top(sources, 5)}.</>}</p>
      )}
      <p className="src-sup muted">{L("Kural tabanlı eşleştirme; rakipler marka düzeyindedir (rakip ürün karşılaştırması değildir). Kanıt gösterir, neden kanıtlamaz.", "Rule-based matching; competitors are brand-level (not a competitor-product comparison). Shows evidence, not proof of cause.")}</p>
    </div>
  );
}

/** Google Shopping görünürlüğü: haftalık (ya da istekle) Google Shopping araması; ürününüzün ve rakip ürünlerin sırası, fiyatı, satıcısı. */
function ShoppingView({ product, rivals, checks, paidAllowed, onChange, onError, onMsg }: {
  product: Product; rivals: Product[]; checks: ShoppingCheck[]; paidAllowed: boolean;
  onChange: () => void; onError: (m: string) => void; onMsg: (m: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const last = checks[0], prev = checks[1];
  const pending = !!product.shopping_requested_at && (!last || last.created_at < product.shopping_requested_at);
  const nameOf = (id: string) => { const r = rivals.find((x) => x.id === id); return r ? `${r.rival_brand ? `${r.rival_brand} ` : ""}${r.name}` : "?"; };
  async function request() {
    setBusy(true);
    try { await api.requestShoppingCheck(product.id); onMsg(L("Google Shopping kontrolü sıraya alındı. Sonuç en geç bir saat içinde burada görünür.", "Google Shopping check queued. The result appears here within an hour.")); onChange(); }
    catch (x) { onError(friendlyError(x)); } finally { setBusy(false); }
  }
  async function saveQuery(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get("shopping_query") || "").trim();
    if (q && q.length < 2) { onError(L("Arama en az 2 karakter olmalı.", "The search needs at least 2 characters.")); return; }
    setBusy(true);
    try { await api.setShoppingQuery(product.id, q || null); setEditing(false); onChange(); }
    catch (x) { onError(friendlyError(x)); } finally { setBusy(false); }
  }
  const change = last && prev && last.query === prev.query ? (() => {
    const a = last.own_position, b = prev.own_position;
    if (a && b) return a < b ? (isEn() ? ` Up from #${b}.` : ` Geçen kontrolde ${b}. sıradaydı, yükseldi.`) : a > b ? (isEn() ? ` Down from #${b}.` : ` Geçen kontrolde ${b}. sıradaydı, düştü.`) : L(" Geçen kontrolle aynı.", " Same as last check.");
    if (a && !b) return L(" Geçen kontrolde listede yoktu.", " Not in the list last time.");
    if (!a && b) return isEn() ? ` Was #${b} last time.` : ` Geçen kontrolde ${b}. sıradaydı.`;
    return "";
  })() : "";
  const items = last ? (showAll ? last.items : last.items.slice(0, 5)) : [];
  return (
    <div className="prod-vis">
      <p className="src-sup"><strong>Google Shopping</strong></p>
      {!last && <p className="src-sup muted">{paidAllowed
        ? (pending ? L("Kontrol sırada.", "Check queued.") : L("Henüz kontrol edilmedi. Ücretli paketlerde ürünleriniz haftada bir otomatik olarak Google Shopping'de aranır.", "Not checked yet. On paid plans your products are searched on Google Shopping automatically once a week."))
        : L("Ücretli paketlerde ürünleriniz haftada bir otomatik olarak Google Shopping'de aranır: sıranız, fiyatınız, satıcılar ve rakip ürünler.", "On paid plans your products are searched on Google Shopping once a week: your position, price, sellers and competitor products.")}</p>}
      {last && <>
        <p className="src-sup">{formatDateTime(last.created_at)} · {L("Arama", "Search")}: <em>{last.query}</em></p>
        <p className="src-sup">{last.own_position
          ? (isEn() ? `Your product is #${last.own_position} of ${last.items.length} listings${last.own_price ? `, ${last.own_price}` : ""}${last.own_seller ? ` (${last.own_seller})` : ""}.${last.own_count > 1 ? ` It appears in ${last.own_count} listings.` : ""}` : `Ürününüz ${last.items.length} ilan içinde ${last.own_position}. sırada${last.own_price ? `, ${last.own_price}` : ""}${last.own_seller ? ` (${last.own_seller})` : ""}.${last.own_count > 1 ? ` Toplam ${last.own_count} ilanda geçiyor.` : ""}`)
          : (isEn() ? `Your product is not among the first ${last.items.length} listings.` : `Ürününüz ilk ${last.items.length} ilan arasında yok.`)}{change}</p>
        {last.rivals.length > 0 && <p className="src-sup">{L("Rakip ürünler: ", "Competitor products: ")}{last.rivals.map((r) => isEn() ? `${nameOf(r.id)} #${r.position}${r.price ? ` (${r.price})` : ""}` : `${nameOf(r.id)} ${r.position}. sırada${r.price ? ` (${r.price})` : ""}`).join(", ")}.</p>}
        {items.length > 0 && <ol className="src-sup shop-list">{items.map((i) => (
          <li key={i.position} value={i.position}>{i.match ? <strong>{i.title}</strong> : i.title}<span className="muted">{i.source ? ` · ${i.source}` : ""}{i.price ? ` · ${i.price}` : ""}{i.match?.kind === "own" ? L(" · sizin ürününüz", " · your product") : i.match?.kind === "rival" ? L(" · rakip ürün", " · competitor product") : ""}</span></li>
        ))}</ol>}
        {last.items.length > 5 && <button className="link-btn" onClick={() => setShowAll(!showAll)}>{showAll ? L("İlk 5'i göster", "Show top 5") : isEn() ? `Show all ${last.items.length}` : `${last.items.length} ilanın hepsini göster`}</button>}
        {last.items.length === 0 && <p className="src-sup muted">{L("Bu arama için Google Shopping sonuç vermedi. Daha genel bir arama deneyin.", "Google Shopping returned no results for this search. Try a broader search.")}</p>}
      </>}
      {editing ? (
        <form className="stack" onSubmit={saveQuery} noValidate aria-label={L("Google Shopping araması", "Google Shopping search")}>
          <Field label={L("Google Shopping'de aranacak ifade", "Search on Google Shopping")} name="shopping_query" maxLength={120} defaultValue={product.shopping_query ?? ""}
            placeholder={L("Örn. erkek koşu ayakkabısı", "e.g. men's running shoes")} hint={L("Müşterinin yazacağı kategori araması. Boş bırakırsanız marka ve ürün adı aranır.", "The category search a customer would type. Leave empty to search the brand and product name.")} />
          <Button type="submit" variant="quiet" busy={busy}>{L("Kaydet", "Save")}</Button>
        </form>
      ) : <p className="src-sup"><span className="muted">{L("Aranan: ", "Searching: ")}</span>{product.shopping_query ?? L("marka ve ürün adı", "brand and product name")} <button className="link-btn" onClick={() => setEditing(true)}>{L("değiştir", "change")}</button></p>}
      {paidAllowed && <button className="link-btn" disabled={pending || busy} onClick={request}>{pending ? L("Kontrol sırada", "Check queued") : L("Şimdi kontrol et", "Check now")}</button>}
      <p className="src-sup muted">{L("Google Shopping sonuçları konuma ve kişiye göre değişebilir; bu, markanızın ülkesinden yapılmış tek bir aramanın anlık görüntüsüdür. İlan başlıkları ürün adınızla eşleştirilir; farklı yazılmış ilanlar sayılmayabilir.", "Google Shopping results can vary by location and person; this is a snapshot of one search from your brand's country. Listing titles are matched to your product name; listings written differently may be missed.")}</p>
    </div>
  );
}

/** Ürün Doğruluğu (pilot): doğru bilgileri girilen ürünü ChatGPT'ye sorar, cevaptaki iddiaları bu bilgilerle karşılaştırır. */
function Products({ brand, paidAllowed }: { brand: Brand; paidAllowed: boolean }) {
  const products = useLoad(() => api.products(brand.id), [brand.id]);
  const checks = useLoad(() => api.productChecks((products.data ?? []).map((p) => p.id)), [(products.data ?? []).map((p) => p.id).join(",")]);
  const shop = useLoad(() => api.shoppingChecks((products.data ?? []).filter((p) => !p.rival_of).map((p) => p.id)), [(products.data ?? []).map((p) => `${p.id}:${p.shopping_requested_at ?? ""}`).join(",")]);
  // Ürün görünürlüğü: ürün adları markanın SON ölçüm cevaplarında aranır (her ölçüm türünün en yenisi; ek API çağrısı yok)
  const runs = useLoad(() => api.runs(brand.id), [brand.id]);
  const lastIds = (["live_search", "model_knowledge"] as const)
    .map((t) => (runs.data ?? []).find((r) => r.status === "done" && r.measurement_type === t)?.id).filter((x): x is string => !!x);
  const visAnswers = useLoad(() => Promise.all(lastIds.map((id) => api.answers(id))).then((a) => a.flat()), [lastIds.join(",")]);
  const visComps = useLoad(() => api.competitors(brand.id), [brand.id]);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const sim = brand.data_origin === "simulated";

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget, f = new FormData(form);
    const name = String(f.get("product_name") || "").trim(), facts = String(f.get("product_facts") || "").trim();
    if (name.length < 2 || facts.length < 10) { setErr(L("Ürün adını ve en az bir iki doğru bilgiyi yazın.", "Enter the product name and at least a couple of correct facts.")); return; }
    setBusy("add"); setErr(null); setMsg(null);
    try { await api.addProduct({ workspace_id: brand.workspace_id, brand_id: brand.id, name, price: String(f.get("product_price") || "").trim() || null, facts }); form.reset(); products.reload(); }
    catch (x) { setErr(friendlyError(x)); } finally { setBusy(null); }
  }
  async function check(id: string) {
    setBusy(id); setErr(null); setMsg(null);
    try { await api.requestProductCheck(id); setMsg(L("Kontrol sıraya alındı. Sonuç en geç bir saat içinde burada görünür.", "Check queued. The result appears here within an hour.")); products.reload(); }
    catch (x) { setErr(friendlyError(x)); } finally { setBusy(null); }
  }
  const STATUS = { wrong: L("Yanlış", "Wrong"), correct: L("Doğru", "Correct"), unverifiable: L("Doğrulanamadı", "Can't verify") } as const;
  const order = { wrong: 0, unverifiable: 1, correct: 2 } as const;

  if (sim) return <div className="stack"><DataNotice type="simulated" /><p className="muted">{L("Ürün doğruluğu demo markalarda kullanılmaz.", "Product accuracy isn't available for demo brands.")}</p></div>;
  return (
    <div className="stack">
      <section className="panel stack">
        <h2>{L("Ürün görünürlüğü ve doğruluğu (deneme)", "Product visibility and accuracy (pilot)")}</h2>
        <p className="muted">{L("Ürününüzün doğru bilgilerini yazın. ChatGPT'ye (canlı web aramasıyla) ürünü sorarız ve cevabındaki iddiaları sizin yazdıklarınızla karşılaştırırız. Karşılaştırmayı bir yapay zekâ adımı yapar ve yanılabilir: \"Yanlış\" işaretli satırları cevabın kendisinden kontrol edin. Tek bir cevaba dayanır; cevaplar sorudan soruya değişir.", "Enter the correct facts about your product. We ask ChatGPT (with live web search) about it and compare the claims in its answer with what you wrote. The comparison is done by an AI step and can be wrong: verify rows marked \"Wrong\" against the answer itself. It is based on a single answer; answers vary between requests.")}</p>
        {!paidAllowed && <p className="caution">{L("Kontrol, ChatGPT canlı aramalı ücretli paketlerde çalışır. Ürünlerinizi şimdiden ekleyebilirsiniz. ", "Checks run on paid plans with ChatGPT live search. You can add your products now. ")}<Link to="/hesap#paket">{L("Paketleri gör", "See plans")}</Link></p>}
        {msg && <p className="success-box">{msg}</p>}
        <ErrorBox message={err} />
        {products.loading ? <Loading /> : (products.data ?? []).length === 0 ? <p className="muted">{L("Henüz ürün eklenmedi.", "No products yet.")}</p> : (
          <ul className="src-dom">
            {(products.data ?? []).filter((p) => !p.rival_of).map((p) => {
              const last = (checks.data ?? []).find((c) => c.product_id === p.id);
              const rivals = (products.data ?? []).filter((r) => r.rival_of === p.id);
              const pending = !!p.check_requested_at && (!last || last.created_at < p.check_requested_at);
              const claims = [...(last?.claims ?? [])].sort((a, b) => order[a.status] - order[b.status]);
              const wrong = claims.filter((c) => c.status === "wrong").length;
              return (
                <li key={p.id}>
                  <p className="src-head"><strong>{p.name}</strong> {p.price && <span className="muted num">{p.price}</span>}</p>
                  <p className="src-sup muted">{p.facts}</p>
                  {visAnswers.data && lastIds.length > 0 && (() => {
                    const sh = shoppingSources(visAnswers.data, p.id, p.name, { name: brand.name, website: brand.website });
                    if (sh.productAnswers === 0) return null;
                    return (
                      <div className="prod-vis">
                        <p className="src-sup"><strong>{L("Nereden satın alınır (AI alışveriş)", "Where to buy (AI shopping)")}</strong></p>
                        <p className="src-sup">{isEn() ? `In the ${sh.productAnswers} answers that mention this product, your own site was cited ${sh.ownSite} times.` : `Bu ürünün geçtiği ${sh.productAnswers} cevapta kendi siteniz ${sh.ownSite} kez kaynak gösterildi.`}
                          {sh.marketplaces.length > 0 ? <> {L("Kaynak gösterilen satış siteleri: ", "Retail sites cited: ")}{sh.marketplaces.slice(0, 6).map((m) => `${m.domain} (${m.answers})`).join(", ")}.</> : <> {L("Hiçbir satış sitesi kaynak gösterilmedi.", "No retail site was cited.")}</>}</p>
                        <p className="src-sup muted">{L("Yalnız canlı aramalı cevaplarda kaynak vardır. ChatGPT'nin uygulamadaki alışveriş kartları (ürün karuseli) bu ölçüme dahil değildir.", "Only live-search answers have sources. ChatGPT's in-app shopping cards (product carousel) are not part of this measurement.")}</p>
                      </div>
                    );
                  })()}
                  <ShoppingView product={p} rivals={rivals} checks={(shop.data ?? []).filter((c) => c.product_id === p.id)} paidAllowed={paidAllowed}
                    onChange={() => { products.reload(); shop.reload(); }} onError={setErr} onMsg={setMsg} />
                  <RivalCompare own={p} rivals={rivals} brand={brand} answers={visAnswers.data ?? null} hasRuns={lastIds.length > 0} onChange={products.reload} onError={setErr} />
                  <ProductVisibilityView loading={runs.loading || visAnswers.loading || visComps.loading} hasRuns={lastIds.length > 0}
                    vis={visAnswers.data && visComps.data && lastIds.length > 0 ? productVisibility(visAnswers.data, { id: p.id, name: p.name }, { name: brand.name, website: brand.website }, visComps.data) : null} />
                  {last && (
                    <div className="loss-card">
                      <p className="loss-title">{formatDateTime(last.created_at)}: {last.recognized === false ? L("ChatGPT farklı bir ürünü anlatmış olabilir.", "ChatGPT may have described a different product.")
                        : last.judge === null ? L("Cevap alındı ama karşılaştırma yapılamadı.", "Got the answer, but the comparison couldn't run.")
                        : wrong > 0 ? (isEn() ? `${wrong} claim${wrong > 1 ? "s" : ""} contradict your facts.` : `${wrong} iddia sizin bilgilerinizle çelişiyor.`)
                        : L("Bilgilerinizle çelişen iddia bulunmadı.", "No claims contradict your facts.")}</p>
                      {claims.length > 0 && <ul>{claims.map((c, i) => <li key={i}><strong>{STATUS[c.status]}:</strong> {c.claim}{c.fact && <span className="muted"> ({L("sizin bilginiz", "your fact")}: {c.fact})</span>}</li>)}</ul>}
                      <button className="link-btn" aria-expanded={open === p.id} onClick={() => setOpen(open === p.id ? null : p.id)}>{open === p.id ? L("Cevabı gizle", "Hide answer") : L("Cevabı göster", "Show answer")}</button>
                      {open === p.id && (
                        <blockquote className="answer">
                          <p className="answer-meta">{last.question}</p>
                          <p style={{ whiteSpace: "pre-wrap" }}>{last.answer_text}</p>
                          {last.cited_urls.length > 0 && <ul className="answer-sources">{last.cited_urls.map((u) => <li key={u}><a href={u} target="_blank" rel="noopener noreferrer nofollow">{(() => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } })()}</a></li>)}</ul>}
                        </blockquote>
                      )}
                    </div>
                  )}
                  <span className="row-actions">
                    {paidAllowed && <button className="link-btn" disabled={pending || busy === p.id} onClick={() => check(p.id)}>{pending ? L("Kontrol sırada", "Check queued") : L("Doğruluğu kontrol et (yaklaşık 0,02 $)", "Check accuracy (about $0.02)")}</button>}
                    <button className="link-btn" onClick={async () => { try { await api.deleteProduct(p.id); products.reload(); } catch (x) { setErr(friendlyError(x)); } }}>{L("Sil", "Delete")}</button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      {(products.data ?? []).filter((p) => !p.rival_of).length < 10 && (
        <form className="panel stack" onSubmit={add} noValidate aria-label={L("Ürün ekle", "Add product")}>
          <h2>{L("Ürün ekleyin", "Add a product")}</h2>
          <Field label={L("Ürün adı", "Product name")} name="product_name" maxLength={120} placeholder={L("Örn. Model X 29 jant dağ bisikleti", "e.g. Model X 29er mountain bike")} />
          <Field label={L("Fiyat (isteğe bağlı)", "Price (optional)")} name="product_price" maxLength={60} placeholder={L("Örn. 24.900 TL", "e.g. $899")} />
          <label className="field" htmlFor="product_facts">
            <span className="field-label">{L("Doğru bilgiler", "Correct facts")}</span>
            <textarea id="product_facts" name="product_facts" rows={5} maxLength={2000} placeholder={L("Örn. Ağırlık 13,2 kg. Alüminyum kadro. 12 vites. Hidrolik disk fren. Yetişkinler için, 165–185 cm.", "e.g. Weight 13.2 kg. Aluminium frame. 12 speeds. Hydraulic disc brakes. For adults 165–185 cm.")} />
            <span className="field-hint">{L("Kısa ve kesin cümleler yazın. Yazmadığınız konular \"doğrulanamadı\" olarak işaretlenir.", "Write short, exact sentences. Topics you leave out are marked \"can't verify\".")}</span>
          </label>
          <Button type="submit" busy={busy === "add"}>{L("Ürünü ekle", "Add product")}</Button>
        </form>
      )}
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
        ...(f.has("fact_card") ? { fact_card: String(f.get("fact_card") || "").trim().length >= 10 ? String(f.get("fact_card")).trim().slice(0, 3000) : null } : {}),
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
      {brand.data_origin !== "simulated" && (
        <label className="field" htmlFor="fact_card">
          <span className="field-label">{L("Doğru bilgi kartı (TruthGuard)", "Fact card (TruthGuard)")}</span>
          <textarea id="fact_card" name="fact_card" rows={5} maxLength={3000} defaultValue={brand.fact_card ?? ""}
            placeholder={L("Örn. Kuruluş: 2009. Merkez: Kadıköy, İstanbul. Şubeler: Kadıköy, Moda. Hafta içi 08:00–22:00. Filtre kahve 85 TL. Paket servis var, rezervasyon yok.", "e.g. Founded 2009. HQ: Austin, TX. Locations: Austin, Dallas. Mon–Fri 8am–10pm. Drip coffee $4. Delivery yes, no reservations.")} />
          <span className="field-hint">{L("Yapay zekânın markanız hakkında söyledikleri bu bilgilerle karşılaştırılır (ücretli paketler). Kısa ve kesin cümleler yazın; yazmadığınız konular \"doğrulanamadı\" sayılır.", "What the AI says about your brand is checked against these facts (paid plans). Write short, exact sentences; anything you leave out counts as \"can't verify\".")}</span>
        </label>
      )}
      <p className="muted">{L("Ad veya yazılışlar değişirse yeni ölçümler yeni adla yapılır; eski ölçümler olduğu gibi kalır.", "If the name or spellings change, past measurements are recalculated for free with the new details.")}</p>
      <ErrorBox message={err} />
      <div className="form-actions">
        <Button type="submit" busy={busy}>Kaydet</Button>
        <Button type="button" variant="quiet" onClick={() => onDone(false)}>{L("Vazgeç", "Cancel")}</Button>
      </div>
      <DeleteBrand brand={brand} />
    </form>
  );
}

/** Markayı tamamen silme: soruları, rakipleri, ürünleri ve tüm ölçümleriyle. Yanlışlıkla silinmesin diye marka adı yazılır. */
function DeleteBrand({ brand }: { brand: Brand }) {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const match = typed.trim().toLocaleLowerCase("tr-TR") === brand.name.trim().toLocaleLowerCase("tr-TR");
  async function del() {
    setBusy(true); setErr(null);
    try { await api.deleteBrand(brand.id); nav("/", { replace: true }); }
    catch (e) { setErr(friendlyError(e)); setBusy(false); }
  }
  if (!open) return <p><button type="button" className="link-btn danger" onClick={() => setOpen(true)}>{L("Markayı tamamen sil", "Delete brand completely")}</button></p>;
  return (
    <div className="caution stack" role="group" aria-label={L("Markayı sil", "Delete brand")}>
      <p><strong>{L("Bu işlem geri alınamaz.", "This can't be undone.")}</strong> {L("Marka; soruları, rakipleri, ürünleri, site denetimleri ve tüm ölçüm sonuçlarıyla birlikte silinir. Bu ay kullanılan sorgu hakkı geri gelmez.", "The brand is deleted with its questions, competitors, products, site audits and all measurement results. Queries already used this month are not refunded.")}</p>
      <label className="field"><span>{isEn() ? `To confirm, type the brand name: ${brand.name}` : `Onaylamak için marka adını yazın: ${brand.name}`}</span>
        <input value={typed} onChange={(e) => setTyped(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }} autoComplete="off" aria-label={L("Silmek için marka adı", "Brand name to delete")} />
      </label>
      <ErrorBox message={err} />
      <div className="form-actions">
        <Button type="button" variant="danger" disabled={!match} busy={busy} onClick={del}>{L("Markayı sil", "Delete brand")}</Button>
        <Button type="button" variant="quiet" onClick={() => { setOpen(false); setTyped(""); }}>{L("Vazgeç", "Cancel")}</Button>
      </div>
    </div>
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

function Report({ brand, type, onBrandChange, paid = false }: { brand: Brand; type: MeasurementType; onBrandChange: () => void; paid?: boolean }) {
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
          <ScorePanel pts={pts} live={live} simulated={type === "simulated"} allRows={vis.data ?? []} engineName={eng ? providerLabel(eng) : null} />
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
            {type !== "simulated" && (() => {
              const f = visibilityForecast(pts.map((p) => ({ at: p.at, k: p.recommend.k, n: p.recommend.n })));
              if (!f) return <p className="muted forecast-note">{L("Tahmin için en az 4 ölçüm ve 14 günlük süre gerekir.", "A forecast needs at least 4 measurements over 14 days.")}</p>;
              return (
                <div className="forecast">
                  <p className="forecast-title"><span className="badge-forecast">{L("Tahmin", "Forecast")}</span> {L("gerçek ölçüm değildir", "not a measurement")}</p>
                  <p>{isEn()
                    ? <>If the current trend continues, the recommendation rate in {f.days} days would be around <strong>{pct(f.value)}</strong> (range {pct(f.low)}–{pct(f.high)}).</>
                    : <>Mevcut eğilim sürerse {f.days} gün sonra önerilme oranı yaklaşık <strong>{pct(f.value)}</strong> olur (aralık {pct(f.low)}–{pct(f.high)}).</>}</p>
                  <p className="muted">{f.trend === "flat"
                    ? L(`Belirgin bir eğilim yok (son ${f.points} ölçüm, ${f.spanDays} gün). Değişim ölçüm oynaklığı içinde.`, `No clear trend (last ${f.points} measurements, ${f.spanDays} days). Changes are within measurement noise.`)
                    : isEn() ? `Trend ${f.trend === "up" ? "up" : "down"} about ${Math.abs(Math.round(f.perWeek * 100))} pts per week (last ${f.points} measurements, ${f.spanDays} days).` : `Eğilim haftada yaklaşık ${Math.abs(Math.round(f.perWeek * 100))} puan ${f.trend === "up" ? "yukarı" : "aşağı"} (son ${f.points} ölçüm, ${f.spanDays} gün).`}</p>
                </div>
              );
            })()}
          </section>

          <section className="panel">
            <h2>{L("Rakiplerle karşılaştırma", "Competitor comparison")}</h2>
            <p className="muted">{L("Son ölçümde her markanın önerildiği cevap oranı.", "Share of answers recommending each brand in the latest measurement.")}</p>
            <CompareBars type={type} rows={competitorsInRun(rows ?? [], last.runId).map((c) => ({
              name: c.name, isTarget: c.isTarget, value: c.recommend.value,
              detail: isEn() ? `${c.recommend.k}/${c.recommend.n} answers, range ${rangeText(c.recommend)}, share of recommendations ${pct(c.share)}` : `${c.recommend.k}/${c.recommend.n} cevap, aralık ${rangeText(c.recommend)}, önerilerde pay ${pct(c.share)}`,
            }))} />
          </section>

          {engList.length > 1 && (
            <EngineComparePanel rows={(vis.data ?? []).filter((r) => r.run_id === last.runId)} answers={answersAll.data ?? []} live={live} />
          )}

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

          {live && insightsReady && (() => {
            const o = ownedSourceShare(answers.data!, insightBrands);
            const part = (n: number, t: number) => (t ? pct(n / t) : "–");
            return (
              <section className="panel" id="kendi-site-payi">
                <h2>{L("Kendi site payı", "Owned-source share")}</h2>
                <p className="muted">{L("Yapay zekânın gösterdiği kaynakların ne kadarı sizin siteniz (veya kanalınız), ne kadarı rakiplerin siteleri, ne kadarı üçüncü taraf siteler. Her cevapta her site bir kez sayılır.", "How much of the sources the AI cited are your own site (or channel), competitors' sites, or third-party sites. Each site counts once per answer.")}</p>
                {o.total === 0 ? <p>{L("Bu ölçümde kaynak gösterilmedi.", "No sources were cited in this measurement.")}</p> : (
                  <>
                    <div className="own-bar" role="img" aria-label={L("Kaynak dağılımı", "Source split")}>
                      <span className="own-own" style={{ flex: o.own }} /><span className="own-comp" style={{ flex: o.competitor }} /><span className="own-third" style={{ flex: o.thirdParty }} />
                    </div>
                    <ul className="own-legend">
                      <li><span className="dot own-own" /> {L("Sizin siteniz", "Your site")}: <strong>{part(o.own, o.total)}</strong> <span className="muted">({o.own})</span></li>
                      <li><span className="dot own-comp" /> {L("Rakip siteleri", "Competitor sites")}: <strong>{part(o.competitor, o.total)}</strong> <span className="muted">({o.competitor})</span></li>
                      <li><span className="dot own-third" /> {L("Üçüncü taraf", "Third-party")}: <strong>{part(o.thirdParty, o.total)}</strong> <span className="muted">({o.thirdParty})</span></li>
                    </ul>
                    <p className="muted">{isEn() ? `Your site was cited in ${o.answersCitingOwn} of ${o.answersWithSources} answers that cited sources.` : `Kaynak gösteren ${o.answersWithSources} cevabın ${o.answersCitingOwn} tanesinde sitenize yer verildi.`}</p>
                    {o.byEngine.length > 1 && (
                      <ul className="own-engines">{o.byEngine.map((e) => <li key={e.provider}><strong>{providerLabel(e.provider)}</strong>: {L("siz", "you")} {part(e.own, e.total)} · {L("rakip", "rivals")} {part(e.competitor, e.total)} · {L("üçüncü taraf", "third-party")} {part(e.thirdParty, e.total)}</li>)}</ul>
                    )}
                    {!brand.website && <p className="src-sup muted">{L("Markaya web sitesi eklenmemiş: sitenizin payı hesaplanamaz. Marka ayarlarından ekleyin (YouTube kanalı için youtube.com/@kanal).", "No website on this brand: your share can't be computed. Add it in brand settings (for a YouTube channel use youtube.com/@channel).")}</p>}
                  </>
                )}
              </section>
            );
          })()}
          {type !== "simulated" && <AiTrafficPanel brand={brand} paid={paid} vis={vis.data ?? []} />}
          {type !== "simulated" && <AiBotsPanel brand={brand} paid={paid} />}
          {type !== "simulated" && <TruthGuardPanel brand={brand} paid={paid} mix={live && insightsReady ? sourceMix(answers.data!, ments.data!, insightBrands) : null}
            stats={answers.data ? statSummary(answers.data, [brand.name, ...brand.aliases]) : null} />}
          {live && insightsReady && <PerceptionPanel summary={perceptionSummary(answers.data!, ments.data!, brand.id)} brand={brand.name} />}
          {!live && type !== "simulated" && (
            <section className="panel" id="kendi-site-payi">
              <h2>{L("Kendi site payı", "Owned-source share")}</h2>
              <p className="muted">{L("Veri yok: kaynaklar yalnız canlı internet aramalı ölçümde oluşur (ChatGPT ve Claude, ücretli paketler).", "No data: sources only exist in live web-search measurements (ChatGPT and Claude, paid plans).")}</p>
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
            {!prompts.loading && (() => {
              const split = splitByKind(prompts.data ?? [], { name: brand.name, aliases: brand.aliases ?? [] });
              const br = split.find((x) => x.kind === "branded"), un = split.find((x) => x.kind === "unbranded");
              if (!br) return null;
              return (
                <div className="loss-card">
                  <p className="loss-title">{L("Markalı ve markasız sorular ayrı", "Branded and unbranded questions, separately")}</p>
                  <ul>
                    {un && <li>{isEn() ? `Unbranded (${un.prompts} questions): recommended in ${un.recommended} of ${un.answers} answers, ${pct(un.answers ? un.recommended / un.answers : 0)} (range ${pct(un.low)}–${pct(un.high)}).` : `Markasız (${un.prompts} soru): ${un.answers} cevabın ${un.recommended} tanesinde önerildiniz, ${pct(un.answers ? un.recommended / un.answers : 0)} (aralık ${pct(un.low)}–${pct(un.high)}).`}</li>}
                    <li>{isEn() ? `Branded (${br.prompts} questions containing your name): recommended in ${br.recommended} of ${br.answers} answers, ${pct(br.answers ? br.recommended / br.answers : 0)}.` : `Markalı (adınızın geçtiği ${br.prompts} soru): ${br.answers} cevabın ${br.recommended} tanesinde önerildiniz, ${pct(br.answers ? br.recommended / br.answers : 0)}.`}</li>
                  </ul>
                  <p className="loss-note muted">{L("Soruda adınız geçince yapay zekâ sizden neredeyse her zaman söz eder; bu oranı şişirir. Gerçek görünürlüğünüz markasız sorulardaki orandır. Yukarıdaki genel oranlar iki grubu birlikte içerir.", "When your name is in the question, the AI almost always mentions you, which inflates the rate. Your real visibility is the unbranded rate. The overall rates above include both groups.")}</p>
                </div>
              );
            })()}
            {prompts.loading ? <Loading /> : (
              <ul className="q-results">
                {(prompts.data ?? []).map((p) => (
                  <li key={p.prompt_id}>
                    <p className="q-text">{p.prompt_text}</p>
                    <p className="q-meta">{INTENT_LABEL[p.intent]}{promptKind(p.prompt_text, { name: brand.name, aliases: brand.aliases ?? [] }) === "branded" && L(", markalı soru", ", branded question")}</p>
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

/** Görünürlük × ziyaretçi: aynı motorda haftalık önerilme oranı ve o motordan gelen ziyaret yan yana. */
function VisVsTraffic({ vis, rows, today }: { vis: VisRow[]; rows: Parameters<typeof trafficSummary>[0]; today: string }) {
  const options = (Object.keys(SOURCE_PROVIDER) as AiSource[]).filter((src) => vis.some((r) => r.provider === SOURCE_PROVIDER[src]) && rows.some((r) => r.source === src));
  const [src, setSrc] = useState<AiSource | null>(null);
  const cur = src && options.includes(src) ? src : options[0];
  if (!cur) return null;
  const pts = series(vis.filter((r) => r.provider === SOURCE_PROVIDER[cur]));
  const { weeks, aligned } = visibilityVsVisits(pts, rows, cur, today);
  const maxV = Math.max(1, ...weeks.map((w) => w.visits));
  return (
    <>
      <h3>{L("Görünürlük ve ziyaretçi", "Visibility and visitors")}</h3>
      {options.length > 1 && (
        <div className="seg" role="group" aria-label={L("Motor", "Engine")}>
          {options.map((o) => <button key={o} aria-pressed={o === cur} onClick={() => setSrc(o)}>{AI_SOURCE[o]}</button>)}
        </div>
      )}
      <div className="vvt" role="img" aria-label={L("Haftalık önerilme oranı ve ziyaret", "Weekly recommendation rate and visits")}>
        {weeks.map((w) => (
          <div key={w.start} className="vvt-col" title={`${formatDate(w.start)}: ${w.visits} ${L("ziyaret", "visits")}${w.rate !== null ? `, ${L("önerilme", "recommended")} ${pct(w.rate)}` : ""}`}>
            <span className="vvt-rate">{w.rate !== null ? pct(w.rate) : "–"}</span>
            <span className="vvt-bar" style={{ height: `${Math.max(3, (100 * w.visits) / maxV)}%` }} />
            <span className="vvt-n">{w.visits}</span>
          </div>
        ))}
      </div>
      <p className="src-sup muted">{isEn() ? `Top: ${AI_SOURCE[cur]} recommendation rate that week; bar: visits from ${AI_SOURCE[cur]}. "–" = no measurement that week.` : `Üstte: o haftaki ${AI_SOURCE[cur]} önerilme oranı; çubuk: ${AI_SOURCE[cur]}'den gelen ziyaret. "–" = o hafta ölçüm yok.`}
        {aligned !== null && " " + (isEn() ? `In ${Math.round(aligned * 100)}% of week-to-week changes they moved in the same direction. This shows a relationship, not proof that one caused the other.` : `Hafta hafta değişimlerin %${Math.round(aligned * 100)}'inde ikisi aynı yönde hareket etti. Bu bir ilişki gösterir; birinin diğerine yol açtığının kanıtı değildir.`)}</p>
    </>
  );
}

/** Gerçek soru keşfi: Google'da insanların sorduğu sorular (SerpApi). Ücretli paketlerde; marka başına 30 günde 2 keşif. */
function GoogleQuestions({ brand, existing, canAdd, onAdd, busy }: { brand: Brand; existing: Set<string>; canAdd: boolean; onAdd: (t: string, i: Intent) => Promise<void>; busy: boolean }) {
  const { current } = useApp();
  const paid = current?.kind === "growth_lab" || (!!current?.plan && current.plan !== "free");
  const sugg = useLoad(() => (paid ? api.promptSuggestions(brand.id) : Promise.resolve([])), [brand.id, paid]);
  const runs = useLoad(() => (paid ? api.discoveryRuns(brand.id) : Promise.resolve([])), [brand.id, paid]);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const pending = (runs.data ?? []).some((r) => !r.done_at);
  const last = (runs.data ?? []).find((r) => r.done_at);
  const list = (sugg.data ?? []).filter((s) => !existing.has(s.text));
  async function discover() {
    setErr(null); setMsg(null);
    try { await api.requestDiscovery(brand.id); setMsg(L("Keşif sıraya alındı. Sorular birkaç dakika ile bir saat içinde burada görünür.", "Discovery queued. Questions appear here within a few minutes to an hour.")); runs.reload(); }
    catch (e) { setErr(friendlyError(e)); }
  }
  return (
    <section className="panel" id="gercek-sorular">
      <h2>{L("Gerçek sorular (Google)", "Real questions (Google)")}</h2>
      <p className="muted">{L("İnsanların Google'da sektörünüzle ilgili sorduğu sorular (\"Diğer kişiler şunları da sordu\" ve ilgili aramalar). Yapay zekâya sorulan soruların sayısını hiçbir şirket yayımlamıyor; bu, gerçek talebe en yakın veri.", "Questions people ask Google about your sector (\"People also ask\" and related searches). No company publishes how often things are asked to AI assistants; this is the closest real demand data.")}</p>
      {!paid ? (
        <p className="muted">{L("Ücretli paketlerde.", "On paid plans.")} <Link to="/hesap#paket">{L("Paketler", "Plans")}</Link></p>
      ) : (
        <>
          {!brand.sector && <p className="caution">{L("Keşif için önce markanın sektörünü yazın (Düzenle).", "Set the brand's sector first (Edit).")}</p>}
          <Button variant="quiet" className="btn-small" disabled={pending || !brand.sector} onClick={discover}>{pending ? L("Keşif sırada…", "Discovery queued…") : L("Soruları keşfet", "Discover questions")}</Button>
          {last && <p className="src-sup muted">{isEn() ? `Last discovery: ${formatDate(last.done_at!)} · ${last.found ?? 0} questions${last.error ? " · " + last.error : ""}` : `Son keşif: ${formatDate(last.done_at!)} · ${last.found ?? 0} soru${last.error ? " · " + last.error : ""}`}</p>}
          {msg && <p className="success-box">{msg}</p>}
          <ErrorBox message={err} />
          {list.length > 0 && (
            <ul className="rows">
              {list.map((s) => (
                <li key={s.id}>
                  <span><span className="q-text">{s.text}</span><span className="q-meta">{s.source === "paa" ? L("Diğer kişiler şunları da sordu", "People also ask") : L("İlgili arama", "Related search")} · {INTENT_LABEL[guessIntent(s.text, brand.city)]}</span></span>
                  <span>
                    {canAdd && <button className="link-btn" disabled={busy} onClick={() => onAdd(s.text, guessIntent(s.text, brand.city))}>+ {L("Ekle", "Add")}</button>}
                    <button className="link-btn" onClick={async () => { try { await api.dismissSuggestion(s.id); sugg.reload(); } catch (e) { setErr(friendlyError(e)); } }}>{L("Gizle", "Hide")}</button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {list.length > 0 && <p className="src-sup muted">{L("İlgili aramalar soru biçiminde değildir; eklerken düzenleyebilirsiniz. Marka başına 30 günde 2 keşif yapılabilir.", "Related searches aren't phrased as questions; you can edit them after adding. Up to 2 discoveries per brand every 30 days.")}</p>}
        </>
      )}
    </section>
  );
}

/** İçerik planları: markanın önerilmediği sorular için gerçek cevaplardan hazırlanan sayfa planı (ücretli; istenince). */
function BriefsPanel({ brand, results }: { brand: Brand; results: PromptResult[] }) {
  const { current } = useApp();
  const paid = current?.kind === "growth_lab" || (!!current?.plan && current.plan !== "free");
  const briefs = useLoad(() => (paid ? api.contentBriefs(brand.id) : Promise.resolve([])), [brand.id, paid]);
  const [open, setOpen] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const lost = results.filter((r) => r.answers > 0 && r.target_recommended === 0);
  if (!lost.length && !(briefs.data ?? []).length) return null;
  const latest = new Map<string, NonNullable<typeof briefs.data>[number]>();
  for (const b of briefs.data ?? []) if (!latest.has(b.prompt_id)) latest.set(b.prompt_id, b);
  const req = async (pid: string) => { setErr(null); try { await api.requestBrief(brand.id, pid); briefs.reload(); } catch (e) { setErr(friendlyError(e)); } };
  return (
    <section className="panel" id="icerik-planlari">
      <h2>{L("İçerik planları", "Content plans")}</h2>
      <p className="muted">{L("Önerilmediğiniz her soru için, yapay zekânın o soruya verdiği gerçek cevaplardan ve kaynak sitelerinden sitenize yazılacak sayfanın planı: başlık, bölümler, yazılması gereken bilgiler, SSS ve yer almanız gereken siteler.", "For each question you're not recommended for: a page plan for your site built from the AI's real answers and cited sites — title, sections, facts to include, FAQ and sites to be on.")}</p>
      {!paid ? <p className="muted">{L("Ücretli paketlerde.", "On paid plans.")} <Link to="/hesap#paket">{L("Paketler", "Plans")}</Link></p> : (
        <>
          <ErrorBox message={err} />
          <ul className="src-dom">
            {lost.map((r) => {
              const b = latest.get(r.prompt_id);
              return (
                <li key={r.prompt_id}>
                  <p className="src-head"><strong>{r.prompt_text}</strong></p>
                  {r.top_competitor && <p className="src-sup muted">{L("Bu soruda öne çıkan: ", "Leading here: ")}{r.top_competitor}</p>}
                  {!b ? <button className="link-btn" onClick={() => req(r.prompt_id)}>{L("İçerik planı oluştur", "Create content plan")}</button>
                    : b.status === "queued" ? <p className="src-sup muted">{L("Plan hazırlanıyor (birkaç dakika ile bir saat).", "Preparing the plan (a few minutes to an hour).")}</p>
                    : b.status === "failed" ? <p className="src-sup">{b.error} <button className="link-btn" onClick={() => req(r.prompt_id)}>{L("Tekrar dene", "Try again")}</button></p>
                    : <button className="link-btn" aria-expanded={open === b.id} onClick={() => setOpen(open === b.id ? null : b.id)}>{open === b.id ? L("Planı gizle", "Hide plan") : L("Planı göster", "Show plan")}</button>}
                  {b?.brief && open === b.id && (
                    <div className="score-how brief">
                      <p><strong>{L("Sayfa başlığı", "Page title")}:</strong> {b.brief.title}</p>
                      {b.brief.angle && <p className="muted">{b.brief.angle}</p>}
                      <p><strong>{L("Bölümler", "Sections")}</strong></p>
                      <ol className="plain-ol">{b.brief.outline.map((x) => <li key={x}>{x}</li>)}</ol>
                      {b.brief.mustInclude.length > 0 && <>
                        <p><strong>{L("Mutlaka yazılacaklar", "Must include")}</strong></p>
                        <ul className="plain">{b.brief.mustInclude.map((x) => <li key={x.item}>{x.item}{x.verify && <span className="badge-verify">{L("doğrulayın", "verify")}</span>}</li>)}</ul>
                      </>}
                      {b.brief.faq.length > 0 && <><p><strong>{L("SSS", "FAQ")}</strong></p><ul className="plain">{b.brief.faq.map((x) => <li key={x}>{x}</li>)}</ul></>}
                      {b.brief.sites.length > 0 && <p><strong>{L("Yapay zekânın baktığı siteler", "Sites the AI relied on")}:</strong> {b.brief.sites.join(", ")}</p>}
                      {b.brief.winners.length > 0 && <p className="muted">{L("Bu soruda önerilenler: ", "Recommended here: ")}{b.brief.winners.join(", ")}</p>}
                      <p className="src-sup muted">{L("\"Doğrulayın\" işaretli maddeleri kendi doğru bilginizle doldurun; plan, bilgi kartınızda olmayan sayı veya iddia uydurmaz.", "Fill items marked \"verify\" with your own accurate facts; the plan doesn't invent numbers or claims that aren't in your fact card.")}</p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="src-sup muted">{L("Marka başına 30 günde en fazla 20 plan; aynı soru için 7 günde bir.", "Up to 20 plans per brand every 30 days; once a week per question.")}</p>
        </>
      )}
    </section>
  );
}

const BOT_KIND: Record<BotKind, [string, string, string, string]> = {
  search: ["Arama botları", "Search bots", "Yapay zekâ aramasında görünmenizi sağlar; en önemlisi bunlar.", "They make you visible in AI search; these matter most."],
  user: ["Kullanıcı isteğiyle gelenler", "Fetched on a user's request", "Biri asistana sitenizle ilgili soru sorduğunda sayfayı anlık okur.", "Read a page live when someone asks an assistant about you."],
  training: ["Eğitim botları", "Training bots", "Model eğitimi için veri toplar; görünürlüğe doğrudan etkisi azdır.", "Collect data for model training; little direct effect on visibility."],
};
/** Yapay zekâ botları: hangi bot hangi sayfayı okudu, hata aldı mı, önemli arama botu hiç gelmiyor mu. */
function AiBotsPanel({ brand, paid }: { brand: Brand; paid: boolean }) {
  const rows = useLoad(() => api.aiBots(brand.id), [brand.id]);
  const [setup, setSetup] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  if (rows.loading) return null;
  const today = new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10);
  const s = botSummary(rows.data ?? [], today);
  const has = s.total > 0;
  const copy = async (k: string, v: string) => { try { await navigator.clipboard.writeText(v); setCopied(k); } catch { /* yok say */ } };
  return (
    <section className="panel" id="ai-botlar">
      <h2>{L("Yapay zekâ botları", "AI crawlers")}</h2>
      {has ? (
        <>
          <p className="muted">{isEn() ? `Last 30 days: AI bots read your site ${s.total} times.` : `Son 30 gün: yapay zekâ botları sitenizi ${s.total} kez okudu.`}</p>
          {!paid ? (
            <p className="muted">{L("Hangi botun hangi sayfaları okuduğu, engellenen istekler ve hiç gelmeyen önemli botlar ücretli paketlerde.", "Which bot read which pages, blocked requests and important bots that never came are on paid plans.")} <Link to="/hesap#paket">{L("Paketler", "Plans")}</Link></p>
          ) : (
            <>
              {s.missingSearch.length > 0 && <p className="caution">{isEn() ? `Not seen in 30 days: ${s.missingSearch.join(", ")}. If these search bots can't read your site, that engine can't cite it. Check robots.txt and your firewall.` : `30 gündür hiç gelmedi: ${s.missingSearch.join(", ")}. Bu arama botları sitenizi okuyamazsa o motor sizi kaynak gösteremez. robots.txt ve güvenlik duvarı ayarlarınızı kontrol edin.`}</p>}
              {s.errors > 0 && <p className="caution">{isEn() ? `${s.errors} bot requests got an error (403/404/5xx). A blocked bot can't read the page.` : `${s.errors} bot isteği hata aldı (403/404/5xx). Engellenen bot sayfayı okuyamaz.`}</p>}
              {(["search", "user", "training"] as BotKind[]).map((k) => {
                const list = s.bots.filter((b) => b.kind === k);
                if (!list.length) return null;
                return (
                  <div key={k}>
                    <h3>{isEn() ? BOT_KIND[k][1] : BOT_KIND[k][0]}</h3>
                    <p className="src-sup muted">{isEn() ? BOT_KIND[k][3] : BOT_KIND[k][2]}</p>
                    <ol className="domains">{list.map((b) => (
                      <li key={b.bot}><span>{b.bot} <span className="muted">· {b.owner}{b.verified > 0 ? L(" · IP doğrulandı", " · IP verified") : ""}{b.errors > 0 ? ` · ${b.errors} ${L("hata", "errors")}` : ""}</span></span><span className="num">{b.hits}</span></li>
                    ))}</ol>
                  </div>
                );
              })}
              <h3>{L("En çok okunan sayfalar", "Most-read pages")}</h3>
              <ol className="domains">{s.topPages.map((p) => <li key={p.path}><span className="src-url">{p.path}</span><span className="num">{p.hits}</span></li>)}</ol>
              <p className="src-sup muted">{L("Bot adı kendini tanıtma metninden okunur; \"IP doğrulandı\" yazanlar, şirketin yayımladığı IP listesiyle eşleşti. Diğerleri taklit olabilir.", "The bot name comes from its user agent; \"IP verified\" ones matched the company's published IP list. Others could be imitations.")}</p>
            </>
          )}
        </>
      ) : <p>{L("Yapay zekâ botlarının sitenizde hangi sayfaları okuduğunu görmek için sitenize küçük bir eklenti kurun. Botlar sayfadaki kodu çalıştırmadığı için ziyaretçi sayacından ayrı çalışır.", "To see which pages AI crawlers read on your site, install a small add-on on your site. Bots don't run page scripts, so this works separately from the visitor counter.")}</p>}
      {brand.track_key && (
        <>
          <button className="link-btn" aria-expanded={setup || !has} onClick={() => setSetup(!setup)}>{has ? (setup ? L("Kurulumu gizle", "Hide setup") : L("Kurulum", "Setup")) : null}</button>
          {(setup || !has) && (
            <div className="score-how">
              <p><strong>{L("Site anahtarınız", "Your site key")}:</strong></p>
              <pre className="code-snippet">{brand.track_key}</pre>
              <button className="link-btn" onClick={() => copy("key", brand.track_key!)}>{copied === "key" ? L("Kopyalandı", "Copied") : L("Anahtarı kopyala", "Copy key")}</button>
              <p><strong>WordPress:</strong> {L("eklentiyi indirin → WordPress paneli → Eklentiler → Yeni ekle → Eklenti yükle → Etkinleştir → Ayarlar → AI SaaSavran → anahtarı yapıştırıp kaydedin. Eklenti ziyaretçi sayacını da kurar.", "download the plugin → WordPress admin → Plugins → Add new → Upload → Activate → Settings → AI SaaSavran → paste the key and save. It also installs the visitor counter.")}</p>
              <p><a href="/downloads/ai-saasavran-bot-sayaci.zip" download>{L("WordPress eklentisini indir (.zip)", "Download the WordPress plugin (.zip)")}</a></p>
              <p><strong>Cloudflare:</strong> {L("siteniz Cloudflare üzerindeyse bu kodu bir Worker olarak ekleyin:", "if your site is on Cloudflare, add this code as a Worker:")}</p>
              <pre className="code-snippet">{workerCode(brand.track_key)}</pre>
              <button className="link-btn" onClick={() => copy("worker", workerCode(brand.track_key!))}>{copied === "worker" ? L("Kopyalandı", "Copied") : L("Kodu kopyala", "Copy code")}</button>
              <p className="src-sup muted">{L("Botun IP adresi yalnız gerçek bot olup olmadığını doğrulamak için kullanılır, saklanmaz. Ziyaretçilerinizin hiçbir bilgisi gönderilmez.", "The bot's IP is only used to verify it's the real bot and is not stored. Nothing about your human visitors is sent.")}</p>
            </div>
          )}
        </>
      )}
    </section>
  );
}

const AI_SOURCE: Record<AiSource, string> = { chatgpt: "ChatGPT", perplexity: "Perplexity", gemini: "Gemini", claude: "Claude", copilot: "Copilot", deepseek: "DeepSeek", grok: "Grok", meta: "Meta AI", other_ai: L("Diğer", "Other") };
/** Yapay zekâdan gelen ziyaretçi: müşteri sitesindeki küçük koddan günlük sayaçlar. Free'de yalnız toplam. */
function AiTrafficPanel({ brand, paid, vis }: { brand: Brand; paid: boolean; vis: VisRow[] }) {
  const rows = useLoad(() => api.aiVisits(brand.id), [brand.id]);
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);
  if (rows.loading) return null;
  const today = new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10);
  const s = trafficSummary(rows.data ?? [], today);
  const code = brand.track_key ? snippet(brand.track_key) : null;
  const has = (rows.data ?? []).length > 0;
  const recNow = (prov: string) => { const ps = series(vis.filter((r) => r.provider === prov)); const p = ps[ps.length - 1]; return p && p.recommend.n ? p.recommend.k / p.recommend.n : null; };
  const maxW = Math.max(1, ...s.weekly.map((w) => w.visits));
  return (
    <section className="panel" id="ai-ziyaretci">
      <h2>{L("Yapay zekâdan gelen ziyaretçi", "Visitors from AI assistants")}</h2>
      {has ? (
        <>
          <dl className="metrics">
            <div><dt>{L("Son 30 gün", "Last 30 days")}</dt><dd className="num">{s.last30}</dd><dd className="range">{s.prev30 ? `${L("önceki 30 gün", "previous 30 days")}: ${s.prev30}` : L("ziyaret", "visits")}</dd></div>
          </dl>
          {!paid ? (
            <p className="muted">{L("Hangi asistandan (ChatGPT, Gemini, Claude…), hangi sayfalara geldikleri ve görünürlüğünüzle ilişkisi ücretli paketlerde.", "Which assistant they came from (ChatGPT, Gemini, Claude…), which pages they landed on and how it relates to your visibility are on paid plans.")} <Link to="/hesap#paket">{L("Paketler", "Plans")}</Link></p>
          ) : (
            <>
              <h3>{L("Kaynak", "Source")}</h3>
              <ol className="domains">
                {s.bySource.map((b) => {
                  const pv = SOURCE_PROVIDER[b.source], r = pv ? recNow(pv) : null;
                  return <li key={b.source}><span>{AI_SOURCE[b.source]}{r !== null && <span className="muted"> · {L("önerilme", "recommended")} {pct(r)}</span>}</span><span className="num">{b.visits} <span className="muted">({pct(b.share)})</span></span></li>;
                })}
              </ol>
              <h3>{L("Son 8 hafta", "Last 8 weeks")}</h3>
              <div className="traffic-bars" role="img" aria-label={L("Haftalık ziyaret", "Weekly visits")}>
                {s.weekly.map((w) => <span key={w.start} title={`${formatDate(w.start)}: ${w.visits}`} style={{ height: `${Math.max(4, (100 * w.visits) / maxW)}%` }} />)}
              </div>
              <VisVsTraffic vis={vis} rows={rows.data ?? []} today={today} />
              <h3>{L("Gelinen sayfalar", "Landing pages")}</h3>
              <ol className="domains">{s.topPages.map((p) => <li key={p.path}><span className="src-url">{p.path}</span><span className="num">{p.visits}</span></li>)}</ol>
              <p className="src-sup muted">{L("Önerilme oranı yükselirken ziyaretçi de artıyorsa görünürlüğünüz gerçek trafiğe dönüşüyor demektir. Bazı uygulamalar kaynak bilgisi göndermez; gerçek sayı bundan biraz yüksek olabilir.", "If visits grow as your recommendation rate rises, visibility is turning into real traffic. Some apps don't send referral data, so the real number may be a bit higher.")}</p>
            </>
          )}
        </>
      ) : (
        <p>{L("ChatGPT, Gemini, Claude veya Perplexity'de bir bağlantıya tıklayıp sitenize kaç kişinin geldiğini görmek için aşağıdaki tek satırlık kodu sitenize ekleyin.", "To see how many people click through to your site from ChatGPT, Gemini, Claude or Perplexity, add the one-line code below to your site.")}</p>
      )}
      {code && (
        <>
          <button className="link-btn" aria-expanded={showCode || !has} onClick={() => setShowCode(!showCode)}>{has ? (showCode ? L("Kodu gizle", "Hide code") : L("Sitenize eklenecek kodu göster", "Show the code for your site")) : null}</button>
          {(showCode || !has) && (
            <div className="score-how">
              <pre className="code-snippet">{code}</pre>
              <button className="link-btn" onClick={async () => { try { await navigator.clipboard.writeText(code); setCopied(true); } catch { /* yok say */ } }}>{copied ? L("Kopyalandı", "Copied") : L("Kodu kopyala", "Copy code")}</button>
              <p className="src-sup muted">{L("Kodu sitenizin her sayfasında, </head> etiketinden hemen önce yapıştırın. WordPress'te \"başlığa kod ekle\" türünde bir eklentiyle yapılabilir. Çerez kullanmaz, kişisel veri toplamaz; yalnız yapay zekâdan gelen ziyaretleri sayar.", "Paste it on every page, just before </head>. On WordPress, a \"header code\" plugin works. No cookies, no personal data; it only counts visits from AI assistants.")}
                {brand.website ? "" : " " + L("Sayım için marka ayarlarında web sitenizin yazılı olması gerekir.", "Your website must be set in the brand settings for counting.")}</p>
            </div>
          )}
        </>
      )}
    </section>
  );
}

const SOURCE_LABEL: Record<SourceType, [string, string]> = {
  own: ["Sizin siteniz", "Your site"], competitor: ["Rakip sitesi", "Competitor site"], official: ["Resmî / kamu / eğitim", "Official / government / education"],
  encyclopedia: ["Ansiklopedi", "Encyclopedia"], news: ["Haber", "News"], review: ["İnceleme / karşılaştırma", "Reviews / comparison"],
  forum: ["Forum / sözlük", "Forum"], social: ["Sosyal medya / video", "Social / video"], marketplace: ["Pazar yeri", "Marketplace"], other: ["Diğer siteler", "Other sites"],
};
/** TruthGuard: bilgi kartıyla doğruluk kontrolü ve kaynak türü dağılımı. Ücretli paketlere özel. */
function TruthGuardPanel({ brand, paid, mix, stats }: { brand: Brand; paid: boolean; mix: SourceMix | null; stats: ReturnType<typeof statSummary> | null }) {
  const checks = useLoad(() => (paid && brand.fact_card ? api.truthChecks(brand.id) : Promise.resolve([])), [brand.id, paid, brand.fact_card ?? ""]);
  const confl = useLoad(() => (paid ? api.engineConflicts(brand.id) : Promise.resolve([])), [brand.id, paid]);
  const conflicts = (confl.data ?? []).filter((c) => !c.failed).flatMap((c) => c.conflicts).slice(0, 6);
  const checked = (confl.data ?? []).filter((c) => !c.failed).length;
  const sl = (t: SourceType) => (isEn() ? SOURCE_LABEL[t][1] : SOURCE_LABEL[t][0]);
  if (!paid) return (
    <section className="panel" id="truthguard">
      <h2>TruthGuard</h2>
      <p className="muted">{L("Yapay zekâ markanız hakkında yanlış bilgi veriyor mu? Fiyat, adres, kuruluş yılı, hizmetler gibi iddialar sizin bilgilerinizle karşılaştırılır; kaynakların güvenilirliği gösterilir. Ücretli paketlerde.", "Is the AI saying wrong things about your brand? Claims about prices, address, founding year and services are checked against your facts, and source reliability is shown. On paid plans.")} <Link to="/hesap#paket">{L("Paketler", "Plans")}</Link></p>
    </section>
  );
  const s = truthSummary(checks.data ?? []);
  const total = s.correct + s.wrong + s.unverifiable;
  return (
    <section className="panel" id="truthguard">
      <h2>TruthGuard</h2>
      {!brand.fact_card ? (
        <p>{L("Doğruluk kontrolü için önce markanın doğru bilgi kartını doldurun: sayfanın üstündeki \"Düzenle\" → \"Doğru bilgi kartı\". Kontrol sonraki saatlerde kendiliğinden yapılır.", "To check accuracy, first fill in the brand's fact card: \"Edit\" at the top → \"Fact card\". Checks then run automatically within hours.")}</p>
      ) : checks.loading ? <Loading /> : s.checks === 0 ? (
        <p className="muted">{L("Henüz kontrol yok. Markanızın geçtiği yeni cevaplar birkaç saat içinde (soru ve motor başına haftada bir) bilgi kartınızla karşılaştırılır.", "No checks yet. New answers that mention your brand are compared with your fact card within hours (once a week per question and engine).")}</p>
      ) : (
        <>
          <p className="muted">{isEn() ? `Last 30 days: ${s.checks} answers checked against your fact card, ${total} claims about your brand.` : `Son 30 gün: ${s.checks} cevap bilgi kartınızla karşılaştırıldı, markanız hakkında ${total} iddia bulundu.`}</p>
          <dl className="metrics">
            <div><dt>{L("Yanlış", "Wrong")}</dt><dd className={`num ${s.wrong ? "truth-bad" : ""}`}>{s.wrong}</dd></div>
            <div><dt>{L("Doğru", "Correct")}</dt><dd className="num">{s.correct}</dd></div>
            <div><dt>{L("Doğrulanamadı", "Can't verify")}</dt><dd className="num">{s.unverifiable}</dd><dd className="range">{L("kartta yok", "not in your card")}</dd></div>
          </dl>
          {s.wrongClaims.length > 0 && (
            <ul className="src-dom">
              {s.wrongClaims.slice(0, 10).map((w) => (
                <li key={w.claim + w.at} className="truth-item">
                  <p className="src-head"><strong>{w.claim}</strong> <span className="muted">{providerLabel(w.provider)}</span></p>
                  <p className="src-sup">{L("Doğrusu: ", "Correct: ")}{w.fact || "–"}</p>
                  <blockquote className="answer"><p>“{w.quote}”</p></blockquote>
                </li>
              ))}
            </ul>
          )}
          {s.unverifiable > 0 && <p className="src-sup muted">{L("\"Doğrulanamadı\" iddiaları azaltmak için bilgi kartınıza o konuları ekleyin.", "Add those topics to your fact card to reduce \"can't verify\" claims.")}</p>}
          <p className="src-sup muted">{L("Karşılaştırmayı küçük bir yapay zekâ modeli yapar ve yanılabilir; her iddia cevaptan birebir alıntıyla gösterilir.", "A small AI model does the comparison and can make mistakes; every claim is shown with an exact quote from the answer.")}</p>
        </>
      )}
      {checked > 0 && (
        <>
          <h3>{L("Motorlar arası çelişki", "Contradictions between engines")}</h3>
          {conflicts.length === 0
            ? <p className="muted">{isEn() ? `Last 30 days: ${checked} questions compared across engines; no contradictions about your brand.` : `Son 30 gün: ${checked} soruda motorların cevapları karşılaştırıldı; markanız hakkında çelişki yok.`}</p>
            : (
              <>
                <p className="muted">{isEn() ? `Different engines say different things about your brand. At least one of them is wrong; your website should state the correct version clearly.` : `Farklı motorlar markanız hakkında farklı şeyler söylüyor. En az biri yanlış; doğrusunu sitenizde açıkça yazın.`}</p>
                <ul className="src-dom">
                  {conflicts.map((c, ix) => (
                    <li key={ix} className="truth-item">
                      <p className="src-head"><strong>{c.topic}</strong></p>
                      {c.sides.map((x) => <p key={x.provider} className="src-sup"><span className="muted">{providerLabel(x.provider)}:</span> “{x.quote}”</p>)}
                    </li>
                  ))}
                </ul>
              </>
            )}
        </>
      )}
      {stats && (
        <>
          <h3>{L("Kaynaksız sayılar ve eski bilgi", "Unsourced numbers and outdated info")}</h3>
          {stats.unsourced + stats.oldDates === 0
            ? <p className="muted">{L("Bu ölçümde markanızla ilgili kaynaksız istatistik veya eski tarihli \"güncel\" bilgi bulunmadı.", "No unsourced statistics or outdated \"current\" info about your brand in this measurement.")}</p>
            : (
              <>
                <p className="muted">{isEn() ? `${stats.unsourced} unsourced statistic${stats.unsourced === 1 ? "" : "s"} and ${stats.oldDates} outdated date${stats.oldDates === 1 ? "" : "s"} in ${stats.answersWithFlags} answers. A number with no source behind it may be made up; check it.` : `${stats.answersWithFlags} cevapta ${stats.unsourced} kaynaksız istatistik ve ${stats.oldDates} eski tarih. Arkasında kaynak olmayan bir sayı uydurma olabilir; kontrol edin.`}</p>
                <ul className="src-dom">
                  {stats.examples.map((e) => (
                    <li key={e.kind + e.sentence}>
                      <p className="src-head"><strong>{e.kind === "unsourced_stat" ? L("Kaynaksız istatistik", "Unsourced statistic") : L("Eski tarih", "Outdated date")}: {e.value}</strong> <span className="muted">{providerLabel(e.provider)}</span></p>
                      <blockquote className="answer"><p>“{e.sentence}”</p></blockquote>
                    </li>
                  ))}
                </ul>
              </>
            )}
        </>
      )}
      {mix && mix.total > 0 && (
        <>
          <h3>{L("Kaynakların türü", "Source types")}</h3>
          <p className="muted">{L("Yapay zekânın bu ölçümde kaynak gösterdiği sitelerin türü (her cevapta her site bir kez).", "What kind of sites the AI cited in this measurement (each site once per answer).")}</p>
          <ol className="domains">{mix.types.map((t) => <li key={t.type}><span>{sl(t.type)}</span><span className="num">{pct(t.share)} <span className="muted">({t.count})</span></span></li>)}</ol>
          {mix.lost.total > 0 && (
            <>
              <p className="src-sup"><strong>{L("Rakibiniz sizin yerinize önerildiğinde:", "When a competitor was recommended instead of you:")}</strong></p>
              <ol className="domains">{mix.lost.types.slice(0, 5).map((t) => <li key={t.type}><span>{sl(t.type)}</span><span className="num">{pct(t.share)} <span className="muted">({t.count})</span></span></li>)}</ol>
              {(() => { const weak = mix.lost.types.filter((t) => t.type === "forum" || t.type === "social").reduce((a, t) => a + t.share, 0); return weak >= 0.4 ? <p className="caution">{isEn() ? `${pct(weak)} of these sources are forums or social media: less reliable sources are shaping these answers. Accurate content on review and news sites can change that.` : `Bu kaynakların %${Math.round(weak * 100)}'i forum veya sosyal medya: cevapları daha az güvenilir kaynaklar şekillendiriyor. İnceleme ve haber sitelerinde doğru içerik bunu değiştirebilir.`}</p> : null; })()}
            </>
          )}
        </>
      )}
    </section>
  );
}

const TRAIT_LABEL: Record<string, [string, string]> = {
  premium: ["Premium", "Premium"], affordable: ["Uygun fiyatlı", "Affordable"], expensive: ["Pahalı", "Expensive"], value_for_money: ["Fiyatına değer", "Value for money"],
  high_quality: ["Kaliteli", "High quality"], low_quality: ["Düşük kalite", "Low quality"], reliable: ["Güvenilir", "Reliable"], unreliable: ["Güvenilmez", "Unreliable"],
  innovative: ["Yenilikçi", "Innovative"], popular: ["Popüler", "Popular"], good_service: ["İyi hizmet", "Good service"], poor_service: ["Kötü hizmet", "Poor service"],
  wide_range: ["Geniş seçenek", "Wide range"], limited_range: ["Sınırlı seçenek", "Limited range"], fast: ["Hızlı", "Fast"], slow: ["Yavaş", "Slow"],
  eco_friendly: ["Çevreci", "Eco-friendly"], local: ["Yerel", "Local"], outdated: ["Eski / geride", "Outdated"],
};
const NEG_TRAITS = new Set(["expensive", "low_quality", "unreliable", "poor_service", "limited_range", "slow", "outdated"]);
/** Marka algısı: yapay zekânın markaya yakıştırdığı nitelikler, cevaptan birebir alıntıyla. */
function PerceptionPanel({ summary: s, brand }: { summary: ReturnType<typeof perceptionSummary>; brand: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const tl = (t: string) => (TRAIT_LABEL[t] ? (isEn() ? TRAIT_LABEL[t][1] : TRAIT_LABEL[t][0]) : t);
  return (
    <section className="panel" id="marka-algisi">
      <h2>{L("Marka algısı", "Brand perception")}</h2>
      <p className="muted">{isEn() ? `How the AI describes ${brand} in answers that mention it. Each trait is backed by an exact quote from an answer; a small model labels them, so open the quotes before drawing conclusions.` : `Yapay zekâ ${brand} markasını, adının geçtiği cevaplarda nasıl anlatıyor. Her nitelik bir cevaptan birebir alıntıyla desteklenir; etiketleri küçük bir model koyar, sonuç çıkarmadan önce alıntılara bakın.`}</p>
      {s.answers === 0 ? <p>{L("Bu ölçümde algı verisi yok. Algı, ücretli paketlerde canlı aramalı ölçümlerde çıkarılır; eski ölçümler için birkaç saat içinde doldurulur.", "No perception data in this measurement. Perception is extracted in live-search measurements on paid plans; older measurements are filled in within a few hours.")}</p> : (
        <>
          <div className="own-bar" role="img" aria-label={L("Duygu dağılımı", "Sentiment split")}>
            <span className="per-pos" style={{ flex: s.sentiment.positive }} /><span className="per-mix" style={{ flex: s.sentiment.mixed }} /><span className="per-neu" style={{ flex: s.sentiment.neutral }} /><span className="per-neg" style={{ flex: s.sentiment.negative }} />
          </div>
          <ul className="own-legend">
            <li><span className="dot per-pos" /> {L("Olumlu", "Positive")}: <strong>{s.sentiment.positive}</strong></li>
            <li><span className="dot per-mix" /> {L("Karışık", "Mixed")}: <strong>{s.sentiment.mixed}</strong></li>
            <li><span className="dot per-neu" /> {L("Nötr", "Neutral")}: <strong>{s.sentiment.neutral}</strong></li>
            <li><span className="dot per-neg" /> {L("Olumsuz", "Negative")}: <strong>{s.sentiment.negative}</strong></li>
          </ul>
          <p className="muted">{isEn() ? `${s.answers} answers analysed.` : `${s.answers} cevap incelendi.`}{s.answers < MIN_SAMPLE && L(" Örneklem küçük; tek bir cevap tabloyu değiştirebilir.", " Small sample; a single answer can change the picture.")}</p>
          {s.traits.length === 0 ? <p className="muted">{L("Belirgin bir nitelik yakıştırılmadı.", "No clear traits were attributed.")}</p> : (
            <ul className="src-dom">
              {s.traits.map((t) => (
                <li key={t.trait} className={NEG_TRAITS.has(t.trait) ? "per-item-neg" : ""}>
                  <p className="src-head"><strong>{tl(t.trait)}</strong> <span className="num">{pct(t.share)}</span></p>
                  <p className="src-sup muted">{isEn() ? `${t.count} of ${s.answers} answers` : `${s.answers} cevabın ${t.count} tanesinde`}{Object.keys(t.byEngine).length > 1 && ` (${Object.entries(t.byEngine).map(([e, n]) => `${providerLabel(e)} ${n}`).join(", ")})`}</p>
                  <button className="link-btn" aria-expanded={open === t.trait} onClick={() => setOpen(open === t.trait ? null : t.trait)}>{open === t.trait ? L("Alıntıyı gizle", "Hide quote") : L("Alıntıyı göster", "Show quote")}</button>
                  {open === t.trait && t.quotes.map((q) => <blockquote key={q} className="answer"><p>“{q}”</p></blockquote>)}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

/** AI Görünürlük Skoru: oranların ağırlıklı ortalaması (0–100), aralığı ve önceki ölçüme göre fark. Ek API çağrısı yok. */
const PART_LABEL: Record<ScorePartKey, string> = {
  recommend: L("Önerilme", "Recommended"), mention: L("Anılma", "Mentioned"),
  share: L("Önerilerdeki pay", "Share of recommendations"), cite: L("Sitenin kaynak gösterilmesi", "Your site cited"),
};
function ScorePanel({ pts, live, simulated, allRows, engineName }: { pts: ReturnType<typeof series>; live: boolean; simulated: boolean; allRows: VisRow[]; engineName: string | null }) {
  const [how, setHow] = useState(false);
  const toInput = (p: (typeof pts)[number] | undefined): ScoreInput | null => p ? ({ recommend: p.recommend, mention: p.mention, share: p.share, cite: live ? p.cite : null }) : null;
  const last = pts[pts.length - 1], prev = pts[pts.length - 2];
  const now = visibilityScore(toInput(last)!);
  if (!now) return null;
  const ch = scoreChange(prev ? visibilityScore(toInput(prev)!) : null, now);
  // Motor bazında: her motorun kendi son iki ölçümü
  const engs = [...new Set(allRows.map((r) => r.provider))];
  const engCh = engs.length > 1 ? engineScoreChanges(engs.map((e) => {
    const ps = series(allRows.filter((r) => r.provider === e));
    return { provider: e, prev: toInput(ps[ps.length - 2]), now: toInput(ps[ps.length - 1]) };
  })) : [];
  const topEng = engCh.find((e) => e.change.delta !== 0 && !e.change.withinNoise);
  const band = now.score >= 60 ? "high" : now.score >= 30 ? "mid" : "low";
  return (
    <section className={`panel score-card score-${band}`} id="gorunurluk-skoru">
      <div className="score-row">
        <div className="score-num" aria-label={L("AI Görünürlük Skoru", "AI Visibility Score")}><strong>{now.score}</strong><span>/100</span></div>
        <div>
          <h2>{L("AI Görünürlük Skoru", "AI Visibility Score")}{engineName && <span className="muted"> · {engineName}</span>}{simulated && <span className="muted"> · {L("simülasyon", "simulation")}</span>}</h2>
          <p className="muted">{L("aralık", "range")} {now.low}–{now.high}</p>
          {ch ? (
            <p>{isEn()
              ? <>Previous measurement {ch.prev} → now {ch.now} ({ch.delta > 0 ? "+" : ""}{ch.delta}).</>
              : <>Önceki ölçüm {ch.prev} → şimdi {ch.now} ({ch.delta > 0 ? "+" : ""}{ch.delta}).</>}
              {ch.withinNoise
                ? <span className="muted"> {L("Fark ölçüm oynaklığı içinde, gerçek değişim olmayabilir.", "The change is within measurement noise; it may not be real.")}</span>
                : ch.topPart && <> {isEn() ? `Biggest driver: ${PART_LABEL[ch.topPart.key].toLowerCase()} (${ch.topPart.delta > 0 ? "+" : ""}${ch.topPart.delta} pts).` : `En çok etkileyen: ${PART_LABEL[ch.topPart.key].toLowerCase()} (${ch.topPart.delta > 0 ? "+" : ""}${ch.topPart.delta} puan).`}</>}
            </p>
          ) : <p className="muted">{L("Karşılaştırma için ikinci ölçüm gerekir.", "A second measurement is needed for a comparison.")}</p>}
          {topEng && <p className="muted">{isEn() ? `Largest ${topEng.change.delta > 0 ? "rise" : "drop"}: ${providerLabel(topEng.provider)} (${topEng.change.prev} → ${topEng.change.now}).` : `En büyük ${topEng.change.delta > 0 ? "artış" : "düşüş"}: ${providerLabel(topEng.provider)} (${topEng.change.prev} → ${topEng.change.now}).`}</p>}
        </div>
      </div>
      {now.lowSample && <p className="caution">{isEn() ? `Not final: only ${now.n} answers. The score can move a lot between measurements.` : `Kesin değil: yalnız ${now.n} cevap var. Skor ölçümler arasında çok oynayabilir.`}</p>}
      <button className="link-btn" aria-expanded={how} onClick={() => setHow(!how)}>{how ? L("Hesabı gizle", "Hide the calculation") : L("Skor nasıl hesaplandı?", "How is the score calculated?")}</button>
      {how && (
        <div className="score-how">
          <ul className="plain">
            {now.parts.map((p) => <li key={p.key}>{PART_LABEL[p.key]}: {pct(p.value)} × {L("ağırlık", "weight")} %{p.weight} = <strong>{p.points}</strong> {L("puan", "pts")}</li>)}
          </ul>
          <p className="muted">{now.citeMissing
            ? L("Bu ölçümde kaynak verisi yok (canlı arama gerekir); kaynak bileşeni sıfır sayılmadı, ağırlığı diğerlerine oransal dağıtıldı.", "No source data in this measurement (needs live search); the source part wasn't counted as zero, its weight was spread across the others.")
            : L("Ağırlıklar: önerilme 45, anılma 20, önerilerdeki pay 20, kaynak gösterilme 15.", "Weights: recommended 45, mentioned 20, share of recommendations 20, cited 15.")}
            {" "}{L("Aralık, oranların %95 güven aralığından hesaplanır. Skor yalnız ölçtüğünüz sorular ve takip ettiğiniz rakiplerle ilgilidir; farklı soru setleri arasında karşılaştırılamaz.", "The range comes from the 95% intervals of the rates. The score only covers your questions and tracked competitors; it can't be compared across different question sets.")}</p>
        </div>
      )}
    </section>
  );
}

/** Motor karşılaştırması: aynı ölçümde motorlar yan yana; motorlar arası tutarsızlık ve motora özgü kaynaklar. Ek API çağrısı yok. */
function EngineComparePanel({ rows, answers, live }: { rows: VisRow[]; answers: { provider: string; cited_urls: string[] | null }[]; live: boolean }) {
  const cmp = engineComparison(rows);
  const engines = [...new Set(rows.map((r) => r.provider))].sort((x, y) => ENGINE_ORDER.indexOf(x) - ENGINE_ORDER.indexOf(y));
  const flagged = cmp.filter((c) => c.level !== "none" || c.ignoredBy.length > 0);
  const src = live ? sourcesByEngine(answers) : [];
  const cell = (c: EngineCompareRow, e: string) => {
    const x = c.byEngine[e];
    return x ? <><span className="num">{x.k}/{x.n}</span> <span className="muted">({pct(x.rate)})</span></> : <span className="muted">–</span>;
  };
  return (
    <section className="panel" id="motor-karsilastirma">
      <h2>{L("Motor karşılaştırması", "Engine comparison")}</h2>
      <p className="muted">{L("Aynı sorular, aynı ölçüm: her motorun her markayı kaç cevapta önerdiği. Bir cevap birden fazla marka önerebilir; bu oranlar pazar payı değildir.", "Same questions, same measurement: how many answers from each engine recommended each brand. One answer can recommend several brands; these rates are not market share.")}</p>
      <div className="table-wrap">
        <table className="eng-table">
          <thead><tr><th>{L("Marka", "Brand")}</th>{engines.map((e) => <th key={e}>{providerLabel(e)}</th>)}<th>{L("Fark", "Gap")}</th></tr></thead>
          <tbody>
            {cmp.map((c) => (
              <tr key={c.brandId} className={c.isTarget ? "is-target" : ""}>
                <th scope="row">{c.name}{c.isTarget && <span className="muted"> {L("(siz)", "(you)")}</span>}</th>
                {engines.map((e) => <td key={e}>{cell(c, e)}</td>)}
                <td className={c.level === "clear" ? "gap-clear" : c.level === "large" ? "gap-large" : ""}>{c.high ? `${Math.round(c.gap * 100)} ${L("puan", "pts")}` : "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3>{L("Öneri payı (sektördeki takip edilen markalar arasında)", "Share of recommendations (among tracked brands)")}</h3>
      <p className="muted">{L("Her motorun yaptığı tüm marka önerileri içinde her markanın payı. Yalnız takip ettiğiniz markalar sayılır.", "Each brand's share of all brand recommendations an engine made. Only the brands you track are counted.")}</p>
      <div className="eng-src">
        {engines.map((e) => (
          <div key={e}>
            <p className="src-head"><strong>{providerLabel(e)}</strong></p>
            <ol className="domains">{[...cmp].filter((c) => c.byEngine[e]).sort((x, y) => y.byEngine[e].share - x.byEngine[e].share).map((c) => (
              <li key={c.brandId}><span>{c.name}{c.isTarget && <span className="muted"> {L("(siz)", "(you)")}</span>}</span><span className="num">{pct(c.byEngine[e].share)}</span></li>
            ))}</ol>
          </div>
        ))}
      </div>
      {flagged.length > 0 && <h3>{L("Motorlar arası tutarsızlık", "Inconsistency between engines")}</h3>}
      {flagged.length > 0 && (
        <ul className="src-dom">
          {flagged.map((c) => (
            <li key={c.brandId} className={c.isTarget ? "src-target" : ""}>
              <p className="src-head"><strong>{c.name}</strong> <span className="num">{Math.round(c.gap * 100)} {L("puan fark", "pt gap")}</span></p>
              <p className="src-sup">
                {c.ignoredBy.length > 0
                  ? (isEn() ? `${c.ignoredBy.map(providerLabel).join(", ")} never mentioned it, while ${providerLabel(c.high!)} recommended it in ${c.byEngine[c.high!].k} of ${c.byEngine[c.high!].n} answers.` : `${c.ignoredBy.map(providerLabel).join(", ")} hiç anmadı; ${providerLabel(c.high!)} ise ${c.byEngine[c.high!].n} cevabın ${c.byEngine[c.high!].k} tanesinde önerdi.`)
                  : (isEn() ? `${providerLabel(c.high!)} recommends it more often than ${providerLabel(c.low!)}.` : `${providerLabel(c.high!)} bu markayı ${providerLabel(c.low!)}'a göre daha sık öneriyor.`)}
              </p>
              <p className="src-sup muted">{c.level === "clear"
                ? L("Güven aralıkları ayrışıyor: fark ölçüm oynaklığıyla açıklanamaz.", "The confidence ranges don't overlap: the gap isn't explained by measurement noise.")
                : L("Fark büyük ama örneklem küçük; güven aralıkları hâlâ kesişiyor. Daha fazla soru ve ölçümle doğrulayın.", "The gap is large but the sample is small; the ranges still overlap. Confirm with more questions and measurements.")}</p>
            </li>
          ))}
        </ul>
      )}
      {src.length > 1 && (
        <>
          <h3>{L("Motorların baktığı siteler", "Sites each engine read")}</h3>
          <p className="muted">{L("Yalnız o motorun kaynak gösterdiği siteler işaretli. Bir motorda görünmüyorsanız, o motorun baktığı sitelerde yer almak işe yarayabilir.", "Sites cited by only that engine are marked. If an engine doesn't show you, getting featured on the sites it reads may help.")}</p>
          <div className="eng-src">
            {src.map((s) => (
              <div key={s.provider}>
                <p className="src-head"><strong>{providerLabel(s.provider)}</strong> <span className="muted">{isEn() ? `${s.answers} answers` : `${s.answers} cevap`}</span></p>
                {s.domains.length === 0 ? <p className="muted">{L("Kaynak gösterilmedi.", "No sources cited.")}</p> : (
                  <ol className="domains">{s.domains.map((d) => <li key={d.domain}><span>{d.domain}{d.only && <span className="muted"> {L("· yalnız bu motor", "· this engine only")}</span>}</span><span className="num muted">{d.count}</span></li>)}</ol>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </section>
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
  async function toggleTask(a: BrandAction, ix: number) {
    const tasks = (a.tasks ?? []).map((t, j) => (j === ix ? { ...t, done: !t.done } : t));
    try { await api.updateActionTasks(a.id, tasks); actions.reload(); } catch (x) { setErr(friendlyError(x)); }
  }
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
              {a.note && <p className="src-sup muted">{a.tasks ? <>{L("Başarı ölçütü: ", "Success check: ")}{a.note}</> : a.note}</p>}
              {a.tasks && (() => {
                const pr = taskProgress(a.tasks);
                return (
                  <div className="camp">
                    <p className="camp-head"><span className="badge-camp">{L("Kampanya", "Campaign")}</span> {pr.done}/{pr.total} {L("görev tamam", "tasks done")}{pr.done === pr.total && L(" · bitti", " · complete")}</p>
                    <div className="camp-bar" aria-hidden><span style={{ width: `${pr.total ? (100 * pr.done) / pr.total : 0}%` }} /></div>
                    <ul className="camp-tasks">
                      {a.tasks.map((t, ix) => (
                        <li key={ix}><label className="check-row"><input type="checkbox" checked={t.done} onChange={() => toggleTask(a, ix)} /><span className={t.done ? "done" : ""}>{t.t}</span></label></li>
                      ))}
                    </ul>
                    <p className="src-sup muted">{L("Önce/sonra: kampanyanın başladığı günden önceki son ölçüm ile sonraki en güncel ölçüm karşılaştırılır.", "Before/after: the last measurement before the campaign started is compared with the latest one after it.")}</p>
                  </div>
                );
              })()}
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
  // İyileştirme rehberi için kanıtlar (ek API çağrısı yok): önceki ölçüm, motor farkı, kaynak fırsatları, ürün doğruluğu, Shopping
  const prevRun = runs.filter((r) => r.status === "done")[1];
  const prevResults = useLoad(() => (prevRun ? api.promptResults(prevRun.id) : Promise.resolve([])), [prevRun?.id]);
  const evidence = useLoad(async () => {
    if (!lastRun || brand.data_origin === "simulated") return null;
    const live = type === "live_search";
    const [vis, comps, prods] = await Promise.all([api.visibility(brand.id, type), api.competitors(brand.id), api.products(brand.id)]);
    const rows = vis.filter((r) => r.run_id === lastRun.id);
    const me = engineComparison(rows).find((c) => c.isTarget);
    const engineGap = me && me.high ? { ignoredBy: me.ignoredBy, high: me.high, highK: me.byEngine[me.high].k, highN: me.byEngine[me.high].n, level: me.level } : null;
    let opportunitySites: { domain: string; count: number }[] = [];
    let ownShare: { own: number; total: number; competitor: number } | null = null;
    if (live) {
      const ans = await api.answers(lastRun.id);
      const ments = ans.length ? await api.mentionsFor(ans.map((a) => a.id)) : [];
      const host = (w: string | null) => (w ? w.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].toLowerCase() : "");
      opportunitySites = sourceOpportunities(ans, ments, brand.id, [brand.website, ...comps.map((c) => c.website)].map(host).filter(Boolean)).filter((d) => !d.own);
      const o = ownedSourceShare(ans, [{ id: brand.id, name: brand.name, website: brand.website, isTarget: true }, ...comps.map((c) => ({ id: c.id, name: c.name, website: c.website, isTarget: false }))]);
      ownShare = { own: o.own, total: o.total, competitor: o.competitor };
    }
    const own = prods.filter((p) => !p.rival_of);
    const ids = prods.map((p) => p.id);
    const [checks, shops] = ids.length ? await Promise.all([api.productChecks(own.map((p) => p.id)), api.shoppingChecks(own.map((p) => p.id))]) : [[], []];
    const latest = <T extends { product_id: string; created_at: string }>(xs: T[]) => [...new Map([...xs].sort((a, b) => a.created_at.localeCompare(b.created_at)).map((x) => [x.product_id, x])).values()];
    const name = (id: string) => prods.find((p) => p.id === id)?.name ?? "";
    const wrongClaims = latest(checks).flatMap((c) => c.claims.filter((x) => x.status === "wrong").map((x) => ({ product: name(c.product_id), claim: x.claim, fact: x.fact })));
    const shoppingBehind = latest(shops).flatMap((sc) => sc.rivals.filter((r) => sc.own_position == null || r.position < sc.own_position).slice(0, 1)
      .map((r) => ({ product: name(sc.product_id), ownPos: sc.own_position, rival: name(r.id), rivalPos: r.position })));
    const tc = brand.fact_card ? await api.truthChecks(brand.id).catch(() => []) : [];
    const wrongBrandClaims = truthSummary(tc).wrongClaims.slice(0, 5).map((w) => ({ claim: w.claim, fact: w.fact }));
    return { engineGap, opportunitySites, wrongClaims, shoppingBehind, ownShare, wrongBrandClaims };
  }, [brand.id, type, lastRun?.id]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [rev, setRev] = useState(0);
  const [campMsg, setCampMsg] = useState<string | null>(null);
  const [campErr, setCampErr] = useState<string | null>(null);
  const camps = useLoad(() => api.actions(brand.id), [brand.id, rev]);
  const sim = brand.data_origin === "simulated";
  const pendingAudit = brand.audit_requested_at && (!audit.data || audit.data.created_at < brand.audit_requested_at);

  if (audit.loading || prompts.loading || results.loading || prevResults.loading || evidence.loading) return <Loading />;
  const recInput = {
    brandName: brand.name, website: brand.website, city: brand.city, sector: brand.sector, aliases: brand.aliases,
    activePrompts: (prompts.data ?? []).filter((p) => p.active).length,
    completedRuns: runs.filter((r) => r.status === "done").length,
    autoWeekly: brand.auto_weekly || sim, measurementType: type,
    prompts: results.data ?? [],
    audit: sim ? null : audit.data ? { status: audit.data.status, checks: audit.data.checks } : null,
    lang: (isEn() ? "en" : "tr") as "en" | "tr",
    previousPrompts: prevResults.data ?? [],
    ...(evidence.data ?? {}),
  } satisfies RecInput as RecInput;
  const recs = buildRecommendations(recInput).filter((r) => !(sim && r.id === "no_website"));
  const activeRecs = new Set((camps.data ?? []).filter((a) => a.rec_id && a.tasks && taskProgress(a.tasks).done < a.tasks.length).map((a) => a.rec_id!));
  async function startCampaign(r: (typeof recs)[number], tasks: string[]) {
    setCampErr(null); setCampMsg(null);
    try {
      await api.addAction({ workspace_id: brand.workspace_id, brand_id: brand.id, title: r.title.slice(0, 200), note: r.check ? r.check.slice(0, 1000) : null, done_on: new Date().toISOString().slice(0, 10), rec_id: r.id, tasks: tasks.map((t) => ({ t, done: false })) });
      setCampMsg(L("Kampanya başladı. Görevler aşağıda, \"Yaptıklarım ve sonuçları\" bölümünde.", "Campaign started. The tasks are below, under \"What I did, and what happened\"."));
      camps.reload(); setRev((x) => x + 1);
      setTimeout(() => document.getElementById("aksiyonlar")?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (e) { setCampErr(friendlyError(e)); }
  }

  async function check() {
    setBusy(true); setErr(null); setMsg(null);
    try { await api.requestAudit(brand.id); setMsg(L("Kontrol sıraya alındı. Sonuç en geç bir saat içinde burada görünür.", "Check queued. Results appear here within an hour.")); onBrandChange(); }
    catch (e) { setErr(friendlyError(e)); } finally { setBusy(false); }
  }

  return (
    <div className="stack">
      {sim && <DataNotice type="simulated" />}
      <section className="panel">
        <h2>{L("İyileştirme rehberi", "Improvement guide")}</h2>
        <p className="muted">{isEn() ? `Derived by rules from the latest measurement${!sim ? " and website check" : ""}; not generated by AI. Ordered by importance.` : `Son ölçüm${!sim ? " ve web sitesi kontrolü" : ""} sonuçlarından kurallarla çıkarıldı; yapay zekâ ile üretilmedi. Önem sırasına göre.`}</p>
        {campMsg && <p className="success-box">{campMsg}</p>}
        <ErrorBox message={campErr} />
        {recs.length === 0 ? <p>{L("Şu an önerimiz yok. Yeni ölçümlerden sonra tekrar bakın.", "No recommendations right now. Check again after new measurements.")}</p> : (
          <ol className="recs">
            {recs.map((r) => (
              <li key={r.id} className={`rec rec-${r.priority === "yüksek" ? "high" : r.priority === "orta" ? "medium" : "low"}`}>
                <div className="rec-head"><strong>{r.title}</strong><span className="rec-pri">{isEn() ? `${r.priority === "yüksek" ? "High" : r.priority === "orta" ? "Medium" : "Low"} priority` : `${r.priority} öncelik`}</span></div>
                <p className="rec-why"><span>{L("Kanıt:", "Evidence:")}</span> {r.why}</p>
                <p className="rec-action"><span>{L("Ne yapılmalı:", "What to do:")}</span> {r.action}</p>
                {r.check && <p className="rec-check"><span>{L("Başarı ölçütü:", "Success check:")}</span> {r.check}</p>}
                {r.progress && <p className={`rec-progress rec-${r.progress.status}`}>{r.progress.status === "improved" ? "↑ " : r.progress.status === "worse" ? "↓ " : "= "}{r.progress.text}</p>}
                {!sim && (() => {
                  const tasks = campaignFor(r, recInput);
                  if (!tasks) return null;
                  return activeRecs.has(r.id)
                    ? <p className="rec-camp muted">{L("Bu madde için kampanya sürüyor.", "A campaign is running for this item.")} <a href="#aksiyonlar">{L("Görevlere git", "Go to tasks")}</a></p>
                    : <Button variant="quiet" className="btn-small" onClick={() => startCampaign(r, tasks)}>{L(`Kampanya başlat (${tasks.length} görev)`, `Start campaign (${tasks.length} tasks)`)}</Button>;
                })()}
              </li>
            ))}
          </ol>
        )}
      </section>

      {!sim && <BriefsPanel brand={brand} results={results.data ?? []} />}
      {!sim && <ActionsPanel key={rev} brand={brand} />}

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

/** Yapay zekâyla soru önerisi: ücretsiz Gemini, markanın sektörü/şehri/rakiplerine göre müşteri gözüyle sorular (günde 5 istek). */
function AiSuggestions({ brand, existing, onAdd, busy }: { brand: Brand; existing: Set<string>; onAdd: (text: string, intent: Intent) => Promise<void>; busy: boolean }) {
  const [items, setItems] = useState<{ text: string; intent: Intent }[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function ask() {
    setLoading(true); setErr(null);
    try {
      const { data } = await sb().auth.getSession();
      const r = await fetch("/api/suggest", { method: "POST", headers: { "content-type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` }, body: JSON.stringify({ brand_id: brand.id }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok) setItems(j.questions ?? []);
      else setErr(j.error === "region" ? L("Bulunduğunuz ülkede otomatik soru önerisi kullanılamıyor.", "Automatic suggestions aren't available in your country.")
        : j.message || L("Şu an öneri alınamadı. Biraz sonra tekrar deneyin.", "Couldn't get suggestions right now. Try again shortly."));
    } catch { setErr(L("Bağlantı hatası. Tekrar deneyin.", "Connection error. Try again.")); }
    finally { setLoading(false); }
  }
  const shown = (items ?? []).filter((q) => !existing.has(q.text));
  return (
    <section className="panel stack">
      <h2>{L("Yapay zekâyla soru öner", "Suggest questions with AI")}</h2>
      <p className="muted">{L("Sektörünüze, şehrinize ve rakiplerinize göre müşterilerin soracağı soruları taslak olarak hazırlar. Marka adı içermez. Beğendiklerinizi ekleyin; ekledikten sonra düzenleyebilirsiniz. Günde 5 kez kullanılabilir.", "Drafts questions customers would ask, based on your industry, city and competitors. No brand names. Add the ones you like; you can edit them afterwards. Up to 5 times a day.")}</p>
      <Button variant="quiet" onClick={ask} busy={loading}>{items ? L("Başka öneriler getir", "Get more suggestions") : L("Bana soru öner", "Suggest questions")}</Button>
      <ErrorBox message={err} />
      {items && (shown.length === 0 ? <p className="muted">{L("Yeni öneri kalmadı.", "No new suggestions left.")}</p> : (
        <ul className="rows">{shown.map((q) => (
          <li key={q.text}><span>{q.text}<span className="q-meta">{INTENT_LABEL[q.intent]}</span></span>
            <button className="link-btn" disabled={busy} onClick={() => onAdd(q.text, q.intent)}>{L("Ekle", "Add")}</button></li>
        ))}</ul>
      ))}
    </section>
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
  const ideas = [...questionTemplates(brand.sector, brand.city), ...postPurchaseTemplates(brand.name, isEn())].filter((s) => !existing.has(s.text));
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
            {list.map((p) => <PromptRow key={p.id} p={p} onChange={prompts.reload} onError={setErr} branded={promptKind(p.text, { name: brand.name, aliases: brand.aliases ?? [] }) === "branded"} />)}
          </ul>
        )}
        {(() => {
          const act = list.filter((p) => p.active), nb = act.filter((p) => promptKind(p.text, { name: brand.name, aliases: brand.aliases ?? [] }) === "branded").length;
          if (act.length < 3) return null;
          const share = nb / act.length;
          return share > 0.3
            ? <p className="caution">{isEn() ? `${nb} of your ${act.length} questions contain your brand name (${Math.round(share * 100)}%). Keep this to about 20%: branded questions almost always mention you and make the result look better than it is.` : `${act.length} sorunuzun ${nb} tanesinde marka adınız geçiyor (%${Math.round(share * 100)}). Bunu %20 civarında tutun: markalı sorularda yapay zekâ sizden neredeyse her zaman söz eder ve sonuç olduğundan iyi görünür.`}</p>
            : <p className="muted small">{isEn() ? `Mix: ${act.length - nb} unbranded, ${nb} branded. A good start is about 80% unbranded questions, spread across researching, comparing and buying.` : `Dağılım: ${act.length - nb} markasız, ${nb} markalı. İyi bir başlangıç: soruların %80 kadarı markasız, bilgi arama, karşılaştırma ve satın alma arasında dağılmış.`}</p>;
        })()}
      </section>

      {brand.data_origin !== "simulated" && <GoogleQuestions brand={brand} existing={existing} canAdd={active < limit} onAdd={add} busy={busy} />}
      {active < limit && brand.data_origin !== "simulated" && <AiSuggestions brand={brand} existing={existing} onAdd={add} busy={busy} />}

      {active < limit && ideas.length > 0 && (
        <section className="panel">
          <h2>{L("Hazır sorular", "Suggested questions")}</h2>
          <p className="muted">{isEn() ? `Hand-written questions${brand.sector ? ` for "${brand.sector}"` : ""}${def?.local && brand.city ? `, for ${brand.city}` : ""}. "After buying" questions check what the AI tells your existing customers about warranty, returns and support; they contain your name, so add only one or two. You can edit them after adding.` : `${brand.sector ? `"${brand.sector}" sektörü için ` : ""}elle hazırlanmış sorular${def?.local && brand.city ? `, ${brand.city} için` : ""}. "Satın aldıktan sonra" soruları, yapay zekânın mevcut müşterilerinize garanti, iade ve destek hakkında ne söylediğini kontrol eder; marka adınızı içerdiği için bir iki tane yeterli. Ekledikten sonra düzenleyebilirsiniz.`}</p>
          <ul className="rows">
            {ideas.map((s) => (
              <li key={s.text}>
                <span><span className="q-text">{s.text}</span><span className="q-meta">{INTENT_LABEL[s.intent]}</span></span>
                <button className="link-btn" disabled={busy} onClick={() => add(s.text, s.intent)} aria-label={L("Ekle", "Add")}>+ {L("Ekle", "Add")}</button>
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

function PromptRow({ p, onChange, onError, branded = false }: { p: Prompt; onChange: () => void; onError: (m: string) => void; branded?: boolean }) {
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
      <span><span className="q-text">{p.text}</span><span className="q-meta">{INTENT_LABEL[p.intent]}{p.segment && `, ${p.segment}`}{branded && L(", markalı", ", branded")}{!p.active && ", pasif"}</span></span>
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
