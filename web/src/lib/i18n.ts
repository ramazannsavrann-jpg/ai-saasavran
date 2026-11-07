// Basit çeviri altyapısı. Türkçe ana dil; İngilizce sözlük kademeli doldurulacak.
// Eksik İngilizce anahtar Türkçeye düşer.

const tr = {
  "app.name": "AI SaaSavran",
  "nav.dashboard": "Panel",
  "nav.status": "Ürün durumu",
  "nav.account": "Hesap",
  "nav.demo": "Demo Lab",
  "auth.login": "Giriş yap",
  "auth.signup": "Hesap oluştur",
  "auth.logout": "Çıkış yap",
  "auth.email": "E-posta",
  "auth.password": "Şifre",
  "auth.passwordHint": "En az 8 karakter",
  "auth.noAccount": "Hesabınız yok mu?",
  "auth.haveAccount": "Zaten hesabınız var mı?",
  "auth.forgot": "Şifremi unuttum",
  "auth.sendReset": "Sıfırlama bağlantısı gönder",
  "auth.resetSent": "Hesap bu adrese kayıtlıysa sıfırlama bağlantısı gönderildi.",
  "auth.checkEmail": "Hesabınız oluşturuldu. Giriş yapmadan önce e-postanızdaki doğrulama bağlantısına tıklayın.",
  "type.model_knowledge": "Aramasız model bilgisi",
  "type.live_search": "Canlı web araması",
  "type.simulated": "Simülasyon",
  "notice.noLive.title": "Canlı web araması yapılmadı",
  "notice.noLive.body": "Bu sonuçlar Gemini'ye web araması kapalıyken sorulan sorulardan geliyor. Modelin eğitim verisinden bildiğini gösterir; Gemini uygulamasının internette arayarak verdiği güncel cevapları temsil etmez.",
  "notice.sim.title": "Simülasyon — gerçek veri değil",
  "notice.sim.body": "Demo Lab'deki markalar ve cevaplar hayalidir. Hiçbir yapay zekâ platformuna bağlanılmadı.",
} as const;

type Key = keyof typeof tr;
const en: Record<Key, string> = {
  "app.name": "AI SaaSavran",
  "nav.dashboard": "Dashboard",
  "nav.status": "Product status",
  "nav.account": "Account",
  "nav.demo": "Demo Lab",
  "auth.login": "Sign in",
  "auth.signup": "Create account",
  "auth.logout": "Sign out",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.passwordHint": "At least 8 characters",
  "auth.noAccount": "No account yet?",
  "auth.haveAccount": "Already have an account?",
  "auth.forgot": "Forgot password",
  "auth.sendReset": "Send reset link",
  "auth.resetSent": "If an account exists for this address, we sent a reset link.",
  "auth.checkEmail": "Your account was created. Click the confirmation link in your email before signing in.",
  "type.model_knowledge": "Model knowledge, no search",
  "type.live_search": "Live web search",
  "type.simulated": "Simulation",
  "notice.noLive.title": "No live web search",
  "notice.noLive.body": "These results come from questions asked to Gemini with web search turned off. They show what the model learned in training, not the up-to-date answers the Gemini app gives when it searches the web.",
  "notice.sim.title": "Simulation, not real data",
  "notice.sim.body": "Brands and answers in the Demo Lab are fictional. No AI platform was contacted.",
};

export type Lang = "tr" | "en";
/** Dil: kullanıcının seçimi, yoksa tarayıcı dili (Türkçe değilse İngilizce). */
function detect(): Lang {
  try { const s = localStorage.getItem("lang"); if (s === "tr" || s === "en") return s; } catch { /* depolama kapalı */ }
  return typeof navigator !== "undefined" && (navigator.language || "").toLowerCase().startsWith("tr") ? "tr" : "en";
}
let lang: Lang = detect();
if (typeof document !== "undefined") document.documentElement.lang = lang;

export const getLang = (): Lang => lang;
export function setLang(l: Lang) { lang = l; document.documentElement.lang = l; }
/** Dili değiştirir ve sayfayı yeniler (tüm metinler yeni dilde çizilir). */
export function switchLang(l: Lang) { try { localStorage.setItem("lang", l); } catch { /* yok say */ } location.reload(); }
export function t(k: Key): string { return lang === "en" ? en[k] : tr[k]; }
/** Satır içi çeviri: L("Türkçe", "English"). */
export const L = (trText: string, enText: string): string => (lang === "en" ? enText : trText);
export const isEn = () => lang === "en";
