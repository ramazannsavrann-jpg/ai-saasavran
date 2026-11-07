import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { sb, friendlyError, isEmail, authProviders } from "../lib/supabase";
import { t, L, isEn } from "../lib/i18n";
import { LangSwitch } from "../components/Shell";
import { Button, ErrorBox, Field } from "../components/ui";

/** "Google ile devam et": yalnızca Supabase'de Google girişi açıksa görünür. */
function GoogleButton({ signup }: { signup?: boolean }) {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { authProviders().then((p) => setEnabled(p.google)); }, []);
  if (!enabled) return null;
  async function go() {
    setBusy(true); setErr(null);
    const { error } = await sb().auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/panel` } });
    if (error) { setErr(friendlyError(error)); setBusy(false); }
  }
  return (
    <div className="oauth">
      <button type="button" className="btn btn-google" onClick={go} disabled={busy} aria-busy={busy}>
        <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden>
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>
        </svg>
        {busy ? L("Google'a yönlendiriliyor…", "Redirecting to Google…") : L("Google ile devam et", "Continue with Google")}
      </button>
      {signup && (isEn()
        ? <p className="field-hint">By continuing with Google you confirm you've read the <Link to="/gizlilik" target="_blank">privacy notice</Link> and accept the <Link to="/kosullar" target="_blank">terms</Link>.</p>
        : <p className="field-hint">Google ile devam ederek <Link to="/gizlilik" target="_blank">aydınlatma metnini</Link> okuduğunuzu ve <Link to="/kosullar" target="_blank">kullanım koşullarını</Link> kabul ettiğinizi onaylarsınız.</p>)}
      <ErrorBox message={err} />
      <p className="or" aria-hidden><span>{L("veya e-posta ile", "or with email")}</span></p>
    </div>
  );
}

function AuthLayout({ title, lead, children }: { title: string; lead: string; children: React.ReactNode }) {
  return (
    <div className="auth">
      <div className="auth-intro">
        <svg viewBox="0 0 32 32" width="40" height="40" aria-hidden className="auth-mark"><rect width="32" height="32" rx="8" fill="currentColor" /><circle cx="16" cy="16" r="5" fill="var(--paper)" /><circle cx="16" cy="16" r="10" fill="none" stroke="var(--paper)" strokeWidth="2" strokeDasharray="3 3" /></svg>
        <h1>{title}</h1>
        <p>{lead}</p>
      </div>
      <div className="auth-card">{children}</div>
      <p className="auth-foot"><Link to="/durum">{L("Ürünün şu anki durumu", "Product status")}</Link> · <Link to="/gizlilik">{L("Gizlilik", "Privacy")}</Link> · <Link to="/kosullar">{L("Koşullar", "Terms")}</Link> · <LangSwitch /></p>
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
    if (!isEmail(email)) { setErr(L("Geçerli bir e-posta adresi girin.", "Enter a valid email address.")); return; }
    if (!String(f.get("password"))) { setErr(L("Şifrenizi girin.", "Enter your password.")); return; }
    setBusy(true); setErr(null);
    const { error } = await sb().auth.signInWithPassword({ email, password: String(f.get("password")) });
    setBusy(false);
    if (error) setErr(friendlyError(error)); else nav("/panel");
  }
  return (
    <AuthLayout title={L("Markanız yapay zekâ cevaplarında nerede?", "Where does your brand stand in AI answers?")} lead={L("Gemini'ye müşterilerinizin sorduğu soruları sorar, markanızın anılıp anılmadığını ve önerilip önerilmediğini ölçeriz.", "We ask AI assistants the questions your customers ask, and measure whether your brand is mentioned and recommended.")}>
      <form onSubmit={submit} noValidate>
        <h2>{t("auth.login")}</h2>
        <GoogleButton />
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
    if (!isEmail(email)) { setErr(L("Geçerli bir e-posta adresi girin.", "Enter a valid email address.")); return; }
    if (password.length < 8) { setErr(L("Şifre en az 8 karakter olmalı.", "Password must be at least 8 characters.")); return; }
    if (!f.get("kvkk")) { setErr(L("Devam etmek için aydınlatma metnini onaylayın.", "Accept the privacy notice to continue.")); return; }
    setBusy(true); setErr(null);
    const { data, error } = await sb().auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/panel` } });
    setBusy(false);
    if (error) setErr(friendlyError(error));
    else if (data.session) nav("/calisma-alani/yeni");
    else setSent(true); // e-posta doğrulaması açık ortamlar
  }
  return (
    <AuthLayout title={L("Hesap oluşturun", "Create your account")} lead={L("Ücretsiz pakette 1 marka, 2 rakip ve 10 soruyla başlarsınız. Kart bilgisi istenmez.", "The free plan includes 1 brand, 2 competitors and 10 questions. No card required.")}>
      {sent ? <p className="success-box">{t("auth.checkEmail")}</p> : (
        <form onSubmit={submit} noValidate>
          <h2>{t("auth.signup")}</h2>
          <GoogleButton signup />
          <Field label={t("auth.email")} name="email" type="email" autoComplete="email" required />
          <Field label={t("auth.password")} name="password" type="password" autoComplete="new-password" hint={t("auth.passwordHint")} minLength={8} required />
          <label className="check">
            <input type="checkbox" name="kvkk" />
            {isEn()
              ? <span>I've read the <Link to="/gizlilik" target="_blank">privacy notice</Link> and accept the <Link to="/kosullar" target="_blank">terms</Link>.</span>
              : <span><Link to="/gizlilik" target="_blank">Aydınlatma metnini</Link> okudum, <Link to="/kosullar" target="_blank">kullanım koşullarını</Link> kabul ediyorum.</span>}
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
    if (!isEmail(email)) { setErr(L("Geçerli bir e-posta adresi girin.", "Enter a valid email address.")); return; }
    setBusy(true); setErr(null);
    const { error } = await sb().auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/hesap` });
    setBusy(false);
    if (error) setErr(friendlyError(error)); else setDone(true);
  }
  return (
    <AuthLayout title={L("Şifre sıfırlama", "Reset password")} lead={L("Kayıtlı e-posta adresinize bir sıfırlama bağlantısı göndereceğiz.", "We'll send a reset link to your registered email.")}>
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
