// Ürünler: ürün görünürlüğü ve önerilme oranı, rakip ürün karşılaştırması, ürün bilgi doğruluğu, Google Shopping, nereden satın alınır.
// Hesaplamalar sitedekiyle aynı motor fonksiyonları (engine/src/insights.ts, shopping.ts); ek ücretli çağrı yapılmaz.
import { useState, type FormEvent, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApp, useLoad } from "../../lib/app";
import { api, type Brand, type Product } from "../../lib/data";
import { friendlyError } from "../../lib/supabase";
import { MIN_SAMPLE, pct, providerLabel } from "../../lib/report";
import { L, isEn } from "../../lib/i18n";
import { compareProducts, productVisibility, rivalReasons, shoppingSources } from "../../../../engine/src/insights.ts";
import { Confirm, Err, Head, Icon, Sheet, Spinner, haptic } from "../ui";
import { useSelectedBrand } from "./Home";

/** Ürün ekranlarının ortak verisi: ürünler, son ölçümlerin cevapları, rakip markalar. */
function useProductData(brand: Brand) {
  const products = useLoad(() => api.products(brand.id), [brand.id]);
  const ids = (products.data ?? []).filter((p) => !p.rival_of).map((p) => p.id);
  const checks = useLoad(() => api.productChecks(ids), [ids.join(","), (products.data ?? []).map((p) => p.check_requested_at ?? "").join(",")]);
  const shop = useLoad(() => api.shoppingChecks(ids), [ids.join(",")]);
  const runs = useLoad(() => api.runs(brand.id), [brand.id]);
  const lastIds = (["live_search", "model_knowledge"] as const).map((t) => (runs.data ?? []).find((r) => r.status === "done" && r.measurement_type === t)?.id).filter((x): x is string => !!x);
  const answers = useLoad(() => Promise.all(lastIds.map((id) => api.answers(id))).then((a) => a.flat()), [lastIds.join(",")]);
  const comps = useLoad(() => api.competitors(brand.id), [brand.id]);
  const loading = products.loading || runs.loading || answers.loading || comps.loading;
  return { products, checks, shop, answers: answers.data ?? [], comps: comps.data ?? [], hasRuns: lastIds.length > 0, loading };
}

const Note = ({ children }: { children: ReactNode }) => <p className="muted small" style={{ margin: 0 }}>{children}</p>;
const Section = ({ title, children }: { title: string; children: ReactNode }) => <section style={{ display: "flex", flexDirection: "column", gap: 10 }}><h2 className="label">{title}</h2>{children}</section>;

export function Products() {
  const nav = useNavigate();
  const sel = useSelectedBrand();
  if (sel.loading) return <Spinner />;
  if (!sel.brand) { nav("/ana", { replace: true }); return null; }
  return <ProductList brand={sel.brand} />;
}

