import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../lib/app";
import { runtimeConfig, sb, friendlyError } from "../lib/supabase";
import { Button, Empty, ErrorBox, Field } from "../components/ui";

type Level = "works" | "partial" | "missing";
const STATUS: { area: string; items: [Level, string, string][] }[] = [
  {
    area: "Hesap ve güvenlik",
    items: [
      ["works", "Kayıt, giriş, çıkış", "Supabase Auth ile; test ortamında gerçek sunucuyla test edildi."],
      ["partial", "Şifre sıfırlama ve e-posta doğrulama", "Akış hazır; e-posta gönderimi bulut ortamında yapılandırılınca çalışacak."],
      ["works", "Müşteri verisi izolasyonu", "Veritabanı satır güvenliğiyle; her sürümde otomatik test ediliyor."],
      ["works", "Paket limitleri ve aylık kota", "Limit aşılınca ölçüm durur, çalışma alanı otomatik duraklatılır."],
      ["missing", "Ekip üyesi davet etme", "Henüz yok."],
      ["missing", "Ödeme ve paket yükseltme", "Henüz yok; herkes Free paketinde."],
    ],
  },
  {
    area: "Ölçüm",
    items: [
      ["works", "Gemini aramasız ölçüm (model bilgisi)", "Ücretsiz katmanda çalışıyor. Ayrı veri türü olarak saklanır ve gösterilir."],
      ["missing", "Canlı web araması", "Ücretsiz katmanda yok. Ücretli kullanım kapalı olduğu için devre dışı."],
      ["missing", "ChatGPT ve Perplexity", "Ücretli; kapalı. Perplexity adaptörü henüz yazılmadı."],
      ["partial", "Otomatik ölçüm işleme", "Sıraya alma ve işleme kodu hazır ve test edildi; bulut sunucusu henüz kurulmadı."],
      ["missing", "Haftalık otomatik ölçüm", "Henüz yok; ölçümler elle başlatılıyor."],
      ["partial", "Önerilme tespiti", "Kural tabanlı; belirsiz cümleler için yapay zekâ kontrolü henüz yok."],
    ],
  },
  {
    area: "Rapor",
    items: [
      ["works", "Anılma, önerilme, rakip payı, güven aralığı", "Her oran örneklem sayısıyla ve aralığıyla gösterilir."],
      ["works", "Geçmiş ölçüm grafiği", "Veri türüne göre çizgi stili farklıdır."],
      ["works", "Soru bazında sonuç", "Hangi soruda önerildiğiniz, hangi rakibin öne çıktığı."],
      ["missing", "Kaynak (citation) analizi", "Canlı arama olmadan ölçülemez."],
      ["missing", "İyileştirme önerileri ve içerik taslakları", "Henüz yok."],
      ["missing", "PDF rapor", "Henüz yok."],
    ],
  },
];
const LEVEL_TEXT: Record<Level, string> = { works: "Çalışıyor", partial: "Kısmen", missing: "Yok" };

export function ProductStatus() {
  const env = runtimeConfig()?.environment;
  const { session } = useApp();
  return (
    <div className="stack">
      <header className="page-head">
        <h1>Ürünün şu anki durumu</h1>
        <p className="lead">Bu sürüm gerçek müşteri kullanımına hazır değildir. Canlı web araması yapılmadığı için ölçümler, Gemini uygulamasının güncel cevaplarını temsil etmez.</p>
        {env && env !== "production" && <p className="muted">Ortam: {env === "test" ? "test (yerel)" : env}</p>}
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
      {!session && <p><Link to="/giris">Giriş sayfasına dön</Link></p>}
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
    if (password.length < 8) { setErr("Şifre en az 8 karakter olmalı."); return; }
    setBusy(true); setErr(null); setMsg(null);
    const { error } = await sb().auth.updateUser({ password });
    setBusy(false);
    if (error) setErr(friendlyError(error)); else { setMsg("Şifreniz güncellendi."); form.reset(); }
  }
  return (
    <div className="stack narrow">
      <header className="page-head"><h1>Hesap</h1><p className="muted">{session?.user.email}</p></header>
      <form className="panel stack" onSubmit={changePassword} noValidate>
        <h2>Şifre değiştir</h2>
        <Field label="Yeni şifre" name="password" type="password" autoComplete="new-password" minLength={8} hint="En az 8 karakter" />
        <ErrorBox message={err} />
        {msg && <p className="success-box">{msg}</p>}
        <Button type="submit" busy={busy}>Şifreyi güncelle</Button>
      </form>
      <section className="panel">
        <h2>Dil</h2>
        <p className="muted">Arayüz Türkçe. İngilizce çeviri altyapısı hazır, metinler henüz çevrilmedi.</p>
      </section>
      <section className="panel">
        <h2>Verileriniz</h2>
        <p className="muted">Hesabınızın ve verilerinizin silinmesini istemek için kayıtlı e-postanızdan <a href="mailto:info@aisaasavran.com">info@aisaasavran.com</a> adresine yazın. <Link to="/gizlilik">Gizlilik politikası</Link> · <Link to="/kosullar">Kullanım koşulları</Link></p>
      </section>
      <Button variant="quiet" onClick={async () => { await sb().auth.signOut(); nav("/giris"); }}>Çıkış yap</Button>
    </div>
  );
}

export function DemoLab() {
  const { isAdmin, workspaces, select } = useApp();
  const nav = useNavigate();
  if (!isAdmin) return <Empty title="Bu sayfa yalnızca platform yöneticilerine açıktır" />;
  const demos = workspaces.filter((w) => w.kind === "demo_lab");
  return (
    <div className="stack">
      <header className="page-head">
        <h1>Demo Lab</h1>
        <p className="lead">Satış demosu ve test için hayali markalar. Buradaki ölçümler hiçbir yapay zekâ platformuna gitmez; tamamen simülasyondur ve gerçek müşteri çalışma alanlarına yazılamaz.</p>
      </header>
      {demos.length === 0 ? <Empty title="Henüz demo çalışma alanı yok"><p>Demo verisi sunucu tarafında "demo:seed" komutuyla yüklenir.</p></Empty> : (
        <ul className="rows panel">
          {demos.map((d) => (
            <li key={d.id}><strong>{d.name}</strong><Button variant="quiet" className="btn-small" onClick={() => { select(d.id); nav("/panel"); }}>Aç</Button></li>
          ))}
        </ul>
      )}
    </div>
  );
}
