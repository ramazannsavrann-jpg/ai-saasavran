import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useApp, useLoad } from "../lib/app";
import { api, type Brand, type MeasurementType } from "../lib/data";
import { friendlyError } from "../lib/supabase";
import { PAUSE_TEXT } from "../lib/messages";
import { formatDateTime, MIN_SAMPLE, numLoc, rangeText, series, pct, usd } from "../lib/report";
import { SECTORS } from "../lib/sectors";
import { L, isEn } from "../lib/i18n";
import { Button, DataNotice, Empty, ErrorBox, Field, Loading, Meter, Select, TypeBadge } from "../components/ui";


export function Dashboard() {
  const { current, workspaces } = useApp();
  if (!current) return workspaces.length === 0 ? <Navigate to="/calisma-alani/yeni" replace /> : <Loading />;
  return <WorkspaceView key={current.id} />;
}

function WorkspaceView() {
  const { current } = useApp();
  const ws = current!;
  const type: MeasurementType = ws.kind === "demo_lab" ? "simulated" : "model_knowledge";
  const usage = useLoad(() => api.usage(ws.id), [ws.id]);
  const brands = useLoad(() => api.brands(ws.id), [ws.id]);
  const own = (brands.data ?? []).filter((b) => !b.is_competitor);
  const u = usage.data;

  return (
    <div className="stack">
      <header className="page-head">
        <h1>{ws.name}</h1>
        <p className="muted">{ws.kind === "agency" ? L("Ajans hesabı", "Agency account") : ws.kind === "demo_lab" ? "Demo Lab" : ws.kind === "growth_lab" ? L("Growth Lab: AI SaaSavran'ın kendi görünürlüğü", "Growth Lab: AI SaaSavran's own visibility") : L("İşletme hesabı", "Business account")}{u && <>, {L(`${u.plan_name} paketi`, `${u.plan_name} plan`)}</>}</p>
      </header>

      {ws.status === "paused" && (
        <p className="error-box" role="alert">{PAUSE_TEXT[ws.paused_reason ?? ""] ?? L("Bu çalışma alanı durduruldu.", "This workspace is paused.")}</p>
      )}

      {ws.paid_live_allowed ? (
        <aside className="notice notice-live" role="note">
          <strong>{L("Bu alanda iki tür ölçüm var", "This workspace has two kinds of measurement")}</strong>
          {isEn()
            ? <p><b>No search (Gemini, free):</b> what the AI knows without looking at the web. <b>Live search (ChatGPT, paid trial):</b> the answer it gives after searching the web; closest to what customers actually see.</p>
            : <p><b>Aramasız (Gemini, ücretsiz):</b> yapay zekânın internete bakmadan bildiği. <b>Canlı aramalı (ChatGPT, ücretli deneme):</b> internete bakarak verdiği cevap; müşterinin gerçekte gördüğüne en yakın olan budur.</p>}
        </aside>
      ) : <DataNotice type={type} />}

      <section className="panel">
        <div className="panel-head">
          <h2>{L("Markalar", "Brands")}</h2>
          {u && own.length < u.brand_limit && <Link className="btn btn-primary btn-small" to="/marka/yeni">{L("Marka ekle", "Add brand")}</Link>}
        </div>
        {brands.loading ? <Loading /> : brands.error ? <ErrorBox message={brands.error} /> : own.length === 0 ? (
          <Empty title={L("Henüz marka eklemediniz", "No brands yet")}>
            <p>{L("İzlemek istediğiniz markayı ekleyin; ardından rakiplerini ve müşterilerinizin soracağı soruları tanımlayın.", "Add the brand you want to track, then its competitors and the questions your customers would ask.")}</p>
            <Link className="btn btn-primary" to="/marka/yeni">{L("İlk markayı ekle", "Add your first brand")}</Link>
          </Empty>
        ) : (
          <ul className="brand-list">{own.map((b) => <BrandRow key={b.id} brand={b} type={type} live={ws.paid_live_allowed} />)}</ul>
        )}
      </section>

      {countryGroups(own).map((g) => <CountryCompare key={g.name} name={g.name} brands={g.brands} type={type} live={ws.paid_live_allowed} />)}

      {u && (
        <section className="panel">
          <h2>{L("Bu ayki kullanım", "This month's usage")}</h2>
          <Meter label={L("Yapay zekâ sorgusu", "AI queries")} used={u.engine_calls} limit={u.engine_call_limit} />
          {u.engine_call_limit > 0 && u.engine_calls >= u.engine_call_limit * 0.8 && (
            <p className="caution">{u.engine_calls >= u.engine_call_limit
              ? L("Bu ayki sorgu kotanız doldu. Ölçümler ay başında kendiliğinden yeniden başlar; beklemek istemezseniz paketinizi yükseltebilirsiniz. ", "You've used this month's query quota. Measurements resume automatically next month; upgrade if you'd rather not wait. ")
              : (isEn() ? `You've used ${Math.round((100 * u.engine_calls) / u.engine_call_limit)}% of this month's query quota. ` : `Bu ayki sorgu kotanızın %${Math.round((100 * u.engine_calls) / u.engine_call_limit)} kadarını kullandınız. `)}
              <Link to="/hesap#paket">{L("Paketleri gör", "See plans")}</Link>
            </p>
          )}
          <Meter label={L("Marka", "Brands")} used={u.brands_used} limit={u.brand_limit} warn={false} />
          <dl className="facts">
            <div><dt>{L("Ücretsiz katman sorgusu", "Free-tier queries")}</dt><dd className="num">{u.free_calls}</dd></div>
            <div><dt>{L("Ücretli API harcaması", "Paid API spend")}</dt><dd className="num">{usd(Number(u.paid_cost_usd))}<span className="muted dd-note">{ws.paid_live_allowed ? L("Deneme bütçesinden (toplam üst sınır 6 $)", "From the trial budget (total cap $6)") : L("Ücretli kullanım kapalı", "Paid usage off")}</span></dd></div>
            <div><dt>{L("Canlı web araması", "Live web search")}</dt><dd>{u.live_search_enabled ? L("Açık", "On") : ws.paid_live_allowed ? L("Yalnız elle, deneme", "Manual only, trial") : L("Kapalı", "Off")}</dd></div>
          </dl>
        </section>
      )}
    </div>
  );
}