function ProductList({ brand }: { brand: Brand }) {
  const nav = useNavigate();
  const d = useProductData(brand);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (d.loading) return <Spinner />;
  const own = (d.products.data ?? []).filter((p) => !p.rival_of);
  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("n") || "").trim(), facts = String(f.get("f") || "").trim();
    if (name.length < 2 || facts.length < 10) { setErr(L("Ürün adını ve en az bir iki doğru bilgiyi yazın.", "Enter the product name and at least a couple of correct facts.")); return; }
    setBusy(true); setErr(null);
    try { await api.addProduct({ workspace_id: brand.workspace_id, brand_id: brand.id, name: name.slice(0, 120), price: String(f.get("p") || "").trim().slice(0, 60) || null, facts: facts.slice(0, 2000) }); setAdding(false); haptic.done(); d.products.reload(); }
    catch (x) { setErr(friendlyError(x)); } finally { setBusy(false); }
  }
  return (
    <div className="screen">
      <Head title={L("Ürünler", "Products")} back={() => nav(-1)} right={<span className="muted small">{brand.name}</span>} />
      {brand.data_origin === "simulated" ? <p className="card" style={{ margin: 0 }}>{L("Ürünler demo markalarda kullanılmaz.", "Products aren't available for demo brands.")}</p> : (
        <>
          <Note>{L("Ürünlerinizin yapay zekâ cevaplarında geçip geçmediğine, önerilip önerilmediğine ve doğru anlatılıp anlatılmadığına bakarız.", "We check whether your products appear in AI answers, get recommended and are described correctly.")}</Note>
          {own.length === 0 ? <p className="muted" style={{ margin: 0 }}>{L("Henüz ürün eklenmedi.", "No products yet.")}</p> : (
            <div className="list">
              {own.map((p) => {
                const v = d.hasRuns ? productVisibility(d.answers, { id: p.id, name: p.name }, { name: brand.name, website: brand.website }, d.comps) : null;
                const ans = v ? v.engines.reduce((a, e) => a + e.answers, 0) : 0, rec = v ? v.engines.reduce((a, e) => a + e.recommended, 0) : 0, men = v ? v.engines.reduce((a, e) => a + e.mentioned, 0) : 0;
                const last = (d.checks.data ?? []).find((c) => c.product_id === p.id);
                const wrong = (last?.claims ?? []).filter((c) => c.status === "wrong").length;
                return (
                  <button key={p.id} className="row" onClick={() => nav(`/urunler/${p.id}`)} style={{ alignItems: "center" }}>
                    <span style={{ display: "flex", flexDirection: "column", gap: 4, textAlign: "left", minWidth: 0 }}>
                      <span style={{ fontWeight: 600 }}>{p.name}</span>
                      <span className="muted small">{!v ? L("Ölçüm bekleniyor", "Waiting for a measurement")
                        : men === 0 ? L("Cevaplarda adı geçmedi", "Not named in answers")
                        : L(`${ans} cevabın ${rec} tanesinde önerildi`, `Recommended in ${rec} of ${ans} answers`)}{last && last.judge !== null && (wrong > 0 ? L(` · ${wrong} yanlış bilgi`, ` · ${wrong} wrong claims`) : L(" · bilgiler doğru", " · facts correct"))}</span>
                    </span>
                    {Icon.chevron}
                  </button>
                );
              })}
            </div>
          )}
          {own.length < 10 && <button className="btn btn-ghost" onClick={() => { setErr(null); setAdding(true); }}>{Icon.plus}{L("Ürün ekle", "Add product")}</button>}
        </>
      )}
      <Sheet open={adding} onClose={() => setAdding(false)} title={L("Ürün ekle", "Add product")}>
        <form onSubmit={add} style={{ display: "flex", flexDirection: "column", gap: 12 }} noValidate>
          <label className="field">{L("Ürün adı", "Product name")}<input name="n" maxLength={120} placeholder={L("Örn. Karışık döner porsiyon", "e.g. Mixed kebab plate")} /></label>
          <label className="field">{L("Fiyat (isteğe bağlı)", "Price (optional)")}<input name="p" maxLength={60} placeholder={L("Örn. 350 TL", "e.g. $12")} /></label>
          <label className="field">{L("Doğru bilgiler", "Correct facts")}<textarea name="f" rows={4} maxLength={2000} placeholder={L("Örn. 200 gram et. Lavaş veya ekmek arası. Paket serviste de var.", "e.g. 200 g meat. Wrap or bread. Available for delivery.")} />
            <span className="hint">{L("Kısa ve kesin cümleler yazın. Yazmadığınız konular \"doğrulanamadı\" sayılır.", "Short, exact sentences. Anything you leave out counts as \"can't verify\".")}</span></label>
          <Err msg={err} />
          <button className="btn btn-primary" disabled={busy}>{L("Ekle", "Add")}</button>
        </form>
      </Sheet>
    </div>
  );
}

export function ProductDetail() {
  const nav = useNavigate();
  const sel = useSelectedBrand();
  if (sel.loading) return <Spinner />;
  if (!sel.brand) { nav("/ana", { replace: true }); return null; }
  return <ProductBody brand={sel.brand} />;
}

