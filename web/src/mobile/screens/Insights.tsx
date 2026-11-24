// Ayrıntı ekranları: Bilgi doğruluğu (TruthGuard, çelişkiler, algı, kaynaksız sayılar), Kaynaklar (kaynak etkisi, fırsatlar, yapay zekânın aramaları),
// Ziyaretçi ve botlar. Hesaplamalar sitedekiyle aynı motor fonksiyonlarından gelir; yeni veri üretilmez.
import { useState, type ReactNode } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useApp, useLoad } from "../../lib/app";
import { api, type Brand, type Run } from "../../lib/data";
import { pct, providerLabel, series, sourceOpportunities } from "../../lib/report";
import { L, isEn } from "../../lib/i18n";
import { MIN_SAMPLE } from "../../lib/report";
import { fanoutQueries, perceptionSummary, rivalTraits } from "../../../../engine/src/insights.ts";
import { sourceNetwork } from "../../../../engine/src/network.ts";
import { sourceMix, statSummary, truthSummary, type SourceType } from "../../../../engine/src/truth.ts";
import { botSummary, snippet, trafficSummary, workerCode, SOURCE_PROVIDER, type AiSource, type BotKind } from "../../../../engine/src/traffic.ts";
import { Head, Icon, Spinner, goBack, haptic, isPaid } from "../ui";
import { useSelectedBrand } from "./Home";


/** Ekran iskeleti: geri düğmesi, başlık, seçili marka. */
function Frame({ title, children }: { title: string; children: (b: Brand) => ReactNode }) {
  const nav = useNavigate();
  const sel = useSelectedBrand();
  if (sel.loading) return <Spinner />;
  if (!sel.brand) return <Navigate to="/kurulum" replace />;
  return (
    <div className="screen">
      <Head title={title} back={() => goBack(nav)} right={<span className="muted small">{sel.brand.name}</span>} />
      {children(sel.brand)}
    </div>
  );
}

const Note = ({ children }: { children: ReactNode }) => <p className="muted small" style={{ margin: 0 }}>{children}</p>;
const Section = ({ title, children }: { title: string; children: ReactNode }) => <section style={{ display: "flex", flexDirection: "column", gap: 10 }}><h2 className="label">{title}</h2>{children}</section>;
function PaidOnly({ text }: { text: string }) {
  const nav = useNavigate();
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span>{text} {L("Ücretli paketlerde açık.", "Available on paid plans.")}</span>
      <button className="btn btn-text" style={{ alignSelf: "flex-start", padding: 0 }} onClick={() => nav("/paket")}>{L("Paketleri gör", "See plans")} {Icon.chevron}</button>
    </div>
  );
}
function Quote({ text }: { text: string }) {
  return <blockquote style={{ margin: 0, padding: "8px 12px", borderLeft: "3px solid var(--line2)", color: "var(--soft)", fontSize: 14, lineHeight: 1.45 }}>“{text}”</blockquote>;
}

/** Son tamamlanmış canlı aramalı ölçümün cevapları, marka sonuçları ve rakipler. */
function useLastLive(brand: Brand) {
  const runs = useLoad(() => api.runs(brand.id), [brand.id]);
  const last = (runs.data ?? []).find((r: Run) => r.status === "done" && r.measurement_type === "live_search") ?? null;
  const answers = useLoad(() => (last ? api.answers(last.id) : Promise.resolve([])), [last?.id]);
  const ments = useLoad(() => (answers.data && answers.data.length ? api.mentionsFor(answers.data.map((a) => a.id)) : Promise.resolve([])), [answers.data]);
  const comps = useLoad(() => api.competitors(brand.id), [brand.id]);
  const brands = [{ id: brand.id, name: brand.name, website: brand.website, isTarget: true },
    ...(comps.data ?? []).map((c) => ({ id: c.id, name: c.name, website: c.website, isTarget: false }))];
  const loading = runs.loading || answers.loading || ments.loading || comps.loading;
  return { last, answers: answers.data ?? [], ments: ments.data ?? [], brands, loading };
}

