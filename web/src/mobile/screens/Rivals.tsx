// Rakipler: son ölçümde kim ne sıklıkla önerildi + takip edilen rakipleri ekleme/silme.
import { useState, type FormEvent } from "react";
import { useApp, useLoad } from "../../lib/app";
import { api, type MeasurementType } from "../../lib/data";
import { friendlyError } from "../../lib/supabase";
import { competitorsInRun, series } from "../../lib/report";
import { L } from "../../lib/i18n";
import { Confirm, Err, Spinner } from "../ui";
import { useSelectedBrand } from "./Home";
import { RivalTraits } from "./Insights";

export function RivalsBody() {
  const { current } = useApp();
  const sel = useSelectedBrand();
  const b = sel.brand;
  const runs = useLoad(() => (b ? api.runs(b.id) : Promise.resolve([])), [b?.id]);
  const type: MeasurementType = (runs.data ?? []).some((r) => r.measurement_type === "live_search" && r.status === "done") ? "live_search" : "model_knowledge";
  const vis = useLoad(() => (b ? api.visibility(b.id, type) : Promise.resolve([])), [b?.id, type]);
  const comps = useLoad(() => (b ? api.competitors(b.id) : Promise.resolve([])), [b?.id]);
  const usage = useLoad(() => (current ? api.usage(current.id) : Promise.resolve(null)), [current?.id]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rm, setRm] = useState<{ id: string; name: string } | null>(null);
  if (sel.loading || !b) return <Spinner />;

  const pts = series(vis.data ?? []);
  const last = pts[pts.length - 1];
  const ranking = last ? competitorsInRun(vis.data ?? [], last.runId) : [];
  const max = Math.max(0.01, ...ranking.map((r) => r.recommend.value));
  const limit = usage.data?.competitor_limit ?? 0;
  const list = comps.data ?? [];

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const name = String(new FormData(form).get("name") ?? "").trim();
    if (!name) return;
    setBusy(true); setErr(null);
    try { await api.addBrand({ workspace_id: b!.workspace_id, name, is_competitor: true, owner_brand_id: b!.id, aliases: [] }); form.reset(); comps.reload(); }
    catch (e2) { setErr(friendlyError(e2)); } finally { setBusy(false); }
  }
  async function remove(id: string) {
    setRm(null);
    try { await api.deleteBrand(id); comps.reload(); } catch (e2) { setErr(friendlyError(e2)); }
  }

  return (
    <>
      <p className="muted" style={{ margin: 0, fontSize: 14 }}>{last ? L("Son ölçümde yapay zekâ cevaplarında kim ne sıklıkla önerildi?", "How often was each brand recommended in AI answers in the last measurement?") : L("İlk ölçümden sonra sıralama burada görünür.", "The ranking appears here after the first measurement.")}</p>
      {ranking.length > 0 && (
        <div className="list">
          {ranking.map((r, i) => (
            <div key={r.brandId} className="row" style={{ gap: 12 }}>
              <span style={{ width: 22, fontWeight: 700, color: r.isTarget ? "var(--accent)" : "var(--muted)" }}>{i + 1}</span>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, color: r.isTarget ? "var(--accent)" : undefined }}>
                  <span>{r.name}{r.isTarget ? L(" (siz)", " (you)") : ""}</span><span>%{Math.round(r.recommend.value * 100)}</span>
                </div>
                <div className="meter"><i style={{ width: `${Math.round((r.recommend.value / max) * 100)}%`, background: r.isTarget ? "var(--accent)" : i === 0 ? "var(--warn)" : undefined }} /></div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 4 }}>
        <h2 className="label" style={{ margin: 0 }}>{L("Takip ettiğiniz rakipler", "Competitors you track")}</h2>
        {limit > 0 && <span className="muted small">{list.length} / {limit}</span>}
      </div>
      {list.length > 0 && (
        <div className="list">
          {list.map((c) => (
            <div key={c.id} className="row">
              <span style={{ fontWeight: 600 }}>{c.name}</span>
              <button className="btn btn-text" style={{ color: "var(--danger)" }} aria-label={L(`${c.name} rakibini çıkar`, `Remove ${c.name}`)} onClick={() => setRm({ id: c.id, name: c.name })}>{L("Çıkar", "Remove")}</button>
            </div>
          ))}
        </div>
      )}
      {(!limit || list.length < limit) && (
        <form onSubmit={add} style={{ display: "flex", gap: 8 }}>
          <label className="field" style={{ flex: 1 }}><span className="sr-only" style={{ position: "absolute", left: -9999 }}>{L("Rakip adı", "Competitor name")}</span><input name="name" placeholder={L("Rakip adı ekleyin", "Add a competitor")} maxLength={120} /></label>
          <button className="btn btn-primary" style={{ width: "auto" }} disabled={busy}>{L("Ekle", "Add")}</button>
        </form>
      )}
      <Err msg={err} />
      <Confirm open={!!rm} title={L(`${rm?.name ?? ""} rakiplerden çıkarılsın mı?`, `Remove ${rm?.name ?? ""} from competitors?`)} text={L("Bu rakip sonraki ölçümlerde takip edilmez.", "This competitor won't be tracked in later measurements.")} action={L("Çıkar", "Remove")} danger onYes={() => rm && remove(rm.id)} onNo={() => setRm(null)} />
      {b && <RivalTraits brand={b} />}
    </>
  );
}
