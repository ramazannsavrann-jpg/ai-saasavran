// Gizlilik politikası ve kullanım koşulları — TASLAK. Gerçek müşteri kullanımından önce hukuki inceleme gerekir.
import { Link } from "react-router-dom";
import { isEn } from "../lib/i18n";

export const CONTACT_EMAIL = "info@aisaasavran.com";
const UPDATED = "7 Kasım 2026";
const UPDATED_EN = "7 November 2026";

function DraftNotice() {
  if (isEn()) return (
    <aside className="notice notice-sim" role="note">
      <strong>Draft</strong>
      <p>This text was written while the product is in early access and has not yet been reviewed by a lawyer. It will be reviewed before paid plans launch.</p>
    </aside>
  );
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
      <p className="muted">{isEn() ? `Last updated: ${UPDATED_EN}` : `Son güncelleme: ${UPDATED}`}</p>
      <DraftNotice />
      {children}
      <hr />
      <p className="muted">
        {isEn() ? "Contact" : "İletişim"}: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> ·{" "}
        <Link to="/gizlilik">{isEn() ? "Privacy policy" : "Gizlilik politikası"}</Link> · <Link to="/kosullar">{isEn() ? "Terms of use" : "Kullanım koşulları"}</Link>
      </p>
    </main>
  );
}

export function Privacy() {
  if (isEn()) return <PrivacyEn />;
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
      <p>Reklam veya analiz amaçlı çerez kullanmıyoruz. Ziyaretçi sayısını görmek için Cloudflare'ın çerez kullanmayan, kişiyi tanımlamayan sayfa görüntüleme sayımı (Cloudflare Web Analytics) açıktır. Tarayıcınızda yalnızca oturumunuzu açık tutmak ve seçtiğiniz çalışma alanını hatırlamak için gerekli bilgiler saklanır.</p>

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
        <li><strong>Cloudflare</strong> (web sitesinin barındırılması, alan adı ve çerezsiz ziyaret sayımı).</li>
        <li><strong>Google</strong> (Gemini yapay zekâ servisi ve Google ile giriş). Ölçüm yaparken yazdığınız sorular Gemini'ye gönderilir. Ücretsiz katmanı kullandığımız için <strong>Google bu içerikleri kendi ürünlerini geliştirmek için kullanabilir</strong>. Bu nedenle sorulara kişisel veri (ad, telefon, adres vb.) yazmayın.</li>
        <li><strong>OpenAI</strong> (ChatGPT ile canlı web aramalı ölçüm; şu an yalnızca kendi test alanımızda, müşteri hesaplarında kapalı).</li>
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
  if (isEn()) return <TermsEn />;
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

function PrivacyEn() {
  return (
    <LegalShell title="Privacy policy">
      <h2>Who we are</h2>
      <p>AI SaaSavran is a web app that measures how visible brands are in AI assistants' answers. It is operated by an individual founder based in Turkey. This policy explains what data we process and why. Questions and requests: {CONTACT_EMAIL}</p>

      <h2>What we process</h2>
      <ul className="plain">
        <li><strong>Account data:</strong> your email address and a hashed password. If you sign in with Google: the name, email and profile picture link Google shares.</li>
        <li><strong>Workspace content:</strong> brand and competitor names, websites, sector, city and the questions you write.</li>
        <li><strong>Measurement results:</strong> answers returned by AI services to your questions, and the rates calculated from them.</li>
        <li><strong>Usage records:</strong> number of measurements, error logs and cost records (for quotas and security).</li>
      </ul>
      <p>We don't use advertising or tracking cookies. Cloudflare Web Analytics counts page views without cookies and without identifying you. Your browser stores only what's needed to keep you signed in and remember your workspace and language.</p>

      <h2>Why (legal basis)</h2>
      <ul className="plain">
        <li>To create your account and provide the service (performance of a contract).</li>
        <li>To prevent abuse, enforce quotas and cost limits, and keep the service secure (legitimate interest).</li>
        <li>To meet legal obligations.</li>
      </ul>

      <h2>Who we share it with</h2>
      <p>We use these service providers. Some of them process data outside your country:</p>
      <ul className="plain">
        <li><strong>Supabase</strong>: database and sign-in (servers in Frankfurt, Germany).</li>
        <li><strong>Cloudflare</strong>: website hosting, domain and cookieless visit counting.</li>
        <li><strong>Google</strong>: the Gemini AI service and Google sign-in. Your questions are sent to Gemini when measuring. Because we use Gemini's free tier, <strong>Google may use this content to improve its products</strong>, so don't put personal data (names, phone numbers, addresses) in your questions.</li>
        <li><strong>OpenAI</strong>: ChatGPT live web-search measurement (currently only in our own test workspace, off for customer accounts).</li>
        <li><strong>GitHub</strong>: the automation that runs measurements.</li>
      </ul>
      <p>We don't sell your data or share it for advertising.</p>

      <h2>How long we keep it</h2>
      <p>As long as your account is open. When you ask us to delete your account, we delete your data within 30 days, except records we are legally required to keep.</p>

      <h2>Your rights</h2>
      <p>You can ask to access, correct, export or delete your data, object to processing, and ask who we've shared it with. If you are in the EU/EEA or UK, you also have the rights under the GDPR, including complaining to your data protection authority. Email {CONTACT_EMAIL} from your registered address; we reply within 30 days.</p>

      <h2>Children</h2>
      <p>The service is not intended for anyone under 18.</p>

      <h2>Changes</h2>
      <p>If we update this policy we change the date above and email you about important changes.</p>
    </LegalShell>
  );
}

function TermsEn() {
  return (
    <LegalShell title="Terms of use">
      <h2>The service</h2>
      <p>AI SaaSavran asks AI assistants the questions you define and measures whether your brand appears in the answers. The service is in <strong>early access</strong>: features may change and outages can happen.</p>

      <h2>What measurements mean</h2>
      <ul className="plain">
        <li>Measurements use the AI providers' developer services (APIs). Results may differ from the answers shown in the same provider's consumer app.</li>
        <li>Measurements without live web search show what the model learned in training; they don't represent current web results.</li>
        <li>AI answers vary from one request to the next. Read rates together with their confidence ranges. Results are not a guarantee or advice.</li>
      </ul>

      <h2>Your account and acceptable use</h2>
      <ul className="plain">
        <li>You are responsible for keeping your account secure.</li>
        <li>Don't put other people's personal data, illegal content or infringing content in your questions.</li>
        <li>Don't overload the service with automated tools, try to bypass security, or access other users' data.</li>
        <li>Measurements stop automatically when plan quotas are reached.</li>
      </ul>

      <h2>Fees</h2>
      <p>Only a free plan is available today. When paid plans launch, prices and terms will be stated clearly in advance.</p>

      <h2>Limitation of liability</h2>
      <p>The service is provided "as is". To the extent the law allows, we are not liable for indirect losses from business decisions based on measurement results.</p>

      <h2>Closing your account</h2>
      <p>You can close your account at any time by emailing {CONTACT_EMAIL}. We may close accounts that seriously breach these terms.</p>

      <h2>Governing law</h2>
      <p>These terms are governed by the laws of the Republic of Turkey.</p>
    </LegalShell>
  );
}
