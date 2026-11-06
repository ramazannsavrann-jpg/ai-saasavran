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
const en: Partial<Record<Key, string>> = {
  "nav.dashboard": "Dashboard",
  "nav.status": "Product status",
  "nav.account": "Account",
  "auth.login": "Sign in",
  "auth.signup": "Create account",
  "auth.logout": "Sign out",
  "auth.email": "Email",
  "auth.password": "Password",
};

let lang: "tr" | "en" = "tr";
export function setLang(l: "tr" | "en") { lang = l; document.documentElement.lang = l; }
export function t(k: Key): string { return (lang === "en" && en[k]) || tr[k]; }
