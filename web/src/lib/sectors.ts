// Sektörler, hazır soru şablonları ve örnek rakipler.
// Şablonlar elle yazıldı (yapay zekâ ile üretilmedi). Örnek rakipler Türkiye'de bilinen markalardır; yalnızca öneridir,
// kullanıcı tek dokunuşla ekler ya da yok sayar.
//   local: true  → şehir/ilçe önemli (restoran, klinik...). Sorularda {where} = "Antalya'da", {city} = "Antalya".
//   local: false → ulusal markalar (banka, telekom...). Sorular "Türkiye'de" diye kurulur.

import type { Intent } from "./data";
import { isEn } from "./i18n";
import { QUESTION_POOL } from "./question-pool";

export interface SectorDef {
  label: string;           // veritabanında saklanan değer (eski kayıtlarla uyumlu)
  local: boolean;
  questions: { text: string; intent: Intent }[];
  competitors: string[];
}

const Q = (text: string, intent: Intent) => ({ text, intent });

export const SECTOR_DEFS: SectorDef[] = [
  {
    label: "Restoran / döner-kebap", local: true, competitors: [],
    questions: [
      Q("{city} için en iyi döner ve kebap restoranları hangileri?", "local"),
      Q("{where} uygun fiyatlı ve lezzetli bir restoran önerir misin?", "comparison"),
      Q("{where} ailece gidilebilecek restoranlar hangileri?", "local"),
      Q("{where} gece geç saatte açık olan iyi bir dönerci var mı?", "purchase"),
      Q("İyi bir döner restoranını nasıl anlarım?", "informational"),
    ],
  },
  {
    label: "Kafe / pastane", local: true, competitors: [],
    questions: [
      Q("{where} kahvaltı için en iyi kafeler hangileri?", "local"),
      Q("{where} ders çalışmaya uygun sessiz bir kafe önerir misin?", "comparison"),
      Q("{where} doğum günü pastası için iyi bir pastane hangisi?", "purchase"),
    ],
  },
  {
    label: "Market", local: false,
    competitors: ["Migros", "BİM", "A101", "ŞOK", "CarrefourSA"],
    questions: [
      Q("Türkiye'de alışveriş için en uygun fiyatlı market zinciri hangisi?", "comparison"),
      Q("Online market siparişi için hangi marketi önerirsin?", "purchase"),
      Q("Taze meyve sebze için en iyi market hangisi?", "comparison"),
      Q("Market alışverişinde nasıl tasarruf ederim?", "informational"),
    ],
  },
  {
    label: "Akaryakıt istasyonu", local: false,
    competitors: ["Opet", "Shell", "Petrol Ofisi", "BP", "TotalEnergies"],
    questions: [
      Q("Türkiye'de en kaliteli yakıtı hangi akaryakıt istasyonu satıyor?", "comparison"),
      Q("Uzun yolda mola vermek için en iyi akaryakıt istasyonları hangileri?", "local"),
      Q("Akaryakıt alırken hangi istasyonun sadakat programı daha avantajlı?", "purchase"),
    ],
  },
  {
    label: "Otel / turizm", local: true, competitors: [],
    questions: [
      Q("{where} aileler için en iyi oteller hangileri?", "local"),
      Q("{where} uygun fiyatlı ve temiz bir otel önerir misin?", "comparison"),
      Q("{where} denize yakın butik otel arıyorum, hangisini önerirsin?", "purchase"),
      Q("Otel seçerken nelere dikkat etmeliyim?", "informational"),
    ],
  },
  {
    label: "Mobilya mağazası", local: false,
    competitors: ["İstikbal", "Bellona", "Doğtaş", "Kelebek", "IKEA"],
    questions: [
      Q("Türkiye'de kaliteli ve uygun fiyatlı mobilya markası hangisi?", "comparison"),
      Q("Yeni ev için koltuk takımı almak istiyorum, hangi markayı önerirsin?", "purchase"),
      Q("{where} güvenilir mobilya mağazaları hangileri?", "local"),
      Q("Mobilya alırken kaliteyi nasıl anlarım?", "informational"),
    ],
  },
  {
    label: "Otomotiv", local: true, competitors: [],
    questions: [
      Q("{where} güvenilir oto servis önerir misin?", "local"),
      Q("{where} ikinci el araba almak için güvenilir galeriler hangileri?", "purchase"),
      Q("Araba bakımını yetkili serviste mi özel serviste mi yaptırmalıyım?", "informational"),
    ],
  },
  {
    label: "Emlak", local: true, competitors: [],
    questions: [
      Q("{where} güvenilir emlak ofisleri hangileri?", "local"),
      Q("{where} ev almak için hangi emlakçıyla çalışmalıyım?", "purchase"),
      Q("Ev alırken emlakçı seçerken nelere dikkat etmeliyim?", "informational"),
    ],
  },
  {
    label: "Klinik / sağlık", local: true, competitors: [],
    questions: [
      Q("{where} en iyi diş klinikleri hangileri?", "local"),
      Q("{where} güvenilir bir göz doktoru önerir misin?", "comparison"),
      Q("{where} randevu almak için iyi bir özel klinik hangisi?", "purchase"),
    ],
  },
  {
    label: "Teknoloji / elektronik", local: false,
    competitors: ["Teknosa", "MediaMarkt", "Vatan Bilgisayar", "Hepsiburada", "Trendyol"],
    questions: [
      Q("Türkiye'de telefon ve bilgisayar almak için en güvenilir mağaza hangisi?", "comparison"),
      Q("Laptop almak istiyorum, hangi mağazadan almalıyım?", "purchase"),
      Q("Elektronik üründe garanti ve servis için en iyi mağaza hangisi?", "comparison"),
    ],
  },
  {
    label: "Oto yıkama / yerel hizmet", local: true, competitors: [],
    questions: [
      Q("{where} en iyi oto yıkama hangisi?", "local"),
      Q("{where} detaylı iç temizlik yapan oto yıkamacı önerir misin?", "purchase"),
      Q("{where} uygun fiyatlı oto kuaför hangisi?", "comparison"),
    ],
  },
  {
    label: "Banka / finans", local: false,
    competitors: ["Garanti BBVA", "Akbank", "İş Bankası", "Yapı Kredi", "Ziraat Bankası", "QNB", "Enpara.com"],
    questions: [
      Q("Türkiye'de en iyi mobil bankacılık uygulaması hangisi?", "comparison"),
      Q("Kredi kartı almak için hangi bankayı önerirsin?", "purchase"),
      Q("Yeni hesap açmak için en iyi banka hangisi?", "purchase"),
      Q("Türkiye'nin en güvenilir bankaları hangileri?", "informational"),
      Q("Esnaflar için en uygun kredi veren bankalar hangileri?", "comparison"),
      Q("İhtiyaç kredisi için en düşük faizi hangi banka veriyor?", "comparison"),
    ],
  },
  {
    label: "Sigorta", local: false,
    competitors: ["Allianz", "Axa Sigorta", "Anadolu Sigorta", "Sompo Sigorta", "Mapfre"],
    questions: [
      Q("Türkiye'de kasko için en iyi sigorta şirketi hangisi?", "comparison"),
      Q("Özel sağlık sigortası yaptırmak istiyorum, hangi şirketi önerirsin?", "purchase"),
      Q("Hasar ödemesinde en hızlı sigorta şirketleri hangileri?", "comparison"),
      Q("Konut sigortası yaptırırken nelere dikkat etmeliyim?", "informational"),
    ],
  },
  {
    label: "Telekom / internet", local: false,
    competitors: ["Turkcell", "Vodafone", "Türk Telekom", "Superonline"],
    questions: [
      Q("Türkiye'de en iyi çeken GSM operatörü hangisi?", "comparison"),
      Q("Ev interneti için hangi firmayı önerirsin?", "purchase"),
      Q("Uygun fiyatlı faturalı hat için hangi operatör daha avantajlı?", "comparison"),
    ],
  },
  {
    label: "E-ticaret", local: false,
    competitors: ["Trendyol", "Hepsiburada", "Amazon Türkiye", "n11", "Pazarama"],
    questions: [
      Q("Türkiye'de online alışveriş için en güvenilir site hangisi?", "comparison"),
      Q("Hızlı kargo ve kolay iade için hangi alışveriş sitesini önerirsin?", "purchase"),
      Q("İnternetten alışverişte dolandırılmamak için nelere dikkat etmeliyim?", "informational"),
    ],
  },
  {
    label: "Kargo / lojistik", local: false,
    competitors: ["Yurtiçi Kargo", "Aras Kargo", "MNG Kargo", "PTT Kargo", "Sürat Kargo"],
    questions: [
      Q("Türkiye'de en hızlı kargo firması hangisi?", "comparison"),
      Q("Küçük işletme olarak gönderilerim için hangi kargo firmasıyla anlaşmalıyım?", "purchase"),
      Q("Kargo firması seçerken nelere dikkat etmeliyim?", "informational"),
    ],
  },
  {
    label: "Havayolu / seyahat", local: false,
    competitors: ["Türk Hava Yolları", "Pegasus", "AJet", "SunExpress"],
    questions: [
      Q("Türkiye'de iç hatlarda en iyi havayolu şirketi hangisi?", "comparison"),
      Q("Ucuz uçak bileti için hangi havayolunu önerirsin?", "purchase"),
      Q("Rötar ve bagaj konusunda en güvenilir havayolu hangisi?", "comparison"),
    ],
  },
  {
    label: "Giyim / moda", local: false,
    competitors: ["LC Waikiki", "DeFacto", "Koton", "Mavi", "Zara"],
    questions: [
      Q("Türkiye'de kaliteli ve uygun fiyatlı giyim markası hangisi?", "comparison"),
      Q("Kot pantolon almak için hangi markayı önerirsin?", "purchase"),
      Q("Çocuk kıyafeti için en iyi markalar hangileri?", "comparison"),
    ],
  },
  {
    label: "Kozmetik / kişisel bakım", local: false,
    competitors: ["Gratis", "Watsons", "Eve Shop", "Flormar"],
    questions: [
      Q("Türkiye'de kozmetik alışverişi için en iyi mağaza hangisi?", "comparison"),
      Q("Uygun fiyatlı ve kaliteli makyaj markası önerir misin?", "purchase"),
      Q("Cilt bakım ürünü seçerken nelere dikkat etmeliyim?", "informational"),
    ],
  },
  {
    label: "Eğitim / kurs", local: true, competitors: [],
    questions: [
      Q("{where} en iyi İngilizce kursları hangileri?", "local"),
      Q("{where} üniversite sınavına hazırlık için hangi dershaneyi önerirsin?", "purchase"),
      Q("Kurs seçerken nelere dikkat etmeliyim?", "informational"),
    ],
  },
  {
    label: "Yazılım / dijital hizmet", local: false, competitors: [],
    questions: [
      Q("Türkiye'de küçük işletmeler için en iyi muhasebe programı hangisi?", "comparison"),
      Q("Web sitesi yaptırmak için hangi ajansı önerirsin?", "purchase"),
    ],
  },
  // İçerik üreticileri (YouTube kanalı, podcast, sosyal medya). Marka = kanal adı; web sitesi = youtube.com/@kanal.
  { label: "İçerik üreticisi: yemek / tarif", local: false, competitors: [], questions: [
    Q("Türkiye'de yemek tarifi için en iyi YouTube kanalları hangileri?", "comparison"),
    Q("Yeni başlayanlar için pratik tarifler anlatan bir YouTube kanalı önerir misin?", "purchase"),
    Q("Türk mutfağını iyi anlatan içerik üreticileri kimler?", "informational"),
    Q("Hızlı ve ekonomik yemek tarifleri için kimi takip etmeliyim?", "purchase"),
  ] },
  { label: "İçerik üreticisi: teknoloji / inceleme", local: false, competitors: [], questions: [
    Q("Türkiye'de telefon ve teknoloji incelemesi için en güvenilir YouTube kanalları hangileri?", "comparison"),
    Q("Telefon almadan önce hangi YouTuber'ın incelemesini izlemeliyim?", "purchase"),
    Q("Tarafsız teknoloji incelemesi yapan Türk içerik üreticileri kimler?", "informational"),
  ] },
  { label: "İçerik üreticisi: oyun", local: false, competitors: [], questions: [
    Q("Türkiye'de en popüler oyun YouTuber'ları kimler?", "comparison"),
    Q("Oyun rehberleri ve ipuçları için hangi kanalı önerirsin?", "purchase"),
    Q("Eğlenceli oyun yayını yapan Türk yayıncılar kimler?", "informational"),
  ] },
  { label: "İçerik üreticisi: eğitim / ders", local: false, competitors: [], questions: [
    Q("Ücretsiz ders anlatan en iyi Türkçe YouTube kanalları hangileri?", "comparison"),
    Q("YKS'ye hazırlanmak için hangi YouTube kanalını önerirsin?", "purchase"),
    Q("Yazılım öğrenmek için Türkçe içerik üreten kanallar hangileri?", "purchase"),
  ] },
  { label: "İçerik üreticisi: seyahat / gezi", local: false, competitors: [], questions: [
    Q("Türkiye'de gezi videoları çeken en iyi YouTuber'lar kimler?", "comparison"),
    Q("Uygun bütçeli seyahat ipuçları için kimi takip etmeliyim?", "purchase"),
    Q("Türkiye'yi gezmek için ilham veren içerik üreticileri kimler?", "informational"),
  ] },
  { label: "İçerik üreticisi: finans / yatırım", local: false, competitors: [], questions: [
    Q("Yeni başlayanlar için yatırımı anlatan en iyi Türkçe YouTube kanalları hangileri?", "comparison"),
    Q("Kişisel finans ve bütçe yönetimi için kimi takip etmeliyim?", "purchase"),
    Q("Ekonomiyi sade anlatan Türk içerik üreticileri kimler?", "informational"),
  ] },
  { label: "İçerik üreticisi: güzellik / moda", local: false, competitors: [], questions: [
    Q("Türkiye'de makyaj ve cilt bakımı için en iyi YouTuber'lar kimler?", "comparison"),
    Q("Uygun fiyatlı kozmetik önerileri için hangi kanalı izlemeliyim?", "purchase"),
    Q("Moda ve kombin önerileri veren içerik üreticileri kimler?", "informational"),
  ] },
  { label: "İçerik üreticisi: spor / fitness", local: false, competitors: [], questions: [
    Q("Evde spor için en iyi Türkçe YouTube kanalları hangileri?", "comparison"),
    Q("Yeni başlayanlar için fitness programı anlatan kanal önerir misin?", "purchase"),
    Q("Sağlıklı beslenme ve spor içerikleri üreten Türk YouTuber'lar kimler?", "informational"),
  ] },
  { label: "İçerik üreticisi: diğer", local: false, competitors: [], questions: [
    Q("Bu konuda en iyi Türkçe YouTube kanalları hangileri?", "comparison"),
  ] },
  // 19 Kasım: tarım, üretim/sanayi ve yerel hizmet sektörleri ("Diğer" ile boş başlayanlar için)
  { label: "Tarım / gübre / zirai ürünler", local: true, competitors: ["Gübretaş", "Toros Tarım", "İGSAŞ", "Ekim Grup"], questions: [
    Q("{where} köklendirici gübre nereden alınır?", "purchase"),
    Q("Türkiye'de en iyi gübre markaları hangileri?", "comparison"),
    Q("Organik gübre mi kimyasal gübre mi daha iyi?", "informational"),
    Q("{where} zirai ürün ve gübre bayileri hangileri?", "local"),
    Q("Sera ve meyve bahçesi için hangi gübre önerilir?", "comparison"),
    Q("Yaprak gübresinde hangi marka daha etkili?", "comparison"),
    Q("Toprak analizinden sonra hangi gübre kullanılmalı?", "informational"),
  ] },
  { label: "Tohum / fide / fidan", local: true, competitors: [], questions: [
    Q("{where} fide ve fidan nereden alınır?", "purchase"),
    Q("Türkiye'de en iyi sebze tohumu markaları hangileri?", "comparison"),
    Q("Sertifikalı fidan satan güvenilir firmalar hangileri?", "comparison"),
    Q("Hibrit tohum mu yerli tohum mu tercih edilmeli?", "informational"),
    Q("{where} sera fidesi satan firmalar hangileri?", "local"),
  ] },
  { label: "Hayvancılık / yem", local: true, competitors: [], questions: [
    Q("Türkiye'de en iyi büyükbaş yemi markaları hangileri?", "comparison"),
    Q("{where} yem bayileri hangileri?", "local"),
    Q("Süt verimini artıran yem hangisi?", "comparison"),
    Q("Kanatlı yemi için hangi firma önerilir?", "purchase"),
    Q("{where} veteriner ilacı ve hayvancılık ekipmanı nereden alınır?", "purchase"),
  ] },
  { label: "Üretim / sanayi (B2B)", local: false, competitors: [], questions: [
    Q("Türkiye'de fason üretim yapan güvenilir firmalar hangileri?", "comparison"),
    Q("Toptan alım için hangi üreticiler önerilir?", "purchase"),
    Q("İhracat yapan güvenilir Türk üretici firmalar hangileri?", "comparison"),
    Q("Bir tedarikçinin güvenilir olduğunu nasıl anlarım?", "informational"),
    Q("Organize sanayi bölgelerinde öne çıkan üretici firmalar hangileri?", "comparison"),
  ] },
  { label: "Makine / ekipman", local: false, competitors: [], questions: [
    Q("Türkiye'de en iyi tarım makinesi markaları hangileri?", "comparison"),
    Q("CNC tezgâhı için hangi firma önerilir?", "purchase"),
    Q("Endüstriyel kompresörde hangi marka daha iyi?", "comparison"),
    Q("İkinci el makine alırken nelere dikkat edilmeli?", "informational"),
    Q("Makine yedek parçası nereden alınır?", "purchase"),
  ] },
  { label: "İnşaat / yapı malzemesi", local: true, competitors: ["Kalekim", "Çimsa", "Akçansa", "Filli Boya", "VitrA"], questions: [
    Q("{where} yapı malzemesi nereden alınır?", "purchase"),
    Q("En iyi boya markaları hangileri?", "comparison"),
    Q("Isı yalıtımı için hangi marka önerilir?", "comparison"),
    Q("{where} güvenilir müteahhit firmaları hangileri?", "local"),
    Q("Seramik ve vitrifiyede en iyi markalar hangileri?", "comparison"),
    Q("Su yalıtımı için hangi ürün daha iyi?", "informational"),
  ] },
  { label: "Enerji / güneş paneli", local: true, competitors: ["Kalyon PV", "Smart Güneş", "CW Enerji"], questions: [
    Q("{where} güneş paneli kuran firmalar hangileri?", "local"),
    Q("Çatı tipi güneş enerjisi sistemi kaça mal olur?", "informational"),
    Q("Türkiye'de en iyi güneş paneli markaları hangileri?", "comparison"),
    Q("Güneş paneli kurulumunda nelere dikkat edilmeli?", "informational"),
    Q("Tarımsal sulama için güneş enerjisi sistemi kuran firmalar hangileri?", "purchase"),
  ] },
  { label: "Gıda üretimi / toptan gıda", local: false, competitors: [], questions: [
    Q("Türkiye'de güvenilir toptan gıda tedarikçileri hangileri?", "comparison"),
    Q("Restoranlar için iyi bir gıda toptancısı hangisi?", "purchase"),
    Q("Toptan zeytinyağı nereden alınır?", "purchase"),
    Q("Doğal ve katkısız ürün satan markalar hangileri?", "comparison"),
    Q("Helal sertifikalı gıda üreticileri hangileri?", "comparison"),
  ] },
  { label: "Kimya / temizlik ürünleri", local: false, competitors: ["Evyap", "Hayat Kimya", "Eyüp Sabri Tuncer"], questions: [
    Q("Türkiye'de en iyi temizlik ürünü markaları hangileri?", "comparison"),
    Q("Endüstriyel temizlik kimyasalı tedarikçileri hangileri?", "purchase"),
    Q("Doğal ve çevre dostu deterjan markaları hangileri?", "comparison"),
    Q("Toptan temizlik malzemesi nereden alınır?", "purchase"),
    Q("Otel ve restoranlar için hangi temizlik ürünü markası önerilir?", "comparison"),
  ] },
  { label: "Ambalaj / plastik", local: false, competitors: [], questions: [
    Q("Türkiye'de güvenilir ambalaj üreticileri hangileri?", "comparison"),
    Q("Gıda ambalajı için hangi firma önerilir?", "purchase"),
    Q("Kargo kutusu toptan nereden alınır?", "purchase"),
    Q("Geri dönüştürülebilir ambalaj üreten firmalar hangileri?", "comparison"),
    Q("Özel baskılı ambalaj yaptırmak için hangi firmalar var?", "purchase"),
  ] },
  { label: "Diş kliniği", local: true, competitors: [], questions: [
    Q("{where} en iyi diş klinikleri hangileri?", "local"),
    Q("{where} implant tedavisi için hangi klinik önerilir?", "comparison"),
    Q("Diş beyazlatma için güvenilir klinik nasıl seçilir?", "informational"),
    Q("{where} acil diş hekimi var mı?", "local"),
    Q("{where} çocuklar için diş hekimi önerir misin?", "comparison"),
    Q("Zirkonyum kaplama için hangi klinik iyi?", "comparison"),
  ] },
  { label: "Kuaför / güzellik salonu", local: true, competitors: [], questions: [
    Q("{where} en iyi kuaförler hangileri?", "local"),
    Q("{where} lazer epilasyon için hangi salon önerilir?", "comparison"),
    Q("{where} gelin saçı ve makyajı için iyi bir salon var mı?", "purchase"),
    Q("{where} uygun fiyatlı güzellik merkezi hangisi?", "comparison"),
    Q("İyi bir güzellik salonunu nasıl anlarım?", "informational"),
  ] },
  { label: "Spor salonu / fitness", local: true, competitors: [], questions: [
    Q("{where} en iyi spor salonları hangileri?", "local"),
    Q("{where} kadınlara özel spor salonu var mı?", "local"),
    Q("{where} uygun fiyatlı bir fitness salonu önerir misin?", "comparison"),
    Q("{where} kişisel antrenör hizmeti veren salonlar hangileri?", "purchase"),
    Q("{where} havuzlu spor merkezi hangisi?", "local"),
  ] },
  { label: "Hukuk bürosu / avukat", local: true, competitors: [], questions: [
    Q("{where} iyi bir boşanma avukatı önerir misin?", "comparison"),
    Q("{where} ticaret hukukunda güvenilir avukatlık büroları hangileri?", "comparison"),
    Q("{where} iş davası için avukat nasıl bulunur?", "purchase"),
    Q("{where} gayrimenkul avukatı önerir misin?", "comparison"),
    Q("Avukat seçerken nelere dikkat etmeliyim?", "informational"),
  ] },
  { label: "Muhasebe / mali müşavir", local: true, competitors: [], questions: [
    Q("{where} şirketler için iyi bir mali müşavir önerir misin?", "comparison"),
    Q("{where} uygun fiyatlı muhasebe bürosu hangisi?", "comparison"),
    Q("Şahıs şirketi için muhasebeci nasıl seçilir?", "informational"),
    Q("E-ticaret muhasebesi yapan firmalar hangileri?", "purchase"),
    Q("Online muhasebe hizmeti veren firmalar hangileri?", "comparison"),
  ] },
  { label: "Veteriner / pet shop", local: true, competitors: [], questions: [
    Q("{where} en iyi veteriner klinikleri hangileri?", "local"),
    Q("{where} 7/24 açık veteriner var mı?", "local"),
    Q("En iyi kedi maması markaları hangileri?", "comparison"),
    Q("En iyi köpek maması markaları hangileri?", "comparison"),
    Q("{where} güvenilir bir pet shop hangisi?", "local"),
  ] },
  { label: "Düğün / organizasyon", local: true, competitors: [], questions: [
    Q("{where} en iyi düğün salonları hangileri?", "local"),
    Q("{where} kır düğünü için mekân önerir misin?", "comparison"),
    Q("{where} organizasyon firmaları hangileri?", "local"),
    Q("{where} iyi bir düğün fotoğrafçısı önerir misin?", "comparison"),
    Q("{where} uygun fiyatlı nişan organizasyonu yapan firmalar hangileri?", "purchase"),
  ] },
  { label: "Reklam / dijital ajans", local: true, competitors: [], questions: [
    Q("{where} en iyi dijital pazarlama ajansları hangileri?", "comparison"),
    Q("{where} sosyal medya yönetimi yapan ajanslar hangileri?", "local"),
    Q("Küçük işletmeler için hangi reklam ajansı önerilir?", "comparison"),
    Q("{where} web sitesi yaptırmak için firma önerir misin?", "purchase"),
    Q("İyi bir ajans nasıl seçilir?", "informational"),
  ] },
  { label: "Matbaa / baskı", local: true, competitors: [], questions: [
    Q("{where} uygun fiyatlı matbaa hangisi?", "comparison"),
    Q("{where} kartvizit ve broşür bastırmak için nereye gitmeliyim?", "purchase"),
    Q("Online baskı hizmeti veren firmalar hangileri?", "comparison"),
    Q("{where} tabela yapan firmalar hangileri?", "local"),
    Q("Ambalaj ve kutu baskısı için hangi firma önerilir?", "purchase"),
  ] },
  { label: "Kuyumcu / takı", local: true, competitors: [], questions: [
    Q("{where} güvenilir kuyumcular hangileri?", "local"),
    Q("{where} pırlanta yüzük için hangi kuyumcu önerilir?", "comparison"),
    Q("Türkiye'de en iyi takı markaları hangileri?", "comparison"),
    Q("Online altın almak için güvenilir siteler hangileri?", "purchase"),
    Q("{where} alyans için iyi bir kuyumcu var mı?", "purchase"),
  ] },
  { label: "Evden eve nakliyat", local: true, competitors: [], questions: [
    Q("{where} en iyi evden eve nakliyat firmaları hangileri?", "local"),
    Q("{where} uygun fiyatlı bir nakliyeci önerir misin?", "comparison"),
    Q("Şehirler arası taşımacılıkta hangi firma güvenilir?", "comparison"),
    Q("{where} asansörlü taşımacılık yapan firmalar hangileri?", "purchase"),
    Q("Nakliyat firması seçerken nelere dikkat etmeliyim?", "informational"),
  ] },
  { label: "Temizlik / ev hizmetleri", local: true, competitors: [], questions: [
    Q("{where} ev temizliği yapan güvenilir firmalar hangileri?", "local"),
    Q("{where} halı yıkama firması önerir misin?", "comparison"),
    Q("{where} ofis temizliği için hangi firma iyi?", "comparison"),
    Q("{where} tadilat ve tamirat ustası nasıl bulunur?", "purchase"),
    Q("{where} böcek ilaçlama firması önerir misin?", "purchase"),
  ] },
  { label: "Mimarlık / iç mimarlık", local: true, competitors: [], questions: [
    Q("{where} iyi bir iç mimar önerir misin?", "comparison"),
    Q("{where} mimarlık ofisleri hangileri?", "local"),
    Q("{where} mutfak tasarımı yapan firmalar hangileri?", "purchase"),
    Q("Ev dekorasyonu için iç mimar tutmalı mıyım?", "informational"),
    Q("{where} villa projesi için mimar önerir misin?", "comparison"),
  ] },
  { label: "Optik / gözlük", local: true, competitors: [], questions: [
    Q("{where} en iyi optik mağazaları hangileri?", "local"),
    Q("En iyi gözlük çerçevesi markaları hangileri?", "comparison"),
    Q("Lenste hangi marka önerilir?", "comparison"),
    Q("{where} uygun fiyatlı gözlükçü var mı?", "local"),
    Q("Güneş gözlüğünde en iyi markalar hangileri?", "comparison"),
  ] },
  { label: "Oto servis / yedek parça", local: true, competitors: [], questions: [
    Q("{where} güvenilir oto servis hangisi?", "local"),
    Q("{where} oto yedek parça nereden alınır?", "purchase"),
    Q("{where} lastik değişimi için nereye gitmeliyim?", "local"),
    Q("{where} kaporta boya ustası önerir misin?", "comparison"),
    Q("Orijinal yedek parça satan güvenilir siteler hangileri?", "comparison"),
  ] },
  { label: "Diğer", local: false, competitors: [], questions: [] },
];


