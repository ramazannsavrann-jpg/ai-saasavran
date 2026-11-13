// Herkese açık sayfaların içeriği (statik HTML olarak üretilir; JavaScript gerektirmez, arama motorları ve yapay zekâ botları okuyabilir).
// Kural: Burada yazan her sayı ve iddia gerçek veriye dayanır. Ölçüm sonuçları Growth Lab'in gerçek ölçümleridir (7 Kasım 2026).

export const SITE = {
  name: "AI SaaSavran",
  url: "https://aisaasavran.com",
  email: "info@aisaasavran.com",
  updated: "2026-11-07",
  // IndexNow anahtarı (gizli değildir; Bing/Yandex'e "bu sayfa değişti" bildirmek için sitede herkese açık durur).
  indexnow: "81070e2ac780301303314203d3c9f558",
  // Markanın resmî profilleri (Organization.sameAs) — yapay zekânın markayı tek bir varlık olarak tanıması için.
  sameAs: ["https://www.youtube.com/@aisaasavran"],
};

// Rehberler: müşterilerin yapay zekâya sorduğu sorulara doğrudan cevap veren sayfalar.
export const GUIDES = [
  {
    slug: "chatgpt-marka-gorunurlugu-olcme",
    title: "ChatGPT'de markanızın görünürlüğünü nasıl ölçersiniz?",
    short: "ChatGPT'de görünürlük nasıl ölçülür",
    description: "ChatGPT ve Gemini cevaplarında markanızın ne sıklıkla anıldığını ve önerildiğini ölçmenin adım adım yöntemi: soru seti, tekrar, canlı arama ve güven aralığı.",
    body: `
<p class="lede">Kısa cevap: Müşterilerinizin yapay zekâya soracağı 10–30 soruyu yazın, her soruyu birkaç kez sorun ve cevaplarda markanızın <b>anılma</b>, <b>önerilme</b> ve <b>kaynak gösterilme</b> oranını sayın. Tek bir soruya tek bir cevaba bakarak karar vermeyin; yapay zekâ aynı soruya her seferinde farklı cevap verebilir.</p>

<h2>1. Müşterinin ağzından soru seti yazın</h2>
<p>Markanızın adını içeren sorular ("X iyi mi?") yanıltıcı olur, çünkü yapay zekâ adını duyduğu markadan bahseder. Asıl önemli olan, müşterinin markasız sorduğu sorulardır:</p>
<ul>
  <li><b>Yerel arama:</b> "Antalya'da aileyle gidilecek döner salonu önerir misin?"</li>
  <li><b>Karşılaştırma:</b> "Türkiye'de en iyi mobil bankacılık uygulaması hangisi?"</li>
  <li><b>Satın alma:</b> "Kredi kartı almak için hangi bankayı önerirsin?"</li>
  <li><b>Bilgi arama:</b> "Yapay zekâ cevaplarında marka görünürlüğü nasıl ölçülür?"</li>
</ul>
<p>Soruların çoğu markasız olsun. Sektörünüze göre hazır soru şablonları <a href="/kayit">AI SaaSavran'da</a> ücretsiz pakette bile var.</p>

<h2>2. Her soruyu birden fazla kez sorun</h2>
<p>Büyük dil modelleri olasılıksal çalışır: aynı soruya bir seferinde sizi, bir sonrakinde rakibinizi önerebilir. Bu yüzden her soruyu en az 2 kez sormak ve sonucu oran olarak okumak gerekir. 20 cevabın 8'inde önerilmek, tek cevapta önerilmekten çok daha güvenilir bir bilgidir.</p>

<h2>3. Üç ölçüyü ayrı ayrı sayın</h2>
<dl class="defs">
  <dt>Anılma</dt><dd>Cevapta markanızın adı geçiyor mu?</dd>
  <dt>Önerilme</dt><dd>Adınız bir öneri listesinde ya da "öneririm", "en iyi seçenek" gibi bir ifadeyle mi geçiyor? "X önerilmez" gibi olumsuz bağlamlar öneri sayılmaz.</dd>
  <dt>Kaynak gösterilme</dt><dd>Yapay zekâ cevabı verirken sizin web sitenizi kaynak olarak gösterdi mi? Bu yalnızca internete bakan (canlı aramalı) cevaplarda ölçülebilir.</dd>
</dl>

<h2>4. Canlı arama ile aramasız cevabı karıştırmayın</h2>
<p>Yapay zekâ iki şekilde cevap verebilir: internete bakmadan yalnızca eğitim verisinden ya da internette arayarak. İki sonuç çok farklı çıkabilir. Kendi ölçümümüzde aynı 10 soruda Araç A, internete bakmayan Gemini'de 20 cevabın 2'sinde önerildi, internette arayan ChatGPT'de 8'inde. Raporunuzda hangi türün ölçüldüğü açıkça yazmalı.</p>

<h2>5. Sonucu aralıkla okuyun</h2>
<p>20 cevapta %40 önerilme, gerçekte yaklaşık %22–61 arasında bir değere karşılık gelir (Wilson güven aralığı). Küçük örneklemde "geçen hafta %30'du, bu hafta %40 oldu" demek çoğu zaman yanlış alarmdır. Eğilime birkaç ölçüm üst üste bakın.</p>

<h2>Gerçek bir örnek: kendi markamız</h2>
<p>AI SaaSavran'ı kendi ürünümüzle ölçtük (10 soru, her biri 2 kez, ChatGPT canlı web aramasıyla, 7 Kasım 2026):</p>
<p class="small">Araç adları gizlendi; beşi de tanınmış yapay zekâ görünürlük araçları.</p>
<table>
  <thead><tr><th>Marka</th><th>Önerildiği cevap</th><th>Sitesi kaynak gösterildi</th></tr></thead>
  <tbody>
    <tr><td>Araç A</td><td>8 / 20</td><td>7 / 20</td></tr>
    <tr><td>Araç B</td><td>7 / 20</td><td>6 / 20</td></tr>
    <tr><td>Araç C</td><td>7 / 20</td><td>6 / 20</td></tr>
    <tr><td>Araç E</td><td>6 / 20</td><td>1 / 20</td></tr>
    <tr><td>Araç D</td><td>5 / 20</td><td>5 / 20</td></tr>
    <tr class="us"><td>AI SaaSavran</td><td>0 / 20</td><td>0 / 20</td></tr>
  </tbody>
</table>
<p>Yeni bir marka olarak sıfırdan başlıyoruz. Bu rehberi yazmamızın sebebi de bu: öne çıkan markalar, kendi sitelerindeki rehber ve yardım sayfalarıyla kaynak gösteriliyor.</p>
`,
    faq: [
      ["ChatGPT'de markamın görünürlüğünü ücretsiz ölçebilir miyim?", "Evet. Soruları elle ChatGPT'ye sorup sonuçları bir tabloya yazabilirsiniz. AI SaaSavran'ın ücretsiz paketi bu işi Gemini ile (aramasız) otomatik yapar."],
      ["Kaç soru yeterli?", "Başlangıç için 10 markasız soru ve her soru için en az 2 cevap. 20 cevabın altındaki sonuçları kesin kabul etmeyin."],
      ["Yapay zekâ neden her seferinde farklı cevap veriyor?", "Dil modelleri olasılıksal çalışır ve canlı arama yapıldığında bulunan sayfalar da değişir. Bu yüzden ölçüm tek cevapla değil, oranla yapılır."],
    ],
  },
  {
    slug: "geo-nedir",
    title: "GEO (Generative Engine Optimization) nedir? İşletmeler için kısa rehber",
    short: "GEO nedir",
    description: "GEO, markanızın ChatGPT, Gemini gibi yapay zekâ asistanlarının cevaplarında yer alması için yapılan çalışmadır. SEO'dan farkı, nasıl ölçüldüğü ve ilk adımlar.",
    body: `
<p class="lede">GEO (Generative Engine Optimization, üretken motor optimizasyonu), markanızın ChatGPT, Gemini, Perplexity gibi yapay zekâ asistanlarının cevaplarında anılması ve önerilmesi için yapılan çalışmalardır. Benzer anlamda AEO (Answer Engine Optimization) terimi de kullanılır.</p>

<h2>SEO'dan farkı ne?</h2>
<table>
  <thead><tr><th></th><th>SEO</th><th>GEO</th></tr></thead>
  <tbody>
    <tr><td>Hedef</td><td>Google sonuç sayfasında üst sıralar</td><td>Yapay zekâ cevabının içinde anılmak ve önerilmek</td></tr>
    <tr><td>Kullanıcı ne görür?</td><td>10 bağlantı</td><td>Tek bir cevap, çoğu zaman 3–5 öneri</td></tr>
    <tr><td>Nasıl ölçülür?</td><td>Sıralama, tıklama</td><td>Anılma, önerilme ve kaynak gösterilme oranı</td></tr>
  </tbody>
</table>
<p>İkisi birbirinin rakibi değildir: canlı arama yapan asistanlar, cevap verirken internetteki sayfalara bakar. İyi SEO, GEO'nun da temelidir.</p>

<h2>Yapay zekâ neye bakarak öneriyor?</h2>
<p>Canlı aramalı ölçümlerimizde ChatGPT'nin en çok şu tür kaynakları gösterdiğini gördük:</p>
<ul>
  <li>Markaların kendi sitelerindeki rehber, blog ve yardım sayfaları (örneğin tanınmış araçların yardım merkezleri)</li>
  <li>Resmî kurumlar ve raporlar (bankacılık sorularında BDDK, TMSF ve danışmanlık şirketlerinin raporları)</li>
  <li>Karşılaştırma ve inceleme siteleri</li>
</ul>

<h2>İlk 5 adım</h2>
<ol>
  <li>Müşterinizin yapay zekâya soracağı 10 markasız soruyu yazın ve bugünkü durumunuzu ölçün.</li>
  <li>Web sitenizde yapay zekâ botlarını engellemediğinizden emin olun (robots.txt'te GPTBot, OAI-SearchBot, PerplexityBot, Google-Extended).</li>
  <li>Bu soruların cevabını doğrudan veren, açık başlıklı sayfalar yazın (sık sorulan sorular, rehberler).</li>
  <li>Sizi rakiplerden ayıran somut bilgileri (fiyat aralığı, hizmet bölgesi, uzmanlık, ödüller) sitenizde açıkça yazın.</li>
  <li>Birkaç hafta sonra aynı soruları yeniden ölçün ve değişime bakın.</li>
</ol>
`,
    faq: [
      ["GEO ile SEO aynı şey mi?", "Hayır ama bağlantılılar. SEO arama sonuçlarında sıralamayı, GEO yapay zekâ cevabının içinde yer almayı hedefler. Canlı arama yapan asistanlar internetteki sayfalara baktığı için iyi SEO GEO'ya da yardım eder."],
      ["GEO sonuç vermesi ne kadar sürer?", "Canlı arama yapan asistanlarda sitenizdeki değişiklik birkaç hafta içinde görülebilir. İnternete bakmayan model bilgisindeki değişim ise yeni model eğitimlerini bekler ve aylar sürebilir."],
    ],
  },
  {
    slug: "yerel-isletme-yapay-zeka",
    title: "Yerel işletmeler ChatGPT ve Gemini'de nasıl öne çıkar?",
    short: "Yerel işletmeler için yapay zekâ",
    description: "Restoran, klinik, oto servis, emlak gibi yerel işletmelerin yapay zekâ asistanlarının önerilerinde yer alması için pratik kontrol listesi.",
    body: `
<p class="lede">Müşterileriniz artık "Kadıköy'de iyi bir diş kliniği önerir misin?" gibi soruları yapay zekâya soruyor. Yapay zekâ bu soruya 3–5 işletme adı verir. Bu listede olmak için yapabilecekleriniz:</p>

<h2>Kontrol listesi</h2>
<ol>
  <li><b>Google İşletme Profili:</b> Adınız, adresiniz, telefonunuz ve çalışma saatleriniz eksiksiz ve güncel olsun. Canlı arama yapan asistanlar bu bilgilere sık başvurur.</li>
  <li><b>Her yerde aynı bilgi:</b> Sitenizde, haritalarda ve rehber sitelerde işletme adınız ve adresiniz aynı yazılsın.</li>
  <li><b>Web sitesinde şehir ve hizmet:</b> Ana sayfanızda hangi şehir ve ilçede, hangi hizmeti verdiğinizi düz cümleyle yazın. "Antalya Muratpaşa'da aile işletmesi döner salonu" gibi.</li>
  <li><b>Sık sorulan sorular sayfası:</b> Müşterilerin gerçekten sorduğu soruları (fiyat aralığı, rezervasyon, otopark, paket servis) cevaplayın.</li>
  <li><b>Yorumlar:</b> Memnun müşterilerden yorum isteyin. Yapay zekâ cevaplarında "yorumları olumlu" ifadesi sık geçer.</li>
  <li><b>Yapay zekâ botlarına izin:</b> Sitenizin robots.txt dosyası GPTBot, OAI-SearchBot ve PerplexityBot'u engellemesin.</li>
  <li><b>Yapılandırılmış veri:</b> Sitenize LocalBusiness türünde schema.org bilgisi ekleyin (adres, telefon, saatler).</li>
</ol>
<p>AI SaaSavran'ın web sitesi kontrolü bu maddelerin bir kısmını otomatik kontrol eder ve eksikleri "Öneriler" sekmesinde listeler.</p>

<h2>Ölçmeden başlamayın</h2>
<p>Önce bugünkü durumunuzu görün: hangi sorularda anılıyorsunuz, hangilerinde sizin yerinize rakibiniz öneriliyor? Değişiklik yaptıktan birkaç hafta sonra aynı soruları tekrar ölçün.</p>
`,
    faq: [
      ["Küçük bir işletme için yapay zekâ görünürlüğü önemli mi?", "Evet. Yapay zekâ asistanları çoğu soruda yalnızca birkaç işletme önerir; listede olmamak, o müşteriyi hiç görmemek demektir."],
      ["Reklam vererek yapay zekâda çıkabilir miyim?", "Yapay zekâ cevaplarındaki öneriler ücretli değildir; internetteki bilgilere ve modelin bildiklerine dayanır. Bu yüzden doğru ve tutarlı bilgi en önemli etkendir."],
    ],
  },
  {
    slug: "rakip-neden-oneriliyor",
    title: "Rakibiniz ChatGPT'de neden öneriliyor? Kaynak analiziyle öğrenin",
    short: "Rakip neden öneriliyor",
    description: "ChatGPT canlı web aramasıyla cevap verirken hangi sitelere baktığını gösterir. Bu kaynakları incelemek, rakibinizin neden önerildiğini anlamanın en hızlı yoludur.",
    body: `
<p class="lede">ChatGPT internette arayarak cevap verdiğinde, baktığı sayfaları kaynak olarak gösterir. Rakibinizin önerildiği cevaplardaki kaynaklara bakmak, onun neden önerildiğini anlamanın en hızlı yoludur.</p>

<h2>Gerçek bir örnek: bankacılık</h2>
<p>"Türkiye'de en iyi mobil bankacılık uygulaması hangisi?" gibi 5 soruyu ChatGPT'ye canlı web aramasıyla ikişer kez sorduk (7 Kasım 2026, toplam 10 cevap):</p>
<table>
  <thead><tr><th>Banka</th><th>Önerildiği cevap</th></tr></thead>
  <tbody>
    <tr><td>Banka C</td><td>6 / 10</td></tr>
    <tr><td>Banka A</td><td>5 / 10</td></tr>
    <tr><td>Banka B</td><td>3 / 10</td></tr>
    <tr><td>Banka E</td><td>2 / 10</td></tr>
    <tr><td>Banka D</td><td>1 / 10</td></tr>
  </tbody>
</table>
<p>En çok gösterilen kaynaklar: Banka A ve Banka C'nin kendi siteleri, bddk.gov.tr, tmsf.org.tr ve bir danışmanlık şirketinin raporu. Banka C örneğinde ChatGPT, bankanın kendi sitesindeki "uygulamamız art arda ödül aldı" sayfasını kaynak gösterip bankanın mobil uygulamasını önerdi.</p>
<p>Çıkarılacak ders: Yapay zekâ, <b>doğrulanabilir ve güncel iddiaları</b> (ödül, rapor, resmî veri) kendi sitesinde açıkça yazan markayı öne çıkarıyor. Bu ölçüm tek seferliktir ve az sayıda cevaba dayanır; kesin bir sıralama olarak okunmamalıdır.</p>

<h2>Kendi rakip analiziniz için 4 adım</h2>
<ol>
  <li>Rakibinizin önerildiği soruları belirleyin.</li>
  <li>Bu cevaplarda gösterilen kaynak siteleri listeleyin.</li>
  <li>Kaynaklar rakibin kendi sitesiyse: o sayfada ne yazdığına bakın (hangi soruya cevap veriyor, hangi kanıtı sunuyor). Kaynak bir rehber ya da karşılaştırma sitesiyse: orada yer almanın yolunu arayın.</li>
  <li>Kendi sitenizde aynı soruya daha net ve kanıtlı cevap veren bir sayfa hazırlayın.</li>
</ol>
`,
    faq: [
      ["ChatGPT'nin hangi sitelere baktığını nasıl görürüm?", "ChatGPT internette aradığında cevabın altında ya da içinde kaynak bağlantıları gösterir. AI SaaSavran canlı aramalı ölçümde bu kaynakları her cevap için kaydeder ve en çok gösterilen siteleri listeler."],
    ],
  },
  {
    slug: "youtuber-yapay-zeka-gorunurlugu",
    title: "YouTuber'lar ve içerik üreticileri ChatGPT'de nasıl önerilir?",
    short: "İçerik üreticileri için yapay zekâ",
    description: "\"En iyi yemek kanalı hangisi?\" gibi sorularda yapay zekâ hangi kanalları öneriyor? İçerik üreticileri için ölçüm yöntemi ve pratik kontrol listesi.",
    body: `
<p class="lede">İzleyiciler artık "Yeni başlayanlar için yatırımı anlatan iyi bir YouTube kanalı önerir misin?" gibi soruları ChatGPT, Gemini ve Claude'a da soruyor. Yapay zekâ genellikle 3–5 kanal adı verir. Bu listede olmak, yeni izleyiciye ulaşmanın yeni yollarından biri.</p>

<h2>Nasıl ölçülür?</h2>
<ol>
  <li>İzleyicinizin soracağı 10–20 soru yazın (konu, seviye, dil: "Türkçe", "yeni başlayan", "kısa video").</li>
  <li>Kanalınızı ve benzer 3–5 kanalı ekleyin. Kanal adresinizi <b>youtube.com/@kanaliniz</b> biçiminde girin.</li>
  <li>Soruları birkaç kez, tercihen canlı web aramasıyla sorun; kanalınızın <b>anılma</b>, <b>önerilme</b> ve <b>kaynak gösterilme</b> oranına bakın.</li>
  <li>Önerilmediğiniz sorularda yerinize hangi kanalın önerildiğine ve yapay zekânın hangi sitelere (liste yazıları, forumlar, haberler) baktığına bakın.</li>
</ol>

<h2>Kontrol listesi</h2>
<ul>
  <li><b>Kanal açıklaması ve video açıklamaları:</b> Konunuzu ve kime hitap ettiğinizi açıkça yazın; anahtar kelimeleri doğal kullanın.</li>
  <li><b>Altyazı/transkript:</b> Videolarınızın metni okunabilir olsun.</li>
  <li><b>Kendi siteniz veya bağlantı sayfanız:</b> Kanalınızı anlatan, sosyal hesaplarınızı bağlayan tek bir sayfa.</li>
  <li><b>Liste ve öneri yazıları:</b> "En iyi … kanalları" yazılarında, forumlarda ve haberlerde yer almak; yapay zekâ bu sayfaları sık kaynak gösterir.</li>
  <li><b>Tutarlı ad:</b> Kanal adınızı her yerde aynı yazın.</li>
</ul>
<p>AI SaaSavran'da "İçerik üreticisi" sektörlerini seçince hazır sorular gelir; kendi site payı hesabında kanal adresiniz ayrı tanınır (başka kanallar "sizin siteniz" sayılmaz).</p>
`,
    faq: [
      ["Yapay zekâ YouTube videolarını kaynak gösterir mi?", "Evet, canlı web aramasında YouTube videoları ve kanal sayfaları kaynak olarak gösterilebilir. Ama çoğu zaman liste yazıları, forumlar ve haber siteleri de belirleyicidir."],
      ["Abone sayısı yüksek olan kanal hep önerilir mi?", "Hayır. Yapay zekâ soruya uygunluğa ve internetteki bilgilere bakar; küçük ama konusunda net bir kanal belirli sorularda öne çıkabilir."],
    ],
  },
];

