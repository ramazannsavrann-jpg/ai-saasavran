// Hesap: paket ve bu ayki kullanım, e-posta/uyarı tercihleri, çıkış, hesap silme.
// Uygulamada Paddle yok (mağaza kuralı); uygulama içi satın alma (Google Play / App Store) sonraki adımda eklenecek.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp, useLoad } from "../../lib/app";
import { api } from "../../lib/data";
import { sb, friendlyError } from "../../lib/supabase";
import { L, getLang } from "../../lib/i18n";
import { Err, Head } from "../ui";

export function Account() {
  const { session, current } = useApp();
  const nav = useNavigate();
  const usage = useLoad(() => (current ? api.usage(current.id) : Promise.resolve(null)), [current?.id]);
  const [weekly, setWeekly] = useState<boolean | null>(null);
  const [drop, setDrop] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [del, setDel] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const { data } = await sb().rpc("my_email_prefs");
        setWeekly((data as { weekly: boolean }[] | null)?.[0]?.weekly ?? true);
        const d = await sb().rpc("my_drop_alerts");
        if (typeof d.data === "boolean") setDrop(d.data);
      } catch { setWeekly(true); }
    })();
  }, []);
  async function setPref(kind: "weekly" | "drop", v: boolean) {
    setErr(null);
    const { error } = kind === "weekly" ? await sb().rpc("set_email_prefs", { p_weekly: v, p_lang: getLang() }) : await sb().rpc("set_drop_alerts", { p_on: v });
    if (error) setErr(friendlyError(error)); else if (kind === "weekly") setWeekly(v); else setDrop(v);
  }
  async function signOut() { await sb().auth.signOut(); nav("/", { replace: true }); }
  async function remove() {
    setBusy(true); setErr(null);
    const { data, error } = await sb().rpc("delete_my_account");
    setBusy(false);
    if (error) { setErr(friendlyError(error)); return; }
    if (data === "active_subscription") { setErr(L("Aktif bir aboneliğiniz var. Önce aboneliği iptal edin, sonra hesabınızı silebilirsiniz. İptal için info@aisaasavran.com adresine yazın.", "You have an active subscription. Cancel it first, then delete your account. To cancel, email info@aisaasavran.com.")); return; }
    if (data !== "deleted") { setErr(L("Hesap silinemedi. Lütfen info@aisaasavran.com adresine yazın.", "Could not delete the account. Please email info@aisaasavran.com.")); return; }
    await sb().auth.signOut().catch(() => undefined);
    try { localStorage.clear(); } catch { /* yok say */ }
    nav("/", { replace: true });
  }
  const u = usage.data;
  return (
    <div className="screen">
      <Head title={L("Hesap", "Account")} />
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontWeight: 700, fontSize: 18 }}>{session?.user.email}</span>
        {current && <span className="muted">{current.name}{u ? ` · ${L("Paket", "Plan")}: ${u.plan_name}` : ""}</span>}
      </div>
      {u && (
        <>
          <span className="label">{L("Bu ayki kullanım", "This month")}</span>
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>{L("Yapay zekâ sorgusu", "AI queries")}</span><span style={{ fontWeight: 700 }}>{u.engine_calls.toLocaleString("tr-TR")} / {u.engine_call_limit.toLocaleString("tr-TR")}</span></div>
            <div className="meter"><i style={{ width: `${Math.min(100, Math.round((u.engine_calls / Math.max(1, u.engine_call_limit)) * 100))}%`, background: "var(--accent)" }} /></div>
            <span className="muted small">{L(`${u.brand_limit} marka · marka başına ${u.prompt_limit} soru · ${u.competitor_limit} rakip`, `${u.brand_limit} brands · ${u.prompt_limit} questions per brand · ${u.competitor_limit} competitors`)}</span>
          </div>
        </>
      )}
      <span className="label">{L("Bildirim tercihleri", "Notification preferences")}</span>
      <div className="list">
        <label className="row">{L("Önerilme düşünce / rakip öne geçince haber ver", "Alert me on drops / when a competitor overtakes me")}<input type="checkbox" checked={drop} onChange={(e) => setPref("drop", e.target.checked)} /></label>
        {weekly !== null && <label className="row">{L("Haftalık özet e-postası", "Weekly summary email")}<input type="checkbox" checked={weekly} onChange={(e) => setPref("weekly", e.target.checked)} /></label>}
      </div>
      <Err msg={err} />
      <button className="btn btn-ghost" onClick={signOut}>{L("Çıkış yap", "Sign out")}</button>
      {!del ? <button className="btn btn-danger" onClick={() => setDel(true)}>{L("Hesabımı sil", "Delete my account")}</button> : (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ lineHeight: 1.45 }}>{L("Hesabınız, tek başınıza sahip olduğunuz çalışma alanları ve tüm ölçümleri kalıcı olarak silinir. Ekipli alanda sahiplik en eski üyeye geçer. Geri alınamaz.", "Your account, the workspaces you own alone and all their measurements are permanently deleted. In a team workspace, ownership passes to the longest-standing member. This cannot be undone.")}</span>
          <button className="btn" style={{ background: "#B3261E", color: "#fff" }} disabled={busy} onClick={remove}>{L("Hesabımı kalıcı olarak sil", "Permanently delete my account")}</button>
          <button className="btn btn-text" onClick={() => setDel(false)}>{L("Vazgeç", "Cancel")}</button>
        </div>
      )}
    </div>
  );
}
