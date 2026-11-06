// Gizlilik politikası ve kullanım koşulları — TASLAK. Gerçek müşteri kullanımından önce hukuki inceleme gerekir.
import { Link } from "react-router-dom";

export const CONTACT_EMAIL = "aisaasavran@gmail.com";
const UPDATED = "6 Kasım 2026";

function DraftNotice() {
  return (
    <aside className="notice notice-sim" role="note">
      <strong>Taslak metin</strong>
      <p>Bu metin ürün test aşamasındayken hazırlanmıştır ve henüz bir hukukçu tarafından incelenmemiştir. Ücretli hizmete geçmeden önce KVKK ve ilgili mevzuata göre gözden geçirilecektir.</p>
    </aside>
  );
}

function LegalShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="content legal">
      <p><Link to="/giris" className="back">AI SaaSavran</Link></p>
      <h1>{title}</h1>
      <p className="muted">Son güncelleme: {UPDATED}</p>
      <DraftNotice />
      {children}
      <hr />
      <p className="muted">
        İletişim: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> ·{" "}
        <Link to="/gizlilik">Gizlilik politikası</Link> · <Link to="/kosullar">Kullanım koşulları</Link>
      </p>
    </main>
  );
}

export function Privacy() {
  return (
    <LegalShell title="Gizlilik politikası ve aydınlatma metni">
      <h2>Biz kimiz</h2>
      <p>AI SaaSavran, markaların yapay zekâ asistanlarının cevaplarında ne kadar görünür olduğunu ölçen bir web uygulamasıdır. Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında hangi verileri neden işlediğimizi açıklar. Sorularınız ve talepleriniz için: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>

      <h2>Hangi verileri işliyoruz</h2>
      <ul className="plain">
        <li><strong>Hesap bilgileri:</strong> e-posta adresiniz ve şifrenizin şifrelenmiş hali. Google ile giriş yaparsanız Google'ın paylaştığı ad, e-posta ve profil resmi bağlantısı.</li>
        <li><strong>Çalışma alanı içeriği:</strong> eklediğiniz marka ve rakip adları, web siteleri, sektör, şehir ve yazdığınız sorular.</li>
        <li><strong>Ölçüm sonuçları:</strong> sorularınıza yapay zekâ servislerinden gelen cevaplar ve bunlardan hesaplanan oranlar.</li>
        <li><strong>Kullanım kayıtları:</strong> ölçüm sayısı, hata kayıtları ve maliyet hesapları (kota ve güvenlik için).</li>
      </ul>
      <p>Reklam veya analiz amaçlı çerez kullanmıyoruz. Tarayıcınızda yalnızca oturumunuzu açık tutmak ve seçtiğiniz çalışma alanını hatırlamak için gerekli bilgiler saklanır.</p>

      <h2>Neden işliyoruz (hukuki sebep)</h2>
      <ul className="plain">
        <li>Hesabınızı oluşturmak ve hizmeti sunmak (sözleşmenin kurulması ve ifası, KVKK m. 5/2-c).</li>
        <li>Kötüye kullanımı önlemek, kota ve maliyet sınırlarını uygulamak, güvenliği sağlamak (meşru menfaat, KVKK m. 5/2-f).</li>
        <li>Yasal yükümlülükler (KVKK m. 5/2-ç).</li>
      </ul>

      <h2>Kimlerle paylaşıyoruz ve yurt dışına aktarım</h2>
      <p>Hizmeti sunmak için aşağıdaki hizmet sağlayıcıları kullanıyoruz. Bu sağlayıcıların sunucuları Türkiye dışında olduğundan verileriniz yurt dışına aktarılır:</p>
      <ul className="plain">
        <li><strong>Supabase</strong> (veritabanı ve giriş sistemi; sunucu: Frankfurt, Almanya).</li>
        <li><strong>Cloudflare</strong> (web sitesinin barındırılması).</li>
        <li><strong>Google</strong> (Gemini yapay zekâ servisi ve Google ile giriş). Ölçüm yaparken yazdığınız sorular Gemini'ye gönderilir. Ücretsiz katmanı kullandığımız için <strong>Google bu içerikleri kendi ürünlerini geliştirmek için kullanabilir</strong>. Bu nedenle sorulara kişisel veri (ad, telefon, adres vb.) yazmayın.</li>
        <li><strong>GitHub</strong> (ölçümleri çalıştıran otomasyon altyapısı).</li>
      </ul>
      <p>Verilerinizi satmıyoruz ve reklam amacıyla kimseyle paylaşmıyoruz.</p>

      <h2>Ne kadar süre saklıyoruz</h2>
      <p>Hesabınız açık olduğu sürece. Hesabınızın silinmesini istediğinizde verilerinizi en geç 30 gün içinde sileriz; yasal olarak saklamamız gereken kayıtlar bunun dışındadır.</p>

      <h2>Haklarınız (KVKK m. 11)</h2>
      <p>Verilerinizin işlenip işlenmediğini öğrenme, bilgi isteme, düzeltilmesini veya silinmesini isteme, aktarıldığı tarafları öğrenme, itiraz etme ve zararın giderilmesini talep etme haklarına sahipsiniz. Talepleriniz için <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> adresine kayıtlı e-postanızdan yazın; en geç 30 gün içinde cevap veririz.</p>

      <h2>Çocuklar</h2>
      <p>Hizmet 18 yaşından küçükler için tasarlanmamıştır.</p>

      <h2>Değişiklikler</h2>
      <p>Bu metni güncellersek sayfadaki tarihi değiştiririz; önemli değişiklikleri e-postayla bildiririz.</p>
    </LegalShell>
  );
}