// İngilizce arayüz için uluslararası sektörler. {city} = şehir adı ("in {city}" diye kurulur).
export const SECTOR_DEFS_EN: SectorDef[] = [
  { label: "Restaurant", local: true, competitors: [], questions: [
    Q("What are the best restaurants in {city} right now?", "local"),
    Q("Can you recommend an affordable, good restaurant in {city}?", "comparison"),
    Q("Where can I take my family for dinner in {city}?", "local"),
    Q("Which restaurants in {city} are good for a date night?", "purchase"),
    Q("How can I tell if a restaurant is good before I go?", "informational"),
  ] },
  { label: "Cafe / bakery", local: true, competitors: [], questions: [
    Q("What are the best cafes for breakfast in {city}?", "local"),
    Q("Can you recommend a quiet cafe to work from in {city}?", "comparison"),
    Q("Where can I order a good birthday cake in {city}?", "purchase"),
  ] },
  { label: "Dentist / medical clinic", local: true, competitors: [], questions: [
    Q("Can you recommend a good dentist in {city}?", "local"),
    Q("Which dental clinics in {city} are best for implants?", "comparison"),
    Q("Where can I get teeth whitening at a fair price in {city}?", "purchase"),
    Q("How do I choose a good dentist?", "informational"),
  ] },
  { label: "Beauty salon / spa", local: true, competitors: [], questions: [
    Q("What are the best beauty salons in {city}?", "local"),
    Q("Can you recommend a good hair salon in {city}?", "comparison"),
    Q("Where can I book a relaxing spa day in {city}?", "purchase"),
  ] },
  { label: "Hotel / accommodation", local: true, competitors: [], questions: [
    Q("What are the best hotels in {city}?", "local"),
    Q("Can you recommend a boutique hotel in {city}?", "comparison"),
    Q("Which family-friendly hotels in {city} are worth booking?", "purchase"),
    Q("How do I find a good hotel without overpaying?", "informational"),
  ] },
  { label: "Auto repair", local: true, competitors: [], questions: [
    Q("Can you recommend a reliable auto repair shop in {city}?", "local"),
    Q("Where can I get an honest car inspection in {city}?", "comparison"),
    Q("Which mechanics in {city} are good for European cars?", "purchase"),
  ] },
  { label: "Real estate agency", local: true, competitors: [], questions: [
    Q("Which real estate agents in {city} are the best?", "local"),
    Q("Can you recommend a real estate agency for buying an apartment in {city}?", "purchase"),
    Q("How do I choose a good real estate agent?", "informational"),
  ] },
  { label: "Law firm", local: true, competitors: [], questions: [
    Q("Can you recommend a good business lawyer in {city}?", "local"),
    Q("Which law firms in {city} handle immigration cases well?", "comparison"),
    Q("How do I find a trustworthy lawyer?", "informational"),
  ] },
  { label: "Accounting / tax", local: true, competitors: [], questions: [
    Q("Can you recommend an accountant for small businesses in {city}?", "local"),
    Q("Which accounting firms in {city} are good for startups?", "comparison"),
  ] },
  { label: "Gym / fitness", local: true, competitors: [], questions: [
    Q("What are the best gyms in {city}?", "local"),
    Q("Can you recommend a good personal trainer in {city}?", "comparison"),
    Q("Where can I find affordable yoga classes in {city}?", "purchase"),
  ] },
  { label: "Home services (plumbing, cleaning…)", local: true, competitors: [], questions: [
    Q("Can you recommend a reliable plumber in {city}?", "local"),
    Q("Which house cleaning services in {city} are good?", "comparison"),
    Q("How do I find a trustworthy contractor?", "informational"),
  ] },
  { label: "Marketing / digital agency", local: false, competitors: [], questions: [
    Q("What are the best digital marketing agencies for small businesses?", "comparison"),
    Q("Can you recommend an SEO agency for an e-commerce store?", "purchase"),
    Q("How do I choose a marketing agency?", "informational"),
  ] },
  { label: "AI visibility / SEO tools", local: false,
    competitors: ["Peec AI", "Otterly.AI", "Profound", "Semrush", "Ahrefs"], questions: [
    Q("What are the best tools to track brand visibility in AI answers?", "comparison"),
    Q("Which tool can show if ChatGPT recommends my business?", "purchase"),
    Q("What are affordable alternatives to Profound for AI visibility tracking?", "comparison"),
    Q("How do I measure my brand's visibility in ChatGPT?", "informational"),
  ] },
  { label: "Project management software", local: false,
    competitors: ["Asana", "Monday.com", "Trello", "ClickUp", "Notion"], questions: [
    Q("What is the best project management tool for a small team?", "comparison"),
    Q("Which project management software should a 10-person agency buy?", "purchase"),
    Q("What are good alternatives to Jira for non-developers?", "comparison"),
  ] },
  { label: "CRM software", local: false,
    competitors: ["HubSpot", "Salesforce", "Pipedrive", "Zoho CRM"], questions: [
    Q("What is the best CRM for a small business?", "comparison"),
    Q("Which CRM should a small sales team buy?", "purchase"),
    Q("What are affordable alternatives to Salesforce?", "comparison"),
  ] },
  { label: "Email marketing software", local: false,
    competitors: ["Mailchimp", "Klaviyo", "Brevo", "Kit"], questions: [
    Q("What is the best email marketing tool for an online store?", "comparison"),
    Q("Which newsletter platform should a creator use?", "purchase"),
    Q("What are cheaper alternatives to Mailchimp?", "comparison"),
  ] },
  { label: "E-commerce store", local: false, competitors: [], questions: [
    Q("Where can I buy high-quality products like ours online?", "purchase"),
    Q("Which online stores are trustworthy for this kind of product?", "comparison"),
  ] },
  { label: "Software / SaaS (other)", local: false, competitors: [], questions: [
    Q("What are the best tools for this kind of job?", "comparison"),
  ] },
  // Content creators (YouTube channel, podcast, social). Brand = channel name; website = youtube.com/@channel.
  { label: "Content creator: food / recipes", local: false, competitors: [], questions: [
    Q("What are the best YouTube channels for recipes?", "comparison"),
    Q("Can you recommend a YouTube channel with easy recipes for beginners?", "purchase"),
    Q("Who should I follow for quick, budget-friendly meals?", "purchase"),
  ] },
  { label: "Content creator: tech / reviews", local: false, competitors: [], questions: [
    Q("Which YouTube channels have the most trustworthy phone and tech reviews?", "comparison"),
    Q("Whose review should I watch before buying a new phone?", "purchase"),
    Q("Which creators make unbiased tech reviews?", "informational"),
  ] },
  { label: "Content creator: gaming", local: false, competitors: [], questions: [
    Q("Who are the most popular gaming YouTubers right now?", "comparison"),
    Q("Which channel do you recommend for game guides and tips?", "purchase"),
  ] },
  { label: "Content creator: education", local: false, competitors: [], questions: [
    Q("What are the best free educational YouTube channels?", "comparison"),
    Q("Which YouTube channel do you recommend for learning to code?", "purchase"),
  ] },
  { label: "Content creator: travel", local: false, competitors: [], questions: [
    Q("Who are the best travel YouTubers?", "comparison"),
    Q("Who should I follow for budget travel tips?", "purchase"),
  ] },
  { label: "Content creator: finance / investing", local: false, competitors: [], questions: [
    Q("What are the best YouTube channels to learn investing as a beginner?", "comparison"),
    Q("Who should I follow for personal finance and budgeting?", "purchase"),
  ] },
  { label: "Content creator: beauty / fashion", local: false, competitors: [], questions: [
    Q("Who are the best YouTubers for makeup and skincare?", "comparison"),
    Q("Which channel should I watch for affordable beauty recommendations?", "purchase"),
  ] },
  { label: "Content creator: sports / fitness", local: false, competitors: [], questions: [
    Q("What are the best YouTube channels for home workouts?", "comparison"),
    Q("Can you recommend a channel with a beginner fitness program?", "purchase"),
  ] },
  { label: "Content creator: other", local: false, competitors: [], questions: [
    Q("What are the best YouTube channels on this topic?", "comparison"),
  ] },
  { label: "Agriculture / fertilizer", local: true, competitors: [], questions: [
    Q("Where can I buy fertilizer in {city}?", "purchase"),
    Q("What are the best fertilizer brands?", "comparison"),
    Q("Is organic or synthetic fertilizer better for my garden?", "informational"),
    Q("Which fertilizer is best for fruit trees?", "comparison"),
    Q("Which farm supply stores in {city} are worth visiting?", "local"),
    Q("What fertilizer should I use after a soil test?", "informational"),
  ] },
  { label: "Seeds / nursery / plants", local: true, competitors: [], questions: [
    Q("What are the best plant nurseries in {city}?", "local"),
    Q("Which seed companies are the most reliable?", "comparison"),
    Q("Where can I buy fruit tree saplings online?", "purchase"),
    Q("Heirloom or hybrid seeds: which should I choose?", "informational"),
  ] },
  { label: "Manufacturing / industrial (B2B)", local: false, competitors: [], questions: [
    Q("How do I find a reliable contract manufacturer?", "informational"),
    Q("Which manufacturers are best for small-batch production?", "comparison"),
    Q("Who are the top suppliers for wholesale orders in this industry?", "purchase"),
    Q("How can I tell if a supplier is trustworthy?", "informational"),
  ] },
  { label: "Construction / building materials", local: true, competitors: [], questions: [
    Q("Where can I buy building materials in {city}?", "purchase"),
    Q("What are the best paint brands?", "comparison"),
    Q("Which insulation brand is best for a home?", "comparison"),
    Q("Can you recommend a reliable general contractor in {city}?", "local"),
  ] },
  { label: "Solar / energy", local: true, competitors: [], questions: [
    Q("Which solar installers in {city} are the most reliable?", "local"),
    Q("How much does a rooftop solar system cost?", "informational"),
    Q("What are the best solar panel brands?", "comparison"),
    Q("What should I check before hiring a solar company?", "informational"),
  ] },
  { label: "Moving company", local: true, competitors: [], questions: [
    Q("What's the best moving company in {city}?", "local"),
    Q("Which movers in {city} are the most affordable?", "comparison"),
    Q("Who should I hire for a long-distance move?", "purchase"),
    Q("How do I choose a reliable moving company?", "informational"),
  ] },
  { label: "Cleaning / pest control", local: true, competitors: [], questions: [
    Q("Can you recommend a reliable house cleaning service in {city}?", "local"),
    Q("Which pest control companies in {city} are best?", "comparison"),
    Q("Who offers good office cleaning in {city}?", "purchase"),
  ] },
  { label: "Pet store / veterinarian", local: true, competitors: [], questions: [
    Q("What are the best vet clinics in {city}?", "local"),
    Q("Is there a 24-hour emergency vet in {city}?", "local"),
    Q("What are the best dog food brands?", "comparison"),
    Q("What are the best cat food brands?", "comparison"),
  ] },
  { label: "Wedding / events", local: true, competitors: [], questions: [
    Q("What are the best wedding venues in {city}?", "local"),
    Q("Can you recommend a wedding photographer in {city}?", "comparison"),
    Q("Which event planners in {city} are worth hiring?", "purchase"),
  ] },
  { label: "Jewelry", local: true, competitors: [], questions: [
    Q("What are the most trusted jewelers in {city}?", "local"),
    Q("Where should I buy an engagement ring?", "purchase"),
    Q("What are the best jewelry brands?", "comparison"),
  ] },
  { label: "Printing / signage", local: true, competitors: [], questions: [
    Q("Where can I print business cards and flyers in {city}?", "purchase"),
    Q("Which online printing services are best?", "comparison"),
    Q("Who makes custom signs in {city}?", "local"),
  ] },
  { label: "Food production / wholesale", local: false, competitors: [], questions: [
    Q("Who are reliable wholesale food suppliers for restaurants?", "comparison"),
    Q("Where can I buy olive oil in bulk?", "purchase"),
    Q("Which food brands are known for natural, clean ingredients?", "comparison"),
  ] },
  { label: "Other", local: false, competitors: [], questions: [] },
];