const TRAIT: Record<string, [string, string]> = {
  premium: ["Premium", "Premium"], affordable: ["Uygun fiyatlı", "Affordable"], expensive: ["Pahalı", "Expensive"], value_for_money: ["Fiyatına değer", "Value for money"],
  high_quality: ["Kaliteli", "High quality"], low_quality: ["Düşük kalite", "Low quality"], reliable: ["Güvenilir", "Reliable"], unreliable: ["Güvenilmez", "Unreliable"],
  innovative: ["Yenilikçi", "Innovative"], popular: ["Popüler", "Popular"], good_service: ["İyi hizmet", "Good service"], poor_service: ["Kötü hizmet", "Poor service"],
  wide_range: ["Geniş seçenek", "Wide range"], limited_range: ["Sınırlı seçenek", "Limited range"], fast: ["Hızlı", "Fast"], slow: ["Yavaş", "Slow"],
  eco_friendly: ["Çevreci", "Eco-friendly"], local: ["Yerel", "Local"], outdated: ["Eski / geride", "Outdated"],
};
const NEG = new Set(["expensive", "low_quality", "unreliable", "poor_service", "limited_range", "slow", "outdated"]);
const tl = (t: string) => (TRAIT[t] ? (isEn() ? TRAIT[t][1] : TRAIT[t][0]) : t);

