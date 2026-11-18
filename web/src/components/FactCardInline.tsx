// Doğru bilgi kartını "Düzenle" formuna gitmeden doldurma (18 Kasım denetimi: kart formun içinde gizli kaldığı için hiç doldurulmamıştı).
import { useState } from "react";
import { api, CHANGED, type Brand } from "../lib/data";
import { friendlyError } from "../lib/supabase";
import { L } from "../lib/i18n";
import { Button } from "./ui";

export function FactCardInline({ brand, onSaved }: { brand: Brand; onSaved?: () => void }) {
  const [text, setText] = useState(brand.fact_card ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  async function save() {
    const t = text.trim();
    if (t.length < 10) { setErr(L("En az bir iki kısa cümle yazın (10 karakter).", "Write at least a short sentence or two (10 characters).")); return; }
    setBusy(true); setErr(null);
    try {
      await api.updateBrand(brand.id, { fact_card: t.slice(0, 3000) });
      setSaved(true); window.dispatchEvent(new Event(CHANGED)); onSaved?.();
    } catch (e) { setErr(friendlyError(e)); } finally { setBusy(false); }
  }
  if (saved) return <p className="success-box" role="status">{L("Bilgi kartı kaydedildi. Doğruluk kontrolü sonraki saatlerde kendiliğinden yapılır.", "Fact card saved. Accuracy checks run automatically within hours.")}</p>;
  return (
    <div className="fact-inline">
      <label className="field" htmlFor={`fact-inline-${brand.id}`}>
        <span className="field-label">{L("Doğru bilgi kartı (2 dakika)", "Fact card (2 minutes)")}</span>
        <textarea id={`fact-inline-${brand.id}`} rows={4} maxLength={3000} value={text} onChange={(e) => setText(e.target.value)}
          placeholder={L("Örn. Kuruluş: 2009. Merkez: Kadıköy, İstanbul. Hafta içi 08:00–22:00. Paket servis var, rezervasyon yok.", "e.g. Founded 2009. HQ: Austin, TX. Mon–Fri 8am–10pm. Delivery yes, no reservations.")} />
        <span className="field-hint">{L("Yapay zekânın markanız hakkında söyledikleri bu bilgilerle karşılaştırılır. Kısa ve kesin cümleler yazın.", "What the AI says about your brand is checked against these facts. Write short, exact sentences.")}</span>
      </label>
      {err && <p className="error-box" role="alert">{err}</p>}
      <Button busy={busy} onClick={save}>{L("Bilgi kartını kaydet", "Save fact card")}</Button>
    </div>
  );
}