/** Seçim listesi arayüz diline göre; kayıtlı eski değerler iki listede de aranır. */
export const SECTORS = (isEn() ? SECTOR_DEFS_EN : SECTOR_DEFS).map((s) => s.label);

export function sectorDef(label: string | null | undefined): SectorDef | undefined {
  return SECTOR_DEFS.find((s) => s.label === label) ?? SECTOR_DEFS_EN.find((s) => s.label === label);
}

/** Türkçe bulunma eki (ünlü uyumu + sert ünsüz): Antalya'da, İzmir'de, Sinop'ta. */
export function locative(name: string): string {
  const lower = name.toLocaleLowerCase("tr-TR");
  const vowels = [...lower].filter((c) => "aıoueiöü".includes(c));
  const last = vowels[vowels.length - 1] ?? "a";
  const v = "aıou".includes(last) ? "a" : "e";
  const hard = "fstkçşhp".includes(lower.slice(-1));
  return `${name}'${hard ? "t" : "d"}${v}`;
}

/** Genel sorular (19 Kasım): marka adını içerir; sektörü "Diğer" ya da listede olmayan markalar boş başlamasın diye
 *  ilk soru seti olur, diğer sektörlerde ek fikir olarak gösterilir. */
export function genericTemplates(brand: string, en: boolean): { text: string; intent: Intent }[] {
  const b = brand.trim();
  if (!b) return [];
  return (en
    ? [Q(`Is ${b} trustworthy?`, "informational"), Q(`What do customers say about ${b}?`, "informational"),
       Q(`What does ${b} do and what does it offer?`, "informational"), Q(`What are the best alternatives to ${b}?`, "comparison"),
       Q(`Where can I buy from ${b}?`, "purchase")]
    : [Q(`${b} güvenilir mi?`, "informational"), Q(`${b} hakkında yorumlar neler?`, "informational"),
       Q(`${b} ne iş yapar, hangi ürünleri var?`, "informational"), Q(`${b} yerine hangi firmalar tercih edilebilir?`, "comparison"),
       Q(`${b} ürünleri nereden alınır?`, "purchase")]);
}

