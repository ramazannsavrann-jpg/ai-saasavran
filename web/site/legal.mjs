// Statik yasal sayfalar (JavaScript'siz okunabilir; ödeme sağlayıcısı incelemesi için). Uygulamadaki Legal.tsx ile aynı içerik.
const E = "info@aisaasavran.com";
const mail = `<a href="mailto:${E}">${E}</a>`;
const UPDATED_EN = "7 November 2026", UPDATED_TR = "7 Kasım 2026";
const draftEn = `<p class="small"><b>Draft:</b> written during early access and not yet reviewed by a lawyer. It will be reviewed before paid plans launch.</p>`;
const draftTr = `<p class="small"><b>Taslak:</b> erken erişim döneminde yazıldı, henüz bir avukat tarafından incelenmedi. Ücretli paketler açılmadan önce incelenecek.</p>`;
const wrap = (h1, updated, draft, body) => `<section class="article legal"><h1>${h1}</h1><p class="small">${updated}</p>${draft}${body}</section>`;

export const LEGAL = {
  terms: { lang: "en", path: "/terms/", title: "Terms of service | AI SaaSavran", description: "Terms of service for AI SaaSavran.", body: wrap("Terms of service", `Last updated: ${UPDATED_EN}`, draftEn, `
<h2>The service</h2>
<p>AI SaaSavran asks AI assistants the questions you define and measures whether your brand appears in the answers. The service is in early access: features may change and outages can happen. The service is operated by an individual founder based in Turkey. Contact: ${mail}</p>
<h2>What measurements mean</h2>
<ul><li>Measurements use the AI providers' developer services (APIs). Results may differ from the answers shown in the same provider's consumer app.</li>
<li>Measurements without live web search show what the model learned in training; they don't represent current web results.</li>
<li>AI answers vary from one request to the next. Read rates together with their confidence ranges. Results are not a guarantee or advice.</li></ul>
<h2>Your account and acceptable use</h2>
<ul><li>You are responsible for keeping your account secure.</li>
<li>Don't put other people's personal data, illegal content or infringing content in your questions.</li>
<li>Don't overload the service with automated tools, try to bypass security, or access other users' data.</li>
<li>Measurements stop automatically when plan quotas are reached. The free plan includes 4 measurements a month.</li></ul>
<h2>Plans, payment and cancellation</h2>
<p>Plans and prices are listed on our <a href="/#pricing">pricing section</a>: Free ($0), Plus ($29/month), Pro ($149/month), Business ($449/month). Paid plans renew monthly until cancelled. Our order process is conducted by our online reseller Paddle.com, which is the merchant of record for all our orders and handles invoices, sales tax, billing enquiries and returns. You can cancel at any time; cancellation takes effect at the end of the period you've paid for. See our <a href="/refund/">refund policy</a>.</p>
<h2>Limitation of liability</h2>
<p>The service is provided "as is". To the extent the law allows, we are not liable for indirect losses from business decisions based on measurement results.</p>
<h2>Closing your account</h2>
<p>You can close your account at any time by emailing ${mail}. We may close accounts that seriously breach these terms.</p>
<h2>Governing law</h2>
<p>These terms are governed by the laws of the Republic of Turkey. Nothing in these terms limits the rights you have as a consumer under the law of your country.</p>`) },

  privacy: { lang: "en", path: "/privacy/", title: "Privacy policy | AI SaaSavran", description: "How AI SaaSavran processes your data.", body: wrap("Privacy policy", `Last updated: ${UPDATED_EN}`, draftEn, `
<h2>Who we are</h2>
<p>AI SaaSavran is a web app that measures how visible brands are in AI assistants' answers, operated by an individual founder based in Turkey. Questions and requests: ${mail}</p>
<h2>What we process</h2>
<ul><li><b>Account data:</b> your email address and a hashed password; with Google sign-in, the name, email and picture link Google shares.</li>
<li><b>Workspace content:</b> brand and competitor names, websites, sector, city and the questions you write.</li>
<li><b>Measurement results:</b> answers returned by AI services to your questions, and the rates calculated from them.</li>
<li><b>Usage records:</b> number of measurements, error logs and cost records (for quotas and security).</li>
<li><b>Payments:</b> handled by Paddle as merchant of record. We don't see or store your card details.</li></ul>
<p>We don't use advertising or tracking cookies. Cloudflare Web Analytics counts page views without cookies.</p>
<h2>Why</h2>
<ul><li>To provide the service (performance of a contract).</li><li>To prevent abuse, enforce quotas and keep the service secure (legitimate interest).</li><li>To meet legal obligations.</li></ul>
<h2>Who we share it with</h2>
<ul><li><b>Supabase</b>: database and sign-in (Frankfurt, Germany).</li>
<li><b>Cloudflare</b>: hosting, domain, cookieless visit counting.</li>
<li><b>Google</b>: Gemini AI and Google sign-in. Because we use Gemini's free tier for free-plan measurements, Google may use this content to improve its products, so don't put personal data in your questions.</li>
<li><b>OpenAI</b>: ChatGPT live web-search measurement.</li>
<li><b>Paddle</b>: payments, invoicing and tax for paid plans.</li>
<li><b>Resend</b>: sending the weekly summary email (you can turn it off from your account page or with one click in the email).</li>
<li><b>GitHub</b>: the automation that runs measurements.</li></ul>
<p>We don't sell your data or share it for advertising.</p>
<h2>Retention and your rights</h2>
<p>We keep your data while your account is open and delete it within 30 days of a deletion request, except records we must keep by law. You can ask to access, correct, export or delete your data, or object to processing. If you are in the EU/EEA or UK you also have rights under the GDPR, including complaining to your data protection authority. Email ${mail}; we reply within 30 days.</p>
<h2>Children</h2><p>The service is not intended for anyone under 18.</p>`) },

  refund: { lang: "en", path: "/refund/", title: "Refund policy | AI SaaSavran", description: "Refund and cancellation policy for AI SaaSavran paid plans.", body: wrap("Refund policy", `Last updated: ${UPDATED_EN}`, "", `
<p>We want you to be happy with AI SaaSavran. Our order process is conducted by our online reseller Paddle.com, the merchant of record for all our orders.</p>
<h2>14-day money-back guarantee</h2>
<p>If you're not satisfied, you can request a full refund within 14 days of your first payment for a paid plan. No questions asked.</p>
<h2>Renewals</h2>
<p>Paid plans renew monthly. You can cancel at any time and keep access until the end of the period you've paid for. If you forgot to cancel, contact us within 7 days of a renewal charge and we'll refund it if you haven't used the service since.</p>
<h2>How to request a refund</h2>
<p>Email ${mail} from the address on your account, or contact Paddle through the link on your receipt. Refunds go back to the original payment method, usually within 5–10 business days.</p>
<p>Your legal rights as a consumer in your country are not affected by this policy.</p>`) },

  iade: { lang: "tr", path: "/iade/", title: "İade politikası | AI SaaSavran", description: "AI SaaSavran ücretli paketleri için iade ve iptal kuralları.", body: wrap("İade politikası", `Son güncelleme: ${UPDATED_TR}`, "", `
<p>Siparişler, tüm siparişlerimizde yetkili satıcı (merchant of record) olan çevrim içi satıcımız Paddle.com üzerinden alınır.</p>
<h2>14 gün koşulsuz iade</h2>
<p>Memnun kalmazsanız ücretli paketteki ilk ödemenizden sonraki 14 gün içinde tam iade isteyebilirsiniz.</p>
<h2>Yenilemeler</h2>
<p>Ücretli paketler aylık yenilenir. İstediğiniz zaman iptal edebilirsiniz; ödediğiniz dönemin sonuna kadar kullanmaya devam edersiniz. İptal etmeyi unuttuysanız, yenileme ödemesinden sonraki 7 gün içinde yazın; o dönemde hizmeti kullanmadıysanız iade ederiz.</p>
<h2>Nasıl istenir?</h2>
<p>Hesabınızdaki e-posta adresinden ${mail} adresine yazın ya da makbuzunuzdaki bağlantıdan Paddle'a başvurun. İade, ödeme yaptığınız yönteme genelde 5–10 iş günü içinde yapılır.</p>
<p>Bu politika, yasal tüketici haklarınızı kısıtlamaz.</p>`) },
};
