// Giriş, kayıt ve şifre sıfırlama (banka uygulaması düzeni: kayıtlı kullanıcı adıyla karşılanır).
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { sb, friendlyError } from "../../lib/supabase";
import { L, getLang } from "../../lib/i18n";
import { SITE_ORIGIN } from "../../lib/env";
import { Err, Icon, greeting } from "../ui";
import { GOOGLE_AVAILABLE, googleSignIn } from "../oauth";

const REMEMBER = "mobil-son-eposta";
export const rememberEmail = (e: string) => { try { localStorage.setItem(REMEMBER, e); } catch { /* yok say */ } };
const remembered = () => { try { return localStorage.getItem(REMEMBER) ?? ""; } catch { return ""; } };
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const initials = (email: string) => (email.split("@")[0].replace(/[^a-zA-ZçğıöşüÇĞİÖŞÜ]/g, " ").trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2) || "?").toLocaleUpperCase("tr");

/** "Google ile devam et": yalnız telefonda (uygulamada) görünür. Hata dönüşü olay ile gelir. */
function GoogleButton() {
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const on = (e: Event) => { setBusy(false); setErr(L("Google ile giriş tamamlanamadı. Tekrar deneyin ya da e-postayla devam edin.", "Google sign-in didn't complete. Try again or continue with email.")); void e; };
    window.addEventListener("oauth-hata", on);
    return () => window.removeEventListener("oauth-hata", on);
  }, []);
  if (!GOOGLE_AVAILABLE) return null;
  return (
    <>
      <button type="button" className="btn btn-ghost" disabled={busy} onClick={async () => { setErr(null); setBusy(true); try { await googleSignIn(); } catch (e) { setBusy(false); setErr(friendlyError(e)); } }}>
        <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
        {busy ? L("Google açılıyor…", "Opening Google…") : L("Google ile devam et", "Continue with Google")}
      </button>
      <Err msg={err} />
    </>
  );
}

export function Welcome() {
  const email = remembered();
  return (
    <div className="screen" style={{ alignItems: "center", textAlign: "center", gap: 18 }}>
      <div className="logo" style={{ marginTop: 12 }} aria-hidden="true">S</div>
      {email ? (
        <>
          <h1 style={{ fontSize: 28, lineHeight: "34px" }}>{greeting()}</h1>
          <div className="avatar">{initials(email)}</div>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 18 }}>{email}</p>
          <Link className="btn btn-primary" to="/giris">{L("Giriş yap", "Sign in")}</Link>
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%", fontWeight: 600, fontSize: 15, minHeight: 48, alignItems: "center" }}>
            <Link to="/giris?baska=1" className="muted">{L("Başka hesap", "Other account")}</Link>
            <Link to="/sifre">{L("Şifremi unuttum", "Forgot password")}</Link>
          </div>
        </>
      ) : (
        <>
          <h1 style={{ fontSize: 28, lineHeight: "34px", marginTop: 24 }}>{L("Markanız yapay zekâlarda öneriliyor mu?", "Is your brand recommended by AIs?")}</h1>
          <p className="muted" style={{ margin: 0, lineHeight: 1.45 }}>{L("ChatGPT, Gemini, Claude ve Perplexity'nin cevaplarında işletmenizin önerilip önerilmediğini ölçün. Ücretsiz pakette Gemini ile ayda 1 ölçüm.", "See whether ChatGPT, Gemini, Claude and Perplexity recommend your business. Free plan: 1 measurement a month with Gemini.")}</p>
          <div style={{ marginTop: "auto", width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
            <Link className="btn btn-primary" to="/kayit">{L("Ücretsiz başla", "Start free")}</Link>
            <GoogleButton />
            <Link className="btn btn-ghost" to="/giris">{L("Giriş yap", "Sign in")}</Link>
            {GOOGLE_AVAILABLE && <p className="muted small" style={{ margin: 0 }}>{L("Google ile devam ederek ", "By continuing with Google you accept the ")}<a href={`${SITE_ORIGIN}/kosullar`} target="_blank" rel="noreferrer">{L("Kullanım Koşulları", "Terms")}</a>{L("'nı ve ", " and the ")}<a href={`${SITE_ORIGIN}/gizlilik`} target="_blank" rel="noreferrer">{L("Gizlilik Bildirimi", "Privacy Notice")}</a>{L("'ni kabul etmiş olursunuz.", ".")}</p>}
          </div>
        </>
      )}
    </div>
  );
}