// ── Bilgi doğruluğu ──────────────────────────────────────────────────────────
export function Accuracy() {
  return <Frame title={L("Bilgi doğruluğu", "Accuracy")}>{(b) => <AccuracyBody brand={b} />}</Frame>;
}
function AccuracyBody({ brand }: { brand: Brand }) {
  const nav = useNavigate();
  const { current } = useApp();
  const paid = isPaid(current);
  const checks = useLoad(() => (paid && brand.fact_card ? api.truthChecks(brand.id) : Promise.resolve([])), [brand.id, paid, brand.fact_card ?? ""]);
  const confl = useLoad(() => (paid ? api.engineConflicts(brand.id) : Promise.resolve([])), [brand.id, paid]);
  const live = useLastLive(brand);
  const [open, setOpen] = useState<string | null>(null);
  if (checks.loading || confl.loading || live.loading) return <Spinner />;
  const s = truthSummary(checks.data ?? []);
  const total = s.correct + s.wrong + s.unverifiable;
  const okConfl = (confl.data ?? []).filter((c) => !c.failed);
  const conflicts = okConfl.flatMap((c) => c.conflicts).slice(0, 6);
  const per = live.answers.length ? perceptionSummary(live.answers, live.ments, brand.id) : null;
  const stats = live.answers.length ? statSummary(live.answers, [brand.name, ...brand.aliases]) : null;

  return (
    <>
      <Note>{L("Yapay zekâların işletmeniz hakkında söyledikleri sizin yazdığınız doğru bilgilerle karşılaştırılır.", "What the AIs say about your business is checked against the facts you wrote.")}</Note>
      <Section title={L("Doğru mu söylüyorlar?", "Are they right?")}>
        {!paid ? <PaidOnly text={L("Fiyat, adres, çalışma saati gibi iddiaların sizin bilgilerinizle karşılaştırılması.", "Checking claims like prices, address and opening hours against your facts.")} />
          : !brand.fact_card ? (
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ margin: 0 }}>{L("Önce doğru bilgilerinizi yazın: adres, çalışma saatleri, fiyatlar, hizmetler. Yapay zekâların söyledikleri bunlarla karşılaştırılır.", "First write your correct facts: address, hours, prices, services. What the AIs say is compared with them.")}</p>
              <button className="btn btn-primary" onClick={() => nav("/marka-duzenle")}>{L("Doğru bilgileri yaz", "Write your facts")}</button>
            </div>
          ) : s.checks === 0 ? <Note>{s.failed > 0
              ? L(`${s.failed} kontrol teknik bir hata yüzünden yapılamadı; sonraki ölçümde yeniden denenir.`, `${s.failed} check(s) failed with a technical error; they're retried with a later measurement.`)
              : L("Henüz kontrol yok. İşletmenizin geçtiği yeni cevaplar bilgilerinizle karşılaştırılır; sonuç burada görünür.", "No checks yet. New answers mentioning your business are compared with your facts; results appear here.")}</Note>
          : (
            <>
              <Note>{L(`Son 30 gün: ${s.checks} cevap karşılaştırıldı, işletmeniz hakkında ${total} iddia bulundu.`, `Last 30 days: ${s.checks} answers checked, ${total} claims about your business.`)}</Note>
              {total > 0 && (
                <div className="stats3">
                  <div><b className={s.wrong ? "bad" : ""}>{s.wrong}</b><span>{L("Yanlış", "Wrong")}</span></div>
                  <div><b>{s.correct}</b><span>{L("Doğru", "Correct")}</span></div>
                  <div><b>{s.unverifiable}</b><span>{L("Bilgilerinizde yok", "Not in your facts")}</span></div>
                </div>
              )}
              {s.wrongClaims.slice(0, 10).map((w) => (
                <article key={w.claim + w.at} className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><b>{w.claim}</b><span className="muted small">{providerLabel(w.provider)}</span></div>
                  <span className="small">{L("Doğrusu: ", "Correct: ")}{w.fact || "–"}</span>
                  <Quote text={w.quote} />
                </article>
              ))}
              {s.unverifiable > 0 && <Note>{L("\"Bilgilerinizde yok\" sayısını azaltmak için o konuları doğru bilgilerinize ekleyin.", "Add those topics to your facts to reduce \"not in your facts\".")}</Note>}
              <Note>{L("Karşılaştırmayı küçük bir yapay zekâ modeli yapar ve yanılabilir; her iddia cevaptan birebir alıntıyla gösterilir.", "A small AI model does the comparison and can make mistakes; every claim comes with an exact quote.")}</Note>
            </>
          )}
      </Section>

      {paid && okConfl.length > 0 && (
        <Section title={L("Yapay zekâlar arasında çelişki", "Contradictions between AIs")}>
          {conflicts.length === 0 ? <Note>{L(`Son 30 gün: ${okConfl.length} soruda cevaplar karşılaştırıldı, çelişki yok.`, `Last 30 days: ${okConfl.length} questions compared, no contradictions.`)}</Note> : (
            <>
              <Note>{L("Farklı yapay zekâlar işletmeniz hakkında farklı şeyler söylüyor. En az biri yanlış; doğrusunu sitenizde açıkça yazın.", "Different AIs say different things about your business. At least one is wrong; state the correct version clearly on your website.")}</Note>
              {conflicts.map((c, ix) => (
                <article key={ix} className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <b>{c.topic}</b>
                  {c.sides.map((x) => <span key={x.provider} className="small"><span className="muted">{providerLabel(x.provider)}: </span>“{x.quote}”</span>)}
                </article>
              ))}
            </>
          )}
        </Section>
      )}

      <Section title={L("Sizi nasıl anlatıyorlar?", "How do they describe you?")}>
        {!per || per.answers === 0 ? <Note>{L("Algı, ücretli paketlerde canlı aramalı ölçümlerde çıkarılır.", "Perception comes from live-search measurements on paid plans.")}</Note> : (
          <>
            <div className="senti" role="img" aria-label={L("Duygu dağılımı", "Sentiment split")}>
              <i className="pos" style={{ flex: per.sentiment.positive }} /><i className="mix" style={{ flex: per.sentiment.mixed }} /><i className="neu" style={{ flex: per.sentiment.neutral }} /><i className="neg" style={{ flex: per.sentiment.negative }} />
            </div>
            <span className="small">{L(`Olumlu ${per.sentiment.positive} · Karışık ${per.sentiment.mixed} · Nötr ${per.sentiment.neutral} · Olumsuz ${per.sentiment.negative}`, `Positive ${per.sentiment.positive} · Mixed ${per.sentiment.mixed} · Neutral ${per.sentiment.neutral} · Negative ${per.sentiment.negative}`)}</span>
            <Note>{L(`${per.answers} cevap incelendi.`, `${per.answers} answers analysed.`)}{per.answers < MIN_SAMPLE && L(" Az cevap var; sonuç değişebilir.", " Few answers; this may change.")}</Note>
            {per.traits.length > 0 && (
              <div className="list">
                {per.traits.map((t) => (
                  <button key={t.trait} className="row" style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }} aria-expanded={open === t.trait} onClick={() => setOpen(open === t.trait ? null : t.trait)}>
                    <span style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: NEG.has(t.trait) ? "var(--warn)" : "var(--text)", fontWeight: 600 }}>{tl(t.trait)}</span><span className="num">{pct(t.share)}</span></span>
                    <span className="muted small" style={{ textAlign: "left" }}>{L(`${per.answers} cevabın ${t.count} tanesinde`, `${t.count} of ${per.answers} answers`)} · {open === t.trait ? L("alıntıyı gizle", "hide quote") : L("alıntıyı gör", "see quote")}</span>
                    {open === t.trait && t.quotes.map((q) => <Quote key={q} text={q} />)}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </Section>

      {stats && stats.unsourced + stats.oldDates > 0 && (
        <Section title={L("Kaynaksız sayılar ve eski bilgi", "Unsourced numbers and old info")}>
          <Note>{L(`${stats.answersWithFlags} cevapta ${stats.unsourced} kaynaksız sayı ve ${stats.oldDates} eski tarih. Arkasında kaynak olmayan bir sayı doğrulanmamış olabilir.`, `${stats.unsourced} unsourced numbers and ${stats.oldDates} old dates in ${stats.answersWithFlags} answers. A number with no source may be unverified.`)}</Note>
          {stats.examples.map((e) => (
            <article key={e.kind + e.sentence} className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span className="small"><b>{e.kind === "unsourced_stat" ? L("Kaynaksız sayı", "Unsourced number") : L("Eski tarih", "Old date")}: {e.value}</b> <span className="muted">· {providerLabel(e.provider)}</span></span>
              <Quote text={e.sentence} />
            </article>
          ))}
        </Section>
      )}
    </>
  );
}

// ── Kaynaklar ────────────────────────────────────────────────────────────────
const SRC: Record<SourceType, [string, string]> = {
  own: ["Sizin siteniz", "Your site"], competitor: ["Rakip sitesi", "Competitor site"], official: ["Resmî / kamu / eğitim", "Official / education"],
  encyclopedia: ["Ansiklopedi", "Encyclopedia"], news: ["Haber", "News"], review: ["İnceleme / karşılaştırma", "Reviews"],
  forum: ["Forum / sözlük", "Forum"], social: ["Sosyal medya / video", "Social / video"], marketplace: ["Pazar yeri", "Marketplace"], other: ["Diğer siteler", "Other sites"],
};
const host = (w: string | null) => (w ? w.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].toLowerCase() : "");

