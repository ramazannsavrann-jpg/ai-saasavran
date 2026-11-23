// İlk kurulum: işletme (çalışma alanı) + ilk marka. Sitedeki "Marka ekleyin" ile aynı kurallar:
// ilk 5 soru otomatik eklenir, sektör seçildiyse Google soru keşfi bir kez sıraya girer.
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../lib/app";
import { api } from "../../lib/data";
import { friendlyError } from "../../lib/supabase";
import { SECTORS, starterQuestions } from "../../lib/sectors";
import { L } from "../../lib/i18n";
import { Err, Icon } from "../ui";

export async function addBrandWithStarter(workspaceId: string, f: { name: string; city: string; sector: string; website: string; offering: string }) {
  const b = await api.addBrand({
    workspace_id: workspaceId, name: f.name.trim(),
    website: f.website.trim() || null, sector: f.sector || null, city: f.city.trim() || null, country: "TR", aliases: [],
    offering: f.offering.trim().slice(0, 120) || null,
  });
  let limit = 5;
  try { limit = Math.min(5, (await api.usage(b.workspace_id))?.prompt_limit || 5); } catch { /* varsayılan 5 */ }
  for (const q of starterQuestions(b.sector, b.city, b.name, limit, b.offering)) {
    try { await api.addPrompt({ workspace_id: b.workspace_id, brand_id: b.id, text: q.text, intent: q.intent }); } catch { break; }
  }
  if (b.sector) { try { await api.requestDiscovery(b.id); } catch { /* hak yoksa sessiz geç */ } }
  return b;
}

export function BrandForm({ onDone, title }: { onDone: (brandId: string) => void; title: string }) {
  const { current, workspaces, reload, select } = useApp();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const needWs = !current && workspaces.length === 0;
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? "");
    if (!v("name").trim()) { setErr(L("İşletme veya marka adı gerekli.", "Business or brand name is required.")); return; }
    if (!v("sector") && !v("offering").trim()) { setErr(L("Ne sattığınızı yazın veya bir sektör seçin; ilk soruları buna göre hazırlıyoruz.", "Tell us what you sell or choose a sector; we prepare the first questions from it.")); return; }
    setBusy(true); setErr(null);
    try {
      let ws = current?.id;
      if (!ws) { ws = await api.createWorkspace(v("name").trim().slice(0, 120), "business"); await reload(); select(ws); }
      const b = await addBrandWithStarter(ws, { name: v("name"), city: v("city"), sector: v("sector"), website: v("website"), offering: v("offering") });
      onDone(b.id);
    } catch (e2) { setErr(friendlyError(e2)); } finally { setBusy(false); }
  }
  return (
    <form className="screen" onSubmit={submit} noValidate>
      {!needWs && <button type="button" className="iconbtn" aria-label={L("Geri", "Back")} onClick={() => nav(-1)}>{Icon.back}</button>}
      <h1 style={{ fontSize: 28 }}>{title}</h1>
      <p className="muted" style={{ margin: 0, lineHeight: 1.45 }}>{L("Yapay zekâ cevaplarında arayacağımız markayı yazın. İlk 5 soruyu biz hazırlarız, sonra değiştirebilirsiniz.", "Enter the brand we'll look for in AI answers. We prepare the first 5 questions; you can change them later.")}</p>
      <label className="field">{L("İşletme veya marka adı", "Business or brand name")}<input name="name" maxLength={120} placeholder={L("Örn. Ali Usta Döner", "e.g. Joe's Pizza")} /></label>
      <label className="field">{L("Şehir", "City")}<input name="city" maxLength={60} placeholder={L("Örn. Antalya", "e.g. Austin")} /></label>
      <label className="field">{L("Ne satıyorsunuz?", "What do you sell?")}<input name="offering" maxLength={120} placeholder={L("Örn. döner, kahve, diş tedavisi", "e.g. pizza, coffee, dental care")} /></label>
      <label className="field">{L("Sektör", "Sector")}
        <select name="sector" defaultValue=""><option value="">{L("Seçin (isteğe bağlı)", "Choose (optional)")}</option>{SECTORS.map((s) => <option key={s}>{s}</option>)}</select>
      </label>
      <label className="field">{L("Web sitesi (isteğe bağlı)", "Website (optional)")}<input name="website" type="url" inputMode="url" placeholder="ornek.com" /></label>
      <Err msg={err} />
      <button className="btn btn-primary" disabled={busy} style={{ marginTop: "auto" }}>{busy ? L("Hazırlanıyor…", "Preparing…") : L("Devam et", "Continue")}</button>
    </form>
  );
}

export function Setup() {
  const nav = useNavigate();
  return <BrandForm title={L("İşletmenizi ekleyin", "Add your business")} onDone={(id) => { try { localStorage.setItem("mobil-marka", id); } catch { /* yok say */ } nav("/ana", { replace: true }); }} />;
}