export function Login() {
  const nav = useNavigate();
  const other = new URLSearchParams(location.hash.split("?")[1] ?? "").get("baska") === "1";
  const [email, setEmail] = useState(other ? "" : remembered());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password") ?? "");
    if (!isEmail(email.trim())) { setErr(L("Geçerli bir e-posta adresi girin.", "Enter a valid email address.")); return; }
    if (!password) { setErr(L("Şifrenizi girin.", "Enter your password.")); return; }
    setBusy(true); setErr(null);
    const { error } = await sb().auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) { setErr(friendlyError(error)); return; }
    rememberEmail(email.trim());
    nav("/ana", { replace: true });
  }
  return (
    <form className="screen" onSubmit={submit} noValidate>
      <button type="button" className="iconbtn" aria-label={L("Geri", "Back")} onClick={() => nav("/")}>{Icon.back}</button>
      <h1 style={{ fontSize: 28 }}>{L("Giriş yap", "Sign in")}</h1>
      <label className="field">{L("E-posta", "Email")}<input type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label className="field">{L("Şifre", "Password")}<input name="password" type="password" autoComplete="current-password" autoFocus={!!email} /></label>
      <Err msg={err} />
      <button className="btn btn-primary" disabled={busy}>{busy ? L("Giriş yapılıyor…", "Signing in…") : L("Giriş yap", "Sign in")}</button>
      <Link to="/sifre" style={{ textAlign: "center", fontWeight: 600 }}>{L("Şifremi unuttum", "Forgot password")}</Link>
      <GoogleButton />
      <p className="muted" style={{ textAlign: "center", margin: "auto 0 0" }}>{L("Hesabınız yok mu?", "No account?")} <Link to="/kayit">{L("Ücretsiz hesap açın", "Create a free account")}</Link></p>
    </form>
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
    const email = String(f.get("email") ?? "").trim();
    const password = String(f.get("password") ?? "");
    if (!isEmail(email)) { setErr(L("Geçerli bir e-posta adresi girin.", "Enter a valid email address.")); return; }
    if (password.length < 8) { setErr(L("Şifre en az 8 karakter olmalı.", "Password must be at least 8 characters.")); return; }
    if (!f.get("kvkk")) { setErr(L("Devam etmek için aydınlatma metnini onaylayın.", "Accept the privacy notice to continue.")); return; }
    setBusy(true); setErr(null);
    const { data, error } = await sb().auth.signUp({ email, password, options: { emailRedirectTo: `${SITE_ORIGIN}/panel`, data: { lang: getLang(), source: "mobile_app" } } });
    setBusy(false);
    if (error) { setErr(friendlyError(error)); return; }
    rememberEmail(email);
    if (data.session) nav("/kurulum", { replace: true }); else setSent(true);
  }
  if (sent) return (
    <div className="screen">
      <h1 style={{ fontSize: 28 }}>{L("E-postanızı kontrol edin", "Check your email")}</h1>
      <p className="ok">{L("Hesabınızı onaylamak için e-postanıza bir bağlantı gönderdik. Onayladıktan sonra buradan giriş yapın.", "We sent a confirmation link to your email. After confirming, sign in here.")}</p>
      <Link className="btn btn-primary" to="/giris">{L("Giriş yap", "Sign in")}</Link>
    </div>
  );
  return (
    <form className="screen" onSubmit={submit} noValidate>
      <button type="button" className="iconbtn" aria-label={L("Geri", "Back")} onClick={() => nav("/")}>{Icon.back}</button>
      <h1 style={{ fontSize: 28 }}>{L("Ücretsiz hesap açın", "Create a free account")}</h1>
      <p className="muted" style={{ margin: 0 }}>{L("Kart bilgisi istenmez.", "No card required.")}</p>
      <label className="field">{L("E-posta", "Email")}<input name="email" type="email" autoComplete="email" inputMode="email" /></label>
      <label className="field">{L("Şifre (en az 8 karakter)", "Password (8+ characters)")}<input name="password" type="password" autoComplete="new-password" /></label>
      <label style={{ display: "flex", gap: 12, alignItems: "flex-start", fontSize: 14, lineHeight: 1.45 }}>
        <input type="checkbox" name="kvkk" style={{ marginTop: 2, flexShrink: 0 }} />
        <span>{L("Aydınlatma metnini okudum, kullanım koşullarını kabul ediyorum.", "I've read the privacy notice and accept the terms.")} <a href={`${SITE_ORIGIN}/gizlilik`} target="_blank" rel="noreferrer">{L("Gizlilik", "Privacy")}</a> · <a href={`${SITE_ORIGIN}/kosullar`} target="_blank" rel="noreferrer">{L("Koşullar", "Terms")}</a></span>
      </label>
      <Err msg={err} />
      <button className="btn btn-primary" disabled={busy}>{busy ? L("Hesap açılıyor…", "Creating account…") : L("Hesap aç", "Create account")}</button>
      <p className="muted" style={{ textAlign: "center", margin: "auto 0 0" }}>{L("Hesabınız var mı?", "Have an account?")} <Link to="/giris">{L("Giriş yapın", "Sign in")}</Link></p>
    </form>
  );
}

export function Forgot() {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    if (!isEmail(email)) { setErr(L("Geçerli bir e-posta adresi girin.", "Enter a valid email address.")); return; }
    setBusy(true); setErr(null);
    const { error } = await sb().auth.resetPasswordForEmail(email, { redirectTo: `${SITE_ORIGIN}/hesap` });
    setBusy(false);
    if (error) setErr(friendlyError(error)); else setDone(true);
  }
  return (
    <form className="screen" onSubmit={submit} noValidate>
      <button type="button" className="iconbtn" aria-label={L("Geri", "Back")} onClick={() => nav(-1)}>{Icon.back}</button>
      <h1 style={{ fontSize: 28 }}>{L("Şifre sıfırlama", "Reset password")}</h1>
      {done ? <p className="ok">{L("Şifre sıfırlama bağlantısı e-postanıza gönderildi. Bağlantı web sitesinde açılır; yeni şifreyi belirledikten sonra buradan giriş yapın.", "We emailed you a reset link. It opens on the website; after setting a new password, sign in here.")}</p> : (
        <>
          <label className="field">{L("E-posta", "Email")}<input name="email" type="email" autoComplete="email" inputMode="email" defaultValue={remembered()} /></label>
          <Err msg={err} />
          <button className="btn btn-primary" disabled={busy}>{L("Bağlantı gönder", "Send link")}</button>
        </>
      )}
    </form>
  );
}