/** Aynı adla birden çok ülkede takip edilen markalar (ör. "Marka A" TR ve DE). */
function countryGroups(own: Brand[]): { name: string; brands: Brand[] }[] {
  const by = new Map<string, Brand[]>();
  for (const b of own) { const k = b.name.trim().toLocaleLowerCase("tr-TR"); by.set(k, [...(by.get(k) ?? []), b]); }
  return [...by.values()].filter((bs) => new Set(bs.map((b) => (b.country || "TR").toUpperCase())).size > 1).map((bs) => ({ name: bs[0].name, brands: bs }));
}

/** Ülke karşılaştırması: aynı markanın her ülkedeki son ölçümü yan yana (canlı aramalı varsa o, yoksa aramasız). */
function CountryCompare({ name, brands, type, live }: { name: string; brands: Brand[]; type: MeasurementType; live: boolean }) {
  const data = useLoad(() => Promise.all(brands.map(async (b) => {
    const lv = live ? series(await api.visibility(b.id, "live_search")) : [];
    const mk = series(await api.visibility(b.id, type));
    const lastLive = lv[lv.length - 1], lastMk = mk[mk.length - 1];
    return { brand: b, live: lastLive ?? null, model: lastMk ?? null };
  })), [brands.map((b) => b.id).join(","), type, live]);
  const rows = data.data ?? [];
  const hasLive = rows.some((r) => r.live);
  const pick = (r: (typeof rows)[number]) => (hasLive ? r.live : r.model);
  const max = Math.max(0.0001, ...rows.map((r) => pick(r)?.recommend.value ?? 0));
  return (
    <section className="panel">
      <h2>{isEn() ? `${name} by country` : `${name}: ülkelere göre`}</h2>
      <p className="muted">{hasLive ? L("Her ülkenin son canlı aramalı ölçümü (ChatGPT/Claude, o ülkeden arama). Önerilme oranı ve güven aralığı.", "Each country's latest live-search measurement (ChatGPT/Claude, searching from that country). Recommendation rate and confidence range.") : L("Her ülkenin son aramasız ölçümü (Gemini). Önerilme oranı ve güven aralığı.", "Each country's latest no-search measurement (Gemini). Recommendation rate and confidence range.")}</p>
      {data.loading ? <Loading /> : (
        <ul className="src-dom">
          {[...rows].sort((a, b) => (pick(b)?.recommend.value ?? -1) - (pick(a)?.recommend.value ?? -1)).map((r) => {
            const p = pick(r);
            return (
              <li key={r.brand.id}>
                <Link to={`/marka/${r.brand.id}`} className="src-head"><span><strong>{(r.brand.country || "TR").toUpperCase()}</strong>{r.brand.city ? ` · ${r.brand.city}` : ""}</span><span className="num">{p ? pct(p.recommend.value) : "–"}</span></Link>
                {p ? <>
                  <div className="bar-track bar-target" aria-hidden="true"><div className="bar-fill" style={{ width: `${(100 * p.recommend.value) / max}%` }} /></div>
                  <p className="src-sup muted">{isEn() ? `recommended in ${p.recommend.k} of ${p.recommend.n} answers (range ${rangeText(p.recommend)}), ${formatDateTime(p.at)}` : `${p.recommend.n} cevabın ${numLoc(p.recommend.k)} önerildi (aralık ${rangeText(p.recommend)}), ${formatDateTime(p.at)}`}{p.recommend.n < MIN_SAMPLE && L("; örneklem küçük", "; small sample")}</p>
                </> : <p className="src-sup muted">{L("Bu ülkede henüz bu türde ölçüm yok.", "No measurement of this kind in this country yet.")}</p>}
              </li>
            );
          })}
        </ul>
      )}
      <p className="src-sup muted">{L("Ülkeler arasındaki fark, aralıklar örtüşmüyorsa anlamlıdır. Sorular ülkeye göre farklıysa doğrudan karşılaştırma yapmayın.", "A difference between countries is meaningful when the ranges don't overlap. If the questions differ by country, don't compare directly.")}</p>
    </section>
  );
}

