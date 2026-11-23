// Giriş, kayıt ve şifre sıfırlama (banka uygulaması düzeni: kayıtlı kullanıcı adıyla karşılanır).
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { sb, friendlyError } from "../../lib/supabase";
import { L, getLang } from "../../lib/i18n";
import { SITE_ORIGIN } from "../../lib/env";
import { Err, Icon, greeting } from "../ui";

const REMEMBER = "mobil-son-eposta";
export const rememberEmail = (e: string) => { try { localStorage.setItem(REMEMBER, e); } catch { /* yok say */ } };
const remembered = () => { try { return localStorage.getItem(REMEMBER) ?? ""; } catch { return ""; } };
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const initials = (email: string) => (email.split("@")[0].replace(/[^a-zA-ZçğıöşüÇĞİÖŞÜ]/g, " ").trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2) || "?").toLocaleUpperCase("tr");

export function Welcome() {
  const email = remembered();
  return (
    <div className="screen" style={{ alignItems: "center", textAlign: "center", gap: 18 }}>
      <div className="logo" style={{ marginTop: 12 }}>{Icon.logo}</div>
      <h1 style={{ fontSize: 30 }}>{greeting()}</h1>
      {email ? (
        <>
          <div className="avatar">{initials(email)}</div>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 18 }}>{email}</p>
          <Link className="btn btn-light" to="/giris" style={{ letterSpacing: ".04em" }}>{L("GİRİŞ YAP", "SIGN IN")}</Link>
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%", fontWeight: 600, fontSize: 15 }}>
            <Link to="/giris?baska=1" className="muted">{L("Başka hesap", "Other account")}</Link>
            <Link to="/sifre">{L("ŞİFREMİ UNUTTUM", "FORGOT PASSWORD")}</Link>
          </div>
        </>
      ) : (
        <>
          <h2 style={{ fontSize: 26, lineHeight: 1.2, marginTop: 8 }}>{L("Markanız yapay zekâlarda öneriliyor mu?", "Is your brand recommended by AIs?")}</h2>
          <p className="muted" style={{ margin: 0, lineHeight: 1.45 }}>{L("ChatGPT, Gemini, Claude ve Perplexity cevaplarında markanızın yerini ölçün, rakiplerinizi takip edin.", "Measure where your brand stands in ChatGPT, Gemini, Claude and Perplexity answers and track your competitors.")}</p>
          <div style={{ marginTop: "auto", width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
            <Link className="btn btn-primary" to="/kayit">{L("Ücretsiz başla", "Start free")}</Link>
            <Link className="btn btn-ghost" to="/giris">{L("Giriş yap", "Sign in")}</Link>
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
      <button className="btn btn-primary" disabled={busy}>{busy ? L("Hesap açılıyor…", "Creating…") : L("Hesap aç", "Create account")}</button>
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
