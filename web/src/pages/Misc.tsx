import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useApp, useLoad } from "../lib/app";
import { api, type AdminWorkspace } from "../lib/data";
import { runtimeConfig, sb, friendlyError } from "../lib/supabase";
import { Button, Empty, ErrorBox, Field, Loading, Select } from "../components/ui";
import { L, isEn } from "../lib/i18n";
import { LangSwitch } from "../components/Shell";
import { BillingPanel } from "../components/Billing";
import { EmailPrefs } from "../components/EmailPrefs";
import { TeamPanel } from "../components/Team";
import { ApiPanel } from "../components/ApiPanel";

type Level = "works" | "partial" | "missing";
const STATUS: { area: string; items: [Level, string, string][] }[] = [
  {
    area: L("Hesap ve güvenlik", "Account and security"),
    items: [
      ["works", L("Kayıt, giriş, Google ile giriş", "Sign-up, sign-in, Google sign-in"), L("Supabase Auth ile; her sürümde otomatik test ediliyor.", "Via Supabase Auth; tested automatically on every release.")],
      ["partial", L("Şifre sıfırlama ve e-posta doğrulama", "Password reset and email confirmation"), L("Çalışıyor; e-posta gönderim sınırı şimdilik düşük.", "Works; the email sending limit is low for now.")],
      ["works", L("Müşteri verisi izolasyonu", "Customer data isolation"), L("Veritabanı satır güvenliğiyle; her sürümde otomatik test ediliyor.", "Enforced by database row-level security; tested on every release.")],
      ["works", L("Paket limitleri ve aylık kota", "Plan limits and monthly quota"), L("Limit aşılınca ölçüm durur.", "Measurements stop when a limit is reached.")],
      ["missing", L("Ekip üyesi davet etme", "Team invitations"), L("Henüz yok.", "Not yet.")],
      ["works", L("Ödeme ve paket yükseltme", "Payments and upgrades"), L("Paddle üzerinden aylık abonelik; ödeme sonrası paket otomatik açılır, iptal Paddle sayfasından.", "Monthly subscriptions via Paddle; the plan opens automatically after payment, cancel from the Paddle page.")],
        ["works", L("Haftalık e-posta özeti", "Weekly email summary"), L("Pazartesi sabahı, o hafta ölçüm yapıldıysa; hesap sayfasından kapatılabilir.", "Monday mornings when there were measurements; can be turned off from the account page.")],
    ],
  },
  {
    area: L("Ölçüm", "Measurement"),
    items: [
      ["works", L("Gemini aramasız ölçüm (model bilgisi)", "Gemini without search (model knowledge)"), L("Ücretsiz katmanda çalışıyor; ayrı veri türü olarak gösterilir.", "Runs on the free tier; shown as its own data type.")],
      ["partial", L("ChatGPT ile canlı web aramalı ölçüm", "ChatGPT live web-search measurement"), L("Deneme aşamasında; yalnız kendi test alanımızda, harcama tavanıyla. Müşterilere henüz açık değil.", "In trial, only in our own test workspace with a spending cap. Not yet open to customers.")],
      ["missing", "Perplexity", L("Henüz yok.", "Not yet.")],
      ["works", L("Otomatik ölçüm işleme ve haftalık ölçüm", "Automatic processing and weekly runs"), L("Ölçümler saatlik işlenir; her marka haftada bir otomatik ölçülür.", "Measurements are processed hourly; each brand is measured weekly.")],
      ["partial", L("Önerilme tespiti", "Recommendation detection"), L("Kural tabanlı; ürün adları ve yazılışlar marka ile eşleştirilir.", "Rule-based; product names and spellings are matched to brands.")],
    ],
  },
  {
    area: L("Rapor", "Reports"),
    items: [
      ["works", L("Anılma, önerilme, rakip payı, güven aralığı", "Mentions, recommendations, share, confidence range"), L("Her oran örneklem sayısıyla ve aralığıyla gösterilir.", "Every rate is shown with its sample size and range.")],
      ["works", L("Geçmiş ölçüm grafiği ve soru bazında sonuç", "History chart and per-question results"), L("Hangi soruda önerildiğiniz, hangi rakibin öne çıktığı.", "Which questions recommend you and which competitor leads.")],
      ["works", L("Kaynak analizi, kaynak egemenliği ve kayıp nedeni kanıtları", "Source analysis, source dominance and loss evidence"), L("Yalnız canlı aramalı ölçümde (ChatGPT). Kanıt gösterir; kesin neden iddia etmez.", "Only with live-search measurements (ChatGPT). Shows evidence; does not claim a proven cause.")],
      ["works", L("Web sitesi kontrolü ve öneriler", "Website check and recommendations"), L("Kural tabanlı; yapay zekâ ile üretilmez.", "Rule-based; not AI-generated.")],
      ["partial", L("Ürün doğruluğu (deneme)", "Product accuracy (pilot)"), L("Ücretli paketlerde: ChatGPT'nin ürününüz hakkında söylediklerini girdiğiniz doğru bilgilerle karşılaştırır. Karşılaştırma bir yapay zekâ adımıdır ve yanılabilir.", "On paid plans: compares what ChatGPT says about your product with the facts you enter. The comparison is an AI step and can be wrong.")],
      ["partial", L("PDF rapor", "PDF reports"), L("Rapor, tarayıcının yazdır penceresinden PDF olarak kaydedilir; ayrı bir PDF dosyası üretilmez.", "Reports can be saved as PDF from the browser's print dialog; no separate PDF file is generated.")],
    ],
  },
];
const LEVEL_TEXT: Record<Level, string> = { works: L("Çalışıyor", "Works"), partial: L("Kısmen", "Partly"), missing: L("Yok", "Not yet") };