export function Sources() {
  return <Frame title={L("Kaynaklar", "Sources")}>{(b) => <SourcesBody brand={b} />}</Frame>;
}
function SourcesBody({ brand }: { brand: Brand }) {
  const live = useLastLive(brand);
  if (live.loading) return <Spinner />;
  if (!live.last || live.answers.length === 0) return <p className="card" style={{ margin: 0 }}>{L("Kaynaklar, yapay zekâların internette arama yaparak cevap verdiği ölçümlerden çıkar (ChatGPT, Claude, Perplexity). Ücretsiz pakette Gemini aramasız ölçtüğü için bu bölüm boş kalır.", "Sources come from measurements where the AIs search the web (ChatGPT, Claude, Perplexity). The free plan measures Gemini without search, so this section stays empty.")}</p>;
  const net = sourceNetwork(live.answers, live.ments, live.brands, 10);
  const opps = sourceOpportunities(live.answers, live.ments, brand.id, live.brands.map((b) => host(b.website)).filter(Boolean)).filter((o) => !o.own).slice(0, 8);
  const mix = sourceMix(live.answers, live.ments, live.brands);
  const fan = fanoutQueries(live.answers, 10);
  const role = (r: string) => r === "rival" ? L("Yalnız rakipler önerildi", "Only rivals recommended") : r === "yours" ? L("Siz önerildiniz", "You were recommended") : r === "shared" ? L("Ortak kaynak", "Shared source") : "";
  return (
    <>
      <Note>{L("Yapay zekâlar cevap verirken bu sitelere baktı. Bu sitelerde doğru ve güncel bilginizin olması, önerilme şansınızı artırır.", "The AIs looked at these sites while answering. Having accurate, current information there raises your chance of being recommended.")}</Note>
      {opps.length > 0 && (
        <Section title={L("Yer almanız gereken siteler", "Sites to be on")}>
          <Note>{L("Bu siteleri kaynak gösteren cevaplarda rakipleriniz önerildi, siz önerilmediniz. Birlikte görülmek neden olduğunu kanıtlamaz; sonucu sonraki ölçümlerde kontrol edin.", "Answers citing these sites recommended rivals, not you. Appearing together isn't proof of cause; check later measurements.")}</Note>
          <div className="list">{opps.map((o) => <div key={o.domain} className="row"><span>{o.domain}</span><span className="muted small">{L(`${o.count} cevap`, `${o.count} answers`)}</span></div>)}</div>
        </Section>
      )}
      {net.length > 0 && (
        <Section title={L("En çok bakılan siteler", "Most-cited sites")}>
          <div className="list">{net.map((n) => (
            <div key={n.domain} className="row" style={{ flexDirection: "column", alignItems: "stretch", gap: 4 }}>
              <span style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><b style={{ overflowWrap: "anywhere" }}>{n.domain}</b>{role(n.role) && <span className={`badge ${n.role === "yours" ? "b-rec" : n.role === "rival" ? "b-no" : "b-men"}`}>{role(n.role)}</span>}</span>
              <span className="muted small">{L(`${n.answers} cevap`, `${n.answers} answers`)} · {n.engines.map(providerLabel).join(", ")}{n.brands.length ? ` · ${n.brands.slice(0, 3).map((x) => `${x.name} ${x.count}`).join(", ")}` : ""}</span>
            </div>))}</div>
        </Section>
      )}
      {mix.total > 0 && (
        <Section title={L("Kaynakların türü", "Kinds of sources")}>
          {mix.types.map((t) => (
            <div key={t.type} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span className="small" style={{ display: "flex", justifyContent: "space-between" }}><span>{isEn() ? SRC[t.type][1] : SRC[t.type][0]}</span><span className="num">{pct(t.share)}</span></span>
              <div className="meter"><i style={{ width: `${Math.round(100 * t.share)}%` }} /></div>
            </div>
          ))}
        </Section>
      )}
      {fan.rows.length > 0 && (
        <Section title={L("Yapay zekâların yaptığı aramalar", "What the AIs searched for")}>
          <Note>{L(`Cevap vermeden önce internette bu ifadelerle arama yapıldı (${fan.answers} cevabın ${fan.searched} tanesinde). Bu aramalarda çıkan sayfalar yapay zekânın okuduğu sayfalardır.`, `Before answering, the AI searched with these phrases (${fan.searched} of ${fan.answers} answers). Pages ranking for them are what the AI reads.`)}</Note>
          <div className="list">{fan.rows.map((r) => <div key={r.query} className="row"><span>{r.query}</span><span className="muted small num">{r.count}</span></div>)}</div>
        </Section>
      )}
      <Note>{L("Son canlı aramalı ölçüm: ", "Latest live-search measurement: ")}{new Date(live.last.created_at).toLocaleDateString(isEn() ? "en-US" : "tr-TR", { day: "numeric", month: "long" })}</Note>
    </>
  );
}

