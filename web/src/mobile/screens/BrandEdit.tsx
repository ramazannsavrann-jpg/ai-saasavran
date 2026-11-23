// Marka bilgileri: ad, diğer yazılışlar, web sitesi, sektör, ne sattığı, şehir, haftalık ölçüm, doğru bilgi kartı, markayı silme.
// Sitedeki "Markayı düzenle" formuyla aynı alanları aynı kurallarla yazar.
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../lib/app";
import { api } from "../../lib/data";
import { friendlyError } from "../../lib/supabase";
import { SECTORS } from "../../lib/sectors";
import { L } from "../../lib/i18n";
import { Confirm, Err, Head, Spinner, haptic } from "../ui";
import { useSelectedBrand } from "./Home";

const splitAliases = (v: FormDataEntryValue | null) => String(v || "").split(",").map((x) => x.trim()).filter(Boolean).slice(0, 20);

export function BrandEdit() {
  const nav = useNavigate();
  const { current } = useApp();
  const sel = useSelectedBrand();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [del, setDel] = useState(false);
  const b = sel.brand;
  if (sel.loading) return <div className="app"><Spinner /></div>;
  if (!b) { nav("/ana", { replace: true }); return null; }
  const sim = b.data_origin === "simulated";
  const paid = current?.kind === "growth_lab" || (!!current?.plan && current.plan !== "free");

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name") || "").trim();
    if (!name) { setErr(L("İşletme adı gerekli.", "Business name is required.")); return; }
    let website = String(f.get("website") || "").trim();
    if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
    if (website && !/^https?:\/\/[^\s/.]+\.[^\s]+$/i.test(website)) { setErr(L("Web sitesi adresi geçerli görünmüyor. Örn. ornek.com", "The website address doesn't look valid. e.g. example.com")); return; }
    const fact = String(f.get("fact_card") || "").trim();
    setBusy(true); setErr(null);
    try {
      await api.updateBrand(b!.id, {
        name: name.slice(0, 120), aliases: splitAliases(f.get("aliases")), website: website || null,
        sector: String(f.get("sector") || "") || null,
        offering: String(f.get("offering") || "").trim().slice(0, 120) || null,
        city: String(f.get("city") || "").trim().slice(0, 60) || null,
        ...(!sim ? { auto_weekly: f.get("auto_weekly") === "on", fact_card: fact.length >= 10 ? fact.slice(0, 3000) : null } : {}),
      });
      haptic.done();
      nav(-1);
    } catch (x) { setErr(friendlyError(x)); setBusy(false); }
  }
  async function remove() {
    setDel(false);
    try { await api.deleteBrand(b!.id); try { localStorage.removeItem("mobil-marka"); } catch { /* yok say */ } nav("/ana", { replace: true }); }
    catch (x) { setErr(friendlyError(x)); }
  }

  return (
    <form className="screen" onSubmit={save} noValidate>
      <Head title={L("İşletme bilgileri", "Business details")} back={() => nav(-1)} />
      <label className="field">{L("İşletme veya marka adı", "Business or brand name")}<input name="name" defaultValue={b.name} maxLength={120} /></label>
      <label className="field">{L("Diğer yazılışlar", "Other spellings")}<input name="aliases" defaultValue={b.aliases.join(", ")} placeholder={L("Örn. Ali Usta, AliUsta", "e.g. Joe's, Joes Pizza")} />
        <span className="hint">{L("Müşterilerin farklı yazdığı adlar. Virgülle ayırın.", "Names customers write differently. Separate with commas.")}</span></label>
      <label className="field">{L("Web sitesi", "Website")}<input name="website" type="url" inputMode="url" defaultValue={b.website ?? ""} placeholder="ornek.com" /></label>
      <label className="field">{L("Ne satıyorsunuz?", "What do you sell?")}<input name="offering" defaultValue={b.offering ?? ""} maxLength={120} placeholder={L("Örn. döner, kahve, diş tedavisi", "e.g. pizza, coffee, dental care")} /></label>
      <label className="field">{L("Sektör", "Sector")}
        <select name="sector" defaultValue={b.sector ?? ""}>
          <option value="">{L("Seçilmedi", "Not set")}</option>
          {SECTORS.map((s) => <option key={s}>{s}</option>)}
          {b.sector && !SECTORS.includes(b.sector) && <option>{b.sector}</option>}
        </select></label>
      <label className="field">{L("Şehir veya ilçe", "City or area")}<input name="city" defaultValue={b.city ?? ""} maxLength={60} /></label>
      {!sim && (
        <>
          <div className="list">
            <label className="row">{L("Her hafta otomatik ölç", "Measure automatically every week")}<input type="checkbox" role="switch" className="switch" name="auto_weekly" defaultChecked={b.auto_weekly} /></label>
          </div>
          <label className="field">{L("Doğru bilgi kartı", "Fact card")}
            <textarea name="fact_card" rows={5} maxLength={3000} defaultValue={b.fact_card ?? ""} placeholder={L("Örn. 2009'dan beri açığız. Adres: Muratpaşa, Antalya. Her gün 10:00–02:00. Paket servis var.", "e.g. Open since 2009. Address: Main St, Austin. Daily 10am–2am. Delivery available.")} />
            <span className="hint">{paid
              ? L("Yapay zekâların işletmeniz hakkında söyledikleri bu bilgilerle karşılaştırılır. Kısa ve kesin cümleler yazın.", "What the AIs say about your business is checked against these facts. Write short, exact sentences.")
              : L("Yapay zekâların söylediklerinin bu bilgilerle karşılaştırılması ücretli paketlerde açık.", "Checking what the AIs say against these facts is available on paid plans.")}</span></label>
        </>
      )}
      <p className="muted small" style={{ margin: 0 }}>{L("Ad veya yazılışlar değişirse yeni ölçümler yeni bilgilerle yapılır.", "If the name or spellings change, new measurements use the new details.")}</p>
      <Err msg={err} />
      <button className="btn btn-primary" disabled={busy}>{busy ? L("Kaydediliyor…", "Saving…") : L("Kaydet", "Save")}</button>
      <button type="button" className="btn btn-text" style={{ color: "var(--danger)" }} onClick={() => setDel(true)}>{L("Bu işletmeyi sil", "Delete this business")}</button>
      <Confirm open={del} danger title={L(`${b.name} silinsin mi?`, `Delete ${b.name}?`)} text={L("Soruları, ölçümleri ve raporları da silinir. Geri alınamaz.", "Its questions, measurements and reports are deleted too. This can't be undone.")} action={L("Sil", "Delete")} onYes={remove} onNo={() => setDel(false)} />
    </form>
  );
}