export function ProductStatus() {
  const env = runtimeConfig()?.environment;
  const { session } = useApp();
  return (
    <div className="stack">
      <header className="page-head">
        <h1>{L("Ürünün şu anki durumu", "Product status")}</h1>
        <p className="lead">{L("Erken erişim aşamasındayız. Ücretsiz ölçümler internete bakmadan (model bilgisiyle) yapılır ve raporda bu açıkça yazar.", "We are in early access. Free measurements use model knowledge without web search, and reports say so clearly.")} {L("Ürün henüz gerçek müşteri kullanımına hazır değildir.", "The product is not yet ready for real customer use.")}</p>
        {env && env !== "production" && <p className="muted">{L("Ortam:", "Environment:")} {env === "test" ? L("test (yerel)", "test (local)") : env}</p>}
      </header>
      {STATUS.map((g) => (
        <section className="panel" key={g.area}>
          <h2>{g.area}</h2>
          <ul className="status-list">
            {g.items.map(([lvl, name, note]) => (
              <li key={name} className={`st-${lvl}`}>
                <span className="st-badge">{LEVEL_TEXT[lvl]}</span>
                <span><strong>{name}</strong><span className="muted">{note}</span></span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {!session && <p><Link to="/giris">{L("Giriş sayfasına dön", "Back to sign in")}</Link></p>}
    </div>
  );
}

export function Account() {
  const { session } = useApp();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [recovery, setRecovery] = useState(() => { try { return sessionStorage.getItem("recovery") === "1" || /type=recovery/.test(location.hash); } catch { return false; } });
  useEffect(() => {
    if (recovery) document.getElementById("yeni-sifre")?.scrollIntoView({ block: "center" });
    const t = setInterval(() => { try { if (sessionStorage.getItem("recovery") === "1") setRecovery(true); } catch { /* yok say */ } }, 500);
    return () => clearInterval(t);
  }, [recovery]);
  async function changePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const password = String(new FormData(form).get("password"));
    if (password.length < 8) { setErr(L("Şifre en az 8 karakter olmalı.", "Password must be at least 8 characters.")); return; }
    setBusy(true); setErr(null); setMsg(null);
    const { error } = await sb().auth.updateUser({ password });
    setBusy(false);
    if (error) setErr(friendlyError(error)); else {
      setMsg(L("Şifreniz güncellendi. Bundan sonra yeni şifrenizle giriş yapabilirsiniz.", "Password updated. Use your new password from now on."));
      form.reset(); setRecovery(false); try { sessionStorage.removeItem("recovery"); } catch { /* yok say */ }
    }
  }
  return (
    <div className="stack narrow">
      <header className="page-head"><h1>{L("Hesap", "Account")}</h1><p className="muted">{session?.user.email}</p></header>
      <BillingPanel />
      <TeamPanel />
      <ApiPanel />
      <EmailPrefs />
      {recovery && <p className="caution" role="alert">{L("Şifre sıfırlama bağlantısıyla giriş yaptınız. Lütfen aşağıdan yeni şifrenizi belirleyin.", "You signed in with a password reset link. Please set your new password below.")}</p>}
      <form className="panel stack" onSubmit={changePassword} noValidate id="yeni-sifre">
        <h2>{recovery ? L("Yeni şifrenizi belirleyin", "Set your new password") : L("Şifre değiştir", "Change password")}</h2>
        <Field label={L("Yeni şifre", "New password")} name="password" type="password" autoComplete="new-password" minLength={8} hint={L("En az 8 karakter", "At least 8 characters")} />
        <ErrorBox message={err} />
        {msg && <p className="success-box">{msg}</p>}
        <Button type="submit" busy={busy}>{L("Şifreyi güncelle", "Update password")}</Button>
      </form>
      <section className="panel">
        <h2>{L("Dil", "Language")}</h2>
        <p className="muted">{L("Arayüz dili: Türkçe.", "Interface language: English.")} <LangSwitch /></p>
      </section>
      <section className="panel">
        <h2>{L("Verileriniz", "Your data")}</h2>
        <p className="muted">{L("Hesabınızın ve verilerinizin silinmesini istemek için kayıtlı e-postanızdan şu adrese yazın:", "To delete your account and data, email us from your registered address:")} info@aisaasavran.com. <Link to="/gizlilik">{L("Gizlilik politikası", "Privacy policy")}</Link> · <Link to="/kosullar">{L("Kullanım koşulları", "Terms of use")}</Link></p>
      </section>
      <Button variant="quiet" onClick={async () => { await sb().auth.signOut(); nav("/giris"); }}>{L("Çıkış yap", "Sign out")}</Button>
    </div>
  );
}

export function DemoLab() {
  const { isAdmin, workspaces, select } = useApp();
  const nav = useNavigate();
  if (!isAdmin) return <Empty title={L("Bu sayfa yalnızca platform yöneticilerine açıktır", "This page is for platform admins only")} />;
  const demos = workspaces.filter((w) => w.kind === "demo_lab");
  return (
    <div className="stack">
      <header className="page-head">
        <h1>Demo Lab</h1>
        <p><Link className="btn btn-quiet btn-small" to="/yonetim">{L("Müşteriler ve ücretsiz paket verme", "Customers and free plans")}</Link></p>
        <p className="lead">{L("Satış demosu ve test için hayali markalar. Buradaki ölçümler hiçbir yapay zekâ platformuna gitmez; tamamen simülasyondur ve gerçek müşteri çalışma alanlarına yazılamaz.", "Fictional brands for demos and testing. Nothing here contacts any AI platform; it is fully simulated and cannot write to real customer workspaces.")}</p>
      </header>
      {demos.length === 0 ? <Empty title={L("Henüz demo çalışma alanı yok", "No demo workspace yet")}><p>{L("Demo verisi sunucu tarafında otomatik yüklenir.", "Demo data is loaded automatically on the server.")}</p></Empty> : (
        <ul className="rows panel">
          {demos.map((d) => (
            <li key={d.id}><strong>{d.name}</strong><Button variant="quiet" className="btn-small" onClick={() => { select(d.id); nav("/panel"); }}>{L("Aç", "Open")}</Button></li>
          ))}
        </ul>
      )}
    </div>
  );
}

const PLAN_NAMES: Record<string, string> = { free: "Free", starter: "Plus", pro: "Pro", agency: "Business" };

/** Yönetici: müşteri çalışma alanları ve ücretsiz paket verme. */
export function AdminCustomers() {
  const { isAdmin, reload } = useApp();
  const list = useLoad(() => (isAdmin ? api.adminWorkspaces() : Promise.resolve([])), [isAdmin]);
  const [q, setQ] = useState("");
  if (!isAdmin) return <Empty title={L("Bu sayfa yalnızca platform yöneticilerine açıktır", "This page is for platform admins only")} />;
  const rows = (list.data ?? []).filter((w) => !q || `${w.name} ${w.owner_email ?? ""}`.toLocaleLowerCase("tr-TR").includes(q.toLocaleLowerCase("tr-TR")));
  return (
    <div className="stack">
      <header className="page-head">
        <h1>{L("Müşteriler", "Customers")}</h1>
        <p className="lead">{L("Müşterilere ödeme almadan paket verebilirsiniz. Ödeme alınmaz; API maliyeti size yazılır. Paket kotaları ve aylık harcama tavanları aynen geçerlidir. Ücretli (Paddle) aboneliği olan alanlar abonelikten yönetilir.", "You can give customers a plan without payment. API costs are on you; plan quotas and monthly spend caps still apply. Workspaces with a paid (Paddle) subscription are managed by the subscription.")}</p>
      </header>
      <label className="field"><span>{L("Ara (ad veya e-posta)", "Search (name or email)")}</span><input value={q} onChange={(e) => setQ(e.target.value)} /></label>
      {list.loading ? <Loading /> : list.error ? <ErrorBox message={list.error} /> : rows.length === 0 ? <Empty title={L("Müşteri yok", "No customers")} /> : (
        <ul className="rows panel">{rows.map((w) => <AdminRow key={w.id} w={w} onChange={() => { list.reload(); reload(); }} />)}</ul>
      )}
    </div>
  );
}

function AdminRow({ w, onChange }: { w: AdminWorkspace; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const plan = String(f.get("plan"));
    const until = String(f.get("until") || "") || null;
    setBusy(true); setErr(null); setMsg(null);
    try { await api.adminSetPlan(w.id, plan, plan === "free" ? null : until); setMsg(L("Kaydedildi.", "Saved.")); onChange(); }
    catch (x) { setErr(friendlyError(x)); } finally { setBusy(false); }
  }
  return (
    <li className="stack">
      <span><strong>{w.name}</strong> <span className="q-meta">{w.owner_email ?? "?"} · {w.kind === "agency" ? L("Ajans", "Agency") : L("İşletme", "Business")} · {isEn() ? `${w.brands} brand(s)` : `${w.brands} marka`}</span></span>
      <span className="muted">{L("Paket", "Plan")}: <strong>{PLAN_NAMES[w.plan] ?? w.plan}</strong>
        {w.comped ? (w.comped_until ? (isEn() ? ` (free, until ${w.comped_until})` : ` (ücretsiz verildi, ${w.comped_until} tarihine kadar)`) : L(" (ücretsiz verildi, süresiz)", " (free, no end date)")) : ""}
        {w.has_paddle ? L(" · Paddle aboneliği", " · Paddle subscription") : ""}{w.status === "paused" ? L(" · durduruldu", " · paused") : ""}</span>
      {!w.has_paddle || !["active", "trialing", "past_due"].includes(w.subscription_status ?? "") ? (
        <form className="stack" onSubmit={save} noValidate aria-label={isEn() ? `Plan for ${w.name}` : `${w.name} paketi`}>
          <Select label={L("Yeni paket", "New plan")} name="plan" defaultValue={w.plan}>
            {Object.entries(PLAN_NAMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <Field label={L("Bitiş tarihi (isteğe bağlı)", "End date (optional)")} name="until" type="date" defaultValue={w.comped_until ?? ""} hint={L("Boşsa süresiz. Tarih geçince paket kendiliğinden Free'ye döner.", "Empty means no end date. After the date the plan returns to Free automatically.")} />
          <ErrorBox message={err} />
          {msg && <p className="success-box" role="status">{msg}</p>}
          <Button type="submit" variant="quiet" busy={busy}>{L("Paketi uygula", "Apply plan")}</Button>
        </form>
      ) : <p className="src-sup muted">{L("Bu alanın paketi Paddle aboneliğiyle yönetiliyor.", "This plan is managed by its Paddle subscription.")}</p>}
    </li>
  );
}

/** Davet bağlantısı: giriş yapmış kullanıcı daveti kabul eder. */
export function AcceptInvite() {
  const { token = "" } = useParams();
  const { reload, select, session } = useApp();
  const nav = useNavigate();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function accept() {
    setBusy(true); setErr(null);
    try { const ws = await api.acceptInvite(token); await reload(); select(ws); nav("/panel", { replace: true }); }
    catch (x) { setErr(friendlyError(x)); setBusy(false); }
  }
  return (
    <div className="stack narrow">
      <header className="page-head"><h1>{L("Ekip daveti", "Team invitation")}</h1>
        <p className="muted">{isEn() ? `Signed in as ${session?.user.email}. The invitation must have been sent to this address.` : `${session?.user.email} olarak giriş yaptınız. Davet bu adrese gönderilmiş olmalı.`}</p></header>
      <ErrorBox message={err} />
      <Button onClick={accept} busy={busy}>{L("Daveti kabul et ve katıl", "Accept and join")}</Button>
    </div>
  );
}