// ── Rakibi öne çıkaran özellikler (Rakipler sekmesinde kullanılır) ───────────
export function RivalTraits({ brand }: { brand: Brand }) {
  const live = useLastLive(brand);
  if (live.loading || !live.answers.length) return null;
  const rows = rivalTraits(live.answers, live.ments, brand.id, live.brands.filter((b) => !b.isTarget).map((b) => b.id));
  if (!rows.length) return null;
  return (
    <Section title={L("Rakiplerin öne çıkan özellikleri", "What rivals are praised for")}>
      <Note>{L("Siz önerilmeyip rakip önerildiğinde yapay zekânın rakibe yakıştırdığı özellikler. Size de yakıştırılıyorsa sayısı yanında.", "Traits the AI gave a rival when it was recommended instead of you, with how often you got the same trait.")}</Note>
      {rows.slice(0, 4).map((r) => (
        <article key={r.rivalId} className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><b>{live.brands.find((x) => x.id === r.rivalId)?.name ?? "?"}</b><span className="muted small">{L(`${r.answers} cevap`, `${r.answers} answers`)}</span></span>
          {r.traits.map((t) => (
            <div key={t.trait} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span className="small" style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><span style={{ fontWeight: 600 }}>{tl(t.trait)}</span><span className="muted">{L(`rakipte ${t.count} · sizde ${t.ownCount}`, `rival ${t.count} · you ${t.ownCount}`)}</span></span>
              {t.quote && <Quote text={t.quote} />}
            </div>
          ))}
        </article>
      ))}
      {rows.reduce((a, r) => a + r.answers, 0) < 10 && <Note>{L("Az cevap var; sonuç değişebilir.", "Few answers; this may change.")}</Note>}
    </Section>
  );
}