function BrandRow({ brand, type, live }: { brand: Brand; type: MeasurementType; live: boolean }) {
  const vis = useLoad(() => api.visibility(brand.id, type), [brand.id, type]);
  const lv = useLoad(() => (live ? api.visibility(brand.id, "live_search") : Promise.resolve([])), [brand.id, live]);
  const pts = series(vis.data ?? []);
  const last = pts[pts.length - 1];
  const lpts = series(lv.data ?? []);
  const llast = lpts[lpts.length - 1];
  const line = (p: typeof last, label: string) => <>{label}: {isEn() ? `recommended in ${p.recommend.k} of ${p.recommend.n} answers` : `${p.recommend.n} cevabın ${numLoc(p.recommend.k)} önerildi`} ({pct(p.recommend.value)})</>;
  return (
    <li>
      <Link to={`/marka/${brand.id}${llast && !last ? "?tur=canli" : ""}`} className="brand-row">
        <span className="brand-row-name">{brand.name}</span>
        <span className="brand-row-meta">{[brand.sector, brand.city].filter(Boolean).join(", ") || L("Sektör ve şehir girilmedi", "No sector or city")}</span>
        {vis.loading || lv.loading ? <span className="brand-row-result">…</span> : !last && !llast ? <span className="brand-row-result">{L("Henüz ölçüm yok", "No measurements yet")}</span> : (
          <>
            {last && <span className="brand-row-result">{line(last, live ? L("Aramasız (Gemini)", "No search (Gemini)") : L("Son ölçümde", "Latest"))}</span>}
            {llast && <span className="brand-row-result">{line(llast, L("Canlı aramalı (ChatGPT)", "Live search (ChatGPT)"))}</span>}
          </>
        )}
        {last && !live && <TypeBadge type={type} />}
      </Link>
    </li>
  );
}

export function NewWorkspace() {
  const { reload, select } = useApp();
  const nav = useNavigate();
  const [kind, setKind] = useState<"business" | "agency">("business");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = String(new FormData(e.currentTarget).get("name")).trim();
    if (!name) { setErr(L("Çalışma alanına bir ad verin.", "Give the workspace a name.")); return; }
    setBusy(true); setErr(null);
    try {
      const id = await api.createWorkspace(name, kind);
      await reload(); select(id); nav("/marka/yeni");
    } catch (e) { setErr(friendlyError(e)); } finally { setBusy(false); }
  }
  return (
    <form className="stack narrow" onSubmit={submit} noValidate>
      <header className="page-head"><h1>{L("Çalışma alanı oluşturun", "Create a workspace")}</h1><p className="muted">{L("Her çalışma alanının verisi diğerlerinden tamamen ayrıdır.", "Each workspace's data is completely separate.")}</p></header>
      <fieldset className="choice">
        <legend>{L("Hesap türü", "Account type")}</legend>
        <label className={kind === "business" ? "on" : ""}><input type="radio" name="kind" checked={kind === "business"} onChange={() => setKind("business")} /><strong>{L("İşletme", "Business")}</strong><span>{L("Kendi markamı izleyeceğim", "I'll track my own brand")}</span></label>
        <label className={kind === "agency" ? "on" : ""}><input type="radio" name="kind" checked={kind === "agency"} onChange={() => setKind("agency")} /><strong>{L("Ajans", "Agency")}</strong><span>{L("Müşterilerimin markalarını izleyeceğim", "I'll track my clients' brands")}</span></label>
      </fieldset>
      <Field label={kind === "agency" ? L("Ajans adı", "Agency name") : L("İşletme adı", "Business name")} name="name" maxLength={120} required />
      <ErrorBox message={err} />
      <Button type="submit" busy={busy}>{L("Çalışma alanını oluştur", "Create workspace")}</Button>
    </form>
  );
}

