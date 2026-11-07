import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../lib/app";
import { runtimeConfig, sb, friendlyError } from "../lib/supabase";
import { Button, Empty, ErrorBox, Field } from "../components/ui";
import { L } from "../lib/i18n";
import { LangSwitch } from "../components/Shell";
import { BillingPanel } from "../components/Billing";

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
      ["partial", L("Kaynak (citation) analizi", "Source (citation) analysis"), L("Yalnız canlı aramalı ölçümde; deneme aşamasında.", "Only with live-search measurement; in trial.")],
      ["works", L("Web sitesi kontrolü ve öneriler", "Website check and recommendations"), L("Kural tabanlı; yapay zekâ ile üretilmez.", "Rule-based; not AI-generated.")],
      ["missing", L("PDF rapor", "PDF reports"), L("Henüz yok; özet metin paylaşılabilir.", "Not yet; a text summary can be shared.")],
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
  async function changePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const password = String(new FormData(form).get("password"));
    if (password.length < 8) { setErr(L("Şifre en az 8 karakter olmalı.", "Password must be at least 8 characters.")); return; }
    setBusy(true); setErr(null); setMsg(null);
    const { error } = await sb().auth.updateUser({ password });
    setBusy(false);
    if (error) setErr(friendlyError(error)); else { setMsg(L("Şifreniz güncellendi.", "Password updated.")); form.reset(); }
  }
  return (
    <div className="stack narrow">
      <header className="page-head"><h1>{L("Hesap", "Account")}</h1><p className="muted">{session?.user.email}</p></header>
      <BillingPanel />
      <form className="panel stack" onSubmit={changePassword} noValidate>
        <h2>{L("Şifre değiştir", "Change password")}</h2>
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
