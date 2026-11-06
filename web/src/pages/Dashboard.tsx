import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useApp, useLoad } from "../lib/app";
import { api, type Brand, type MeasurementType } from "../lib/data";
import { friendlyError } from "../lib/supabase";
import { PAUSE_TEXT } from "../lib/messages";
import { numLoc, series, pct, usd } from "../lib/report";
import { SECTORS } from "../lib/sectors";
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
        <p className="muted">{ws.kind === "agency" ? "Ajans" : ws.kind === "demo_lab" ? "Demo Lab" : "İşletme"} hesabı{u && <>, {u.plan_name} paketi</>}</p>
      </header>

      {ws.status === "paused" && (
        <p className="error-box" role="alert">{PAUSE_TEXT[ws.paused_reason ?? ""] ?? "Bu çalışma alanı durduruldu."}</p>
      )}

      <DataNotice type={type} />

      <section className="panel">
        <div className="panel-head">
          <h2>Markalar</h2>
          {u && own.length < u.brand_limit && <Link className="btn btn-primary btn-small" to="/marka/yeni">Marka ekle</Link>}
        </div>
        {brands.loading ? <Loading /> : brands.error ? <ErrorBox message={brands.error} /> : own.length === 0 ? (
          <Empty title="Henüz marka eklemediniz">
            <p>İzlemek istediğiniz markayı ekleyin; ardından rakiplerini ve müşterilerinizin soracağı soruları tanımlayın.</p>
            <Link className="btn btn-primary" to="/marka/yeni">İlk markayı ekle</Link>
          </Empty>
        ) : (
          <ul className="brand-list">{own.map((b) => <BrandRow key={b.id} brand={b} type={type} />)}</ul>
        )}
      </section>

      {u && (
        <section className="panel">
          <h2>Bu ayki kullanım</h2>
          <Meter label="Yapay zekâ sorgusu" used={u.engine_calls} limit={u.engine_call_limit} />
          <Meter label="Marka" used={u.brands_used} limit={u.brand_limit} warn={false} />
          <dl className="facts">
            <div><dt>Ücretsiz katman sorgusu</dt><dd className="num">{u.free_calls}</dd></div>
            <div><dt>Ücretli API harcaması</dt><dd className="num">{usd(Number(u.paid_cost_usd))}<span className="muted dd-note">Ücretli kullanım kapalı</span></dd></div>
            <div><dt>Canlı web araması</dt><dd>{u.live_search_enabled ? "Açık" : "Kapalı"}</dd></div>
          </dl>
        </section>
      )}
    </div>
  );
}

function BrandRow({ brand, type }: { brand: Brand; type: MeasurementType }) {
  const vis = useLoad(() => api.visibility(brand.id, type), [brand.id, type]);
  const pts = series(vis.data ?? []);
  const last = pts[pts.length - 1];
  return (
    <li>
      <Link to={`/marka/${brand.id}`} className="brand-row">
        <span className="brand-row-name">{brand.name}</span>
        <span className="brand-row-meta">{[brand.sector, brand.city].filter(Boolean).join(", ") || "Sektör ve şehir girilmedi"}</span>
        <span className="brand-row-result">
          {vis.loading ? "…" : last ? <>Son ölçümde {last.recommend.n} cevabın {numLoc(last.recommend.k)} önerildi ({pct(last.recommend.value)})</> : "Henüz ölçüm yok"}
        </span>
        {last && <TypeBadge type={type} />}
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
    if (!name) { setErr("Çalışma alanına bir ad verin."); return; }
    setBusy(true); setErr(null);
    try {
      const id = await api.createWorkspace(name, kind);
      await reload(); select(id); nav("/marka/yeni");
    } catch (e) { setErr(friendlyError(e)); } finally { setBusy(false); }
  }
  return (
    <form className="stack narrow" onSubmit={submit} noValidate>
      <header className="page-head"><h1>Çalışma alanı oluşturun</h1><p className="muted">Her çalışma alanının verisi diğerlerinden tamamen ayrıdır.</p></header>
      <fieldset className="choice">
        <legend>Hesap türü</legend>
        <label className={kind === "business" ? "on" : ""}><input type="radio" name="kind" checked={kind === "business"} onChange={() => setKind("business")} /><strong>İşletme</strong><span>Kendi markamı izleyeceğim</span></label>
        <label className={kind === "agency" ? "on" : ""}><input type="radio" name="kind" checked={kind === "agency"} onChange={() => setKind("agency")} /><strong>Ajans</strong><span>Müşterilerimin markalarını izleyeceğim</span></label>
      </fieldset>
      <Field label={kind === "agency" ? "Ajans adı" : "İşletme adı"} name="name" maxLength={120} required />
      <ErrorBox message={err} />
      <Button type="submit" busy={busy}>Çalışma alanını oluştur</Button>
    </form>
  );
}

export function NewBrand() {
  const { current } = useApp();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!current) return <Navigate to="/panel" replace />;
  const demo = current.kind === "demo_lab";
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name")).trim();
    if (!name) { setErr("Marka adı gerekli."); return; }
    setBusy(true); setErr(null);
    try {
      const b = await api.addBrand({
        workspace_id: current!.id, name,
        website: String(f.get("website") || "").trim() || null,
        sector: String(f.get("sector") || "") || null,
        city: String(f.get("city") || "").trim() || null,
        aliases: String(f.get("aliases") || "").split(",").map((s) => s.trim()).filter(Boolean),
        ...(demo ? { data_origin: "simulated" } : {}),
      });
      nav(`/marka/${b.id}?sekme=sorular`);
    } catch (e) { setErr(friendlyError(e)); } finally { setBusy(false); }
  }
  return (
    <form className="stack narrow" onSubmit={submit} noValidate>
      <header className="page-head"><h1>Marka ekleyin</h1><p className="muted">Yapay zekâ cevaplarında arayacağımız markayı tanımlayın.</p></header>
      <Field label="Marka adı" name="name" required maxLength={120} placeholder={demo ? "Hayali bir ad" : "Örn. Ali Usta Döner"} />
      <Field label="Diğer yazılışlar" name="aliases" hint="Virgülle ayırın. Örn. Ali Usta, AliUsta" />
      <Field label="Web sitesi" name="website" type="url" inputMode="url" placeholder="ornek.com" />
      <Select label="Sektör" name="sector" defaultValue="">
        <option value="" disabled>Seçin</option>
        {SECTORS.map((s) => <option key={s}>{s}</option>)}
      </Select>
      <Field label="Şehir veya ilçe" name="city" placeholder="Örn. Antalya" />
      <ErrorBox message={err} />
      <Button type="submit" busy={busy}>Markayı ekle</Button>
    </form>
  );
}