// ── Ziyaretçi ve botlar ──────────────────────────────────────────────────────
const AI_SOURCE: Record<AiSource, string> = { chatgpt: "ChatGPT", perplexity: "Perplexity", gemini: "Gemini", claude: "Claude", copilot: "Copilot", deepseek: "DeepSeek", grok: "Grok", meta: "Meta AI", other_ai: L("Diğer", "Other") };
const BOT_KIND: Record<BotKind, [string, string]> = { search: ["Arama botları", "Search bots"], user: ["Kullanıcı isteğiyle gelenler", "On a user's request"], training: ["Eğitim botları", "Training bots"] };

export function Traffic() {
  return <Frame title={L("Ziyaretçi ve botlar", "Visitors and bots")}>{(b) => <TrafficBody brand={b} />}</Frame>;
}
function TrafficBody({ brand }: { brand: Brand }) {
  const { current } = useApp();
  const paid = isPaid(current);
  const visits = useLoad(() => api.aiVisits(brand.id), [brand.id]);
  const bots = useLoad(() => api.aiBots(brand.id), [brand.id]);
  const vis = useLoad(() => api.visibility(brand.id, "live_search"), [brand.id]);
  const [copied, setCopied] = useState<string | null>(null);
  if (visits.loading || bots.loading || vis.loading) return <Spinner />;
  const today = new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10);
  const t = trafficSummary(visits.data ?? [], today);
  const bs = botSummary(bots.data ?? [], today);
  const hasV = (visits.data ?? []).length > 0, hasB = bs.total > 0;
  const recNow = (prov: string) => { const ps = series((vis.data ?? []).filter((r) => r.provider === prov)); const p = ps[ps.length - 1]; return p && p.recommend.n ? p.recommend.k / p.recommend.n : null; };
  const maxW = Math.max(1, ...t.weekly.map((w) => w.visits));
  async function share(k: string, text: string) {
    haptic.tap();
    const subject = L("Sitemize eklenecek kod (AI SaaSavran)", "Code for our website (AI SaaSavran)");
    if (navigator.share) { await navigator.share({ title: subject, text }).catch(() => undefined); return; }
    try { await navigator.clipboard.writeText(text); setCopied(k); } catch { /* yok say */ }
  }
  const code = brand.track_key ? snippet(brand.track_key) : null;
  return (
    <>
      <Section title={L("Yapay zekâdan gelen ziyaretçi", "Visitors from AI")}>
        {hasV ? (
          <>
            <div className="card" style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span className="num" style={{ fontSize: 36, fontFamily: "var(--num)", fontWeight: 700 }}>{t.last30}</span>
              <span className="muted small">{L("ziyaret, son 30 gün", "visits, last 30 days")}{t.prev30 ? L(` (önceki 30 gün: ${t.prev30})`, ` (previous 30 days: ${t.prev30})`) : ""}</span>
            </div>
            {!paid ? <PaidOnly text={L("Hangi yapay zekâdan, hangi sayfalara geldikleri.", "Which AI they came from and which pages they landed on.")} /> : (
              <>
                <div className="list">{t.bySource.map((b) => {
                  const pv = SOURCE_PROVIDER[b.source], r = pv ? recNow(pv) : null;
                  return <div key={b.source} className="row"><span>{AI_SOURCE[b.source]}{r !== null && <span className="muted small"> · {L("önerilme", "recommended")} {pct(r)}</span>}</span><span className="num">{b.visits}</span></div>;
                })}</div>
                <div className="spark" role="img" aria-label={L("Son 8 hafta ziyaret", "Visits, last 8 weeks")}>{t.weekly.map((w) => <i key={w.start} style={{ height: `${Math.max(4, (100 * w.visits) / maxW)}%` }} />)}</div>
                <Note>{L("Son 8 hafta. Önerilme oranınız yükselirken ziyaretçi de artıyorsa görünürlüğünüz gerçek müşteriye dönüşüyor demektir.", "Last 8 weeks. If visits grow as your recommendation rate rises, visibility is turning into real customers.")}</Note>
                {t.topPages.length > 0 && <div className="list">{t.topPages.map((p) => <div key={p.path} className="row"><span style={{ overflowWrap: "anywhere" }}>{p.path}</span><span className="num">{p.visits}</span></div>)}</div>}
              </>
            )}
          </>
        ) : <Note>{L("ChatGPT, Gemini, Claude veya Perplexity'den sitenize kaç kişinin geldiğini görmek için sitenize tek satırlık bir kod eklenir. Kodu sitenizi yapan kişiye gönderebilirsiniz.", "To see how many people come to your site from ChatGPT, Gemini, Claude or Perplexity, a one-line code is added to your site. You can send it to whoever runs your website.")}</Note>}
        {code && <button className="btn btn-ghost" onClick={() => share("v", `${L("Bu kodu sitenin her sayfasında </head> etiketinden hemen önce yapıştırın. Çerez kullanmaz, kişisel veri toplamaz.", "Paste this on every page just before </head>. No cookies, no personal data.")}\n\n${code}`)}>{copied === "v" ? L("Kopyalandı", "Copied") : L("Kodu gönder", "Send the code")}</button>}
        {!brand.website && <Note>{L("Sayım için işletme bilgilerinde web sitenizin yazılı olması gerekir.", "Your website must be set in business details for counting.")}</Note>}
      </Section>

      <Section title={L("Yapay zekâ botları", "AI crawlers")}>
        {hasB ? (
          <>
            <Note>{L(`Son 30 gün: yapay zekâ botları sitenizi ${bs.total} kez okudu.`, `Last 30 days: AI bots read your site ${bs.total} times.`)}</Note>
            {!paid ? <PaidOnly text={L("Hangi botun hangi sayfaları okuduğu ve hiç gelmeyen önemli botlar.", "Which bot read which pages and important bots that never came.")} /> : (
              <>
                {bs.missingSearch.length > 0 && <p className="card" style={{ margin: 0, color: "var(--warn)" }}>{L(`30 gündür hiç gelmedi: ${bs.missingSearch.join(", ")}. Bu botlar sitenizi okuyamazsa o yapay zekâ sizi kaynak gösteremez.`, `Not seen in 30 days: ${bs.missingSearch.join(", ")}. If these bots can't read your site, that AI can't cite it.`)}</p>}
                {bs.errors > 0 && <p className="card" style={{ margin: 0, color: "var(--warn)" }}>{L(`${bs.errors} bot isteği hata aldı. Engellenen bot sayfayı okuyamaz.`, `${bs.errors} bot requests got an error. A blocked bot can't read the page.`)}</p>}
                {(["search", "user", "training"] as BotKind[]).map((k) => {
                  const list = bs.bots.filter((x) => x.kind === k);
                  if (!list.length) return null;
                  return <div key={k} style={{ display: "flex", flexDirection: "column", gap: 6 }}><span className="small" style={{ fontWeight: 600 }}>{isEn() ? BOT_KIND[k][1] : BOT_KIND[k][0]}</span>
                    <div className="list">{list.map((x) => <div key={x.bot} className="row"><span>{x.bot} <span className="muted small">· {x.owner}</span></span><span className="num">{x.hits}</span></div>)}</div></div>;
                })}
              </>
            )}
          </>
        ) : <Note>{L("Yapay zekâ botlarının sitenizde hangi sayfaları okuduğunu görmek için sitenize küçük bir eklenti kurulur (WordPress eklentisi veya Cloudflare kodu). Kurulum bilgisini sitenizi yapan kişiye gönderebilirsiniz.", "To see which pages AI bots read on your site, a small add-on is installed (WordPress plugin or Cloudflare code). You can send the setup info to whoever runs your website.")}</Note>}
        {brand.track_key && <button className="btn btn-ghost" onClick={() => share("b", `${L("Site anahtarı", "Site key")}: ${brand.track_key}\n\nWordPress: https://aisaasavran.com/downloads/ai-saasavran-bot-sayaci.zip\n\nCloudflare Worker:\n${workerCode(brand.track_key!)}`)}>{copied === "b" ? L("Kopyalandı", "Copied") : L("Kurulum bilgisini gönder", "Send setup info")}</button>}
      </Section>
    </>
  );
}