export function NewBrand() {
  const { current } = useApp();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Ziyaretçinin ülkesi: ülke kodu önceden doldurulur. Avrupa Ekonomik Alanı, İsviçre ve Birleşik Krallık'ta ücretsiz Gemini kapalıdır.
  const [geo, setGeo] = useState<{ country: string; geminiFree: boolean }>({ country: "", geminiFree: true });
  useEffect(() => {
    let live = true;
    fetch("/api/geo").then((r) => (r.ok ? r.json() : null)).then((j) => { if (live && j && typeof j.country === "string") setGeo({ country: j.country, geminiFree: j.geminiFree !== false }); }).catch(() => {});
    return () => { live = false; };
  }, []);
  if (!current) return <Navigate to="/panel" replace />;
  const demo = current.kind === "demo_lab";
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name")).trim();
    if (!name) { setErr(L("Marka adı gerekli.", "Brand name is required.")); return; }
    setBusy(true); setErr(null);
    try {
      const b = await api.addBrand({
        workspace_id: current!.id, name,
        website: String(f.get("website") || "").trim() || null,
        sector: String(f.get("sector") || "") || null,
        city: String(f.get("city") || "").trim() || null,
        country: /^[A-Za-z]{2}$/.test(String(f.get("country") || "").trim()) ? String(f.get("country")).trim().toUpperCase() : null,
        aliases: String(f.get("aliases") || "").split(",").map((s) => s.trim()).filter(Boolean),
        ...(demo ? { data_origin: "simulated" } : {}),
      });
      nav(`/marka/${b.id}?sekme=sorular`);
    } catch (e) { setErr(friendlyError(e)); } finally { setBusy(false); }
  }
  return (
    <form className="stack narrow" onSubmit={submit} noValidate>
      <header className="page-head"><h1>{L("Marka ekleyin", "Add a brand")}</h1><p className="muted">{L("Yapay zekâ cevaplarında arayacağımız markayı tanımlayın.", "Define the brand we'll look for in AI answers.")}</p></header>
      <Field label={L("Marka adı", "Brand name")} name="name" required maxLength={120} placeholder={demo ? L("Hayali bir ad", "A fictional name") : L("Örn. Ali Usta Döner", "e.g. Joe's Pizza")} />
      <Field label={L("Diğer yazılışlar", "Other spellings")} name="aliases" hint={L("Virgülle ayırın. Örn. Ali Usta, AliUsta", "Comma-separated, e.g. Joes Pizza, Joe's")} />
      <Field label={L("Web sitesi", "Website")} name="website" type="url" inputMode="url" placeholder={L("ornek.com", "example.com")} />
      <Select label={L("Sektör", "Sector")} name="sector" defaultValue="">
        <option value="" disabled>{L("Seçin", "Choose")}</option>
        {SECTORS.map((s) => <option key={s}>{s}</option>)}
      </Select>
      <Field label={L("Şehir veya ilçe", "City or area")} name="city" placeholder={L("Örn. Antalya", "e.g. Austin")} />
      <Field label={L("Ülke kodu (isteğe bağlı)", "Country code (optional)")} name="country" key={geo.country} defaultValue={geo.country} maxLength={2} placeholder={L("TR", "US")} hint={L("İki harf: TR, US, DE, GB… Boşsa Türkiye sayılır.", "Two letters: US, GB, DE, TR… Empty means Turkey.")} />
      {!geo.geminiFree && !demo && <p className="caution">{L("Bulunduğunuz ülkede ücretsiz Gemini ölçümü kapalı (Avrupa Ekonomik Alanı, İsviçre, Birleşik Krallık). Marka ekleyebilir ve sorularınızı hazırlayabilirsiniz; ölçüm için ChatGPT canlı aramalı ücretli paketler kullanılabilir.", "Free Gemini measurement isn't available in your country (EEA, Switzerland, UK). You can add your brand and prepare questions; measurement is available with ChatGPT live search on paid plans.")}</p>}
      <ErrorBox message={err} />
      <Button type="submit" busy={busy}>{L("Markayı ekle", "Add brand")}</Button>
    </form>
  );
}
