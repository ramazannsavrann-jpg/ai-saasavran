// Ekip: üyeler, roller, davetler (Hesap sayfası) ve gelen davetler (Panel).
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useApp, useLoad } from "../lib/app";
import { api } from "../lib/data";
import { friendlyError } from "../lib/supabase";
import { L, isEn } from "../lib/i18n";
import { formatDate } from "../lib/report";
import { Button, Confirm, ErrorBox, Field, Select } from "./ui";

export const ROLE_TEXT: Record<string, () => string> = {
  owner: () => L("Sahip", "Owner"),
  admin: () => L("Yönetici (davet eder, rolleri değiştirir)", "Admin (invites, changes roles)"),
  editor: () => L("Düzenleyici (marka, soru, ölçüm)", "Editor (brands, questions, measurements)"),
  viewer: () => L("İzleyici (yalnız raporları görür)", "Viewer (reports only)"),
};
const shortRole = (r: string) => ROLE_TEXT[r]?.().split(" (")[0] ?? r;

export function TeamPanel() {
  const { current, reload, select } = useApp();
  const ws = current!;
  const nav = useNavigate();
  const team = useLoad(() => api.team(ws.id), [ws.id]);
  const me = (team.data ?? []).find((m) => m.is_me);
  const isAdmin = me?.role === "owner" || me?.role === "admin";
  const isOwner = me?.role === "owner";
  const invites = useLoad(() => (isAdmin ? api.invites(ws.id) : Promise.resolve([])), [ws.id, isAdmin]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  if (ws.kind !== "business" && ws.kind !== "agency") return null;
  const url = (t: string) => `${location.origin}/davet/${t}`;
  async function invite(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setBusy(true); setErr(null); setLink(null);
    try {
      const t = await api.createInvite(ws.id, String(f.get("email") || ""), String(f.get("role") || "editor"));
      setLink(url(t)); form.reset(); invites.reload();
    } catch (x) { setErr(friendlyError(x)); } finally { setBusy(false); }
  }
  async function share(t: string) {
    try { if (navigator.share) await navigator.share({ title: "AI SaaSavran", text: L(`${ws.name} ekibine davet`, `Invitation to ${ws.name}`), url: url(t) }); else await navigator.clipboard.writeText(url(t)); } catch { /* vazgeçildi */ }
  }
  async function act(fn: () => Promise<void>) {
    setErr(null);
    try { await fn(); team.reload(); invites.reload(); } catch (x) { setErr(friendlyError(x)); }
  }
  return (
    <section className="panel stack" id="ekip">
      <h2>{L("Ekip", "Team")}</h2>
      <p className="muted">{isEn() ? `Workspace: ${ws.name}` : `Çalışma alanı: ${ws.name}`}</p>
      <ul className="rows">{(team.data ?? []).map((m) => (
        <li key={m.user_id} className="stack">
          <span><strong>{m.email}</strong>{m.is_me && <em className="muted"> {L("(siz)", "(you)")}</em>}<span className="q-meta">{shortRole(m.role)}</span></span>
          {isAdmin && !m.is_me && m.role !== "owner" && (isOwner || m.role !== "admin") && (
            <span className="row-form">
              <Select label={L("Rol", "Role")} name={`role-${m.user_id}`} defaultValue={m.role} onChange={(e) => act(() => api.setMemberRole(ws.id, m.user_id, e.target.value))}>
                {(isOwner ? ["admin", "editor", "viewer"] : ["editor", "viewer"]).map((r) => <option key={r} value={r}>{shortRole(r)}</option>)}
              </Select>
              <Confirm label={L("Ekipten çıkarılsın mı?", "Remove from team?")} onConfirm={() => act(() => api.removeMember(ws.id, m.user_id))}>{L("Çıkar", "Remove")}</Confirm>
            </span>
          )}
          {m.is_me && m.role !== "owner" && (
            <Confirm label={L("Bu çalışma alanından ayrılmak istiyor musunuz?", "Leave this workspace?")} onConfirm={async () => { await api.removeMember(ws.id, m.user_id); select(""); await reload(); nav("/panel"); }}>{L("Ekipten ayrıl", "Leave team")}</Confirm>
          )}
        </li>
      ))}</ul>
      {isAdmin && (
        <>
          <form className="stack" onSubmit={invite} noValidate aria-label={L("Ekibe davet et", "Invite to team")}>
            <h3>{L("Davet et", "Invite")}</h3>
            <Field label={L("E-posta adresi", "Email address")} name="email" type="email" required autoComplete="off" />
            <Select label={L("Rol", "Role")} name="role" defaultValue="editor">
              {(isOwner ? ["admin", "editor", "viewer"] : ["editor", "viewer"]).map((r) => <option key={r} value={r}>{ROLE_TEXT[r]()}</option>)}
            </Select>
            <p className="src-sup muted">{L("Davet edilen kişi bu e-posta adresiyle kaydolup giriş yapınca davet panelinde görünür. Ayrıca aşağıdaki davet bağlantısını kendisine gönderebilirsiniz. Davet 14 gün geçerli. Kişi sınırı paketinize göre: Plus 2, Pro 5, Business 15 kişi (sahip dahil).", "The invited person sees the invitation on their dashboard after signing up with this email. You can also send them the invitation link below. Valid for 14 days. Seats depend on your plan: Plus 2, Pro 5, Business 15 (including the owner).")}</p>
            <ErrorBox message={err} />
            <Button type="submit" busy={busy}>{L("Davet oluştur", "Create invitation")}</Button>
          </form>
          {link && <p className="success-box" role="status">{L("Davet oluşturuldu. Bağlantıyı gönderin: ", "Invitation created. Send this link: ")}<a href={link}>{link}</a></p>}
          {(invites.data ?? []).length > 0 && (
            <>
              <h3>{L("Bekleyen davetler", "Pending invitations")}</h3>
              <ul className="rows">{(invites.data ?? []).map((i) => (
                <li key={i.id}>
                  <span>{i.email}<span className="q-meta">{shortRole(i.role)} · {isEn() ? `until ${formatDate(i.expires_at)}` : `${formatDate(i.expires_at)} tarihine kadar`}</span></span>
                  <span><button className="link-btn" onClick={() => share(i.token)}>{L("Bağlantıyı gönder", "Send link")}</button>
                    <Confirm label={L("Davet iptal edilsin mi?", "Revoke invitation?")} onConfirm={() => act(() => api.revokeInvite(i.id))}>{L("İptal et", "Revoke")}</Confirm></span>
                </li>
              ))}</ul>
            </>
          )}
        </>
      )}
      {!isAdmin && !err && <p className="src-sup muted">{L("Davet göndermek için sahip ya da yönetici olmalısınız.", "Only owners and admins can invite.")}</p>}
      {!isAdmin && <ErrorBox message={err} />}
    </section>
  );
}

/** Panelde: bu e-postaya gelen bekleyen davetler. */
export function MyInvites() {
  const { reload, select } = useApp();
  const nav = useNavigate();
  const inv = useLoad(() => api.myInvites(), []);
  const [err, setErr] = useState<string | null>(null);
  if (!inv.data || inv.data.length === 0) return null;
  async function accept(token: string) {
    setErr(null);
    try { const ws = await api.acceptInvite(token); await reload(); select(ws); inv.reload(); nav("/panel"); } catch (x) { setErr(friendlyError(x)); }
  }
  return (
    <section className="panel stack notice">
      <h2>{L("Size gelen davetler", "Invitations for you")}</h2>
      <ul className="rows">{inv.data.map((i) => (
        <li key={i.id}>
          <span><strong>{i.workspace_name}</strong><span className="q-meta">{shortRole(i.role)}</span></span>
          <Button variant="quiet" className="btn-small" onClick={() => accept(i.token)}>{L("Katıl", "Join")}</Button>
        </li>
      ))}</ul>
      <ErrorBox message={err} />
    </section>
  );
}
