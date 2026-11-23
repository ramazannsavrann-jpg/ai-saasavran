// Bildirimler: müşterinin kendi sonuçlarındaki belirgin değişiklikler ve ölçüm geçmişi ("Haftalık ölçüm yapıldı", "Sorgunuz tamamlandı"). Rakip dili yok.
// ve ölçüm geçmişi. Uyarı mantığı e-posta uyarısıyla aynıdır (engine/src/alerts.ts): ≥10 puan ve istatistiksel olarak belirgin.
import { useLoad } from "../../lib/app";
import { api } from "../../lib/data";
import { sb } from "../../lib/supabase";
import { formatDateTime, providerLabel } from "../../lib/report";
import { L } from "../../lib/i18n";
import { Head, Spinner, trAbl, trDat } from "../ui";
import { useSelectedBrand } from "./Home";

interface Drop { provider: string; prev: { k: number; n: number }; now: { k: number; n: number }; lost: number; lost_items?: { prompt: string; instead: string | null }[] }
interface Alert { run_id: string; checked_at: string; measurement_type: string; detail: { drops?: Drop[] } | null }
const pctOf = (x: { k: number; n: number }) => (x.n ? Math.round((x.k / x.n) * 100) : 0);

export function Activity() {
  const sel = useSelectedBrand();
  const b = sel.brand;
  const alerts = useLoad(async () => {
    if (!b) return [] as Alert[];
    const { data, error } = await sb().rpc("brand_alerts", { p_brand: b.id, p_limit: 20 });
    if (error) return [] as Alert[]; // eski sunucuda fonksiyon yoksa ekran yine açılır
    return (data ?? []) as Alert[];
  }, [b?.id]);
  const runs = useLoad(() => (b ? api.runs(b.id) : Promise.resolve([])), [b?.id]);
  if (sel.loading || alerts.loading) return <Spinner />;
  const list = alerts.data ?? [];
  const done = (runs.data ?? []).filter((r) => r.status === "done" || r.status === "failed").slice(0, 10);

  return (
    <div className="screen">
      <Head title={L("Bildirimler", "Alerts")} />
      <h2 className="label">{L("Sonuçlarınızdaki değişiklikler", "Changes in your results")}</h2>
      {list.length === 0 ? <p className="muted" style={{ margin: 0 }}>{L("Şu an uyarı yok. Önerilme oranınız belirgin değişirse burada görünür.", "No alerts. If your recommendation rate changes clearly, it shows here.")}</p> : list.map((a) => (
        (a.detail?.drops ?? []).map((d, i) => (
          <article key={`${a.run_id}-${i}`} className="card" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ color: "var(--warn)", fontWeight: 700, fontSize: 14 }}>{L("Sonucunuz değişti", "Your result changed")} · {providerLabel(d.provider)}</span>
            <span style={{ fontWeight: 600 }}>{L(`Önerilme oranınız %${trAbl(pctOf(d.prev))} %${trDat(pctOf(d.now))} indi.`, `Your recommendation rate went from ${pctOf(d.prev)}% to ${pctOf(d.now)}%.`)}</span>
            {(d.lost_items ?? []).map((x, j) => (
              <span key={j} className="muted small" style={{ lineHeight: 1.4 }}>{L(`“${x.prompt}” sorusunda bu ölçümde önerilmediniz.`, `Not recommended for “${x.prompt}” in this measurement.`)}</span>
            ))}
            <span className="muted small">{formatDateTime(a.checked_at)}</span>
          </article>
        ))
      ))}
      <h2 className="label" style={{ marginTop: 6 }}>{L("Ölçümleriniz", "Your measurements")}</h2>
      {done.length === 0 ? <p className="muted" style={{ margin: 0 }}>{L("Henüz ölçüm yok.", "No measurements yet.")}</p> : (
        <div className="list">
          {done.map((r) => (
            <div key={r.id} className="row">
              <span>{r.status !== "done" ? L("Ölçüm tamamlanamadı", "Measurement failed") : r.trigger === "weekly" ? L("Haftalık ölçüm yapıldı. Sonuçlarınızı inceleyebilirsiniz.", "Weekly measurement done. You can review your results.") : L("Sorgunuz tamamlandı. İnceleyebilirsiniz.", "Your query is done. You can review it.")}</span>
              <span className="muted small">{formatDateTime(r.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