/** Sektör etiketi İngilizce listedense (ya da hiçbir listede yoksa ve arayüz İngilizceyse) İngilizce sorular. */
function sectorIsEn(sector: string | null | undefined): boolean {
  if (SECTOR_DEFS_EN.some((s) => s.label === sector)) return true;
  if (SECTOR_DEFS.some((s) => s.label === sector)) return false;
  return isEn();
}

/** Markaya uygun hazır sorular. Yerel sektörlerde şehir yoksa yerel sorular çıkmaz.
 *  Sektörün hazır sorusu yoksa ("Diğer" ya da serbest yazılmış sektör) ve marka adı verildiyse genel sorularla başlar. */
export function questionTemplates(sector: string | null, city: string | null, brand?: string): { text: string; intent: Intent }[] {
  const def = sectorDef(sector);
  if (!def || def.questions.length === 0) return brand ? genericTemplates(brand, sectorIsEn(sector)) : [];
  const c = city?.trim();
  return def.questions
    .filter((q) => c || !/\{(city|where)\}/.test(q.text))
    .map((q) => ({ ...q, text: q.text.replace("{where}", c ? locative(c) : "").replace("{city}", c ?? "") }));

}

/** Satın alma sonrası sorular (garanti, iade, destek): her sektörde geçerli, marka adını içerir (raporda "markalı" sayılır). */
export function postPurchaseTemplates(brand: string, en: boolean): { text: string; intent: Intent }[] {
  const b = brand.trim();
  if (!b) return [];
  return (en
    ? [`How does the ${b} warranty work?`, `How do I return or exchange something I bought from ${b}?`, `How can I reach ${b} customer support?`]
    : [`${b} garantisi nasıl işliyor?`, `${b}'dan aldığım ürünü nasıl iade ederim?`, `${b} müşteri hizmetlerine nasıl ulaşırım?`]
  ).map((text) => ({ text, intent: "post_purchase" as Intent }));
}

