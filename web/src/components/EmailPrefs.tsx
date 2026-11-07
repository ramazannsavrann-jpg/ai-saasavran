import { useEffect, useState } from "react";
import { sb } from "../lib/supabase";
import { L, getLang } from "../lib/i18n";

/** Hesap sayfası: haftalık e-posta özeti açık/kapalı. E-posta dili, arayüz dilinden alınır. */
export function EmailPrefs() {
  const [weekly, setWeekly] = useState<boolean | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      await sb().rpc("set_email_prefs", { p_lang: getLang() });
      const { data } = await sb().rpc("my_email_prefs");
      setWeekly((data as { weekly: boolean }[] | null)?.[0]?.weekly ?? true);
    })();
  }, []);
  async function toggle(v: boolean) {
    setWeekly(v); setSaved(null);
    const { error } = await sb().rpc("set_email_prefs", { p_weekly: v, p_lang: getLang() });
    setSaved(error ? L("Kaydedilemedi, tekrar deneyin.", "Couldn't save. Please try again.") : L("Kaydedildi.", "Saved."));
  }
  if (weekly === null) return null;
  return (
    <section className="panel stack">
      <h2>{L("E-posta", "Email")}</h2>
      <label className="check-row">
        <input type="checkbox" checked={weekly} onChange={(e) => toggle(e.target.checked)} />
        <span>{L("Haftalık özet e-postası (Pazartesi sabahı; o hafta ölçüm yapıldıysa)", "Weekly summary email (Monday mornings, when there were measurements that week)")}</span>
      </label>
      {saved && <p className="muted" role="status">{saved}</p>}
    </section>
  );
}