export const HOME_FAQ = [
  ["AI SaaSavran ne işe yarar?", "Markanızın ChatGPT ve Gemini gibi yapay zekâ asistanlarının cevaplarında ne sıklıkla anıldığını ve önerildiğini ölçer, rakiplerinizle karşılaştırır ve ne yapmanız gerektiğini önerir."],
  ["AI SaaSavran'ın benzer adlı başka şirketlerle ilgisi var mı?", "Hayır. AI SaaSavran, aisaasavran.com adresindeki yapay zekâ görünürlük ölçüm aracıdır. Kendi paketleri olan (Free, Plus 29 $, Pro 149 $, Business 449 $ aylık) bağımsız bir üründür; benzer adlı şirket ya da hizmetlerle bağlantısı yoktur. Bir yapay zekâ asistanı bizim adımızla farklı paketler ya da farklı bir iş anlatıyorsa, başka birini anlatıyordur."],
  ["Ücretsiz mi?", "Ücretsiz paketle 1 marka, 15 soru ve ayda 4 ölçümle başlayabilirsiniz. Ücretli paketler ChatGPT tarzı: Plus 29 $, Pro 149 $, Business 449 $ (aylık); istediğiniz zaman iptal edebilirsiniz. Ücretsiz pakette ölçümler Gemini ile, internete bakmadan (model bilgisiyle) yapılır ve raporda bu açıkça yazar."],
  ["Hangi yapay zekâlar ölçülüyor?", "Ücretsiz pakette Gemini (canlı web araması olmadan; Avrupa Ekonomik Alanı, İsviçre ve Birleşik Krallık'ta kullanılamaz). Ücretli paketlerde buna ChatGPT ve Claude canlı web aramalı ölçüm ve baktıkları kaynak siteler eklenir. Perplexity henüz yok. Raporlar her motoru ayrı gösterir."],
  ["Ürün hazır mı?", "Erken erişim aşamasındayız. Neyin çalıştığını, neyin denemede olduğunu ürün durumu sayfasında açıkça yazıyoruz."],
];