/** Örnek rakipler: markanın kendisi ve zaten ekli olanlar hariç. */
export function competitorSuggestions(sector: string | null, brandName: string, existing: string[]): string[] {
  const def = sectorDef(sector);
  if (!def) return [];
  const norm = (s: string) => s.toLocaleLowerCase("tr-TR").replace(/[^a-z0-9çğıöşü]/g, "");
  const taken = new Set([brandName, ...existing].map(norm));
  return def.competitors.filter((c) => !taken.has(norm(c)) && !norm(brandName).includes(norm(c)) && !norm(c).includes(norm(brandName)));
}

/** Soru havuzu (19 Kasım): sektör için Google'da sorulan gerçek sorular (scripts/question-pool.ts ile toplanır). */
export function poolQuestions(sector: string | null | undefined): { text: string; intent: Intent }[] {
  return (sector ? QUESTION_POOL[sector] ?? [] : []).map((q) => ({ text: q.t, intent: q.i as Intent }));
}

/** Marka sayfasındaki tüm hazır soru fikirleri: sektör + Google havuzu + genel + satın alma sonrası (tekrarsız). */
export function allQuestionIdeas(sector: string | null, city: string | null, brand: string): { text: string; intent: Intent }[] {
  const en = sectorIsEn(sector), seen = new Set<string>(), out: { text: string; intent: Intent }[] = [];
  for (const q of [...questionTemplates(sector, city, brand), ...poolQuestions(sector), ...genericTemplates(brand, en), ...postPurchaseTemplates(brand, en)]) {
    if (!seen.has(q.text)) { seen.add(q.text); out.push(q); }
  }
  return out;
}

/** Yeni markaya otomatik eklenen ilk sorular (19 Kasım): önce sektör soruları, eksik kalırsa genel sorular; en fazla n. */
export function starterQuestions(sector: string | null, city: string | null, brand: string, n = 5): { text: string; intent: Intent }[] {
  const seen = new Set<string>(), out: { text: string; intent: Intent }[] = [];
  for (const q of [...questionTemplates(sector, city, brand), ...poolQuestions(sector), ...genericTemplates(brand, sectorIsEn(sector))]) {
    if (out.length >= n) break;
    if (!seen.has(q.text)) { seen.add(q.text); out.push(q); }
  }
  return out;
}