export function Terms() {
  return (
    <LegalShell title="Kullanım koşulları">
      <h2>Hizmet</h2>
      <p>AI SaaSavran, yapay zekâ asistanlarına sizin belirlediğiniz soruları sorar ve markanızın cevaplarda anılıp anılmadığını ölçer. Hizmet şu an <strong>test aşamasındadır</strong>; özellikler değişebilir, kesintiler olabilir.</p>

      <h2>Ölçümlerin anlamı</h2>
      <ul className="plain">
        <li>Ölçümler yapay zekâ sağlayıcılarının geliştirici servisleri (API) üzerinden yapılır. Sonuçlar, aynı sağlayıcının tüketici uygulamasında görülen cevaplarla birebir aynı olmayabilir.</li>
        <li>Canlı web araması kapalıyken yapılan ölçümler, modelin eğitim verisinden bildiğini gösterir; güncel internet sonuçlarını temsil etmez.</li>
        <li>Yapay zekâ cevapları her seferinde değişebilir. Oranlar güven aralığıyla birlikte değerlendirilmelidir. Sonuçlar bir garanti veya tavsiye değildir.</li>
      </ul>

      <h2>Hesabınız ve kullanım kuralları</h2>
      <ul className="plain">
        <li>Hesap bilgilerinizin güvenliğinden siz sorumlusunuz.</li>
        <li>Sorulara başkalarına ait kişisel veri, yasa dışı veya hak ihlali içeren içerik yazmayın.</li>
        <li>Hizmeti otomatik araçlarla zorlamayın, güvenlik önlemlerini aşmaya çalışmayın, başka kullanıcıların verilerine erişmeye çalışmayın.</li>
        <li>Paket kotaları aşıldığında ölçümler otomatik olarak durur.</li>
      </ul>

      <h2>Ücretler</h2>
      <p>Şu an yalnızca ücretsiz paket vardır. Ücretli paketler sunulduğunda fiyatlar ve koşullar önceden açıkça bildirilecektir.</p>

      <h2>Sorumluluğun sınırı</h2>
      <p>Hizmet "olduğu gibi" sunulur. Ölçüm sonuçlarına dayanarak verdiğiniz iş kararlarından doğan dolaylı zararlardan, yürürlükteki mevzuatın izin verdiği ölçüde sorumlu değiliz.</p>

      <h2>Hesabın kapatılması</h2>
      <p>Hesabınızı istediğiniz zaman kapatabilirsiniz (<a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>). Bu koşulları ağır şekilde ihlal eden hesapları kapatabiliriz.</p>

      <h2>Uygulanacak hukuk</h2>
      <p>Bu koşullar Türkiye Cumhuriyeti hukukuna tabidir.</p>
    </LegalShell>
  );
}
