// Hesap: paket ve bu ayki kullanım, e-posta/uyarı tercihleri, çıkış, hesap silme.
// Uygulamada Paddle yok (mağaza kuralı); uygulama içi satın alma (Google Play / App Store) sonraki adımda eklenecek.
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useApp, useLoad } from "../../lib/app";
import { api } from "../../lib/data";
import { sb, friendlyError } from "../../lib/supabase";
import { L, getLang, switchLang } from "../../lib/i18n";
import { Err, Head, Icon, Sheet } from "../ui";
import { disablePush, enablePush, pushState, type PushState } from "../push";

const PLAN_TR: Record<string, [string, string]> = { free: ["Ücretsiz", "Free"], starter: ["Gümüş", "Silver"], altin: ["Altın", "Gold"], pro: ["Platin", "Platinum"], agency: ["Elmas", "Diamond"] };
const planTr = (id: string, name: string) => (PLAN_TR[id] ? L(PLAN_TR[id][0], PLAN_TR[id][1]) : name);

export function Account() {
  const { session, current } = useApp();
  const nav = useNavigate();
  const usage = useLoad(() => (current ? api.usage(current.id) : Promise.resolve(null)), [current?.id]);
  const quota = useLoad(() => (current ? api.quota(current.id) : Promise.resolve(null)), [current?.id]);
  const [weekly, setWeekly] = useState<boolean | null>(null);
  const [drop, setDrop] = useState(true);
  const [push, setPush] = useState<PushState>("unavailable");
  useEffect(() => { void pushState().then(setPush); }, []);
  async function togglePush(on: boolean) {
    setErr(null);
    try {
      if (on) { const ok = await enablePush(); setPush(ok ? "on" : await pushState()); if (!ok) setErr(L("Bildirim izni verilmedi. Telefonun Ayarlar > Uygulamalar > SaaSavran > Bildirimler bölümünden açabilirsiniz.", "Notification permission wasn't granted. You can turn it on in your phone's Settings > Apps > SaaSavran > Notifications.")); }
      else { await disablePush(); setPush("off"); }
    } catch (e) { setErr(friendlyError(e)); }
  }
  const [err, setErr] = useState<string | null>(null);
  const [del, setDel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  async function changePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const p1 = String(f.get("p1") ?? ""), p2 = String(f.get("p2") ?? "");
    setErr(null); setPwMsg(null);
    if (p1.length < 8) { setErr(L("Yeni şifre en az 8 karakter olmalı.", "The new password must be at least 8 characters.")); return; }
    if (p1 !== p2) { setErr(L("İki şifre aynı değil.", "The two passwords don't match.")); return; }
    const { error } = await sb().auth.updateUser({ password: p1 });
    if (error) { setErr(friendlyError(error)); return; }
    setPwOpen(false); setPwMsg(L("Şifreniz değiştirildi.", "Your password was changed."));
  }
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
  async function signOut() { await disablePush().catch(() => undefined); await sb().auth.signOut(); nav("/", { replace: true }); }
  async function remove() {
    setBusy(true); setErr(null);
    const { data, error } = await sb().rpc("delete_my_account");
    setBusy(false);
    if (error) { setErr(friendlyError(error)); return; }
    if (data === "active_subscription") { setErr(L("Aktif bir aboneliğiniz var. Önce aboneliği iptal edin, sonra hesabınızı silebilirsiniz. İptal için info@aisaasavran.com adresine yazın.", "You have an active subscription. Cancel it first, then delete your account. To cancel, email info@aisaasavran.com.")); return; }
    if (data !== "deleted") { setErr(L("Hesap silinemedi. Lütfen info@aisaasavran.com adresine yazın.", "Could not delete the account. Please email info@aisaasavran.com.")); return; }
    await disablePush().catch(() => undefined);
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
        {current && <span className="muted">{current.name}{u ? ` · ${L("Paket", "Plan")}: ${planTr(u.plan_id, u.plan_name)}` : ""}</span>}
      </div>
      {u && (
        <>
          <h2 className="label">{L("Bu ayki kullanım", "This month")}</h2>
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {quota.data?.hybrid ? (() => { const q = quota.data!; const row = (label: string, used: number, cap: number) => (
              <>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>{label}</span><span style={{ fontWeight: 700 }}>{used.toLocaleString("tr-TR")} / {cap.toLocaleString("tr-TR")}</span></div>
                <div className="meter"><i style={{ width: `${Math.min(100, Math.round((used / Math.max(1, cap)) * 100))}%`, background: "var(--accent)" }} /></div>
              </>);
              return <>
                {row(L("Soru hakkı (istediğiniz zaman)", "Question credits (any time)"), q.manual_used, q.manual_cap)}
                {row(L("Haftalık otomatik ölçüm", "Weekly automatic measurement"), q.weekly_used, q.weekly_cap)}
                <span className="muted small">{L("1 soru hakkı, bir sorunun bir yapay zekâya bir kez sorulmasıdır. Haklar her ay başında yenilenir.", "One credit is one question asked to one AI once. Credits renew at the start of each month.")}</span>
              </>; })() : <>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>{L("Yapay zekâ cevabı", "AI answers")}</span><span style={{ fontWeight: 700 }}>{u.engine_calls.toLocaleString("tr-TR")} / {u.engine_call_limit.toLocaleString("tr-TR")}</span></div>
              <div className="meter"><i style={{ width: `${Math.min(100, Math.round((u.engine_calls / Math.max(1, u.engine_call_limit)) * 100))}%`, background: "var(--accent)" }} /></div>
            </>}
            <span className="muted small">{L(`${u.brand_limit} marka · marka başına ${u.prompt_limit} soru · ${u.competitor_limit} rakip`, `${u.brand_limit} brands · ${u.prompt_limit} questions per brand · ${u.competitor_limit} competitors`)}</span>
          </div>
        </>
      )}
      <h2 className="label">{L("Bildirimler", "Notifications")}</h2>
      <div className="list">
        {push !== "unavailable" && <label className="row">{L("Ölçüm bitince telefona bildirim", "Phone notification when a measurement is done")}<input type="checkbox" role="switch" className="switch" checked={push === "on"} onChange={(e) => togglePush(e.target.checked)} /></label>}
        <label className="row">{L("Sonucum belirgin değişince e-posta gönder", "Email me when my result changes clearly")}<input type="checkbox" role="switch" className="switch" checked={drop} onChange={(e) => setPref("drop", e.target.checked)} /></label>
        {weekly !== null && <label className="row">{L("Haftalık özet e-postası", "Weekly summary email")}<input type="checkbox" role="switch" className="switch" checked={weekly} onChange={(e) => setPref("weekly", e.target.checked)} /></label>}
      </div>
      <h2 className="label">{L("Ayarlar", "Settings")}</h2>
      <div className="list">
        <label className="row">{L("Dil", "Language")}
          <select value={getLang()} onChange={(e) => switchLang(e.target.value as "tr" | "en")} style={{ background: "transparent", border: 0, color: "var(--muted)", fontSize: 15, minHeight: 44 }}>
            <option value="tr">Türkçe</option><option value="en">English</option>
          </select>
        </label>
        <button className="row" onClick={() => { setPwOpen(!pwOpen); setPwMsg(null); }} aria-expanded={pwOpen}>{L("Şifre değiştir", "Change password")}<span className="muted">{Icon.chevron}</span></button>
        {pwOpen && (
          <form onSubmit={changePassword} style={{ display: "flex", flexDirection: "column", gap: 10, padding: "10px 0 14px" }} noValidate>
            <label className="field">{L("Yeni şifre", "New password")}<input name="p1" type="password" autoComplete="new-password" /></label>
            <label className="field">{L("Yeni şifre (tekrar)", "New password (again)")}<input name="p2" type="password" autoComplete="new-password" /></label>
            <button className="btn btn-primary">{L("Şifreyi kaydet", "Save password")}</button>
          </form>
        )}
      </div>
      {pwMsg && <p className="ok" role="status">{pwMsg}</p>}
      <Err msg={err} />
      <button className="btn btn-ghost" onClick={signOut}>{L("Çıkış yap", "Sign out")}</button>
      <button className="btn btn-text" style={{ alignSelf: "center", color: "var(--muted)" }} onClick={() => setDel(true)}>{L("Hesap ve veriler", "Account and data")}</button>
      <Sheet open={del} onClose={() => setDel(false)} title={L("Hesabı silmek", "Deleting your account")}>
        <p style={{ margin: 0 }}>{L("Hesabınız, tek başınıza sahip olduğunuz çalışma alanları ve bütün ölçümleri kalıcı olarak silinir. Ekipli alanda sahiplik en eski üyeye geçer. Geri alınamaz.", "Your account, the workspaces you own alone and all their measurements are permanently deleted. In a team workspace, ownership passes to the longest-standing member. This cannot be undone.")}</p>
        <Err msg={err} />
        <button className="btn btn-danger-solid" disabled={busy} onClick={remove}>{L("Hesabımı kalıcı olarak sil", "Permanently delete my account")}</button>
        <button className="btn btn-ghost" onClick={() => setDel(false)}>{L("Vazgeç", "Cancel")}</button>
      </Sheet>
    </div>
  );
}