function ProductBody({ brand }: { brand: Brand }) {
  const nav = useNavigate();
  const { id } = useParams();
  const { current } = useApp();
  const paidLive = !!current?.paid_live_allowed;
  const d = useProductData(brand);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [addRival, setAddRival] = useState(false);
  const [queryEdit, setQueryEdit] = useState(false);
  const [rm, setRm] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);
  if (d.loading) return <Spinner />;
  const p = (d.products.data ?? []).find((x) => x.id === id && !x.rival_of);
  if (!p) return <div className="screen"><Head title={L("Ürün", "Product")} back={() => nav("/urunler")} /><p className="muted">{L("Ürün bulunamadı.", "Product not found.")}</p></div>;
  const rivals = (d.products.data ?? []).filter((r) => r.rival_of === p.id);
  const v = d.hasRuns ? productVisibility(d.answers, { id: p.id, name: p.name }, { name: brand.name, website: brand.website }, d.comps) : null;
  const rows = d.hasRuns && rivals.length ? compareProducts(d.answers, p, rivals, { name: brand.name }) : [];
  const engines = [...new Set(rows.flatMap((r) => Object.keys(r.byEngine)))].sort();
  const reasons = d.hasRuns && rivals.length ? rivalReasons(d.answers, p, rivals, { name: brand.name }).filter((x) => x.quotes.length > 0) : [];
  const sh = d.hasRuns ? shoppingSources(d.answers, p.id, p.name, { name: brand.name, website: brand.website }) : null;
  const last = (d.checks.data ?? []).find((c) => c.product_id === p.id);
  const pending = !!p.check_requested_at && (!last || last.created_at < p.check_requested_at);
  const order = { wrong: 0, unverifiable: 1, correct: 2 } as const;
  const claims = [...(last?.claims ?? [])].sort((a, b) => order[a.status] - order[b.status]);
  const STATUS = { wrong: L("Yanlış", "Wrong"), correct: L("Doğru", "Correct"), unverifiable: L("Doğrulanamadı", "Can't verify") } as const;
  const sc = (d.shop.data ?? []).filter((c) => c.product_id === p.id);
  const shopLast = sc[0];
  const winners = new Map<string, number>();
  for (const l of v?.losses ?? []) for (const w of l.winners) winners.set(w.name, (winners.get(w.name) ?? 0) + w.count);
  const topWinners = [...winners.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k]) => k);

  async function check() {
    setBusy(true); setErr(null); setMsg(null); haptic.tap();
    try { await api.requestProductCheck(p!.id); setMsg(L("Kontrol sıraya alındı. Sonuç en geç bir saat içinde burada görünür.", "Check queued. The result appears here within an hour.")); d.products.reload(); }
    catch (x) { setErr(friendlyError(x)); } finally { setBusy(false); }
  }
  async function saveRival(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("n") || "").trim();
    if (name.length < 2) { setErr(L("Rakip ürünün adını yazın.", "Enter the competitor product's name.")); return; }
    setBusy(true); setErr(null);
    try { await api.addRival({ workspace_id: brand.workspace_id, brand_id: brand.id, name: name.slice(0, 120), rival_of: p!.id, rival_brand: String(f.get("b") || "").trim().slice(0, 80) || null }); setAddRival(false); d.products.reload(); }
    catch (x) { setErr(friendlyError(x)); } finally { setBusy(false); }
  }
  async function saveQuery(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get("q") || "").trim();
    setBusy(true); setErr(null);
    try { await api.setShoppingQuery(p!.id, q.length >= 2 ? q.slice(0, 120) : null); setQueryEdit(false); d.products.reload(); }
    catch (x) { setErr(friendlyError(x)); } finally { setBusy(false); }
  }
  async function remove(x: Product) {
    setRm(null);
    try { await api.deleteProduct(x.id); if (x.id === p!.id) nav("/urunler", { replace: true }); else d.products.reload(); }
    catch (e) { setErr(friendlyError(e)); }
  }

  return (
    <div className="screen">
      <Head title={p.name} back={() => nav(-1)} />
      {p.price && <span className="muted">{p.price}</span>}
      {msg && <p className="ok" role="status">{msg}</p>}
      <Err msg={err} />

      <Section title={L("Yapay zekâ cevaplarında", "In AI answers")}>
        {!v ? <Note>{L("Görünürlük için önce bir ölçüm tamamlanmalı.", "Visibility needs a completed measurement first.")}</Note> : (
          <>
            {v.engines.map((e) => (
              <div key={e.provider} className="card" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ display: "flex", justifyContent: "space-between" }}><b>{providerLabel(e.provider)}</b><span className="num">{pct(e.answers ? e.recommended / e.answers : 0)}</span></span>
                <span className="muted small">{L(`${e.answers} cevabın ${e.mentioned} tanesinde geçti, ${e.recommended} tanesinde önerildi`, `Named in ${e.mentioned} of ${e.answers} answers, recommended in ${e.recommended}`)}{e.recommended > 0 && L(`; ${e.wins} tanesinde ilk sırada`, `; first in ${e.wins}`)}{e.answers < MIN_SAMPLE && L(" · örneklem küçük", " · small sample")}</span>
              </div>
            ))}
            {v.engines.every((e) => e.mentioned === 0) && <Note>{L("Ürün adı hiçbir cevapta geçmedi. Sorularınız işletme düzeyindeyse bu beklenir; bu ürünün kategorisine dair sorular ekleyin (örn. \"Antalya'da en iyi karışık döner nerede?\").", "The product wasn't named in any answer. That's expected if your questions are business-level; add questions about this product's category.")}</Note>}
            {topWinners.length > 0 && <Note>{L(`${v.losses.length} soruda ürününüz yerine önerilenler: ${topWinners.join(", ")}.`, `Recommended instead in ${v.losses.length} questions: ${topWinners.join(", ")}.`)}</Note>}
          </>
        )}
      </Section>

      <Section title={L("Rakip ürünler", "Competitor products")}>
        {rivals.length === 0 ? <Note>{L("Müşterinizin bu ürün yerine alabileceği 1–5 rakip ürün ekleyin.", "Add 1–5 products a customer might buy instead.")}</Note>
          : !d.hasRuns ? <Note>{L("Karşılaştırma için önce bir ölçüm tamamlanmalı.", "A completed measurement is needed to compare.")}</Note> : null}
        {rows.length > 0 && engines.map((en) => (
          <div key={en} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="small" style={{ fontWeight: 600 }}>{providerLabel(en)}</span>
            <div className="list">{rows.map((r) => { const e = r.byEngine[en]; return (
              <div key={r.id} className="row"><span style={{ fontWeight: r.isOwn ? 600 : 400 }}>{r.name}</span><span className="muted small">{e ? L(`${e.answers} cevapta ${e.recommended} öneri`, `${e.recommended} of ${e.answers}`) : "–"}</span></div>
            ); })}</div>
          </div>
        ))}
        {reasons.map((x) => (
          <article key={x.rivalId} className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <b>{L(`${rows.find((r) => r.id === x.rivalId)?.name} sizin yerinize önerildiğinde`, `When ${rows.find((r) => r.id === x.rivalId)?.name} was recommended instead`)}</b>
            {x.quotes.map((q) => <span key={q.answerId} className="small"><span className="muted">{providerLabel(q.provider)}: </span>“{q.text}”</span>)}
            <Note>{L("Bu özellikler sizin ürününüzde de varsa sitenizde açıkça yazın.", "If your product has these strengths too, state them clearly on your site.")}</Note>
          </article>
        ))}
        {rivals.length > 0 && rows.length > 0 && <span className="small" style={{ fontWeight: 600 }}>{L("Eklediğiniz rakip ürünler", "Competitor products you added")}</span>}
        {rivals.length > 0 && <div className="list">{rivals.map((r) => (
          <div key={r.id} className="row"><span>{r.rival_brand ? `${r.rival_brand} ` : ""}{r.name}</span><button className="btn btn-text" style={{ minHeight: 40, padding: "0 4px", color: "var(--muted)" }} onClick={() => setRm(r)}>{L("Sil", "Delete")}</button></div>
        ))}</div>}
        {rivals.length < 5 && <button className="btn btn-ghost" onClick={() => { setErr(null); setAddRival(true); }}>{Icon.plus}{L("Rakip ürün ekle", "Add competitor product")}</button>}
      </Section>

      <Section title={L("Bilgileri doğru mu?", "Are the facts right?")}>
        <Note>{L("Yapay zekâya ürününüzü sorarız, cevabını sizin yazdığınız bilgilerle karşılaştırırız. Karşılaştırmayı yapay zekâ yapar ve yanılabilir; \"Yanlış\" satırlarını cevaptan kontrol edin.", "We ask the AI about your product and compare its answer with your facts. The comparison is done by AI and can be wrong; verify \"Wrong\" rows against the answer.")}</Note>
        {last ? (
          <article className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <b>{last.recognized === false ? L("Yapay zekâ farklı bir ürünü anlatmış olabilir.", "The AI may have described a different product.")
              : last.judge === null ? L("Cevap alındı ama karşılaştırma yapılamadı.", "Got the answer, but couldn't compare.")
              : claims.some((c) => c.status === "wrong") ? L(`${claims.filter((c) => c.status === "wrong").length} bilgi sizinkiyle çelişiyor.`, `${claims.filter((c) => c.status === "wrong").length} claims contradict your facts.`)
              : L("Bilgilerinizle çelişen bir şey bulunmadı.", "Nothing contradicts your facts.")}</b>
            {claims.map((c, i) => (
              <span key={i} className="small"><span className={`badge ${c.status === "wrong" ? "b-no" : c.status === "correct" ? "b-rec" : "b-men"}`} style={{ marginRight: 6 }}>{STATUS[c.status]}</span>{c.claim}{c.fact && <span className="muted"> ({L("sizin bilginiz", "your fact")}: {c.fact})</span>}</span>
            ))}
            <button className="btn btn-text" style={{ alignSelf: "flex-start", padding: 0 }} onClick={() => setShowAnswer(true)}>{L("Cevabın tamamını gör", "See the full answer")}</button>
          </article>
        ) : <Note>{paidLive ? L("Henüz kontrol edilmedi.", "Not checked yet.") : L("Kontrol, canlı aramalı ücretli paketlerde çalışır.", "Checks run on paid plans with live search.")}</Note>}
        {paidLive && (pending ? <p className="ok" role="status">{L("Kontrol sırada.", "Check queued.")}</p> : <button className="btn btn-ghost" disabled={busy} onClick={check}>{L("Bilgileri kontrol et", "Check the facts")}</button>)}
        <Note>{L("Sizin yazdığınız bilgiler: ", "Your facts: ")}{p.facts}</Note>
      </Section>

      <Section title="Google Shopping">
        {!shopLast ? <Note>{paidLive ? L("Ücretli paketlerde ürününüz haftada bir Google Shopping'de aranır. İlk sonuç bir sonraki haftalık kontrolde gelir.", "On paid plans your product is searched on Google Shopping weekly. The first result comes with the next weekly check.") : L("Ücretli paketlerde ürününüz haftada bir Google Shopping'de aranır: sıranız, fiyatınız ve rakip ürünler.", "On paid plans your product is searched on Google Shopping weekly: your position, price and competitor products.")}</Note> : (
          <article className="card" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <b>{shopLast.own_position ? L(`${shopLast.items.length} ilan içinde ${shopLast.own_position}. sıradasınız`, `#${shopLast.own_position} of ${shopLast.items.length} listings`) : L(`İlk ${shopLast.items.length} ilan arasında yoksunuz`, `Not in the first ${shopLast.items.length} listings`)}</b>
            {shopLast.own_price && <span className="small">{shopLast.own_price}{shopLast.own_seller ? ` · ${shopLast.own_seller}` : ""}</span>}
            {shopLast.rivals.length > 0 && <span className="small muted">{L("Rakip ürünler: ", "Competitor products: ")}{shopLast.rivals.map((r) => { const x = rivals.find((y) => y.id === r.id); return `${x?.name ?? "?"} ${isEn() ? `#${r.position}` : `${r.position}.`}`; }).join(", ")}</span>}
            <span className="muted small">{L("Aranan: ", "Search: ")}{shopLast.query} · {new Date(shopLast.created_at).toLocaleDateString(isEn() ? "en-US" : "tr-TR", { day: "numeric", month: "short" })}</span>
          </article>
        )}
        {queryEdit ? (
          <form onSubmit={saveQuery} style={{ display: "flex", flexDirection: "column", gap: 10 }} noValidate>
            <label className="field">{L("Google Shopping'de aranacak ifade", "Search on Google Shopping")}<input name="q" maxLength={120} defaultValue={p.shopping_query ?? ""} placeholder={L("Örn. erkek koşu ayakkabısı", "e.g. men's running shoes")} />
              <span className="hint">{L("Müşterinin yazacağı arama. Boş bırakırsanız işletme ve ürün adı aranır.", "What a customer would type. Empty means business and product name.")}</span></label>
            <button className="btn btn-ghost" disabled={busy}>{L("Kaydet", "Save")}</button>
          </form>
        ) : <button className="btn btn-text" style={{ alignSelf: "flex-start", padding: 0 }} onClick={() => setQueryEdit(true)}>{L("Aranan: ", "Searching: ")}{p.shopping_query ?? L("işletme ve ürün adı", "business and product name")} · {L("değiştir", "change")}</button>}
      </Section>

      {sh && sh.productAnswers > 0 && (
        <Section title={L("Nereden satın alınır?", "Where to buy?")}>
          <Note>{L(`Bu ürünün geçtiği ${sh.productAnswers} cevapta kendi siteniz ${sh.ownSite} kez kaynak gösterildi.`, `In ${sh.productAnswers} answers naming this product, your own site was cited ${sh.ownSite} times.`)}</Note>
          {sh.marketplaces.length > 0 && <div className="list">{sh.marketplaces.slice(0, 6).map((m) => <div key={m.domain} className="row"><span>{m.domain}</span><span className="muted small">{L(`${m.answers} cevap`, `${m.answers} answers`)}</span></div>)}</div>}
        </Section>
      )}

      <button className="btn btn-text" style={{ color: "var(--danger)" }} onClick={() => setRm(p)}>{L("Bu ürünü sil", "Delete this product")}</button>

      <Sheet open={addRival} onClose={() => setAddRival(false)} title={L("Rakip ürün ekle", "Add competitor product")}>
        <form onSubmit={saveRival} style={{ display: "flex", flexDirection: "column", gap: 12 }} noValidate>
          <label className="field">{L("Rakip ürün adı", "Competitor product name")}<input name="n" maxLength={120} /></label>
          <label className="field">{L("Rakip marka (isteğe bağlı)", "Competitor brand (optional)")}<input name="b" maxLength={80} /></label>
          <Err msg={err} />
          <button className="btn btn-primary" disabled={busy}>{L("Ekle", "Add")}</button>
        </form>
      </Sheet>
      <Sheet open={showAnswer && !!last} onClose={() => setShowAnswer(false)} title={L("Yapay zekânın cevabı", "The AI's answer")}>
        {last && <>
          <Note>{last.question}</Note>
          <p style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{last.answer_text}</p>
          {last.cited_urls.length > 0 && <Note>{L("Kaynaklar: ", "Sources: ")}{last.cited_urls.map((u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } }).join(", ")}</Note>}
        </>}
      </Sheet>
      <Confirm open={!!rm} danger title={L(`${rm?.name ?? ""} silinsin mi?`, `Delete ${rm?.name ?? ""}?`)} action={L("Sil", "Delete")} onYes={() => rm && remove(rm)} onNo={() => setRm(null)} />
    </div>
  );
}
