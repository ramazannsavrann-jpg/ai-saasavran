import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { sb, friendlyError, isEmail } from "../lib/supabase";
import { t } from "../lib/i18n";
import { Button, ErrorBox, Field } from "../components/ui";

function AuthLayout({ title, lead, children }: { title: string; lead: string; children: React.ReactNode }) {
  return (
    <div className="auth">
      <div className="auth-intro">
        <svg viewBox="0 0 32 32" width="40" height="40" aria-hidden className="auth-mark"><rect width="32" height="32" rx="8" fill="currentColor" /><circle cx="16" cy="16" r="5" fill="var(--paper)" /><circle cx="16" cy="16" r="10" fill="none" stroke="var(--paper)" strokeWidth="2" strokeDasharray="3 3" /></svg>
        <h1>{title}</h1>
        <p>{lead}</p>
      </div>
      <div className="auth-card">{children}</div>
      <p className="auth-foot"><Link to="/durum">Ürünün şu anki durumu</Link></p>
    </div>
  );
}

export function Login() {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email")).trim();
    if (!isEmail(email)) { setErr("Geçerli bir e-posta adresi girin."); return; }
    if (!String(f.get("password"))) { setErr("Şifrenizi girin."); return; }
    setBusy(true); setErr(null);
    const { error } = await sb().auth.signInWithPassword({ email, password: String(f.get("password")) });
    setBusy(false);
    if (error) setErr(friendlyError(error)); else nav("/panel");
  }
  return (
    <AuthLayout title="Markanız yapay zekâ cevaplarında nerede?" lead="Gemini'ye müşterilerinizin sorduğu soruları sorar, markanızın anılıp anılmadığını ve önerilip önerilmediğini ölçeriz.">
      <form onSubmit={submit} noValidate>
        <h2>{t("auth.login")}</h2>
        <Field label={t("auth.email")} name="email" type="email" autoComplete="email" required />
        <Field label={t("auth.password")} name="password" type="password" autoComplete="current-password" required />
        <ErrorBox message={err} />
        <Button type="submit" busy={busy}>{t("auth.login")}</Button>
        <p className="auth-links"><Link to="/sifre">{t("auth.forgot")}</Link><span>{t("auth.noAccount")} <Link to="/kayit">{t("auth.signup")}</Link></span></p>
      </form>
    </AuthLayout>
  );
}

export function Signup() {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email")).trim();
    const password = String(f.get("password"));
    if (!isEmail(email)) { setErr("Geçerli bir e-posta adresi girin."); return; }
    if (password.length < 8) { setErr("Şifre en az 8 karakter olmalı."); return; }
    if (!f.get("kvkk")) { setErr("Devam etmek için aydınlatma metnini onaylayın."); return; }
    setBusy(true); setErr(null);
    const { data, error } = await sb().auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/panel` } });
    setBusy(false);
    if (error) setErr(friendlyError(error));
    else if (data.session) nav("/calisma-alani/yeni");
    else setSent(true); // e-posta doğrulaması açık ortamlar
  }
  return (
    <AuthLayout title="Hesap oluşturun" lead="Ücretsiz pakette 1 marka, 2 rakip ve 10 soruyla başlarsınız. Kart bilgisi istenmez.">
      {sent ? <p className="success-box">{t("auth.checkEmail")}</p> : (
        <form onSubmit={submit} noValidate>
          <h2>{t("auth.signup")}</h2>
          <Field label={t("auth.email")} name="email" type="email" autoComplete="email" required />
          <Field label={t("auth.password")} name="password" type="password" autoComplete="new-password" hint={t("auth.passwordHint")} minLength={8} required />
          <label className="check">
            <input type="checkbox" name="kvkk" />
            <span>Kişisel verilerimin hesap ve ölçüm hizmeti için işlenmesine ilişkin aydınlatma metnini okudum. <em>(Metin yayına almadan önce hukuki olarak hazırlanacak.)</em></span>
          </label>
          <ErrorBox message={err} />
          <Button type="submit" busy={busy}>{t("auth.signup")}</Button>
          <p className="auth-links"><span>{t("auth.haveAccount")} <Link to="/giris">{t("auth.login")}</Link></span></p>
        </form>
      )}
    </AuthLayout>
  );
}

export function Forgot() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email")).trim();
    if (!isEmail(email)) { setErr("Geçerli bir e-posta adresi girin."); return; }
    setBusy(true); setErr(null);
    const { error } = await sb().auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/hesap` });
    setBusy(false);
    if (error) setErr(friendlyError(error)); else setDone(true);
  }
  return (
    <AuthLayout title="Şifre sıfırlama" lead="Kayıtlı e-posta adresinize bir sıfırlama bağlantısı göndereceğiz.">
      {done ? <p className="success-box">{t("auth.resetSent")}</p> : (
        <form onSubmit={submit} noValidate>
          <Field label={t("auth.email")} name="email" type="email" autoComplete="email" required />
          <ErrorBox message={err} />
          <Button type="submit" busy={busy}>{t("auth.sendReset")}</Button>
          <p className="auth-links"><Link to="/giris">{t("auth.login")}</Link></p>
        </form>
      )}
    </AuthLayout>
  );
}
